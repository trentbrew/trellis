# TRL-108 findings — what the dashboard spike settles for SPEC-v1.1

**Status:** spike complete. Feeds [TRL-110](../../README.md) (SPEC-v1.1), which
gates TRL-111 (Iroh).

The lanes dashboard is a peer: local, trusted, read-only, one-directional —
SPEC-v1.1's easiest case. The point was to answer the wire-shape question
against a real consumer before any network exists.

---

## What was there

`/api/lanes/stream` polled every second and pushed a **full snapshot**, forever,
whether or not anything had changed. Having no ops, the client invented them by
diffing counters:

```js
opLog.push({ at: snap.at, kind: 'op', detail: `${l.opCount} ops`,
             laneId: l.id, hash: snap.at + l.id });
toast(`op logged ${l.id}`);
```

A "Logs" tab showing an op log reverse-engineered from `opCount` deltas, with
synthesised hashes, in a system whose premise is a causal op log.

## What it is now

- `event: snapshot` — projections (lanes/issues), sent **only when ops changed**.
- `event: op` — the real `VcsOp`, with `id: <hash>` so SSE's `Last-Event-ID`
  resumes for free.
- `?since=<hash>` resumes; an unknown hash replays from the start.

Measured on this repo: **1 snapshot + 9,627 ops, each exactly once, then
silence.** Resume from a mid-stream hash yields **27 ops, not 9,627**. Unknown
hash replays all 9,627. `detectChanges()`, `prevLaneIds` and `prevIssueIds` are
deleted — the client applies ops.

---

## Finding 1 — the typed vocabulary is what makes a peer legible

The Logs tab wants `vcs:issueClose`, not "three facts changed". Shipping typed
ops made it trivially correct; shipping decomposed facts would have forced the
client to *re-infer* the kind — the same reverse-engineering the spike deleted,
one level down.

**For SPEC-v1.1:** whatever the wire carries, `kind` must survive on it. This is
concrete evidence for the collapse shape argued in TRL-110: one op type whose
kind vocabulary is preserved, not a payload that discards intent.

## Finding 2 — the projection half is the real fork, and it is not about ops

Ops stream cleanly. **Projections do not.** The dashboard renders lanes and
issues, which are *derived* from the materialized EAV store — `engine.listLanes()`,
`engine.getIssue()`, `engine.getActiveIssues()`. A client that receives only ops
must **materialize the store itself** to render anything.

So a read-only peer has exactly two options:

1. **Server-derived projections** (what this spike kept) — thin client, but the
   server must know every projection the client wants. Not local-first: the peer
   cannot answer a question the server did not anticipate.
2. **Client-side materialization** — the peer applies ops to its own store and
   queries locally. This *is* the local-first model, and it is what Iroh peers
   must do regardless, since there is no server to ask.

The spike deliberately took (1) to isolate the op-transport question. **(2) is
what SPEC-v1.1 actually has to specify**, and it is a bigger question than the
wire format: it means shipping the store + decompose + EQL-S to every peer.

**This is the finding that matters.** "Do peers exchange VcsOps or KernelOps"
looked like the hard question. It isn't. The hard question is *what does a peer
do with them* — and the answer determines the first one, because:

## Finding 3 — client-side materialization makes decompose consensus-critical

If peers materialize locally (and Iroh peers must), then each peer runs
`decompose()` over received ops. `decompose()` is **pure** — a deterministic
function of the op alone. Two peers on different versions therefore derive
**different state from identical, hash-verified ops**. The hash agrees.
Verification passes. State silently diverges, and nothing in the system can
detect it, because the hash covers the *intent* and not the *result*.

That is ADR 0021's bug — hash the output, not the input — arriving at the sync
boundary. Shipping **decomposed payloads** (facts, not intent) eliminates the
class outright: the facts *are* the payload, the hash covers the actual delta,
and `decompose` demotes from consensus-critical to a local authoring
convenience that can version freely.

Combined with Finding 1: **ship `kind` + decomposed payload.** Intent for
legibility, facts for convergence. Neither alone is sufficient.

---

## What the spike deliberately did not do

No network, no auth, no bidirectional sync, no conflict handling, no
client-side store. The peer is local, trusted and read-only — that was the
point. Everything above is evidence *toward* SPEC-v1.1, not a substitute for it.

## Open, for TRL-110

- **Client-side materialization** — the real fork (Finding 2). Ship store +
  decompose + EQL-S to peers, or keep projections server-side and accept that
  peers cannot ask novel questions?
- **Lane journals are not in the stream.** Only the integration journal is.
  A peer that wants lane ops needs them enumerated — and until TRL-102 they
  could not have been sent at all, since none of them verified.
- **Backpressure.** A cold peer replays 9,627 ops on connect. Fine locally;
  not fine over a network. Snapshot-plus-tail, or Sedimentree-style bundles
  (the `OpBundle` framing) belong in the spec.
- **`verifyOpHash` at ingest.** ADR 0021 §1 requires it at the sync boundary.
  This spike's consumer trusts the server, so it does not verify — a real peer
  must, and that criterion is still outstanding.
