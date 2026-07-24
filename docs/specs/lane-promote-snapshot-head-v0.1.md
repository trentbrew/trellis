# Spec: Lane promote — snapshot head invariant (v0.1)

**Status:** Ready for impl  
**Date:** 2026-07-24  
**Parent chain:** TRL-296 (promote harden epic) · sibling to TRL-297 coordination skip  
**Unblocks:** Spec-parent close batch — TRL-166, TRL-161, TRL-170, TRL-278, TRL-297

---

## 1. Problem

Auto-promote on `trellis issue close` fails with:

```text
Integration head moved during promote — retry after integration settles
```

even when `planLanePromote` dry-run reports **Ready to promote** (0 blocking conflicts).

### Root cause

`resolveBranchHeadFromOps` in `src/vcs/lane-promote.ts`:

```ts
// When no vcs:branchAdvance exists for targetBranch…
return ops[ops.length - 1]?.hash;  // global integration tail
```

Issue-scoped lanes (`issue/TRL-N-…` branches) rarely receive `branchAdvance` on the
integration journal — work happens in the lane journal. Promote planning pins
`snapshotHead` to the global integration tail (correct for `headStore` conflict
detection).

During apply, `engine.promoteLane` appends `vcs:lanePromoteStart` to the
integration log, then **re-resolves** head with the same helper. The global tail
is now the start op → `currentHead !== snapshotHead` → abort loop.

Failed retries leave start/abort pairs on the causal stream (observed 14+ pairs).

**This is orthogonal to TRL-297** (coordination hard-conflict skip). Both fixes
are required for reliable spec-parent close.

## 2. Goals

1. **Stable snapshot** — post-`lanePromoteStart` head re-check must not treat our
   own promote lifecycle ops as integration movement.
2. **Concurrent-write safety preserved** — a foreign integration op appended
   between plan and start must still abort promote.
3. **Close path** — `trellis issue close TRL-166 --confirm` succeeds after
   `pnpm build` (representative spec-parent; batch applies to 161/170/278).
4. **Regression** — existing lane-promote tests remain green; no thrashing
   start/abort ops on retry.

## 3. Non-goals

- Emitting `branchAdvance` for issue branches on integration (ADR 0004 scope)
- Changing conflict detection / coordination stale skip (TRL-297)
- Promote lock semantics
- Git sync on promote

## 4. Design

### 4.1 Promote lifecycle exclusion set

File: `src/vcs/lane-promote.ts`

```ts
export const PROMOTE_LIFECYCLE_KINDS = new Set([
  'vcs:lanePromoteStart',
  'vcs:lanePromoteAbort',
  'vcs:lanePromoteComplete',
]);
```

### 4.2 Fix `resolveBranchHeadFromOps` fallback

Keep existing `branchAdvance` scan (unchanged).

Replace the global tail fallback:

```ts
// BEFORE (buggy)
return ops[ops.length - 1]?.hash;

// AFTER
for (let i = ops.length - 1; i >= 0; i--) {
  const op = ops[i]!;
  if (PROMOTE_LIFECYCLE_KINDS.has(op.kind)) continue;
  return op.hash;
}
return undefined;
```

Rationale: when `targetBranch` has no advances, integration **content tail**
(not promote envelope noise) is the promote snapshot. After appending
`lanePromoteStart`, walking backward skips it and returns the same hash.

`getBranchHeadOpHash` fallback in `engine.promoteLane` remains second choice when
this returns `undefined`.

### 4.3 Engine — no structural change

`engine.ts` promote path already captures `snapshotHead` before start and
re-reads with the same helper. Fix is entirely in `resolveBranchHeadFromOps`.

Optional hardening (only if needed in impl): pass `snapshotHead` into the
post-start check as pinned reference instead of re-resolving — prefer fixing the
helper first; add pin only if edge case found in tests.

### 4.4 Concurrent write detection (invariant)

| Scenario | Expected |
| -------- | -------- |
| Plan → start (no foreign ops) | Promote succeeds |
| Foreign `issueUpdate` appended between plan and start | Abort — head moved |
| Retry after abort | Succeeds — lifecycle ops skipped in fallback |
| Issue branch lane with 1 safe replay op | Promote + close succeed |

## 5. Tests (`test/p4/lane-promote.test.ts`)

| Test | Behavior |
| ---- | -------- |
| `resolveBranchHeadFromOps skips promote lifecycle at tail` | Synthetic op log ending in `lanePromoteStart` → returns prior content op hash |
| `issue-branch lane promote succeeds end-to-end` | `startIssue` + lane journal op + `promoteLane` → `promoted: true`, no throw |
| `foreign integration op between plan and start aborts` | Mock/spy: append non-lifecycle op after dry-run → promote throws head-moved |

Export `resolveBranchHeadFromOps` (already exported) and
`PROMOTE_LIFECYCLE_KINDS` for unit assertions.

## 6. Files

| File | Change |
| ---- | ------ |
| `src/vcs/lane-promote.ts` | `PROMOTE_LIFECYCLE_KINDS`; fix fallback loop |
| `test/p4/lane-promote.test.ts` | Unit + e2e promote tests above |
| `docs/specs/lane-promote-coordination-hard-conflict-v0.1.md` | Cross-link sibling spec |

## 7. Verification / close

After impl + `pnpm build`:

```bash
pnpm check
pnpm exec vitest run test/p4/lane-promote.test.ts
pnpm exec trellis issue close TRL-166 --confirm
```

Batch (manual / strategist after green):

```bash
for id in TRL-161 TRL-170 TRL-278 TRL-297; do
  pnpm exec trellis issue close "$id" --confirm
done
```

## Acceptance criteria

**Spec (static — architect gate):**

```text
test:pnpm check
test:test -f docs/specs/lane-promote-snapshot-head-v0.1.md
test:grep -q PROMOTE_LIFECYCLE_KINDS docs/specs/lane-promote-snapshot-head-v0.1.md
test:pnpm exec vitest run test/p4/lane-promote.test.ts
```

**Impl (close gate — after build):**

```text
test:pnpm build && pnpm exec trellis issue close TRL-166 --confirm
```

Behavioral:

- [ ] Post-start head check ignores own promote lifecycle ops
- [ ] Issue-branch lanes promote without abort thrashing
- [ ] Foreign integration writes during promote still abort
- [ ] TRL-166 spec parent closes post-impl
