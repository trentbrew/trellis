# ADR 0022: Zone-scoped capability model (read authorization + per-writer refs)

> **Terminology:** **Zone** = a spatial boundary backed by a capability grant
> (telos §VII). **`zoneId`** = an immutable, authority-bearing identifier
> (`turtle://<ownerDid>/zone/<uuid>`). **`alias`** = the mutable human name of a
> zone. **Grant** = an explicit `(principal, zoneId, level)` fact. **Principal** =
> an Agent Ed25519 `did:key` identity (device keys roll up under ADR 0020).

**Status:** Accepted
**Date:** 2026-07-15

**Impl:** Phases 0–2 in `src/identity/capability.ts`; Phase 4 (per-writer refs) in
`src/vcs/branch.ts` + `src/vcs/decompose.ts`. **Phase 3 (kernel deny-by-default)
is NOT started.**

> **Grants are ops, not store writes.** The first implementation wrote grants
> straight to `EAVStore`. That store is *derived* — rebuilt by op replay on boot
> — so those grants vanished on restart, never replicated, were not hash-covered
> and carried no provenance. Because Phase 3 is deny-by-default enforcement,
> building it on that would have meant the first reboot dropped every grant,
> `resolveCapability` returned `None` for everyone, and the repo locked itself
> out. Writes now mint `vcs:zoneDefine` / `zoneRename` / `grantSet` /
> `grantRetract` through `EngineContext`; reads still run against the
> materialized store. Regression covered by `test/p4/capability-persistence.test.ts`
> against a real engine and a real reboot — the original tests were
> store-isolated and could not have caught it.
>
> Authorization ops get their own kinds rather than riding a generic
> `vcs:storeAssert`: a grant you cannot name in the log is a grant you cannot
> audit.
**Issue:** TRL-102 (refs / lane-hash), TRL-97 (sprite relay blobstore)
**Depends on:** `src/identity/` (Ed25519 + signing middleware, ADR 0020),
`src/identity/governance.ts`
**Supersedes:** nothing

## Context

Three findings, each verified against the code, converge on one decision.

### 1. Branch heads are order-dependent registers

`vcs:branchAdvance` decomposes to an `addFacts` of a `headOpHash` and **never
deletes the prior head** (`src/vcs/decompose.ts:233`). The head is resolved
positionally (`src/vcs/branch.ts:50`):

```ts
return facts[facts.length - 1]?.v;   // branch.ts:50 — "latest wins"
```

`branch:main` accumulates one `headOpHash` per advance and resolves by store
*insertion order*, which for concurrent advances is *arrival order*. Two peers
with an identical op set — every hash verifying, set union complete — resolve
`main` to **different** values. This is the session's recurring bug: correctness
depends on something the hash does not cover (ADR 0021: payload; TRL-102: lane;
here: **order**).

### 2. The bounded-domain test is necessary but not sufficient

`criterionUpdate` is a safe register because its domain is bounded
(`pending|passed|failed`) so it can delete-all-priors (`src/vcs/decompose.ts:488`).
`headOpHash`'s domain is every hash that ever existed, so it degrades into a
position-resolved log. The `getLast()` reads in `src/vcs/issue.ts:246` use the
same `matches[matches.length - 1]` pattern and are the same latent bug under a
second writer.

**Generalization (the audit criterion):** a "latest wins" field is safe **iff**
(domain is bounded) **AND** (writes are totally ordered — single writer being
the special case). `headOpHash` fails *twice* (unbounded + multi-writer);
`status` passes *twice* (bounded + single-writer-today). A grep for
`[last]`/`[length - 1]` must therefore also check **who writes the field**, not
just its read shape.

### 3. "Room = boundary" is unnamed in the kernel

§5 of the sync spec concludes "the room is the boundary" but leaves *what a room
is* open. telos §VII already defines the spatial ontology — Lab / Workshop /
Lobby / Showroom / Classroom / Giftshop — each a zone mapped to a capability
grant. The spec is rediscovering the telos zone model at the kernel layer. The
seven names are **presets**, not kernel vocabulary.

