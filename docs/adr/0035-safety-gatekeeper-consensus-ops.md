# ADR 0035: Safety gatekeeper + preconditions for validated op acceptance

> **Scope.** This ADR covers **TRL-334** (spec): deterministic, validated
> acceptance of graph mutations at the persistence boundary. It does **not**
> cover TRL-333's transport work (graph-snapshot export/import, entity-delta
> compute/apply) — that remains ADR 0027 implementation and is tracked by
> TRL-333's task list. The two issues share a title but are separate decisions.

**Status:** Proposed
**Date:** 2026-08-01
**Related:** [0003](./0003-workspace-conflict-taxonomy.md) (conflict taxonomy),
[0008](./0008-store-op-decomposition.md) (op decomposition),
[0021](./0021-canonical-op-hashing-and-provenance.md) (canonical hashing),
[0022](./0022-zone-capability-model.md) (zone capability),
[0027](./0027-realtime-full-state-sync.md) (realtime full-state sync),
TRL-333 (proposal), TRL-334 (spec)

**Impacted components:** `src/vcs/op-log.ts`, `src/vcs/types.ts`,
`src/vcs/ops.ts`, `src/core/ontology/validator.ts`,
`src/identity/signing-middleware.ts`, `src/sync/room-core.ts`,
`src/sync/sync-engine.ts`, `src/vcs/sync-policy.ts` (quarantine store)

## Terminology mapping

The earlier sketch introduced new vocabulary for things the codebase already
names. Canonical terms are used throughout this ADR:

| Sketch term            | Canonical term                                                            |
| ---------------------- | ------------------------------------------------------------------------- |
| Atomic Scope Operation | **Transactional batch commit** — N `VcsOp`s appended atomically (§2)       |
| ConsensusOperation    | **`VcsOp` with `vcs.preconditions`** — a `VcsOp` whose `vcs` payload carries declarative preconditions (hash-covered) + the existing Ed25519 `signature` (§3) |
| SafetyGatekeeper       | **Safety gatekeeper** — deterministic semantic validation at the persistence boundary (§4) |
| Consensus Rule Set     | **Conflict resolution policy** — policy rules scoped to EAV ops, unresolvable → quarantine (§6) |
| Right-to-read context  | **Capability precondition** — delegated to the ADR 0022 capability model, not a new mechanism (§3) |

## Context

### The current model is validated nowhere near the persistence boundary

Validation today exists in three fragments, and none of them runs where the
op-log is written:

1. **Schema validation** — `createValidationMiddleware`
   (`src/core/ontology/validator.ts:303`) validates facts/links against the
   ontology, but only on the kernel `addFacts`/`addLinks` store-call path. The
   engine's real graph-write path (`engine.ts` → `decompose()` → `OpLog.append`,
   ADR 0008) bypasses it.
2. **Integrity verification** — `verifyVcsOpHash` runs on *remote* ops
   (`src/sync/room-core.ts:308`) and `verifyOp`/`verifyOpBatch`
   (`src/identity/signing-middleware.ts`) verify signatures when present. This
   proves *authenticity*, not *validity*: a well-formed, correctly signed op
   that references a non-existent entity passes.
3. **Whole-store invariants** — `validateStore` (`validator.ts`) exists but is
   a diagnostic, not a gate; nothing runs it incrementally before accept.

Consequence: `JsonOpLog.append()` (`src/vcs/op-log.ts:118`) accepts **any**
`VcsOp`, local or remote. A peer can push an op that relates two non-existent
nodes; the local engine stores it, and reconciliation then makes the corruption
contagious — every peer converges *to* the invalid state. The merge/CRDT layer
assumes the data it merges is sound; that assumption is today unenforced.

### What the codebase already gives us

- **Signed ops** — `signOp`/`verifyOp` with Ed25519 (ADR 0020/0021), already
  wired at the sync boundary. "Sign to prove intent" is not a new decision.
- **Hash-covered payload fields** — ADR 0021 §5 established the pattern: a
  field placed *inside* `vcs` is covered by the op hash with **no preimage
  change and no migration** (absent key is omitted by canonical
  `JSON.stringify`). Preconditions can land the same way provenance did.
- **Quarantine** — `QuarantineStore` (`src/vcs/sync-policy.ts:208`) already
  holds suspicious changes for manual review (ADR 0027). It is the natural
  landing spot for remote-apply validation failures.

### The distributed semantics problem

"Validate against current local state" at commit time is insufficient: two
nodes with concurrent writes can both pass the check locally and disagree
about validity when they converge. That disagreement is where consistency
breaks. The ADR's answer must be **apply-position validation**: an op is
validated against the state produced by its causal ancestors, in op order.
Acceptance then depends only on the causal prefix, so every replica with the
same prefix accepts identically. "Consensus" here means **validated
convergence**, not a global total order — no ordering authority is introduced
(ordering authority is deferred, §8).

