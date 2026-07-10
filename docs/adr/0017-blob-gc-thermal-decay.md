# ADR 0017 — Blob GC and thermal decay policy

**Status:** proposed (2026-07-10) **Related:**
[0016](./0016-relay-blob-serving.md) (relay blob serving),
[0014](./0014-git-materialization-and-lane-worktrees.md) (blob-store on promote),
`src/vcs/blob-store.ts`, `src/realtime/blob-handler.ts`, TRL-48 (range reads),
TRL-46/TRL-47 (which deferred GC)

## Context

[0016](./0016-relay-blob-serving.md) shipped the byte tier but explicitly
deferred a garbage-collection policy: `BlobStore` never evicts, so the relay's
`{trellisDir}/blobs/` grows without bound. On a Sprites.dev host the storage
tiers are priced ~25× apart — **hot NVMe ≈ $0.50/GB‑month vs cold object
≈ $0.02/GB‑month** — and, more importantly, keeping a Sprite awake purely to
seed bytes is a _compute_ bill (a 24/7 1 vCPU + 2 GB relay ≈ $115/month),
dwarfing storage. So an unbounded hot store is the expensive failure mode, and
"just keep everything hot forever" is the wrong default.

We need an eviction policy — but eviction of a content-addressed store is only
safe if it is never destructive. The design has to make that guarantee
structural, not a hope.

### What content addressing buys us

A blob's hash _is_ its identity. Evicting the relay's copy of `X` loses nothing
**as long as some other holder can still re-produce bytes that hash to `X`**.
That reframes GC from "deletion" to "cache demotion": a miss is a re-fetch, not
data loss. The relay is a _cache_ of a byte that lives authoritatively
elsewhere — never the sole holder.

## Decision

Treat the relay blob store as a **thermal cache** with a strict safety
invariant, a heat signal, an eviction algorithm, and an explicit tier ladder.

### Safety invariant (non-negotiable)

> The relay copy of a blob is **never the sole authoritative copy**. Eviction is
> permitted only when the byte is recoverable from a colder tier or a peer.

Concretely, a blob becomes eligible for hot eviction only once it has been
durably written to the cold tier (object storage) **or** is known-held by at
least one reachable peer. A freshly `PUT` blob that has not yet been backed up
is **pinned** (ineligible) until backup completes. This makes decay a
latency/cost decision, never a correctness one — a design consequence of
"servers never own state" ([0016](./0016-relay-blob-serving.md)).

### Heat signal

Heat is **access frequency with recency decay** — the popularity signal the user
proposed ("hot/cold by how often a file is fetched, including peer copies"),
which is exactly a **W‑TinyLFU** admission/eviction policy (Caffeine's algorithm):
a frequency sketch plus a small recency window. Per-blob heat inputs:

- `getCount` — `GET`/Range hits on `/blob/:hash` (a Range hit counts once).
- `peerFetchCount` — copies handed to peers (future iroh-blobs replication).
- `lastAccess` — recency, for the decay term.

Heat is metadata kept beside the store (sidecar index / SQLite), **not** in the
content-addressed bytes — the bytes stay immutable and their hash unchanged.

### Eviction algorithm

1. Trigger when hot-tier bytes exceed a high-water mark (configurable, e.g. a
   fraction of the Sprite's ~100 GB ext4 ceiling).
2. Rank eligible (non-pinned, backed-up) blobs by W‑TinyLFU score (frequency +
   recency).
3. Demote the coldest until below a low-water mark. Demotion = drop hot bytes;
   the cold/peer copy remains. A later `GET` re-warms on miss.
4. Never touch pinned blobs (§ safety invariant).

Probabilistic "the colder it gets the likelier it is deleted" (the user's
framing) falls out naturally: low frequency + old `lastAccess` ⇒ low score ⇒
first demoted. But demotion is deletion _of the hot copy only_.

### Tier ladder

| Tier | Location | Cost profile | Role |
| --- | --- | --- | --- |
| **Hot** | Relay/Sprite NVMe (`blobs/`) | ~$0.50/GB‑mo, compute-attached | W‑TinyLFU cache; decays freely |
| **Cold** | Object storage (Sprite cold tier / R2) | ~$0.02/GB‑mo, R2 has $0 egress | Durable backstop; re-warms hot on miss |
| **Local** | Client OPFS + `navigator.storage.persist()` | free to us | Local-first authoritative copy |
| **Peer** | Other clients via iroh-blobs (BLAKE3) | free to us | P2P re-fetch; feeds `peerFetchCount` |

A `GET` miss walks _up_ the ladder (peer/cold → hot); decay pushes _down_. R2 is
preferred for the cold tier specifically because a blob server is egress-shaped
and R2 charges no egress. The client OPFS copy needs `persist()` or the browser
may evict it under storage pressure — without it the "local authoritative copy"
is itself only a cache, which would violate the invariant when it is the last
holder.

### Relationship to iroh-blobs / BLAKE3

The peer tier is [iroh-blobs](https://www.iroh.computer/sendme) (the library
under `sendme`), which is content-addressed over **BLAKE3**, whereas `BlobStore`
is **SHA‑256**. Adopting the peer tier implies either a hash migration to BLAKE3
or a dual-hash index. BLAKE3's Bao verified-streaming tree also enables
incremental range verification — a natural fit for the TRL-48 range/streaming
path and future P2P video. This ADR records the direction; the hash decision is
its own follow-up.

## Consequences

- **Bounded hot storage** with a tunable footprint; the expensive tier stays a
  working set, not an archive.
- **No data loss from GC** by construction (pinned-until-backed-up invariant).
- **New moving parts:** a heat sidecar index, a backup/demote path to cold
  storage, and high/low-water config on the relay. `BlobStore.get` /
  `createReadStream` gain a re-warm-on-miss path.
- **Deferred:** the BLAKE3 vs SHA‑256 hash decision; concrete W‑TinyLFU
  parameters; whether cold is Sprite-native object storage or R2; reference
  counting from the graph (a blob still referenced by a live field could pin
  independent of heat).

## Alternatives considered

- **Plain LRU / reference counting only.** Simpler, but LRU ignores frequency
  (one-hit scans evict genuinely hot blobs) and pure refcounting can't bound the
  hot tier when everything is still referenced. W‑TinyLFU subsumes recency while
  respecting frequency; refcounting can layer in later as an additional pin.
- **No GC (status quo).** Rejected: unbounded hot NVMe is the single most
  expensive posture on the pricing sheet.
- **Relay as durable origin.** Rejected: violates "servers never own state" and
  the safety invariant; makes eviction destructive.