SemType (semtype.org/spec) confirms the hygiene: a stable versioned `$id` with a
separate mutable `title`; lane-scoped draft versions (`{major}-draft.{lane}.{revision}`)
resolved by explicit precedence — i.e. per-writer refs with a convergence rule;
and an ontology/knowledge split where inherited constraints resolve via closure
(`allOf`). Our zone registry is ontology; our grant facts are knowledge.

The unifying principle across all three: **partition, don't filter.**

## Decision

### 1. Capability levels

```ts
enum CapabilityLevel {
  None = 0,    // absence of grant = default. NEVER persisted as a fact.
  Reader = 1,  // read-only within the boundary
  Member = 2,  // read + write within the boundary
  Owner = 3,   // administer grants + full access; MAY be multi-principal
}
// effective(principal, zone) = max over direct + inherited grants; absent = None
// invariant: only an Owner may add/remove grants on a zone
```

- **Ordinal comparison** for "at least level L" checks (`None < Reader < Member < Owner`).
- **`None` is never persisted.** It is the *absence* of a grant fact, which is the
  deny-by-default default. Revocation = **retract the grant fact**, not write a
  `None` grant. This keeps the membership register a clean in/out set with
  delete-then-add semantics (the safe pattern from §2). Storing `None` would create
  two representations of "no access" and break the enumerable-domain guarantee.
- **`Owner` is administrative authority**, not "the serializer." It MAY be held by
  multiple principals (co-owners). The single-writer property of a shared ref comes
  from exactly one principal holding `Owner` on that zone **plus** a causally-ordered
  journal — not from the level itself.

### 2. Zones are graph entities, referenced by immutable id

```ts
interface Zone {
  zoneId: string;          // turtle://<ownerDid>/zone/<uuid> — immutable
  alias: string;           // mutable human name ("Workshop", "Lab", …)
  defaultVisibility: CapabilityLevel; // level granted to anon
  parentZone?: string;     // opaque zoneId for nesting → grant inheritance
}
// grant fact: (principal, zoneId, level)  — explicit, deny-by-default
```

- The kernel references **only `zoneId` + the enum.** Zone *names* are a mutable
  `alias` fact. Renaming "Workshop" → "Workspace" edits the alias; the id and every
  grant stay put. This is the rename-proof guarantee — the kernel never contains the
  string "Workshop".
- **`zoneId` is authority-bearing**: `turtle://<ownerDid>/zone/<uuid>` carries the
  owner's identity (the Ed25519 principal from ADR 0020) in the identifier, so
  ownership and grants are self-describing and cross-device stable.
- **Nesting via `parentZone`** yields a capability closure (SemType `allOf`-style):
  a principal's effective level in a zone is the `max` over its direct grants plus
  grants inherited up the `parentZone` chain. Inheritance is positive-only (union/
  max) — there is no explicit-deny override, which keeps resolution precedence-free.

### 3. The seven telos zones are presets, not kernel vocabulary

| telos zone        | `defaultVisibility` | Maps to                         |
| ----------------- | ------------------- | ------------------------------- |
| Lab               | `None` (owner only) | single-writer scope             |
| Workshop          | `None` + invited    | the "room = boundary"           |
| Lobby / Showroom  | `Reader` (public)   | The Commons / Garden boundary   |
| Classroom         | `Reader` (members)  | `tx-agent` capability grant     |
| Giftshop / Market | `Reader` (public)   | transaction-gated               |

These pre-populate `defaultVisibility` + grants. The kernel understands four levels
and "who holds what on which opaque id" — nothing more.

### 4. Refs resolve under the zone model (§2a)

- **Each writer's branch head = their own per-principal zone.** No shared-mutable
  pointer exists, so the `branch.ts:50` order-dependence dissolves rather than
  needing a convergence rule. Two writers never write the same ref.
- **`integration` head = a zone owned by exactly one principal** (the room owner).
  This is the recursion bottoming out at a single writer. `vcs:branchAdvance` is
  **retained there as the audit op** (Option 3 — a genuine history of where
  `integration` has been), while personal branches leave the graph (Option 1).
  The 1,128 accumulated `headOpHash` facts stop being dead once scoped to the one
  ref where position-order is meaningful because there is one writer producing it.
- **Writer identity = Agent Ed25519 principal** (device keys roll up via ADR 0020),
  not `agentId` (self-asserted) or lane (a workspace concept).

### 5. Membership is the one safe shared-mutable register

