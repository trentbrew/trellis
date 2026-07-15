# SPEC-v1.1 — Graph Op Sync Protocol

**Status:** Proposed — decisions §1–§4 are ratifiable now; §5 needs your call.
**Date:** 2026-07-15
**Issue:** TRL-110 · **Blocks:** TRL-111 (Iroh) · **Informed by:** TRL-108 (spike)
**Related:** ADR 0021 (canonical op hashing + provenance), ADR 0017 (blob tiers),
ADR 0020 (identity / device pairing), `docs/planning/trellis-ui-dsl.md` §5, §11.0

> The locked rule is that SPEC-v1.1 precedes Iroh adapter work, and ROADMAP
> Milestone 4 precedes Milestone 5. This is Milestone 4.
>
> **Transport-independent by construction.** Trellis owns semantics; Iroh moves
> bytes. No transport type appears below.

---

## What this settles, and why it kept not getting settled

One question has surfaced six times this year, each time looking like an
unrelated bug:

| Symptom | Actually |
|---|---|
| `vcs`/`signature` handling in all three kernel backends was dead code | `VcsOp`s never reach `KernelBackend` |
| Kernel provenance couldn't cover the CLI (ADR 0021 Phase B) | CLI graph writes mint `VcsOp`s |
| `VcsMiddleware` silently did nothing; deleted | Written against a contract the kernel never had |
| Lane ops failed verification 1334/1334 (TRL-102) | Could never have crossed an ingest boundary |
| The dashboard fabricated ops by diffing counters (TRL-108) | The stream carried state, not ops |
| `tx-query` reads the same whether local or remote (ui-dsl §11.1) | It presupposes the answer below |

Six symptoms, one cause: **Trellis has two op logs and has never said which one
peers exchange.** This spec says.

---

## §1 — Peers materialize. DECIDED.

**A peer applies ops to its own store and queries locally. It does not receive
server-derived projections.**

Three reasons, in order of weight:

1. **Iroh peers must.** There is no server to ask. The alternative is two
   divergent paths for one job — which is exactly how the two-log split arose.
2. **"Local-first" is falsifiable here.** A peer that can only answer questions
   the server anticipated is a thin client with good branding. The test is
   whether a peer can ask something novel, offline. Projections fail it by
   construction.
