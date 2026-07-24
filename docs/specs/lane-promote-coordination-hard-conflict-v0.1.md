# Spec: Lane promote — coordination hard-conflict skip (v0.1)

**Status:** Ready for impl  
**Date:** 2026-07-24  
**Proposal:** TRL-296  
**Parent:** TRL-286 coordination-metadata v0 (TRL-287/289)  
**Unblocks:** TRL-281, TRL-170 close (theme scrubber harden)

---

## 1. Problem

v0 shipped soft-conflict skip + stale **description** hard skip (`isIntegrationWinsStaleFact`).
Close on **TRL-281** still fails:

```text
[hard] issue:TRL-281.status
  Integration changed issue:TRL-281.status since fork
  integration: queue
  lane:        in_progress
```

Lifecycle flow:

1. `issue start` / lane journal records `status: in_progress` at fork time.
2. Reviewer / Strategist updates integration to `status: queue`.
3. Auto-promote on close treats stale lane `status` as **hard** blocking conflict.

Soft loop already skips `status` when the lane op did not write that attr.
The **addFacts hard loop** does not — only `description` gets integration-wins
treatment today.

Same class of bug will hit `startedAt`, claim fields, and strategist `describe`
when lane journal holds redundant lifecycle facts.

## 2. Goals

1. **Generalize integration-wins stale skip** — any `ISSUE_COORDINATION_ATTRS`
   fact where integration head diverged from fork base and lane value is stale
   must not emit a hard conflict and must not replay.
2. **Close path** — `trellis issue close TRL-281 --confirm` succeeds after
   `pnpm build` (CLI uses `dist/`).
3. **Regression safety** — real attribute edits (title, labels, code paths) still
   hard-conflict when integration changed since fork.

## 3. Non-goals

- Changing which ops route to integration vs lane journal
- Merging divergent coordination values (integration always wins)
- File conflict logic
- New coordination attrs beyond existing `ISSUE_COORDINATION_ATTRS` set

## 4. Design

### 4.1 Extend `isIntegrationWinsStaleFact`

File: `src/vcs/lane-promote.ts`

Today (description-only):

```ts
if (fact.a === 'description') {
  return headValue !== undefined
    && !atomsEqual(headValue, baseValue)
    && !atomsEqual(headValue, fact.v);
}
```

**Change:** for any issue entity fact where `ISSUE_COORDINATION_ATTRS.has(fact.a)` and integration head is defined and differs from the lane fact:

```ts
if (ISSUE_COORDINATION_ATTRS.has(fact.a)) {
  return headValue !== undefined && !atomsEqual(headValue, fact.v);
}
```

Keep the early exit `atomsEqual(headValue, fact.v)` at the top of the function.

Rationale: coordination metadata is integration-owned (see v0 spec §4.1). Lane
journal copies are orientation / lifecycle noise once integration head moved.

### 4.2 Hard loop unchanged structurally

`detectEntityConflicts` addFacts loop already calls `isIntegrationWinsStaleFact`
before pushing `hard`. No new branches required beyond the helper generalization.

Outer replay skip (lines ~452–461) uses `shouldSkipStaleLaneOp` — skips when
all addFacts are stale/redundant **and** all deleteFacts are stale coordination
deletes (`oldIssueStatus` on `issueUpdate`).

### 4.3 Allowlist (no change)

```ts
export const ISSUE_COORDINATION_ATTRS = new Set([
  'claimedLaneId',
  'claimedAt',
  'claimedSessionId',
  'status',
  'startedAt',
  'description',
]);
```

## 5. Tests (`test/p4/lane-promote.test.ts`)

| Test | Behavior |
| ---- | -------- |
| `stale lane status yields integration status` | Lane sets `in_progress`; integration later `queue` → 0 blocking, 0 replay, integration `queue` retained |
| `integration status wins over stale lane status` | Same scenario; dry-run + promote both clean |
| `non-coordination attr still hard-conflicts` | Lane + integration diverge on `title` → blocking hard remains |

Optional regression: fold existing describe tests still pass (description now
covered by generalized helper — behavior unchanged).

## 6. Files

| File | Change |
| ---- | ------ |
| `src/vcs/lane-promote.ts` | Generalize `isIntegrationWinsStaleFact` |
| `test/p4/lane-promote.test.ts` | Status stale + title still blocks |
| `docs/specs/lane-promote-coordination-metadata-v0.md` | Cross-link v0.1 hard axis |

## 7. Verification / close

After impl + `pnpm build`:

```bash
pnpm check
pnpm exec vitest run test/p4/lane-promote.test.ts
trellis issue close TRL-281 --confirm
trellis issue close TRL-170 --confirm
```

## Acceptance criteria

**Spec (static — architect gate):**

```text
test:pnpm check
test:pnpm exec vitest run test/p4/lane-promote.test.ts
```

**Impl (close gate — after build):**

```text
test:pnpm build && pnpm exec trellis issue close TRL-281 --confirm
```

Behavioral:

- [ ] Stale lane `status` (and other coordination attrs) do not hard-block promote
- [ ] Integration coordination values retained when lane fact is stale
- [ ] Non-coordination attrs (e.g. `title`) still hard-conflict when integration diverged
- [ ] TRL-281 + TRL-170 close succeeds post-impl
