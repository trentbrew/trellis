# ADR 0006: Session fork → lane mapping

> **Terminology ([ADR 0005](./0005-agent-lane-naming.md)):** **lane**, `trellis lane`, `LaneMeta`, `TRELLIS_LANE_ID`.

**Status:** Accepted  
**Date:** 2026-05-29  
**Issue:** TRL-35 (W0 addendum); Studio W5 follow-up  
**Depends on:** [0001](./0001-workspace-journal-model.md), [0002](./0002-workspace-promote-algorithm.md), [0003](./0003-workspace-conflict-taxonomy.md)  
**Plan:** [Agent Lanes](../../../tooling/planning/agent-lanes.md)

## Context

Trellis Studio and turtlecode/OpenCode expose **session fork**; a user or agent branches a chat into a sibling conversation while continuing the parent thread. In Trellis VCS:

| Primitive | What it isolates today |
| --------- | ---------------------- |
| **Branch** (`main`, `feature/x`) | Metadata + `headOpHash` pointer; **not** a separate op journal in P0 |
| **Agent Lane** | Isolated `ops.json` forked from integration `baseOpHash`; explicit promote |

Forking a session must not be modeled as “create a Trellis branch” alone; concurrent agents would still contend on one integration journal and lose lane-scoped attribution.

Two fork shapes appear in product UX:

1. **Sibling fork**; new session continues from the **same integration snapshot** the parent lane had at fork time (`baseOpHash` unchanged). Both lanes replay from integration + their own journals. Promote conflicts are detectable via ADR 0003.
2. **Child fork**; new session continues from the **parent lane’s current head** (parent journal ops included). Promote planner today only diffs against integration state at `baseOpHash`; child fork requires virtual integration, promote-chain, or lane-on-lane replay; **not implemented in W1–W4**.

`LaneMeta` already carries optional `sessionId` and `issueId` (`kernel/src/vcs/lane.ts`). `trellis issue start` creates and enters a lane. Studio W5 must wire session lifecycle (create, fork, leave) without breaking promote invariants.

## Decision

**Map Studio/turtlecode “fork session” to a new sibling Agent Lane**, not to a new Trellis branch.

### Fork → lane (v1)

```text
Parent session (lane A, active)
  User/agent forks session
    → Studio calls createLane({
         parentLaneId: A,
         forkKind: 'sibling',
         baseOpHash: A.baseOpHash,      // same integration snapshot
         baseBranch: A.baseBranch,
         targetBranch: A.targetBranch,
         sessionId: <new session id>,
         issueId: A.issueId,            // inherit when fork is issue-scoped
         agentId: <forking agent>,
       })
    → Parent: leaveLane(A) or freeze (status remains active; no integration writes)
    → Child subprocess: TRELLIS_LANE_ID=<new lane id>
```

**Sibling fork only in v1.** Child fork (`forkKind: 'child'`, parent head as virtual base) is **deferred**; see [Deferred](#deferred-child-fork).

### LaneMeta extensions (W5+)

Add optional fields to `LaneMeta` / `CreateLaneParams`:

| Field | Type | Meaning |
| ----- | ---- | ------- |
| `parentLaneId?` | string | Lane forked from (provenance) |
| `forkKind?` | `'sibling'` \| `'child'` | v1: only `'sibling'` emitted |
| `forkedAt?` | ISO8601 | When fork occurred |

No new op kinds for fork; `vcs:laneCreate` + extended meta is sufficient.

### Issue ↔ lane rule

- **At most one `active` lane per `issueId`** at a time.
- Multiple lanes per issue are allowed when prior lanes are `promoted`, `dropped`, or parent was left inactive after fork.
- Fork creates a **new** active lane; Studio must **leave or freeze** the parent lane before the child enters (engine already forbids two concurrent `activeLaneId` writers).

Strict 1:1 issue↔lane for all time is **not** required; fork history is intentional.

### Promote behavior (unchanged)

Sibling lanes promote via ADR 0002 replay onto current integration head. Conflicts between sibling lanes that touched the same entities/files classify per ADR 0003 (`safe` / `soft` / `hard` / `file`). No special-case fork merge in v1.

### Studio / turtlecode obligations (W5)

| Event | Action |
| ----- | ------ |
| Session start (no issue) | `createLane({ sessionId })` + `enterLane` + `TRELLIS_LANE_ID` |
| `issue start` | Already: create lane with `issueId` + enter |
| Session fork | Sibling lane per above; new `sessionId`; warn if parent had unpromoted work |
| Session end / archive | `leaveLane`; **do not** auto-promote (program non-goal) |
| Unpromoted lane on close | Surface warning; lane remains on disk until promote or drop |

### CLI (optional W5)

```bash
trellis lane fork <parent-id> [--session <id>] [--issue <id>]
```

Thin wrapper around `createLane` with sibling defaults; Studio may call engine API directly.

## Non-goals (v1)

- **Child fork** from parent lane head
- Auto-promote on session close
- New Trellis branch per chat fork
- Cross-lane op replay / virtual integration store
- Resolving sibling conflicts automatically (human or `--explain` + manual fix)

## Consequences

**Positive**

- Fork UX aligns with existing lane promote and conflict machinery; no P0 branch journal required.
- Clear provenance via `parentLaneId` for Studio UI (fork tree, unpromoted warnings).
- Issue workflow stays coherent: one active lane, explicit promote per fork line.

**Negative**

- Child fork (“continue from where parent agent left off”) needs a follow-on ADR and engine work (ADR 0007 candidate).
- Sibling forks from the same `baseOpHash` can produce ADR 0003 conflicts at promote time; expected; Studio should set expectations in UX.
- `parentLaneId` is metadata only until child fork lands; no kernel enforcement of fork DAG in v1.

## Deferred: child fork

Implemented in **[ADR 0007](./0007-child-fork-lane-base.md)**; virtual integration base at `parent.headOpHash`.

## Alternatives considered

| Alternative | Rejected because |
| ----------- | ---------------- |
| Fork → new Trellis branch | Branches do not isolate journals in P0; lock contention unchanged |
| Fork → same lane, new `sessionId` only | Loses isolated journals; concurrent edits collide |
| Auto-promote parent on fork | Violates explicit promote invariant; surprise integration writes |
| Child fork in v1 without virtual base | Promote planner would miss parent journal ops → silent overwrite risk |

## References

- Lane metadata: `kernel/src/vcs/lane.ts`
- Promote: `kernel/src/vcs/lane-promote.ts`, ADR 0002
- Conflicts: ADR 0003
- Program W5: `tooling/planning/agent-lanes.md` (worktree bind + session lifecycle)
