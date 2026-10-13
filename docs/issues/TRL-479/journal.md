# TRL-479 journal

## 2026-10-12 — executor · impl (slice 3 graduation)

- Relocated `experiments/formula-core-v1` → `src/formula` (core, adapters, SPEC) and corpus → `test/formula` (runner + matrix) via `git mv`; experiments dir removed.
- Added `./formula` export (mirrors `./cms` shape) + `src/formula/index.ts` build entry; `build:formula` chained into `build`.
- `scripts/build-formula-amalgamation.mjs`: bundles `dist/formula/v1.js`, self-verifies import + `parse`/`evaluate`/`serialize` exports.
- Dropped `check:experiments` + `tsconfig.experiments.json`; `formula-unit` replaces `formula-core-v1-unit`; `test/formula` added to `test`; vitest include reverted to `test/**`.
- Evidence: `formula-unit` 25 pass / 1 skip · amalgamation smoke ok · `npm run check` exit 0.
