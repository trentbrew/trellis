# ADR 0026: An intent vocabulary — issue types, cycles, and what stays retrospective

> **Terminology:** **Retrospective** = an assertion about ops that already exist.
> **Prospective** = a statement about work that does not exist yet. **Epic** = a
> long-lived container of intent, rooted in the telos. **Cycle** = a
> time-boxed container with a target date.

**Status:** Proposed
**Date:** 2026-07-15
**Depends on:** ADR 0022 (the name-vs-type lesson), ADR 0021 (ops as assertions)
**Related:** TRL-106 (legibility), TRL-107 (join code to intent)

## Context

TrellisVCS tracks **what happened and why** extremely well. It has almost no
vocabulary for **what we want to happen**. Three findings, measured against the
live tracker rather than asserted:

### 1. "Epic" is a title prefix, not a type

`grep` for `issueType` across `src/vcs/types.ts` and `src/vcs/issue.ts` returns
nothing. TRL-3, TRL-11 and TRL-17 are epics because someone typed `Epic:` at the
front of a string. Twenty other issues have children and are not called epics.

This is exactly the failure ADR 0022 fixed for zones: **a name doing the work of
a type.** You cannot query "all epics", cannot enforce "every issue rolls up to
one", and a rename silently breaks the convention. It is `alias` with no
`zoneId`.

Measured: **89 issues created, 66 (74%) have a parent, 23 distinct parents, 3
titled "Epic:"**. The hierarchy habit is real; the type is missing.

### 2. There is no prospective vocabulary at all

`grep -inE "dueDate|deadline|cycle|sprint|estimate|effort"` over the op payload
returns **nothing**. Not underused — absent.

### 3. Milestones are retrospective by construction, and that is correct

`vcs:milestoneCreate` carries `fromOpHash` / `toOpHash`: a milestone is *defined
as a range of ops that already exist*. It is structurally incapable of describing
future work. 18 exist and all are bookmarks.

This is not a defect. Everything in an append-only causal log is an assertion
about the past — even `status: backlog` means "I asserted this exists". A log of
what happened cannot, by its nature, hold what we intend. **The gap is real and
the log is not the place to close it by accident.**

## Decision

### 1. `issueType` becomes a real field

```ts
type IssueType = 'epic' | 'issue' | 'spike' | 'msg';
// vcs:issueCreate carries issueType; absent ⇒ 'issue'
```

- The kernel gets a **type**, not a naming convention. `Epic:` in a title becomes
  decoration, exactly as `alias` is decoration on a zone.
- **Enables the thing that actually matters:** an agent picking up a leaf issue
  can walk `parentIssueId` to an epic and find out *why the work exists*. Today
  that path is a string prefix and 26% of issues are not on it at all. This is
  TRL-106's legibility argument applied to intent instead of scope.
- Backfill is a query, not a migration: the three `Epic:`-titled issues get an
  `issueType` fact; everything else defaults.

### 2. Cycles are thin containers, and the only honest home for a deadline

```ts
// vcs:cycleCreate → cycle entity { alias, targetDate }
// issues link to a cycle; the link is the membership
```

**A deadline does not belong on an issue.** An issue has no capacity and nothing
to reconcile against, so a per-issue due date is a promise the graph cannot keep
— it is a field that looks like a plan. A cycle's target date is falsifiable:
*this set of work, by this date, and here is what got cut.* That is what turns
"right direction" into "right pace".

Same shape as ADR 0022's `defaultVisibility`: **a property of the container, not
a field on every member.**

**Deliberately thin.** A cycle is an entity, issues link to it, it has a target
date and acceptance criteria. That is all.

- **Burndown, velocity, projection, the Studio calendar view are QUERIES, not
  fields.** We have EQL-S; TRL-107's rule applies verbatim — ingest and join,
  do not recompute and store. The moment a cycle carries estimates *and* rollups
  *and* velocity, we have rebuilt Jira inside an op log.
- **No event types.** A deadline is not an event, it is a fact with a date
  (`cycle:x → targetDate`). Studio's calendar projects it. Adding `vcs:event*`
  kinds would model a calendar in the kernel, which is Studio's job over the
  graph, not the kernel's.

### 3. Milestones stay retrospective. Explicitly.

Milestones are honest as bookmarks. **Do not overload them with intent** — that
is what cycles are for. The two are complements: a cycle says what we mean to do
by when; a milestone says what happened, as a range of ops. Conflating them would
put a mutable plan inside an immutable record, which is the same category error
as a mutable pointer inside op identity (TRL-102).