Room membership (who currently holds the key) is unavoidably shared, mutable state.
It passes the §2 audit: the domain is `in`/`out` (bounded), so delete-then-add is
exhaustive, and it is owner-written — the same shape as `criterionUpdate`. The one
piece of shared-mutable state that cannot be namespaced away is already safe by the
test that everything else failed.

**Revocation is honestly "rotate."** Once a peer materializes a zone's ops, those
bytes stay readable offline forever (telos gift economy: immutable attribution).
Revoking removes future access by rotating the zone key; already-replicated history
stays readable. Ship no zone to a peer you would not show the whole zone to, forever.

## Consequences

**Good**

- Renaming a zone never touches the kernel or breaks grants (alias is a fact; id is
  immutable and authority-bearing).
- Branch heads converge across peers — the `branch.ts:50` divergence bug is closed.
- Deny-by-default becomes real in the kernel, not a server projection (telos Boulder 1).
- The same model unblocks Iroh sync (per-writer refs) and the UI DSL `tx-agent`
  capability boundary (room = file).
- The audit criterion (bounded domain **and** total write-order) is now a grep
  against every op handler.

**Costs / risks**

- **`alias` is an unbounded-domain register and fails the §2 audit's second half.**
  `decompose` is pure and cannot read the store, so `vcs:zoneRename` carries the
  prior alias on the op in order to delete it. Exact for sequential renames;
  two co-owners renaming concurrently can leave two `alias` facts, which
  `getZone`'s `find()` then resolves by insertion order. Grants avoid this
  because their domain *is* bounded — `decompose` enumerates and deletes every
  prior level. Same shape as `headOpHash`, one field over.
- **Authority is checked at mint, not at ingest.** `assertOwner` stops an honest
  caller; a peer that mints a `vcs:grantSet` directly is not stopped by anything
  yet. That is Phase 3, and until it lands the model is advisory against a
  hostile peer.
- `writerPrincipal` falls back to the self-asserted `agentId` for unsigned ops,
  which contradicts §4's "not `agentId`". Spoofable until ADR 0020 signing is
  enforced at ingest.
- `vcs:branchAdvance` semantics change for personal branches (leave the graph); only
  `integration` keeps it as an audit op.
- Encryption-at-rest per zone key (AES-256-GCM / argon2id) is a follow-on ADR — this
  ADR defines the *boundary* the key will lock, not the crypto.
- `Owner` being multi-principal means a shared `integration` owner set must still
  serialize writes via the causally-ordered journal; the single-writer guarantee is
  per-zone-config, not automatic.

**If we don't**

- The order-dependence bug ships to multi-peer Iroh sync and diverges `main` faster.
- The UI DSL binds `use:query`/`tx-agent` to a boundary the wire does not enforce.
- A future rename of a zone name forces a kernel refactor.

## Acceptance criteria

1. `CapabilityLevel` enum with ordinal; `None` is never persisted — revocation
   retracts the grant fact (test).
2. A zone is referenced by immutable `zoneId`; renaming `alias` leaves the id and all
   grants intact (test).
3. `resolveCapability(principal, zoneId)` computes the `parentZone` closure; absent =
   `None` (deny-by-default), verified by test.
4. Only an `Owner` may add/remove grants on a zone (invariant enforced + tested).
5. Two peers with an identical op set resolve the same branch head (the
   `branch.ts:50` bug closed — test).
6. `integration` head is owned by a single principal; `vcs:branchAdvance` is retained
   there as an audit trail.

## References

- `docs/planning/spec-v1.1-refs-and-authz.md` (§2a, §5)
- `docs/specs/spec-v1.1-graph-op-sync.md` (§2a open, §5 deferred)
- `docs/planning/trellis-ui-dsl.md` (§5 "room = file", `tx-agent`)
- `turtleos/telos.md` §VII (the ontology), Boulder 1 (kernel hardening)
- ADR 0020 (Ed25519 identity / device signing)
- ADR 0021 (canonical op hashing — "the hash doesn't cover X")
- semtype.org/spec (stable `$id` + mutable `title`; lane-scoped drafts; `allOf` closure)
- `src/vcs/branch.ts:50`, `src/vcs/decompose.ts:233,488`, `src/vcs/issue.ts:246`,
  `src/identity/governance.ts`
