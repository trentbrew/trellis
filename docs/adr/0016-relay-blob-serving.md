# ADR 0016 — Blob serving on the realtime relay

**Status:** accepted (2026-07-10) **Related:**
[0014](./0014-git-materialization-and-lane-worktrees.md) (blob-store commit on
promote), `src/vcs/blob-store.ts`, `src/realtime/relay-server.ts`

## Context

`trellis` already has both halves of a content-addressed byte tier, unconnected:

- **`BlobStore`** (`src/vcs/blob-store.ts`) — content-addressed store
  (`put`/`putSync`/`get`/`has`, sha256 hex, `count`/`totalSize`), disk-backed at
  `{trellisDir}/blobs/{hash}`. Today it serves VCS file reconstruction only.
- **The realtime relay** (`createRealtimeRelay`/`attachRealtimeRelay`) — already
  runs a `node:http` server that does WS fan-out on `/rt` plus an HTTP health
  route (`GET /`, `/health`) with CORS. Every client already connects to it.

Downstream clients (the Threlte game engine, sprite-client, Raster) need to
**distribute binary assets across machines** — a model uploaded on one device
must resolve on another that has never seen the bytes. That is a _distribution_
problem: a client-side cache (IndexedDB/OPFS) can't seed a cold machine;
something reachable by all clients must hold the bytes.

The relay is that something: always-on, browser-reachable, and already the
multiplayer rendezvous. Serving blobs from it is the honest "one seed everyone
can reach" — the always-available seed in a future peer-assisted (torrent-style)
fetch model.

This does **not** violate "servers never own state." Content addressing means
the bytes _are_ their own identity — the relay holds no authority; it returns
whatever hashes to `X`. The graph still owns _which_ asset a field references.
This is "Trellis owns semantics, the relay moves bytes" at the package boundary.

Notably this sidesteps the [TRL-20] browser-client blocker: blobs are dumb bytes
keyed by a hash — no graph sync, no live subscriptions, no permission-filtered
queries. It is the easy, un-blocked slice.

## Decision

Add an optional blob HTTP surface to the relay, backed by an injected
`BlobStore`, plus a browser-safe fetch client.

### 1. Server — blob routes on the relay HTTP handler

Extend `RealtimeRelayOptions` mirroring the existing `persistence` injection:

```ts
blobStore?: false | (() => BlobStore); // default false (no blob surface)
maxBlobBytes?: number;                 // default 64 MiB → 413 over limit
authorizeBlobWrite?: (req: IncomingMessage) => boolean | Promise<boolean>;
```

Factor routing into
`createBlobRequestHandler(store, opts): (req, res) => boolean` (returns `true`
if it handled the request) so **both** the standalone `createServer` handler and
`attachRealtimeRelay` embedders can mount it. Routes:

- `GET /blob/:hash` → validate `^[a-f0-9]{64}$` (else 400); `store.get(hash)` →
  `200` `application/octet-stream` with `ETag: "<hash>"` and
  `Cache-Control: public, max-age=31536000, immutable` (content-addressed ⇒
  immutable), or `404`. Honor `If-None-Match` → `304`.
- `HEAD /blob/:hash` → `store.has(hash)` → `200`/`404`. Cheap existence probe
  for the resolver and for a future "who has X?" peer step.
- `PUT /blob` → read body (enforce `maxBlobBytes` → `413`); run
  `authorizeBlobWrite` (→ `401`); `await store.put(body)`; respond
  `201 { hash }`. **Integrity is free**: the server computes the hash from
  bytes, so a client cannot lie about content identity.
- CORS: extend the allow-methods const to `GET, HEAD, PUT, OPTIONS` for
  `/blob*`.

`BlobStore.get` is sync/disk (Node) — fine on the server. No new storage engine;
reuse the existing store. The relay may point at its **own** blob dir (v1:
populated by client PUTs, the "relay as cache/seed" model) or at a Trellis
workspace's `.trellis/blobs` (config swap) to serve graph-committed assets.

### 2. Client — browser blob client

New browser-safe export (fetch only, no node deps), e.g. under `./realtime` or a
new `./blobs` condition:

```ts
createBlobClient({ baseUrl }): {
  get(hash): Promise<ArrayBuffer | null>;   // GET /blob/:hash
  has(hash): Promise<boolean>;              // HEAD /blob/:hash
  put(bytes): Promise<string>;              // PUT /blob → hash
}
```

Optional verify-on-read: re-hash the response (`crypto.subtle.digest`) and
compare to the requested hash → detect corruption/MITM. Cheap, and it upholds
the content-addressing guarantee end-to-end.

## Consequences

- **The relay becomes stateful.** Today it's pure fan-out. A blob dir needs disk
  (or a bucket backend later), plus the write guardrails above (size cap, auth
  hook). **GC / quota / eviction is out of scope for v1** — note as follow-up;
  content-addressed blobs are safe to retain and dedupe by construction.
- **"Reachable" assumes one shared deployment** (LAN: desktop relay; cloud: the
  deployed sprite relay via `VITE_RELAY_URL`). The fully-airgapped case is
  covered downstream by committed manifests + offline export, not by this ADR.
- **Reusable primitive**, not a per-app hack — any Trellis client gets
  content-addressed asset distribution.
- **Downstream (Threlte engine, TRL-182)** keeps the naming/manifest/resolver
  layer; its resolver's network step calls this blob client. The engine repo
  owns the `asset:` scheme and the OPFS/IDB cache; `trellis` owns the byte
  source.
- **Sprite deploy path (trellis ≥ 3.2.6):** `generateServerEntrypoint` mounts
  `presenceRelay: { path: '/rt', blobStore: () => new BlobStore('/home/sprite/trellis-db') }`.
  `startServer` accepts `boolean | RealtimeRelayOptions` so `blobStore` reaches
  `attachRealtimeRelay`. Existing sprites need a **redeploy**
  (`trellis deploy --name <sprite>`) after this kernel lands; until then they
  only expose `/rt`. Clients use `wss://<sprite>.sprites.app/rt` and
  `https://<sprite>.sprites.app/blob/:sha256` on the same origin.

## Open question

The OPFS/IDB cache could live in the `trellis` browser blob client (every app
gets offline-instant assets) or in each app (per-app eviction policy). Lean:
cache-capable client in `trellis` with app-configurable quota; prototype
app-side first, upstream once stable.
