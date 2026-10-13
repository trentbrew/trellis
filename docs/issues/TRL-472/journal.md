# TRL-472 journal

## 2026-10-12 — architect · spec

- Opened spec from TRL-470 / ADR 0059.
- Scoped **slice 1** to `experiments/formula-core-v1` + corpus + `SPEC.md`; adapters and shablon wire-up deferred to slice 2.
- Machine AC: summary on disk, `formula-core-v1-unit`, `npm run check`.

## Teach

Slice 1 proves the **corpus contract** before any production import path moves. Adapters translate surface syntax to one IR; the runner is the gate.
