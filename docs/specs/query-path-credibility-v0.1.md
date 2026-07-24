# Spec: Query path credibility — agent hints + labels probe (v0.1)

**Status:** Spec · **Date:** 2026-07-24\
**Proposal:** TRL-282 · **Builds on:** TRL-283/284 (query-path-stress v0)

> v0 shipped the regression battery. v0.1 makes harness output **agent-legible**:
> explicit link-direction guidance, labels storage reality, and a CLI cookbook
> footer — without changing EAV schema or admin WebDriver routing.

---

## 1. Problem

Desk stress (2026-07-24) and agent sessions show recurring mistakes:

| Mistake | Reality |
| ------- | ------- |
| Query `parentOf` links | Graph stores **`childOf` only** (parent is object of triple) |
| Expect Decision rows on cold desk | Zero `vcs:decisionRecord` ops = **adoption**, not projection bug |
| Filter `labels` like a set | Labels stored as **comma-separated string** on Issue entity |

v0 checks encode some of this in per-check `detail` strings; agents still miss the pattern when scanning pass/fail only.

## 2. Goals

1. **`issue.labels_scalar` check** in `runQueryStress` — sample Issue with labels; detail documents scalar/comma storage and query implication.
2. **CLI hints footer** — after human report (non-`--json`), print 3-line agent cookbook:
   - Hierarchy: `childOf` not `parentOf`
   - Decisions: materialize via `recordDecision` / MCP
   - Regression: `just check` / `trellis query-stress`
3. **Vitest** — fixture asserts new check present; CLI footer covered by unit test on exported hint helper (if extracted) or snapshot of `formatQueryStressHints()`.
4. **Spec cross-ref** — update `docs/specs/query-path-stress-v0.md` §4 checks table with v0.1 row.

## 3. Non-goals

- Admin `WebDriver` / `evaluateQuery` → PeerDriver flip (separate epic)
- Labels-as-set schema migration
- New EQL-S syntax

## 4. Design

### 4.1 Labels probe

In `src/query/stress.ts`:

```ts
// issue.labels_scalar
// Query one Issue with labels fact; detail:
// "labels stored as comma-separated string (not set); use substring/LIKE filters"
```

Pass when query runs (count ≥ 0). If no labeled issues, detail still documents storage model.

### 4.2 Hints footer

Extract `formatQueryStressHints(): string[]` (3 strings) from CLI module or `stress.ts`.  
`query-stress.ts` prints after check list when not `--json`.

### 4.3 Tests

| File | Assert |
| ---- | ------ |
| `test/query/query-path-stress.test.ts` | `issue.labels_scalar` check exists; detail mentions comma |
| `test/query/query-path-stress.test.ts` or `test/cli/query-stress.test.ts` | hints helper returns childOf + Decision lines |

## 5. Files

| File | Change |
| ---- | ------ |
| `src/query/stress.ts` | `issue.labels_scalar` check |
| `src/cli/query-stress.ts` | hints footer |
| `test/query/query-path-stress.test.ts` | new assertions |
| `docs/specs/query-path-stress-v0.md` | checks table note |
| `docs/specs/query-path-credibility-v0.1.md` | this spec |

## 6. Acceptance criteria

- `pnpm check`
- `just check`
- `pnpm exec vitest run test/query/query-path-stress.test.ts`
- `issue.labels_scalar` check documents comma-string labels
- CLI prints agent hints footer (non-json)
