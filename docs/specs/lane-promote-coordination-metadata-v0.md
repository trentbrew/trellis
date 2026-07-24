# Spec: Lane promote — coordination metadata non-blocking (v0)

**Status:** Spec · **Date:** 2026-07-24\
**Proposal:** TRL-286 · **Unblocks:** TRL-284, TRL-279 close

> Issue lifecycle ops (`issueStart`, `issueClaim`, …) write to **integration**
> even inside a lane (`ISSUE_INTEGRATION_KINDS`). Lane journals often hold
> redundant `issueUpdate` describe/claim facts. Promote must not block close on
> metadata noise when integration head already owns the truth.

---

## 1. Problem

`planLanePromote` / `issue close --confirm` blocked on TRL-284 with:

| Class | Attribute | Cause |
| ----- | --------- | ----- |
| soft | `claimedLaneId`, `claimedAt` | Integration claim via `issueStart`; lane touched same issue entity |
| hard | `description` | Strategist `describe` on integration vs lane `issueUpdate` describe |

Ops to replay: 1 safe op — but **blockingConflicts > 0** → auto-promote fails.

Existing skip (lines 407–416) only handles facts where `head === lane value`. It does not handle integration-wins metadata or soft conflicts on attrs the lane op never intended to change.

## 2. Goals

1. **Coordination attribute allowlist** — do not emit **blocking** soft conflicts for integration-owned issue metadata attrs the lane op did not write.
2. **Integration-wins stale describe** — when a lane `issueUpdate` only sets `description` and integration head already changed `description` since fork, **skip replay** without hard conflict.
3. **Preserve real conflicts** — parallel edits on substantive attrs (title vs description on different axes) still soft/hard block per existing tests.
4. **Close path** — after fix, `trellis issue close TRL-284 --confirm` succeeds (0 replay ok when journal is metadata-only).

## 3. Non-goals

- Merging divergent descriptions (LWW prose merge)
- Changing `ISSUE_INTEGRATION_KINDS` routing
- File conflict logic

## 4. Design

### 4.1 Coordination attributes (Issue entities)

Add exported constant in `src/vcs/lane-promote.ts`:

```ts
/** Integration-owned issue metadata — never block promote on cross-lane noise. */
export const ISSUE_COORDINATION_ATTRS = new Set([
  'claimedLaneId',
  'claimedAt',
]);
```

In `detectEntityConflicts` soft loop (head changed since base, lane touched entity but not this attr):

- If `entityId.startsWith('issue:')` and `ISSUE_COORDINATION_ATTRS.has(attribute)` → **omit** soft conflict (class `safe` or skip entirely).

### 4.2 Stale lane describe skip

In the `addFacts` hard-conflict loop, before pushing `hard`:

- If `fact.a === 'description'`, entity is `issue:*`, and `headValue !== fact.v` with `headValue !== baseValue`:
  - Treat as **integration-wins** — do not push hard conflict; let outer loop skip replay (same as redundant-fact skip).

Rationale: describe on integration (CLI/strategist/protocol) is authoritative for close; lane journal describe is orientation noise.

### 4.3 Promote boundary unchanged

`canPromote === false` with `opsToReplay.length === 0` remains valid.\
`autoPromoteIssueLaneBeforeClose` already no-ops when `opsToReplay.length === 0 && blockingConflicts.length === 0`.

## 5. Tests (`test/p4/lane-promote.test.ts`)

Add:

1. **`claim metadata does not soft-block when lane edits title`** — integration `issueStart` sets claim; lane `updateIssue` title only → `blockingConflicts` empty, title replays or promotes clean.
2. **`stale lane describe yields integration description`** — integration describe after fork; lane describe differs → promote not blocked; integration description retained.
3. **Existing `same entity different attributes is a soft conflict`** — unchanged (still blocks).

Optional integration smoke (manual AC on graph):

- `trellis issue close TRL-284 --confirm` after impl on active lane.

## 6. Files

| File | Change |
| ---- | ------ |
| `src/vcs/lane-promote.ts` | Allowlist + stale describe skip |
| `test/p4/lane-promote.test.ts` | New regression cases |
| `src/vcs/types.ts` or ADR note | Cross-ref coordination attrs (optional one-liner) |

## 7. Acceptance criteria

- `pnpm check`
- `pnpm exec vitest run test/p4/lane-promote.test.ts`
- New tests: claim soft-conflict suppressed; stale describe non-blocking
- Existing lane-promote tests remain green
