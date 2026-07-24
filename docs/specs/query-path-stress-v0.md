# Spec: Query path stress harness (v0)

**Status:** Spec · **Date:** 2026-07-24\
**Proposal:** TRL-282

> Regression guard for the agent-facing query path: EQL-S over materialized
> EAV, hierarchy links, and context pack budget — not TML `evaluateQuery`.

---

## 1. Problem

Desk stress test (2026-07-24) found:

- CLI `trellis query` is fast and correct on Issues (~125 entities, sub-3ms)
- `childOf` works; agents guess `parentOf` and get empty results
- Decision entities exist in decompose but desk had zero `vcs:decisionRecord` ops
- Admin default `WebDriver` still uses snapshot `evaluateQuery` (separate track)
- No CI guard when projection or parser regresses

## 2. Goals

1. **`runQueryStress(engine)`** library in `src/query/stress.ts`
2. **`trellis query-stress`** CLI — human/agent runnable on any repo
3. **Vitest fixture** — seeds parent/child issue + decision, requires childOf +
   Decision projection
4. **Optional live test** — passes on `trellis-node` when `.trellis` present

## 3. Non-goals

- PeerDriver default flip (admin shell — separate issue)
- `.tml` compiler
- File entity projection
- Labels-as-set query ergonomics

## 4. Checks (v0)

| Check | Pass condition |
| ----- | -------------- |
| `issue.type` | Query runs; count ≥ 0 |
| `issue.status_filter` | `in_progress` filter runs |
| `link.childOf` | Query runs; `--require-child-of` fails if empty |
| `link.parentOf_absent` | `parentOf` returns 0 rows |
| `issue.priority_order` | ORDER BY priority runs |
| `decision.projection` | `--require-decisions` fails if empty |
| `context_pack.boot_budget` | boot pack ≤ budget |
| `issue.labels_scalar` | v0.1 — documents comma-string label storage |

See also: `docs/specs/query-path-credibility-v0.1.md` (agent hints footer).

## 5. Acceptance criteria

- `pnpm exec vitest run test/query/query-path-stress.test.ts` green
- `trellis query-stress` exits 0 on desk repo
- Fixture proves Decision queryable after `recordDecision()`
