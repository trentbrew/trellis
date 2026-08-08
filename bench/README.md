# Bench: kernel-cycle measurement harness (protocol v1)

Tracking: epic **TRL-18** → **TRL-24** (bench step), plan
`docs/planning/trl-18-kernel-perf-nixos-budget.md`.

## Bench step — locked

One **kernel cycle**, transport-tolerant:

```
boot → load op-log/mirror → apply/merge inbound ops → fixed query mix → sync round
```

- **Arrival tiers** — Tier A (V1 op-path, JSONL + SQLite replay) is the runnable
  first-pass. Tier B (V2 full-state, TRL-333/334) plugs into the same bench slot
  as an arrival mode once live.
- **Arrival modes** — every cycle covers `flood-cold` (K ops since head,
  catch-up) and `live-trickle` (N small realtime-style batches).
- **Noise protocol** — alternate control/candidate, report medians + p95,
  `drop_caches` between cold runs (root; skipped with warning otherwise).
- **Budget accounting** — wall p50/p95, `/proc` VmRSS + VmHWM, page-fault
  style counters where available, io bytes where available.
- **Decision rule** — repeatable end-to-end win => ship; repeatable loss
  => revert; inconclusive => default unchanged, always recorded.

## Layout

```
bench/
  README.md        this file
  schema.ts        record schema + result writer + stats
  corpus.ts        seeded synthetic VcsOp corpus (deterministic)
  measure.ts       wall/RSS helpers + drop_caches
  run.ts           scenario runner (V1 slices) -> bench/results/*.jsonl
  check.ts         corridor gate against bench/budget.json
  budget.json      corridor lock (populated from first baseline)
```

## Usage

```bash
bun bench/run.ts --depth=1000,10000,100000 --warm-runs=5 --cold-runs=1
bun bench/run.ts --smoke                     # quick CI smoke
bun bench/check.ts --results=<file.jsonl>   # gate (respects budget lock)
```

`cold-runs` drops the OS page cache before each sample (needs root). Without
root the harness degrades to warm runs and flags `cold:'skipped'`.