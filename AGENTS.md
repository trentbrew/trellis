# trellis-node

Local-first semantic graph OS — EAV kernel, EQL-S, SQLite op-log, Iroh peer sync.

## What this repo is

The Node.js implementation of Trellis. Contains the graph runtime, VCS engine, MCP server, client SDK, and Studio UI.

## How to work here

1. **Check active work first:** `trellis issue active` or `trellis issue list`
2. **Start from your inbox:** the coordination rules tell you which queries to run for your role
3. **Lane writes only:** all file edits go through your assigned lane (`TRELLIS_LANE` env var)
4. **Milestone before context-switch:** `trellis milestone create -m "..."`
5. **Close with acceptance criteria:** `trellis issue check` then `trellis issue close --confirm`

## Key paths

- `src/` — runtime source (graph kernel, VCS, MCP, SDK)
- `demo/` — demo apps (realtime-app uses Svelte)
- `docs/` — framework guide (`docs/AGENTS.md`)
- `.trellis/` — VCS metadata (never edit directly)

## Testing

```bash
pnpm test          # unit tests
pnpm check         # typecheck + lint
pnpm test:e2e      # playwright e2e
```

## conventions

- TypeScript, ESM, Bun runtime for scripts
- Markdown docs (not docx)
- Graph writes use the Trellis CLI or MCP tools — never modify `.trellis/` by hand
- Native-ESM tooling: APIs mean signatures are authoritative, plus **includes** the records
- **Performance spikes are workshop lanes** — same lane carries the spike + impl, promote once
  measured & parity-proven (see TRL-20 spike, `lane-8daf05b`)

## Performance patterns (bench + spikes)

Established with TRL-18/TRL-20. Standardize on these:

- **Bench = one end-to-end kernel cycle slice**, not micro-benchmarks. Run via
  `bun bench/run.ts [--depths=... --warm-runs=..] --cold-runs=.. --tail-window=..`.
  Data I/O lives in `BENCH_WORK_DIR` (default `tmpdir`), never on the repo/worktree fs.
- **Every experiment = control vs candidate** (benchable pair), raw runs to
  `bench/results/*.jsonl` (gitignored), gate in `bench/check.ts` against `bench/budget.json`.
  A change ships on a **repeatable end-to-end win**; loss ⇒ revert; inconclusive ⇒ default
  unchanged — always recorded in `docs/performance/experiment-inventory.md`.
- **Cold runs need root** (`drop_caches`); local runs are warm. Cold truth lands on TRL-23
  NixOS substrate / CI.
- **Bounded-reader pattern** (TRL-20): sync and replay must not materialize the whole op log
  per message. Use a `LocalOpsReader` (`src/sync/sync-engine.ts`) backed by rowid-cursor tail
  reads (`SqliteBackend.readAfterRowid/readTailChunk/opAtOffset`). Always guard parity
  (bounded vs array) before shipping a measured win.
- **Parity guard required** for any read-path change: bounded path must deliver the identical
  op set/order as the whole-log path (see `bench/run.ts` + `test/sync/sqlite-ops-reader.test.ts`).