## Decision

### 1. The persistence unit stays `VcsOp`; atomicity is a commit-time concern

No new op kind, no migration of the unit. A logical transaction ("create node
A, add relationship R from A to B") already decomposes into multiple store ops
(ADR 0008). What is missing is **all-or-nothing landing**.

- `OpLog` gains `appendBatch(ops: VcsOp[]): void` alongside `append()`.
- **Implementation:** stage the N lines in `<journal>.staging`, then a single
  atomic `rename` over the journal, followed by per-line `mirrorOpLine` and the
  existing `.bak` ring. `rename` is atomic on POSIX and the batch is a strict
  superset of the current file, so the peer-process "adopt the longer disk
  journal" logic in `append()` (op-log.ts:127-135) keeps working unchanged.
- **Rejected:** a transaction-envelope op carrying sub-ops inline. It would
  break op-level reconciliation — peers dedupe by op hash, and sub-ops would
  need re-extraction and re-chaining on every apply.
- Durability story is unchanged: batch commits ride the same
  mirror/`.bak`/remote-repair safety net as single appends.

### 2. Preconditions ride inside `vcs`, hash-covered, grandfathered

`VcsOp['vcs']` gains an optional field:

```ts
interface Precondition {
  kind:
    | 'entityExists'   // ref target exists at apply position
    | 'idUnique'       // explicit id not already present
    | 'fieldEquals'    // { entity, attr, value } — CAS-style compare
    | 'refIntegrity'   // no dangling links (src/target exist)
    | 'capability';    // ADR 0022 read/write scope — deferred integration
  target: string;      // entity id, or e1→attr for fieldEquals
  value?: unknown;     // fieldEquals expectation / capability level
}

// inside VcsOp['vcs']:
preconditions?: Precondition[];
```

- **Hash-covered by construction** — same trick as ADR 0021 §5: the field
  lives inside `vcs`, which `hashVcsOp` hashes wholesale. No preimage change.
- **Legacy ops are grandfathered** — absent `preconditions` = pass. This is
  the ADR 0021 v1 ratchet again: the sooner gatekeeping lands, the smaller the
  permanently unvalidated prefix of every log. Nothing retroactively verifies
  old ops.
- **Deterministic evaluation only.** A precondition refers to `target` and
  `value` — never to wall-clock time, never to environment, never to
  "head". Evaluated against the state at the op's causal position (§4).

### 3. Safety gatekeeper — three ordered checks at two chokepoints

New module `src/vcs/safety-gatekeeper.ts`:

```ts
class SafetyGatekeeperService {
  constructor(
    registry: OntologyRegistry,        // schema checks
    invariants: GraphInvariantSet,     // §4 catalog
    resolveState: (op: VcsOp) => ApplyState,  // causal-position state
    resolver?: IdentityResolver,       // signatures, when present
  ) {}
  async verify(op: VcsOp, origin: 'local' | 'remote'): Promise<GateResult>;
}
```

Checks, in fixed order — **any failure stops the chain**:

1. **Precondition validation** (§2) — evaluate each declared precondition
   against the apply-position state.
2. **Schema validation** — reuse the existing ontology validation logic
   (`validator.ts` `createValidationMiddleware` semantics), invoked
   incrementally per op rather than per store-call.
3. **Graph invariant check** — a documented, fixed catalog (initial set:
   no dangling entity references; explicit-id uniqueness; type facts on
   typed entities; link source/target types per relation def). Invariants are
   **appendix-grade fixed** — adding an invariant later is an ADR change, so
   peers cannot disagree about the rule set.

The gatekeeper runs at **both persistence chokepoints**:

- **Local mint → append:** `engine` calls `gatekeeper.verify(op, 'local')`
  before `opLog.append()` / `appendBatch()`. Failure → the write is rejected
  and the caller gets the failing check + reason. **Rejected:** putting the
  hook inside `JsonOpLog` — the log is a dumb, lock-guarded append-only store
  shared across processes; validation context (registry, state) is
  engine-owned, and a multi-process journal must not hold schema knowledge.
- **Remote apply:** `room-core.ts` `handleOps` (room-core.ts:256) already does
  `verifyVcsOpHash` (room-core.ts:308); the gatekeeper runs immediately after
  — same order as local, plus signature requirement (§5). Failure →
  **quarantine, not reject** (§6).

### 4. Apply-position state is the only valid evaluation context

`resolveState(op)` = the state produced by applying `op`'s causal ancestors in
hash-chain order (`previousHash` chain). Concretely:

- All checks are a pure function of (op, causal prefix). Same prefix in, same
  verdict out — on every replica, every time.
- This is what makes re-validation on remote apply sound: the remote peer
  evaluates at the same causal position the minting peer did, *before* any
  concurrent-op interleaving.
- Consequence for the op-log: ops are already content-addressed and
  chain-linked (ADR 0021), so the prefix is always reconstructible. Lane
  journals and the integration journal both support this unchanged.

### 5. Remote-origin ops require a verifiable signature

- Local mints may stay unsigned (local trust); **remote ops without a
  `signature`/`signedBy` resolvable through the `IdentityResolver` are
  rejected** at the gate (gate check 0, "authenticity"). This makes
  non-repudiation real at the sync boundary without forcing signing on every
  local write.
- Reuses `verifyOpBatch` (`signing-middleware.ts`) — no new crypto.
- **The resolver's trust anchor is the local peer graph.** Identity in Trellis
  is socially witnessed: a `{peer}` handle resolves through `~/.trellis/peers.json`
  and only references people you know (network-scoped handles —
  `docs/specs/peer-system-specification.md`, TRL-371+). The gatekeeper's
  authenticity verdict is therefore only as strong as the resolver's peer
  entries: an unknown `signedBy` identity is unverifiable by construction and
  fails the gate — no global directory exists to appeal to. `AUTHORITY_OVERRIDE`
  conflict resolution (§6) inherits the same property: authority is
  peer-scoped trust, never a global authority.
- **The gate fails closed on peer misregistration.** A wrong or stale peer
  entry (the Lauren you registered is not the Lauren who signed) resolves to
  the wrong key → signature fails → quarantine. Misregistration is safe-by-
  failure, mirroring the peer system's "cannot target unknown peers"
  property — it never silently accepts.
- **Revocation must reach the resolver.** Peer key revocation (peer system
  TRL-385) must be consultable at the authenticity gate: a `signedBy` identity
  whose key is revoked fails the gate. Multi-stage attestation (TRL-383) is a
  future *strengthening* of this check (attestation chains verified at
  resolution time), not a requirement of this ADR's gate.

### 6. Conflict resolution evolution — policy on EAV ops, quarantine on failure

- When an incoming op's gate verdict *differs from the sender's* (they
  accepted at a different causal position, or preconditions failed under their
  ordering), **no programmatic merge of raw data is attempted**. The
  conflicting pair is reported to the **conflict resolution policy**:
  - `LATEST_WRITE_WINS` — by op timestamp (already signed/covered);
  - `AUTHORITY_OVERRIDE` — peer-scoped trust first (witnessed identities,
    TRL-371+), with ADR 0022 zone capability as the structured form of that
    trust once capability preconditions land (deferred, §8);
  - default → **unresolvable**: the incoming op is **quarantined** via
    `QuarantineStore` with a decision code and reason; the local log is
    untouched. Human review via the existing `realtime-sync quarantine`
    CLI.
- **File-level three-way merge (`src/vcs/merge.ts`) is unchanged.** It serves
  branch/promote workflows on file content; LWW would be a regression there.
  Policy resolution applies to EAV graph ops only. Conflict *taxonomy* stays
  ADR 0003; this ADR adds the policy response to it.

### 7. Layer separation: SyncPolicy vs gatekeeper

- `src/vcs/sync-policy.ts` (ADR 0027) is the **environment risk policy** — it
  gates at the daemon/network boundary, is environment-dependent
  (`TRELLIS_SYNC_ENV`), and block/quarantines by message risk class.
- The **safety gatekeeper is the semantic validity policy** — deterministic,
  environment-independent, at the persistence boundary.
- They compose in series: transport risk → gatekeeper validity → log. Neither
  subsumes the other; the ADR documents both sides of the boundary so they do
  not drift.

### 8. Explicitly deferred

- **Ordering authority / total order** across peers. This ADR's consensus is
  validated convergence per causal prefix. If a sync server ever becomes an
  ordering authority, that is a separate ADR with a new message type — not a
  change to gatekeeper semantics.
- **Capability preconditions** (ADR 0022 integration) — the `capability` kind
  is declared in the schema but its evaluator is wired later; remote enforcement
  requires zone data to be resolvable at apply position.
- **Peer-system hardening of the authenticity gate** — attestation chains,
  trust levels, and key revocation (peer system TRL-383/384/385) strengthen
  §5's resolver without changing the gate's semantics: the gate only needs
  "resolve `signedBy` → keys, fail if unknown or revoked". Landing before
  those TRLs ships is fine; the resolver interface just grows.
- **Retroactive validation** of the legacy unvalidated prefix — explicitly not
  attempted (matching ADR 0021's v1 policy).

## Implementation tasks

1. **Precondition schema + evaluator** — `src/core/ontology/preconditions.ts`:
   types (§2), deterministic evaluator, and a registry of *known* kinds with a
   hard failure on unknown kinds (so schema drift cannot silently weaken
   checks). Tests for each kind incl. apply-position semantics.
2. **Graph invariant catalog** — `src/core/ontology/invariants.ts`: fixed
   `GraphInvariantSet` (dangling refs, id uniqueness, type facts, relation
   source/target typing), reusing `validator.ts` primitives where they exist.
3. **Gatekeeper service** — `src/vcs/safety-gatekeeper.ts`:
   `verify(op, origin)` running precondition → schema → invariant in order;
   `GateResult` with check name + reason; signature gate for remote ops via
   `verifyOpBatch` against the composed `peerKeyResolver` (ADR 0036 — local
   identity ∪ peer graph, revoked keys filtered).
4. **Batch commit** — `OpLog.appendBatch()` + staging/rename path in
   `src/vcs/op-log.ts`; mirror + `.bak` coverage; `IdbOpLog` equivalent
   (batched `flush`).
5. **Local chokepoint** — engine write path: call `verify(op,'local')` before
   `append`/`appendBatch`; map failures to caller-visible errors (status 422 +
   reason).
6. **Remote chokepoint** — `src/sync/room-core.ts` `handleOps` (after
   `verifyVcsOpHash` at room-core.ts:308) and `src/sync/sync-engine.ts`
   `handleOps`: gate → quarantine → ack/nack with decision code.
7. **Quarantine wiring** — decision codes for gate failures
   (`precondition-failed` / `schema-failed` / `invariant-failed` /
   `signature-missing` / `unresolvable-conflict`) surfaced in
   `QuarantineStore` entries and `realtime-sync quarantine list`.
8. **Provenance-style mint-site coverage** — every op *minting* preconditions
   (CLI entity/fact/link commands, MCP graph tools, SDK) declares them; absent
   preconditions stay legal for legacy compatibility (grandfathering).
9. **Tests** — gatekeeper unit tests (each check, order, determinism under
   concurrent forks); op-log batch atomicity (crash-window + adoption);
   remote-apply quarantine round-trip; sync e2e: invalid peer op does not
   contaminate a peer's log.

## Consequences

**Good**

- The op-log becomes a *validated* log: anything in it satisfies the
  invariant catalog by construction. Reconciliation converges to valid states
  instead of invalid ones.
- Preconditions and signatures are hash-covered and grandfather cleanly
  (ADR 0021 pattern) — no log migration, no preimage break.
- Conflict handling is explicit and auditable (quarantine + decision code)
  instead of silent merge outcomes.
- File-level merge workflows (branch/promote) are untouched.

**Costs / risks**

- **Every log acquires a permanent unvalidated prefix** (ops minted before
  this lands). Same trade as ADR 0021; grows daily until it lands.
- Gatekeeper adds a synchronous validation hop on the hot write path;
  invariant checks must be incremental (per-op), not `validateStore`-style
  full scans, or the engine's sync-read hot path regresses.
- Requiring signatures on remote ops tightens the sync boundary — unsigned
  legacy peer ops will quarantine until re-minted.
- Two rule sets (SyncPolicy risk + gatekeeper validity) must stay coherent;
  §7 documents the boundary.

**If we don't**

- Remote ops keep entering logs unvalidated; a single invalid peer op is
  contagious via reconciliation.
- Preconditions, added later, either sit outside the hash (forgeable) or
  force a second preimage break — the ADR 0021 cost, re-paid.

## Acceptance criteria

1. `verify(op, 'local')` on a store-op referencing a non-existent entity fails
   with `invariant-failed` (dangling ref) before anything is appended.
2. An op whose preconditions hold at its causal position but fail at a peer's
   head (concurrent interleave) quarantines on the peer with
   `unresolvable-conflict`, never merges, and never reaches the peer's log.
3. Two replicas with identical causal prefixes return identical gate verdicts
   for the same op (determinism property test).
4. `appendBatch([...])` is all-or-nothing: a kill during staging leaves the
   journal byte-identical to its pre-batch state; mirror + `.bak` recover it.
5. A remote op without a resolvable signature is rejected
   (`signature-missing`); a signed remote op passes the authenticity gate and
   proceeds to semantic checks.
6. Every op minted with `preconditions` verifies (`verifyVcsOpHash === true`)
   — preconditions are inside the hash preimage.
7. Ops minted before this change (no `preconditions`) verify and apply
   unchanged (grandfathering).
8. `merge.ts` three-way file merge behavior is unchanged (existing merge test
   suite green).
9. Unknown `Precondition.kind` hard-fails (schema drift cannot weaken the
   gate).