3. **The infrastructure already exists, unwired.** `SqlJsKernelBackend`
   ("Pure-WASM SQLite … browser"), `IdbOpLog` ("Browser-side companion to
   `JsonOpLog`"), and `src/core/query` has no node-only imports. Nobody builds an
   IndexedDB op log for a thin client.

**The falsifier was measured and failed.** A full browser peer — `EAVStore` +
`QueryEngine` + `IdbOpLog` + `verifyVcsOpHash` — is **4 KB gzipped** (12 KB raw).
The 644 KB `sql.js` WASM is **not required**: `trellis-kernel.ts:100` is
`this.store = new EAVStore()`, an in-memory structure. Backends persist *ops*,
not the store. A browser peer materializes into memory and persists ops via
IndexedDB. No WASM on the peer path at all.

There is no remaining argument for projections.

## §2 — The wire carries one op type: `kind` + decomposed payload. PROPOSED.

`decompose()` maps **34 of 41** declared `VcsOpKind`s onto
`{addFacts, addLinks, deleteFacts, deleteLinks}` — precisely `KernelOp`'s
payload. `VcsOp` is a typed DSL whose target language is `KernelOp`;
`decompose.ts` is its compiler.

The seven unmapped kinds do not weaken that, but they must be stated rather than
rounded away:

| Kind | Mint sites | Status |
|---|---|---|
| `dirAdd`, `dirDelete` | 0 | Tier 1, declared, never implemented |
| `symbolRename`, `symbolMove`, `symbolExtract`, `signatureChange` | 0 | Tier 2, explicitly "future" |
| `merge` | 1 | **Live, and acts on refs — see §2a** |

Six are vocabulary that was declared and never built; they decompose to nothing
because nothing mints them. `vcs:merge` is the real exception, and it points at a
genuine gap in the model (§2a).

**For every kind that is actually minted and touches the graph, `VcsOp` carries
no semantics `KernelOp` cannot express.**

Two constraints pull in opposite directions, and both are real:

**(a) The payload must be decomposed, because `decompose()` is pure.**
If the wire carries authoring intent (`vcs`) and each peer decomposes locally —
which §1 requires them to do — then `decompose` becomes **distributed consensus
code**. Two peers on different versions derive *different state* from
*identical, hash-verified ops*. The hash agrees. Verification passes. State
diverges silently, and nothing can detect it, because the hash covers the
**intent** rather than the **result**. That is ADR 0021's bug — *hash the output,
not the input* — arriving at the sync boundary.

**(b) `kind` must survive, because intent is what makes a peer legible.**
TRL-108 found this concretely: the Logs tab wants `vcs:issueClose`, not "three
facts changed". Discard `kind` and the client re-infers it — the same
reverse-engineering that spike deleted, one level down. Semantic diff and
decision traces need it too.

**Therefore the wire op is:**

```ts
interface WireOp {
  hash: string;          // over the canonical preimage below
  v: 2;                  // preimage version (ADR 0021)
  kind: string;          // the 33-kind vocabulary — legibility
  timestamp: string;
  agentId: string;
  previousHash: string | null;
  facts: Fact[];         // the decomposed state delta — the RESULT
  links: Link[];
  deleteFacts: Fact[];
  deleteLinks: Link[];
  provenance: OpProvenance | null;   // ADR 0021 §2
}
```

This **is** `KernelOp` with a widened `kind`. The collapse is not a rewrite; it
is recognising that one of the two types was always the other one wearing a
vocabulary.

**Consequences, stated honestly:**

- The peer **never runs `decompose`**. It applies facts. `decompose` demotes from
  consensus-critical to a local *authoring* convenience that can version freely.
- The store becomes a **pure function of the ops received** — convergence by
  construction, not by two peers' `decompose` agreeing.
- The hash covers the **actual state delta**, so verifying an op means the facts
  are trustworthy. Under (a)-violating designs you would have to decompose in
  order to check that shipped facts matched the op — circular.
- **`vcs` (authoring intent) does not go on the wire.** It is local to the
  minting peer. `kind` carries what a remote reader needs.
- ADR 0021 **already built this preimage** — the v2 canonical shape is exactly
  `{v, kind, timestamp, agentId, previousHash, facts, links, deleteFacts,
  deleteLinks, provenance}`. This spec adopts it rather than inventing one.

**Migration cost — the real one.** Existing `VcsOp` hashes are computed over
`{kind, timestamp, agentId, previousHash, vcs}`. Under this spec an op's identity
is its *result*, not its *intent*, so **existing VcsOp hashes do not carry over**.
Grandfather them exactly as ADR 0021 grandfathers v1 kernel ops: v1 ops are
opaque history, never reverified, and newly minted ops are v2. Every log keeps a
permanent v1 prefix. That is the cost of having hashed intent for a year.

## §2a — Not all state is in the graph: refs. NEEDS A DECISION.

Found while checking §2's own claims. **An earlier revision of this section said
branch heads are side files. That was wrong** — see
`docs/planning/spec-v1.1-refs-and-authz.md` for the full map.

`vcs:branchAdvance` *does* decompose to a fact:

```ts
result.addFacts.push({ e: `branch:${name}`, a: 'headOpHash', v: targetOpHash });
```

Branch heads are in the graph. `state.json` holds only `currentBranch` — a name,
not a hash — which is local checkout state and correctly local. Lane heads *are*
files (`lanes/<id>/meta.json`), so the two disagree, but that is the smaller
problem.

**The real problem is that refs are order-dependent registers.**
`branchAdvance` only *adds*; it never deletes the prior head. `branch:main` has
accumulated **1,128 `headOpHash` facts** in this repo, and the head is resolved
positionally — `branch.ts:42` returns `facts[facts.length - 1]`. Insertion order
decides, and for concurrent advances insertion order is *arrival* order.

So two peers, holding an identical op set in which every hash verifies, **resolve
`main` to different values depending on the order ops arrived.** Set union is
complete and they still disagree.

`criterionUpdate` gets this right by deleting all priors before adding — but only
because its domain is bounded (`pending|passed|failed`). `headOpHash`'s domain is
every hash that has ever existed, so the priors cannot be enumerated, and the
register degrades to an append log read by position.

This generalizes: **any unbounded-domain "latest wins" field is order-dependent**,
and `getLast()` in `issue.ts` uses the same pattern. Single-writer today; it bites
when there are peers.

`vcs:merge` — the one live kind `decompose` does not map — is a symptom of the
same thing: its effect is on a pointer, not on the graph.

**This is Git's shape, and Git already solved it:** *negotiate refs, transfer
objects*. The wire conversation is about branches ("I want `refs/heads/main`, I
have `abc`"); the payload is content-addressed, immutable, branch-agnostic
objects. Two channels, because the two things have different mutability and
different lifetimes. Conflating them means either every ref update is an
append-only op (churn for a pointer) or every op carries a mutable label
(identity instability — precisely the bug TRL-102 fixed).

**Options:**

1. **Refs as a second, mutable channel** (Git's answer, recommended). A small
   `name → tip hash` map, synced separately, last-write-wins or explicitly
   negotiated. Ops stay immutable and identity-stable.
2. **Refs as derived state.** A lane's head is the last op in its journal;
   `main`'s head is reachability from a known root. Requires no channel at all,
   but makes "which branch am I on" a query rather than a fact, and it cannot
   express an *intentional* rollback (a ref moving backwards).
3. **Refs as ops.** `vcs:branchAdvance` already exists and *does* decompose. This
   is the current de-facto answer for branches and it works — but it means the
   log accumulates a permanent op per pointer move, and it is not how lane heads
   are stored today (`meta.json`), so the two disagree.

The system currently does **3 for branches and 1-without-a-channel for lanes**,
which is why they disagree. Pick one.

**Recommendation: refs are per-writer and namespaced, never shared-mutable.**
Git never converges `main` for you — it gives you `main` and `origin/main` and
makes the merge explicit. Refs are per-peer; convergence is a decision, not a
protocol guarantee. **Trellis already has this and calls it lanes**: a lane *is*
a per-writer ref, and `promote` *is* the explicit merge. The model is already
right; only the storage disagrees with itself.

If no two writers ever write the same ref, no convergence rule is needed — which
dissolves the order-dependence above rather than papering over it.

**Until this is decided, peers cannot agree on anything ref-shaped**, and no
amount of materialization fixes it, because the disagreement is in the resolution
rule rather than in the data.

## §3 — Envelope vs payload. DECIDED (TRL-102 set the principle).

- **Payload** = identity-bearing ⇒ **hashed**.
- **Envelope** = ambient context ⇒ **not hashed**, and must never be assumed to be.

Established: `laneId` is envelope — the same semantic op minted in two lanes must
hash identically, or cross-peer dedup is lost and cherry-picking rewrites op
identity, which set-reconciliation depends on. `facts`/`links` at the top level
of `VcsOp` are envelope too: `RemoteManager` tags pulled ops with
`{e:'op', a:'remote'}` so `trellis log --remote` can filter *without*
invalidating the origin peer's hash — annotate a peer's op, don't corrupt it.

**Rule for this spec:** a receiving peer MUST NOT trust envelope fields for
convergence. They are local annotation. Only the hashed payload determines state.

## §4 — Ingest. PROPOSED (generalizes existing code).

`engine.integrateOps()` already implements this for `VcsOp`s. The spec
generalizes it rather than inventing:

1. **Idempotent** — known hash ⇒ skip. (`known.has(op.hash)`)
2. **Kind-validated** — unknown kind ⇒ reject `invalid-kind`.
3. **Hash-verified** — `verifyOpHash(op)` fails ⇒ reject `hash-mismatch`.
   **Non-negotiable, and currently unmet on the kernel path**: ADR 0021 §1
   requires `verifyOpHash` at the sync boundary; it is exported and never called,
   because no kernel-op ingest boundary exists. This is that boundary.
4. **Batch-deduped** — repeated hash within one batch ⇒ skip.
5. **Causally ordered** — `previousHash` unknown ⇒ defer, retry to a fixed point,
   so out-of-order arrival converges without requiring ordered delivery.
6. **Apply failure is a rejection, not a crash** — reject `apply-failed`.

An op that fails any check is **rejected at the boundary, not stored**. Rejections
are typed and reported; a peer is never silently partially-applied.

Note the asymmetry this closes: the VCS log has always had real ingest
(`verifyVcsOpHash` is called at `engine.ts` and `sync/room-core.ts:301`). The
kernel never did. That is why `SyncProvider` — the `KernelOp`-shaped seam the
docs promise Iroh will use — has exactly one implementation, a stub.

## §5 — Read authorization. NEEDS YOUR CALL.

**§1 forces this.** A peer that materializes holds **every fact you shipped it**.
Per-fact read filtering is therefore client-side theatre — the same argument that
rules out lane-scoped sync as a boundary: *once the bytes land, the filter is
cosmetic.*

So:

> **The replication unit is the authorization unit.**

"What may this peer see" must be decidable at the replication boundary, and that
boundary must be **real** (its own key) rather than a `where` clause. A lane is
either a real boundary — in which case it needs a key and it *is* a room — or it
is a naming convenience, and lane-scoped sync is `rule Read` all over again: a UI
affordance cosplaying as security.

**Recommendation: the room is the boundary.** It is the only construct that
already carries tenancy, and ADR 0020 already establishes device identity and
key material to build on.

**Explicitly deferred, with the exposure named:** the *mechanism* — room keys,
membership grant/revoke, and whether revocation is even meaningful once a peer
has materialized (it has the bytes; you cannot un-ship them). That is
`ui-dsl.md` §5's "hard problem the essay skips" and deserves its own ADR.

**The exposure until then:** any peer granted a room's op stream can read
everything in that room, permanently, including after revocation. Ship no room
to a peer you would not show the whole room to. This is not a gap this spec
creates — materialization makes it *visible* rather than pretend.

---

## Deferred

- **Backpressure.** A cold peer replays 9,627 ops today. Fine locally, not over a
  network. Snapshot-plus-tail, or the `OpBundle` framing (many ops chunked,
  compressed and addressed as a unit — its own identity, its own hash). Note this
  is the one place a *second* type is legitimate: one op type, one frame type.
- **Bidirectional sync and conflict semantics.** TRL-108's peer was read-only.
  Merge is set union over a causal op log — but "CRDT" stays unclaimed until the
  graph conflict-semantics work exists.
- **Blob transfer.** ADR 0017's peer tier, gated on the independent BLAKE3 vs
  SHA-256 decision (`BlobStore` is SHA-256 at `blob-store.ts:117`; `iroh-blobs`
  is BLAKE3). Resolvable today, and it does not block this spec.
- **Lane journals on the wire.** The TRL-108 stream carries the integration
  journal only. Until TRL-102 lane ops could not have been sent at all.

## Acceptance

- **§1 (materialize)** — decided; the falsifier was measured at 4 KB and failed.
- **§2 (wire = `kind` + decomposed payload)** — ratifiable. Follows from §1 plus
  `decompose`'s purity. Carries a real migration cost: existing `VcsOp` hashes do
  not survive, because identity moves from intent to result.
- **§2a (refs)** — **open, and the most consequential gap here.** Ops alone
  cannot convey ref state; a peer replaying every op still does not know what
  `main` points at. Recommend option 1 (refs as a second mutable channel, Git's
  answer). **Needs your call.**
- **§3 (envelope/payload)** — decided by TRL-102.
- **§4 (ingest)** — ratifiable; generalizes `integrateOps`, which already works.
  Closes ADR 0021 §1's outstanding `verifyOpHash`-at-the-boundary criterion.
- **§5 (read authorization)** — recommendation stands (room is the boundary);
  mechanism deferred with the exposure named. **Needs your call**, and an ADR
  before `rule Read` is real.

Two of six need you. The rest follow from §1 or from code that already exists.

Nothing here mentions Iroh. That is the test of whether it is a protocol.
