# Spec: Lane promote — coordination metadata non-blocking (v0)

**Status:** Shipped · **Date:** 2026-07-24\
**Proposal:** TRL-286 · **Impl:** TRL-287, TRL-289 · **Unblocks:** TRL-284, TRL-279 close

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
| soft | `description` | Integration describe diverged while lane edited other attrs (TRL-289) |

Ops to replay: 1 safe op — but **blockingConflicts > 0** → auto-promote fails.

Existing skip (lines 407–416) only handles facts where `head === lane value`. It does not handle integration-wins metadata or soft conflicts on attrs the lane op never intended to change.

## 2. Goals

1. **Coordination attribute allowlist** — do not emit **blocking** soft conflicts for integration-owned issue metadata attrs the lane op did not write.
2. **Integration-wins stale describe** — when a lane `issueUpdate` only sets `description` and integration head already changed `description` since fork, **skip replay** without hard conflict.
3. **Integration-owned describe on soft axis** — `description` is coordination/orientation metadata; parallel lane title (or code) edits promote cleanly while integration describe is retained (TRL-289).
4. **Close path** — after fix, `trellis issue close TRL-284 --confirm` succeeds.

## 3. Non-goals

- Merging divergent descriptions (LWW prose merge)
- Changing `ISSUE_INTEGRATION_KINDS` routing
- File conflict logic

## 4. Design

### 4.1 Coordination attributes (Issue entities)

Exported constant in `src/vcs/lane-promote.ts`:

```ts
/** Integration-owned issue metadata — never block promote on cross-lane noise. */
export const ISSUE_COORDINATION_ATTRS = new Set([
  'claimedLaneId',
  'claimedAt',
  'claimedSessionId',
  'status',
  'description',
]);
```

In `detectEntityConflicts` soft loop (head changed since base, lane touched entity but not this attr):

- If `entityId.startsWith('issue:')` and `ISSUE_COORDINATION_ATTRS.has(attribute)` → **omit** soft conflict.

Rationale: claim metadata and strategist/protocol `describe` on integration are authoritative; lane journal copies are orientation noise.

### 4.2 Stale lane describe skip (hard axis)

In the `addFacts` hard-conflict loop, before pushing `hard`:

- If `fact.a === 'description'`, entity is `issue:*`, and `headValue !== fact.v` with `headValue !== baseValue`:
  - Treat as **integration-wins** — do not push hard conflict; let outer loop skip replay (same as redundant-fact skip).

### 4.3 Promote boundary unchanged

`canPromote === false` with `opsToReplay.length === 0` remains valid.\
`autoPromoteIssueLaneBeforeClose` already no-ops when `opsToReplay.length === 0 && blockingConflicts.length === 0`.

## 5. Tests (`test/p4/lane-promote.test.ts`)

| Test | Behavior |
| ---- | -------- |
| `claim metadata does not soft-block when lane edits title` | Claim on integration; lane title edit → promotes |
| `stale lane describe yields integration description` | Stale lane describe skipped; integration description retained |
| `integration description wins over stale lane describe` | Hard axis integration-wins |
| `parallel title edit promotes when integration owns description` | Soft axis integration-wins (TRL-289) |

## 6. Files

| File | Change |
| ---- | ------ |
| `src/vcs/lane-promote.ts` | Allowlist + stale describe skip |
| `test/p4/lane-promote.test.ts` | Regression cases |
| `justfile` | `just check` runs typecheck + query-stress + lane-promote vitest |

## 7. Acceptance criteria

- `just check` (or `pnpm check` + vitest paths above)
- `pnpm exec vitest run test/p4/lane-promote.test.ts`
- `trellis issue close TRL-284 --confirm` succeeds post-build
