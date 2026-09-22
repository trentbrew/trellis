# ADR 0042 — Blob tier seam and the OPFS local rung

**Status:** accepted (2026-08-31) **Related:**
[0016](./0016-relay-blob-serving.md) (relay `/blob` HTTP surface),
[0017](./0017-blob-gc-thermal-decay.md) (thermal decay + tier ladder),
`src/blobs/`, `src/vcs/blob-store.ts`, `src/realtime/blob-client.ts`

## Context

[ADR 0017](./0017-blob-gc-thermal-decay.md) defines blob storage as a ladder —
hot (relay NVMe) / cold (object storage) / local (client OPFS) / peer
(iroh-blobs) — where *"a `GET` miss walks up the ladder; decay pushes down."*

Two rungs were implemented, and neither could be walked:

- **`BlobStore`** (`src/vcs/blob-store.ts`) — synchronous, `Buffer`-based, disk.
  Synchronous because VCS diff/merge are synchronous.
- **`BlobClient`** (`src/realtime/blob-client.ts`) — async, `ArrayBuffer`-based,
  `fetch`. Browser-safe by construction ([0016](./0016-relay-blob-serving.md)).

They share an addressing scheme and nothing else: no common type, no consumer
polymorphic over both, no composition. A ladder cannot be walked when the rungs
have no shared shape.

The **local rung did not exist at all.** `src/client/vcs-client.ts` throws
`'OPFS persistence not yet implemented'` — and that is for the *op-log*, not
blobs. A browser page with no relay therefore had nowhere to put bytes, which
breaks local-first operation for media specifically.

Three consumers want the same thing and cannot express it: pi-sprite (a
WebContainer host page whose container is disposable), a collaborative
app-builder (two peers resolving the same image without a shared runtime), and
VCS itself.

## Decision

Introduce **`BlobTier`** (`src/blobs/tier.ts`) as the shared rung type, adapt the
existing implementations to it without changing them, and implement the **OPFS
local rung**.

### 1. The interface is async

```ts
interface BlobTier {
  readonly name: string;
  get(hash: BlobHash): Promise<Uint8Array | null>;
  has(hash: BlobHash): Promise<boolean>;
  put(content: Uint8Array, meta?: BlobTierMeta): Promise<BlobHash>;
}
```

Only a local filesystem can answer synchronously. A synchronous signature would
permanently exclude OPFS, IndexedDB, and every network rung — so the seam is
async and the disk rung is adapted, not the reverse.

### 2. Existing implementations are adapted, never rewritten

`diskTier()` (`src/blobs/node.ts`) and `relayTier()` (`src/blobs/relay.ts`) are
thin adapters. `BlobStore` keeps its synchronous `Buffer` API because VCS
depends on it; `BlobClient` keeps server-side addressing so a client/server hash
disagreement surfaces rather than being papered over in the adapter.

### 3. Addressing lives in one function

`hashBlob()` is the sole address derivation, and must stay byte-identical to
`BlobStore.hashSync` and the relay's server-side hashing. If two rungs disagree
on an address the same bytes land under two hashes and dedup silently stops
working. ADR 0017 anticipates a SHA-256 → BLAKE3 move for the iroh-blobs peer
tier; that migration lands here, in one place, by design.

### 4. The ladder composes rungs, warmest first

`createBlobLadder([opfs, relay])` implements 0017's read path: walk up on a
miss, re-warm every warmer rung on the way back. Two deliberate behaviours:

- **A failing rung is tolerated, not fatal.** An offline relay must not break
  local reads. Failures are surfaced through `onTierError` rather than swallowed.
- **`put` writes every rung.** This is how a client satisfies 0017's
  pinned-until-backed-up invariant: the bytes exist locally *and* on the relay
  before the put resolves. Partial failure resolves (the content is stored and
  the address is valid) and is reported; only total failure throws.

### 5. OPFS persistence is a correctness concern, not a nicety

ADR 0017 makes the local copy an **authoritative** tier under the non-negotiable
never-sole-copy invariant. But OPFS is evictable by default — the browser may
reclaim it under storage pressure. An unpersisted local tier is therefore only a
cache, and treating it as authoritative breaks the invariant precisely when it is
the last holder.

So `OpfsBlobTier` never assumes durability:

- `persisted` starts `null` — unknown until asked.
- `requestPersistence()` calls `navigator.storage.persist()` and records the
  real answer.
- A denial returns `false` rather than throwing. Callers promoting this tier to
  authoritative must check.

Layout is flat `blobs/{hash}`, matching `.trellis/blobs/{hash}` so the local and
disk rungs stay directly comparable.

### 6. Browser safety is enforced by module boundary

`trellis/blobs` is browser-safe; the disk rung is isolated in
`trellis/blobs/node` so importing the seam in a page never pulls in `node:fs`.
(A WebContainer *guest* has an emulated `node:fs` and can use the disk rung; the
page around it cannot.)

## Consequences

**Positive**

- 0017's ladder is now expressible in code rather than only in prose.
- Local-first holds for media: a browser page works with no relay reachable.
- One contract suite defines correctness for every rung — a new backend (cold
  R2, iroh peer) is correct when it passes unchanged.
- Consumers write against one store and never branch on which tier holds what.

**Negative**

- A third byte-shape convention (`Uint8Array`) now sits alongside `Buffer` and
  `ArrayBuffer`. `toBytes()` normalizes at the boundary; the underlying
  implementations still differ.
- `ladder.put` writing every rung makes a put as slow as its slowest tier. Fine
  for the pinned-until-backed-up rule; revisit if a cold rung joins the write
  path.

**Neutral**

- Purely additive. No existing implementation, call site, or on-disk format
  changed.

## Not decided here

- **Eviction.** ADR 0017's heat sidecar, W-TinyLFU scoring, pin/demote, and the
  cold (R2) tier remain unimplemented. This ADR delivers the *read* half of the
  ladder; decay is the other half and 0017 remains proposed.
- **Hash migration.** SHA-256 → BLAKE3 for the peer tier is 0017's follow-up.

## References

- `src/blobs/tier.ts`, `ladder.ts`, `opfs.ts`, `relay.ts`, `node.ts`, `memory.ts`
- `test/blobs/tier-contract.test.ts` — contract suite across all four rungs
- `src/client/vcs-client.ts` — the op-log's still-unimplemented OPFS backend
