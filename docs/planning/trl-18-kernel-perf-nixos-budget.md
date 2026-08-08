---
title: Kernel performance budget substrate (NixOS)
description: Scope for adapting TurboFieldfare's hard-budget + end-to-end measurement discipline to the trellis kernel as a NixOS substrate.
created: 2026-08-08
updated: 2026-08-08
---

# Kernel performance budget substrate (NixOS)

Tracking epic: **TRL-18** · Plan: `docs/planning/trl-18-kernel-perf-nixos-budget.md`

Adopts the methodology of [TurboFieldfare](https://github.com/drumih/turbo-fieldfare)
(Gemma 4 26B-A4B in ~2 GB RAM) — hard budgets, explicit bounded I/O, end-to-end
gating, and an honest experiment inventory — for the trellis graph kernel as a
NixOS substrate on real machines.

## Why this exists

We are moving from "runs on this box" to "runs inside a declared budget on
unknown hardware." Two things are missing today:

- **No declared budget.** There is no enforceable, per-deployment memory/disk/CPU
  contract, and no measurement loop that fails a build when the kernel overruns
  it.
- **Whole-file read paths on the hot path.** `JsonOpLog.load()` reads the entire
  journal into memory (`src/vcs/op-log.ts:111`), mirrors do full restores, and
  sync catch-up can replay the whole log. As journals grow this becomes the
  `mmap` trap TurboFieldfare documented: cost timing owned by the OS, not by us.

## Reference: what TurboFieldfare actually did

From `docs/SYSTEM_DESIGN.md` + `docs/OPTIMIZATION_JOURNEY.md` (103 audited
experiments), the durable lessons:

| Lesson | Evidence | Kernel mapping |
| --- | --- | --- |
| Explicit bounded `pread` beats demand-paged `mmap` | Cold expert `pread` 2.79 ms vs demand-page 9.88 ms; streaming 0.50 → 3.97 tok/s | Bounded tail/range reads over whole-file loads (TRL-19, TRL-20) |
| LFU + recency tiebreak cache over LRU | I/O 72.6 → 64.8 ms/token in paired runs | Bounded hot-op cache A/B (TRL-21) |
| Coarse overlap, explicit ownership; fine-grained + speculative hurt | Speculative reads stretched prefill 82.5 → 123.6 s; coarse overlap won 4.404 → 4.736 tok/s | Epoch-batched Iroh sync, no speculative prefetch (TRL-22) |
| Local wins gate on end-to-end | RDADVISE, packed KV cache, monolithic fusions all reversed after full-path tests | Bench harness + CI gate decides (TRL-24) |
| Never materialize the whole artifact in heap | Repacker capped scratch at 524 KB; whole 15 GB checkpoint never materialized | Chunked tail reads; no full-table replays in heap (TRL-19, TRL-20) |
| Budget is a hard constraint, and measured | ~2 GB budget accounted per MiB (weights/KV/cache slots) | NixOS module budget + accounting (TRL-23) |

The method that mattered: profile the whole step → isolate the largest share →
reproduce real sizes/constraints → return to a clean end-to-end A/B.
A slice is "repeatable" only if its median survives alternating control/candidate
runs with cold caches.

## Scope

### In

- The six child workstreams (below), each with measurable ACs.
- A `docs/` scoping + methodology doc (this file) and an experiment inventory.
- NixOS module + benchmark/CI substrate matched to a real-machine target.

### Out

- Micro-optimizations with no end-to-end A/B slice.
- Tuning for a single hardware profile before the methodology lands.
- Prediction-driven I/O or sync prefetch (explicitly rejected by TRL-22).

## Bench step — locked (2026-08-08)

**Decision:** the bench step is **one kernel cycle**, transport-tolerant, not a
per-protocol benchmark. Realtime-sync and op-sync are *arrival sources* feeding
the kernel surface, not the skeleton of the harness.

```
kernel cycle = boot → load op-log/mirror → apply/merge inbound ops
             → serve fixed query mix → push/pull sync round → measure
```

- **Tiered arrival (locked):** Tier A (V1 op-path — `have/want/ops` and
  JSONL/SQLite replay) is the *runnable* first-pass corpus. Tier B (V2
  full-state — `graph-snapshot` via `VACUUM INTO`, `entity-delta`, `lane-journal`,
  per TRL-333/334) plugs into the **same bench slot** as an arrival mode once it
  lands. This keeps the frozen protocol exercised against real data now instead
  of waiting on an unbuilt wire.
- **Two arrival modes** every cycle must cover: `flood-cold` (K ops since head,
  late-joiner catch-up) and `live-trickle` (N small realtime-style batches).
- **Evidence from the sync hot path** (`src/sync/sync-engine.ts`,
  `src/sync/vcs-sync-peer.ts`): every message rebuilds the whole op set via
  `getOps()`, `handleWant` tails the log with `localOps.findIndex(hash)`
  (O(n) per request), and `handleHave`/`handleOps` build full `Set` pass each
  message. This is the app-layer `mmap` trap: cost scales with total history,
  not with what one sync needs. It is a first-order target for TRL-19/20 and
  must be visible in the `flood-cold` slice of the bench.

## Work items and surfaces

### TRL-19 — Bounded op-log tail reads (cold-path discipline)

Replace whole-journal/mirror loads with bounded range reads.

Surfaces: `src/vcs/op-log.ts`, `src/vcs/oplog-mirror.ts`, tail/lookbehind on
`Append*` ops. Guardrail: tail replay bytes identical to whole-file parse.

### TRL-20 — SQLite read-path scaling + chunked tail reads

Benchmark the read path at scale and add a streamed/chunked tail-read API so
the sync replay path never materializes the full table.

Surfaces: `src/core/persist/sqlite-backend.ts` (`readAll`, `readAfter`,
`readUntil*`, `findCommonAncestor`), `bench/` harness data.

### TRL-21 — LFU-with-recency hot-op cache experiment

A/B bounded LFU+recency cache behind the `OpLog` surface vs LRU vs none on a
realistic op/query mix with a cache-drop protocol. Keep only a repeatable
end-to-end win.

### TRL-22 — Coarse-overlap sync (epoch batching, no speculative prefetch)

Batch Iroh send+receive on commit epochs; overlap only at coarse boundaries;
explicitly no prediction-driven I/O.

### TRL-23 — NixOS budget substrate

NixOS module wrapping the kernel service with `MemoryMax`, CPU quota, and
`io.max` disk throttle; per-run accounting via cgroup v2 `memory.peak`
and `/proc` MaxRSS. Slow-disk/weak-host reproducible sim.

### TRL-24 — Golden A/B benchmark + CI budget corridor (+ bench harness)

- Bench step = **one kernel cycle** (see "Bench step — locked" above), tiered
  V1-now / V2-when-live, with `flood-cold` and `live-trickle` arrival modes.
- A/B runner alternating candidate/control with `drop_caches` between runs,
  medians reported.
- CI gate enforces a budget corridor.
- `docs/performance/` (static inventory) tracks measured pairs + outcomes.

Tracked under epic **TRL-18** as children: TRL-19, TRL-20, TRL-21, TRL-22,
TRL-23, TRL-24.