---
title: Kernel performance experiment inventory
description: Measured pairs and outcomes for kernel experiments (TurboFieldfare-style), gated end-to-end.
created: 2026-08-08
updated: 2026-08-08
---

# Kernel performance experiment inventory

Decision rule: a change ships on a **repeatable end-to-end win** in the bench
step (see `docs/planning/trl-18-kernel-perf-nixos-budget.md`). Repeatable loss
⇒ revert; inconclusive ⇒ default unchanged — always recorded.

Raw runs: `bench/results/*.jsonl` (schema in `bench/schema.ts`, gate in
`bench/check.ts`).

## Baseline (warm, synthetic corpus, trellis-desk-4)

First pass of the locked kernel-cycle bench on the V1 read path
(`bun bench/run.ts --depths=10000,100000 --cold-runs=0 --warm-runs=3`,
`rev=660d8b3`). Cold/root runs deferred to the TRL-23 NixOS substrate.

| Depth | Backend | Knob | p50 wall | RSS peak | Notes |
| --- | --- | --- | --- | --- | --- |
| 10,000 | jsonl | load (whole file) | 18.0 ms | 164 MB | cold-path target (TRL-19) |
| 10,000 | sqlite | readAll | 24.1 ms | 191 MB | full-table replay |
| 10,000 | sqlite | readAfter (tail 1k) | 1.35 ms | — | bounded tail |
| 100,000 | jsonl | load (whole file) | 264.6 ms | 570 MB | grows ~linearly with history |
| 100,000 | sqlite | readAll | 529.8 ms | 742 MB | **materializes ~740 MB heap** |
| 100,000 | sqlite | readAfter (tail 1k) | 1.4 ms | — | bound ~fixed by window |

## Finding (feeds TRL-19/20/21)

- **`readAll` at 100k ops blows the budget**: ~530 ms wall and ~740 MB peak
  RSS just to replay history into heap — the app-layer `mmap` trap, now
  quantified on our kernel. A 1k `readAfter` tail is ~1 ms.
- `jsonl load` is O(total history): 18 ms @10k → 265 ms @100k (≈15x for 10x
  depth). Bounded tail reads should make catch-up O(window), not O(history).
- RSS coupling: because tail samples share the process after `readAll`, peak
  RSS is polluted by the preceding slice. Isolate tail memory in a subprocess
  for clean numbers (TRL-24 harness note).

## Outcome log

| Date | TRL | Hypothesis | Variant | Baseline | Candidate | Parity | Outcome | Repro |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-08-08 | TRL-24 | Baseline V1 read path | control | — | see table above | n/a | baseline | `bun bench/run.ts --depths=10000,100000 --cold-runs=0 --warm-runs=3` |