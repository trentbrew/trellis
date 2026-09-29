# ADR 0050: Notes and the derived operator surface

> **Terminology:** **Note** = a durable, operator-scoped capture with no
> commitment. **Promote** = the deliberate act of turning a note into committed
> work (issue, ADR, cycle membership). **Operator surface** = derived,
> recomputed views over ops + graph (`wip`, `cadence`, `report`) that are never
> hand-maintained.

**Status:** Accepted (2026-09-29; P0–P3 implemented)
**Date:** 2026-09-29
**Depends on:** [0018](./0018-explicit-ids-and-field-sync-tiers.md) (field sync
tiers), [0019](./0019-graph-native-cron.md) (graph-native cron), [0026](./0026-intent-vocabulary-issue-types-and-cycles.md)
(cycles; retrospective vs prospective), [0046](./0046-agent-forum.md) (forum —
agent-scoped notes), [0047](./0047-datalog-logic-layer.md) (rules as graph data)
**Related:** [0044](./0044-plan-artifact-capture.md) (plan artifact capture),
[0015](./0015-agent-handoff-protocol.md) (handoff / `whereami` re-entry)
**Supersedes:** nothing
**Impacted components:** `src/core/ontology/core-ontology.ts` (new `Note` type),
`src/vcs/` (note ops, or generic entity use), `src/cli/` (new `note` and `wip`
commands), `docs/`

## Context

Observed on the os-sandbox desk (2026-09-28/29), and general:

1. **Capture is missing, so ideation becomes thrash.** The only affordances for
   "not now" are ad-hoc `docs/SCRATCH.md` files and external notes. There is no
   durable, queryable capture with a lifecycle, so shiny things are either
   chased immediately or lost.
2. **Status is fragmented and hand-cached.** `trellis status`, `issue active`,
   `issue readiness`, `admin`, and a `graph-briefing.txt` snapshot (stale by
   construction) each show one slice; nothing shows *active / shipped / next* in
   one derived read.
3. **The retrospective / prospective split is already correct** (ADR 0026).
   Milestones are op-ranges (past); cycles hold intent and a target date
   (future). ADR 0026 is Proposed; `issueType` is implemented, **cycles are
   not**.
4. **Drift is tier confusion.** A hand-maintained mirror (issue tree, ADR index,
   briefing) is treated as durable, so it lags. A status asserted without
   reading it ("landed"-but-open) is the same error.
5. **ADR 0046 (forum) covers agent-scoped, decaying notes** — a *different
   audience* (agents, stigmergic) from the operator's own capture.

## Decision

### 1. `Note` is a first-class, operator-scoped entity type

Distinct from its two neighbors by audience and life:

| | Audience | Asks for action | Lifetime | About |
|---|---|---|---|---|
| **Note** (this ADR) | the operator | no | until promoted/archived | the operator's own thinking |
| **Post** (ADR 0046) | agents | no | decays | the work |
| **Issue** (ADR 0026) | the work | yes (AC) | until closed | committed change |

A note carries `text`, `createdAt`, optional `tags`, optional refs (via the
existing reference grammar), and `status: captured | promoted | archived`. It
has **no acceptance criteria, no lane, no assignment, no commitment**.

### 2. Capture is frictionless; promotion is the only act that commits

- `trellis note "<text>"` (alias `note add`) appends one durable note — as cheap
  as a shell line.
- `trellis note promote <id> --issue|--adr|--cycle` is the deliberate, explicit
  act that creates committed work. This is the anti-thrash mechanism: the note
  is where the shiny thing *goes* so it does not pull focus.
- `trellis note archive <id>` retires it. Unpromoted notes feed
  `trellis garden` (abandoned-cluster detection already exists).

### 3. The operator surface is derived, never stored

One generator over ops + rules, several projections:

- `trellis wip` — **active** (in_progress / queue), **shipped** (closed in the
  last N days), **next** (ready, unblocked). Replaces the hand-cached briefing.
- `trellis cadence` — due checks (below).
- `trellis report [--day]` — ops → issues → epics → telos rollup (ADR 0026 d4;
  requires the telos/epic rollup).
- **Mirrors and indexes are generated** (issue tree, ADR index) from the graph.
  Hand-maintaining a derived artifact is disallowed.

### 4. Cadence is a derived rule with a gate

Cadence is a Datalog rule (ADR 0047) over durable facts, optionally scheduled by
a `CronJob` (ADR 0019): `cadenceDue(session)`, `stale(mirror)`. **Its only
purpose is to gate** — refuse `issue close` on unreconciled drift, surface
due-soon in `wip`. Derived-without-a-gate is theater and is disallowed.

### 5. Notes are first-class for refs and search

Notes participate in the existing reference grammar (`@{…}`), semantic search,
and the `wip` "notes awaiting triage" line.

## Consequences

**Good**

- "Not now" has a home, so focus is not lost to shiny things.
- Status becomes one derived read instead of five stale ones.
- Drift becomes structurally impossible for mirrors, and gated for status.

**Costs / risks**

- **The note / issue / forum boundary must hold.** The gradient is real; the
  discipline is audience + commitment, not fields.
- A generator is more work than a written file, once — the payoff is every
  future reconcile.
- Cadence gating can annoy; it must gate *something real* or be removed.

**If we don't**

- Capture stays ad-hoc; ideation keeps thrashing.
- The desk keeps hand-caching derived state and reconciling it by hand.
- ADR 0026 stays half-implemented (`issueType` without cycles).

## Implementation phases (spike scope)

- **P0 (this pass):** ADR 0050; `trellis note` (add/list/show/archive/link);
  `trellis wip` (derived snapshot).
- **P1:** `cadence` rule + gate on `issue close`.
- **P2:** `report` rollup (epic→telos; telos/boulder entities).
- **P3:** generated mirrors (issue tree / ADR index) and retire the cached
  briefing.
