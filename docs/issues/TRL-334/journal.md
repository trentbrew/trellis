# TRL-334 journal

## 2026-09-22 — H2 typed graph tools landed (executor)

- `registerTypedGraphTools` + `createDevtoolsLLMProvider` shipped in trellis-node
  (`src/core/agents/typed-graph-tools.ts`, `src/llm/devtools-provider.ts`).
- Agent read surface is **typed** (`list_entities`, `get_entity`) — no freeform
  EQL-S in harness tools; kernel IR unchanged for Studio/SDK.
- os eval default arm promoted to typed graph; frozen EQL-S baseline =
  `--arm=graph-strict` (see `experiments/graph-vs-shell/LOCAL-EVAL-2026-09-22.md`).
- CI: `pnpm test` now includes `test/llm`, `test/blobs`, and
  `test/sync/sync-checkpoint.test.ts` (not full `test/sync` — Bun-only sqlite
  reader tests stay on the p7/bun path).

## 2026-09-15 — Spec refresh (architect)

- Re-scoped TRL-334 into four executor slices; parent TRL-333 goals unchanged.
- Documented existing partial impl (types, daemon tests, audit-trail module).
- Flagged duplicate graph AC rows for cleanup before impl handoff.
