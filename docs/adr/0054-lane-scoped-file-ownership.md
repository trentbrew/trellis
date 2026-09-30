# ADR 0054: Lane-scoped cross-agent file ownership

> **Terminology:** **Owner** = the live active lane that first wrote a path.
> **Writer** = the session attempting a write. **Lane** = an isolated op journal
> (ADR 0005). **agentId** = an identity entity id.

**Status:** Accepted (implemented)
**Date:** 2026-09-30
**Issues:** TRL-89 (host↔OS parity), TRL-117 AC4 (ownership guard origin)
**Depends on:** [0005](./0005-agent-lane-naming.md) (lanes), [0015](./0015-agent-handoff-protocol.md)
(handoff), [0014](./0014-git-materialization-and-lane-worktrees.md) (lane worktrees)
**Related:** [0052](./0052-agent-liveness-census.md) (identity vs session), [0050](./0050-notes-and-derived-operator-surface.md)
**Impacted components:** `src/vcs/lane-ownership.ts`, `src/cli/guard.ts`,
`agent-ops/hooks/trellis-file-ownership-lib.mjs`, opencode plugin (planned)

## Context

The cross-agent ownership guard (TRL-117 AC4) rejects a file write when a
**different `agentId`** owns the path. That works when agents have distinct
identities — but on the host **every session shares one per-machine identity**:
all 77 lanes in `trellis-node` carry `agentId: "agent:trentbrew"`. The agentId
comparison therefore never distinguishes concurrent sessions, and the guard is
**inert on the host** — the exact situation it exists for (two tabs editing the
same checkout). The distinguishing key is the **lane** (unique per session); the
lane meta already carries `sessionId`.

The policy text itself says a file "is owned by that **lane**" — so lane-scoping
aligns the implementation with the stated intent.

## Decision

### 1. Ownership is lane-scoped when the writer names its own lane

`trellis guard <path> --exclude-lane <lane>` excludes the writer's lane from the
owner map; any remaining owner is a **foreign lane** and the write is denied with
the ADR 0015 handoff prompt.

### 2. agentId remains the fallback

Without `--exclude-lane`, the check compares `agentId` (cross-machine / distinct
identities). This keeps the original semantics where they are meaningful.

### 3. One policy, thin enforcement points

The rule lives in `src/vcs/lane-ownership.ts` (exported on `trellis/vcs`); the
CLI (`trellis guard`) and host hooks are thin callers. No reimplementation.

### 4. Cache the owner map (perf)

`buildActiveLaneFileOwners` loads **every** lane's op-log, so a per-edit guard is
O(all lanes). Enforcement must cache the owner map (short TTL, invalidated on
lane writes) or scope the scan — a guard that costs seconds per edit will be
disabled, which is worse than no guard.

## Alternatives considered

| Option | Why not |
| ------ | ------- |
| Per-session agentId (`agent:trentbrew:<session>`) | agentId is an identity, not a session; churns every lane and confuses provenance |
| agentId-only (status quo) | inert on the host — cannot distinguish concurrent sessions |
| No guard | the blind-spot that lets one agent clobber another's checkout |

## Consequences

**Good** — the guard actually enforces on the host; host and OS share one rule.

**Costs** — lane-scoping is host-centric (cross-machine identity still uses
agentId); the owner-map scan needs caching.

## Implementation phases

- **P0:** lane-scoped `trellis guard` + Claude PreToolUse wiring. ✅
- **P1:** owner-map cache (TTL + invalidate on lane writes).
- **P2:** opencode plugin write-path wiring.
