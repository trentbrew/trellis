# ADR 0055: Lane hygiene is scheduled at the host, not the tenant cron

**Status:** Accepted (implemented)
**Date:** 2026-09-30
**Issues:** TRL-88 (lane hygiene), TRL-407 (lane gc)
**Depends on:** [0019](./0019-graph-native-cron.md) (graph-native cron), [0047](./0047-datalog-logic-layer.md)
(rules as data), [0014](./0014-git-materialization-and-lane-worktrees.md) (lane worktrees)
**Related:** [0052](./0052-agent-liveness-census.md), [0050](./0050-notes-and-derived-operator-surface.md)
**Impacted components:** `world/services/CRON/` (desk), `src/cli/index.ts`
(`cadence --lanes --dispatch`), `src/plugins/cron/` (`builtin:clock`)

## Context

D2 asked for a scheduler sweep of lane hygiene (the session-end hook is only the
fast path). The obvious home — the cron plugin (ADR 0019) — does not fit:

- `createCronPlugin` / `attachCronToPool` build a `CronStore` over a
  **`TrellisKernel` / `TenantPool`** — tenant-scoped graph state.
- Lanes are **VCS-engine-scoped**: `.trellis/lanes/*` journals bound to a repo
  worktree (`gcLanes(engine, …)` needs a `TrellisVcsEngine`).

So the tenant cron cannot run the lane sweep. The graph-native pattern
(`currentTime(Now)` fact → `cadenceDue(Session)` rule → dispatch, ADR 0047) would
require lanes to be materialized as graph facts, which they are not today.

## Decision

### 1. Lane hygiene runs at the host/desk level

A launchd agent (`world/services/CRON/com.turtle.trellis-cadence`, hourly) runs
`trellis cadence --lanes --dispatch` for each desk repo. The session-end hook
remains the fast path; the scheduler is the sweep of record.

### 2. `builtin:clock` seeds the graph-native future

The cron plugin gains `builtin:clock`, asserting a singleton `clock:now`
(`currentTime`/`epochMs`/`tickCount`) so cadence **rules** can join against Now
once lanes (or their derived status) are graph facts.

### 3. One generator, both surfaces

The due-check is exported as `buildCadence` on `trellis/operator`; the host CLI
and turtleOS consume the same function (ADR 0050, ADR 0052 d5).

## Alternatives considered

| Option | Why not |
| ------ | ------- |
| Extend the tenant cron to be repo-aware | crosses the tenant/VCS boundary; large |
| Materialize lanes as graph facts now | big modeling change; defer until needed |
| Rely on the session-end hook alone | misses crashed/abandoned sessions |

## Consequences

**Good** — works today; the sweep is repo-aware and shares the OS generator.

**Costs** — host-level means per-machine (not synced, ADR 0016 posture); the OS
desk root sweep is minutes (~100 lanes over a 34MB op-log) so it is opt-in.

## Implementation phases

- **P0:** `cadence --lanes --dispatch`, host launchd agent, `builtin:clock`. ✅
- **P1:** `cadenceDue` rule once lanes (or lane status) are graph facts.
- **P2:** promote the host sweep into a repo-aware engine runner (host↔OS parity).
