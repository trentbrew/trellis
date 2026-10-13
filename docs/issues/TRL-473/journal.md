# TRL-473 journal

## 2026-10-12 — executor · impl

- Added `experiments/formula-core-v1/` (IR, parse/eval/serialize, registry, SPEC.md).
- Corpus `matrix.jsonl` (14 rows, 3 dialects, 2 pb-compat reject rows).
- `formula-core-v1-unit` script; vitest include for `experiments/**/corpus/*.test.ts`.

## 2026-10-12 — executor · rework (TRL-473 REJECT)

- `null` IR literal; corpus `k-if-null`; SPEC null section.
- `evaluate.ts` exhaustive switch (no invalid `default` on `BinOp`).
- `check:experiments` + `tsconfig.experiments.json` gates `experiments/formula-core-v1/**`.
