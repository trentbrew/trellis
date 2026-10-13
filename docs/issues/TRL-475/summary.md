# TRL-475 — Spec: Formula core slice 2 (adapters + shablon wire)

**Parent:** TRL-470 · **Impl:** TRL-476 · **Depends on:** TRL-473 (slice 1, closed) · **ADR:** [0059](../../adr/0059-frozen-formula-core-dialect-adapters.md)

## Context

Slice 1 (`experiments/formula-core-v1`) proves parse/eval/serialize + corpus for three dialect tags. Slice 2 adds **explicit adapter modules** and wires **shablon** classification to the same semantics without breaking existing PB proxy tests.

## Goal

1. **Adapters** — thin `surface → IR → evaluate` entrypoints per dialect tag.
2. **Shablon bridge** — `src/formula/dialect.js` delegates CMS-compat classification to shared rules (Node-importable path from trellis-node experiment or duplicated minimal classifier kept in sync — prefer **file import** from `trellis` workspace path documented in impl).
3. **Corpus growth** — lift shablon 4a matrix rows into `matrix.jsonl` (classification + eval rows).
4. **Regression** — shablon `pb-formula-compat-unit` + `pb-schema-unit` unchanged green.

**Non-goals (slice 2):** kernel `ExprEvaluator` replacement, `trellis/cms` client migration, npm publish pin, TRL-471 pb-node.

## Deliverables

### 1. Adapter modules (`experiments/formula-core-v1/adapters/`)

| File | Export |
| ---- | ------ |
| `kernel-fn.ts` | `evaluateKernel(expr, ctx)` |
| `cms-brace.ts` | `evaluateCms(expr, ctx)` |
| `pb-compat.ts` | `evaluatePb(expr, ctx)` + `assertPbSurface(expr)` |

Each calls existing `parse(expr, dialect)` + `evaluate` from slice 1.

### 2. Public barrel (`experiments/formula-core-v1/adapters/index.ts`)

Re-export adapters + `classifyPbCompat(expr)` returning same labels as shablon `classifyFormula` for cms-numeric vs rich vs invalid on **pb-compat surface only**.

### 3. Corpus extension

Add ≥6 rows ported from shablon `dialect.test.js` expectations (ids prefixed `sh-`). Runner unchanged.

### 4. Shablon wire (`lab/oss/shablon`)

- Add dev dependency path or relative import documented in `src/formula/README.md` (slice 2): **optional** — if cross-repo import is impractical in CI, duplicate classifier logic in shablon with **shared corpus JSON** copied to both repos and a comment linking TRL-475.

Minimum AC: shablon tests pass; dialect behavior unchanged for Trellis schema guard paths.

### 5. Docs

- Update `experiments/formula-core-v1/SPEC.md` — adapter section.
- `docs/issues/TRL-475/journal.md` on impl hops.

## Acceptance criteria

**Spec (TRL-475):**

```text
test:test -f docs/issues/TRL-475/summary.md
test:npm run check
```

**Impl (TRL-476):**

```text
test:npm run check
test:npm run formula-core-v1-unit
test:test -f experiments/formula-core-v1/adapters/index.ts
test:sh -c "grep -rqE '(eval\(|new Function)' experiments/formula-core-v1 --include='*.ts' --exclude='*.test.ts' && exit 1 || exit 0"
test:cd ../../lab/oss/shablon && bun run pb-formula-compat-unit
test:cd ../../lab/oss/shablon && bun run pb-schema-unit
```

## Impl hints

- Keep zero runtime deps in formula-core experiment.
- AC runner cwd is the repo root (`manifestRoot = trellis-node`); shablon paths are repo-relative: `cd ../../lab/oss/shablon` (pre-verified green — formula 4 pass, schema 6 pass).
- Do not change proxy HTTP shapes in shablon — only formula/dialect layer.