### 4. Every issue rolls up to an epic; every epic roots in the telos

Enforced as a **readiness check**, not a mint-time throw — doodling is necessary,
and an issue you cannot yet place is a real state. `trellis issue readiness`
reports orphans; `issue create` does not refuse them.

Marketing, legal, hardware, licensing are not different *kinds* of work. They are
different epics. The graph does not need new machinery for them — it needs the
type.

## Consequences

**Good**

- "Why does this work exist" becomes a graph walk instead of a naming convention.
- The telos informs the sand: an agent can traverse leaf → epic → telos without
  a human explaining it.
- Deadlines become falsifiable at the level that can actually hold one.
- Planning gains a vocabulary without the op log pretending to be a planner.

**Costs / risks**

- **The Jira gradient is real.** Every field added to a cycle is a step toward
  reimplementing a tracker. The discipline is: containers and links in the graph;
  everything derived is a query.
- `issueType` is a new bounded-domain register — it passes ADR 0022 §2's audit
  (enumerable ⇒ delete-then-add is exhaustive), so `decompose` can project it
  safely.
- Cycle membership is a link, so an issue in two cycles is expressible. Decide
  whether that is a feature (carry-over) or an error.

**If we don't**

- Epics stay a string prefix and 26% of work has no stated reason to exist.
- Deadlines land on issues, where they cannot mean anything.
- Planning continues to live in Trent's head, which is the thing the project
  exists to fix.

## Acceptance criteria

1. `issueType` is a first-class field; `Epic:` in a title is decoration.
2. `trellis issue list --type epic` works; the three existing epics are backfilled.
3. An agent can walk a leaf issue to its epic via `parentIssueId` in one query.
4. `vcs:cycleCreate` exists; a cycle has an `alias` and a `targetDate`; issues
   link to it.
5. Burndown/velocity/calendar are **queries**, and no such field exists on the
   cycle entity.
6. `issue readiness` reports issues with no epic; `issue create` still allows them.
7. Milestones are unchanged and remain retrospective.

## Phasing

- **Phase 1 — `issueType`. LANDED** (`vcs:types.ts`, `decompose.ts`, `issue.ts`,
  CLI `--type` on create/update/list; `test/vcs/issue-type.test.ts`). Kills the
  title convention and makes telos→work a query.
  - **Backfill of TRL-3/11/17 is NOT done.** The three `vcs:issueUpdate` ops were
    minted and then *lost from the journal* by a concurrent engine — see the
    op-log clobber note below. Re-run once that is understood; the ops are cheap
    to remint, but doing so now would just feed the same race.
- **Phase 2 — cycles.** Container + `targetDate` + link. Follow-on.
- **Phase 3 — projections.** Studio calendar / burndown as EQL-S queries. No
  kernel work.

Phase 1 stands alone and is worth landing on its own.

---

## Unrelated finding, surfaced by the Phase 1 backfill: the op log can lose ops

Backfilling three epics minted three `vcs:issueUpdate` ops carrying `issueType`.
They were verified present in `ops.json`. Minutes later they were **gone**, and
the journal had grown — so a concurrent writer had rewritten it without them.

`JsonOpLog.append` locks, re-reads disk and reconciles, so it is *designed* for
concurrency. The hole is the optimisation:

```ts
private canUseMemoryWithoutDiskRead(): boolean {
  ...
  return this.diskCache.mtimeMs === stat.mtimeMs && this.diskCache.size === stat.size;
}
```

Staleness is judged by **mtime + size**. A long-lived engine (another agent, a
`lane watch` server) whose cache matches on both keeps its stale `this.ops`,
pushes onto it, and `writeOpsToDisk()` writes the *whole array* — silently
dropping ops it never read. `shouldReconcileFromDisk` then sets
`this.ops = diskOps`, so the loss propagates into memory as well.

This is not a papercut: **the causal log is the source of truth, and it can lose
entries when two agents share a repo.** It is the same root cause as the commit
sweeps (`7703da4`) and the mid-edit build breaks — agents sharing one tree — and
it is the strongest argument yet for lanes-with-worktrees as the default
(ADR 0026 is not the place to fix it; it needs its own issue).

Worth noting the irony: this was found *because* an ADR about tracking intent
could not record its own intent.
