# ADR 0064: Issue identity vs display number — ids stored, names computed

**Status:** Proposed
**Date:** 2026-10-29
**Issues:** KRN-507 (collision guard), KRN-508 (two-peer renumber, the interim this ADR bounds)
**Related:** [0022](./0022-zone-capability-model.md) (`zoneId` immutable vs `alias` mutable — the same split, already accepted for zones), [0060](./0060-iroh-peer-transport.md) (peer pull that surfaced the problem), `docs/spec/JOURNAL-FORMAT.md` §6 (v2 `parents[]` envelope), os-sandbox ADR-0013 (derived references — ids stored, names computed)

## Context

An issue's display number is its identity. `createIssue` mints `TRL-N` from a machine-local counter, the store keys the entity as `issue:TRL-N`, and every later op names the issue by that string: `criterionAdd`, `issueUpdate`, `issueClose`, `issueBlock.blockedByIssueId`, `parentIssueId`, and criterion entity ids (`criterion:TRL-N:ac-k`).

Two writers that allocate offline mint the same `TRL-N` for different issues. The 2026-10-29 two-machine dogfood (Mac + ThinkPad over `trellis wire`) reproduced it: both minted `TRL-247`. KRN-507 made that safe — `integrateOps` rejects the foreign create (`issue-id-conflict`) instead of overwriting the local issue — but the peer's later ops chain off the rejected create and reject as `missing-dependency`, so the peer is wedged permanently.

The log cannot say which `TRL-247` a later op meant:

- **The reference is a bare string.** `criterionAdd { issueId: "TRL-247" }` carries no pointer to a create.
- **`previousHash` is not causal ancestry across a merge.** It records one parent, and pulled ops are appended to the local tail. After a merge, a writer's next op chains off whatever op is last — often a *foreign* op — so walking `previousHash` from it reaches the other writer's create, not the one its author was looking at.

## Decision

### Target (this ADR): identity is the create, the number is a name

1. **An issue's identity is its create op's hash.** The entity id becomes `issue:<createHash>` (or a short form of it). This never collides: two creates are two hashes.
2. **`TRL-N` is a derived display name**, computed in materialization the way `alias` is for zones (ADR 0022). Each create proposes a number; when two creates propose the same number, the earlier by `(timestamp, hash)` keeps it and the other takes a deterministic disambiguated name. Every peer that holds the same ops computes the same names, in any arrival order.
3. **References carry the create hash.** New ops that name an issue write `{ issueRef: <createHash> }` alongside the human `issueId` (kept for legibility and older readers). Resolution prefers the hash; the bare string is a fallback.
4. **Merges record ancestry.** Ops minted after integrating foreign ops use the v2 envelope (`parents[]`, JOURNAL-FORMAT §6) so "which issues did the author's store hold" is answerable from the log. Legacy bare-string references written before this ADR resolve by an explicit, documented rule (the create authored by the same `agentId` that precedes the reference in that author's chain, else the display-number winner).
5. **Migration is additive.** Existing creates keep `TRL-N` as both their name and — through a compatibility alias — a resolvable id, so CLI input like `trellis issue show TRL-245`, docs, commit messages and journals keep working. No op is rewritten.

### Interim (KRN-508): two-peer renumber by rewriting the losing tail

Until the target lands, a wedged peer recovers by **rewriting** its own unshared ops:

- The loser is the create that is later by `(timestamp, hash)` — the same rule as (2), so the interim and the target agree on who keeps the number.
- Only the losing machine rewrites, and only ops that descend from its losing create and that the winner rejected. Those ops were never accepted by the other peer, so the rewrite is invisible to it.
- The rewrite goes through the destructive-op guard, keeps a full pre-rewrite journal copy, and appends a `vcs:issueRenumber` op listing every superseded hash; `integrateOps` rejects a superseded op if a stale copy resurfaces.
- It **refuses** when any configured remote has acked an op in the rewrite range (`lastAckHash`), because a third copy now holds the ops being replaced.

The interim is an exception to the append-only log, valid only while the replaced ops have exactly one other holder that rejected them. It is not to be extended to three or more writers, to relays, or to agent/guest writers; those wait for the target.

## Consequences

**Positive**
- The target removes the conflict class entirely rather than resolving it: no rewrite, no wedge, convergent for any number of peers.
- Same pattern as zones (ADR 0022) — one identity model to explain, not two.
- The interim unblocks daily two-machine use now without pretending to be the architecture.

**Negative / cost**
- The target touches every issue op kind, materialization, the CLI's id resolution, and the projection that renders issues; it is multi-week.
- Display numbers become non-unique *transiently* (a disambiguated name appears after a merge), which tools that parse `TRL-N` must tolerate.
- The interim rewrites ops; a stale copy outside the two peers (an unconfigured backup, a manual file copy) is protected only by the superseded-hash record.

## Triggers to start the target

Any one of: a third writer on one issue store; a relay or hosted ledger that receives ops before peers reconcile; agents or guest VMs authoring issues into a shared store; or the interim's refusal firing in practice.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Device-scoped numbers (`TRL-m247`, or numbers in a per-device residue class) | Prevents collisions without coordination, but the human-sequential number is the reason the id exists; it would be the first thing people work around. |
| Lease number blocks via ops | The lease itself is allocated offline and can collide — rarer, same problem. |
| Resolve legacy references purely by `previousHash` ancestry | Unsound across merges (see Context). |
| Make the interim rewrite the permanent answer | It depends on knowing every holder of the replaced ops, which stops being knowable at three writers. |
