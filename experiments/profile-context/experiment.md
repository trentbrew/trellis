# Profile-context injection — empirical eval (TRL-335)

**Status:** running (L1 gate passed · L2 baseline pending)
**Hypothesis:** Budgeted `~/.trellis/profile.json` injection at session boot improves preference adherence without unacceptable context bloat.

## Variants

| id | env | injection surface |
| -- | --- | ----------------- |
| `off` | `TRELLIS_PROFILE_CONTEXT_ARM=off` | control |
| `session` | `=session` | `buildSessionStartContext()` + scaffold pre-prompt-recall |
| `pack` | `=pack` | `trellis context pack` user slice |
| `both` | `=both` | session + pack (redundancy test) |

## L1 — frozen corpus (automated)

```bash
# From trellis-node root
trellis eval profile-context --arm off --trials 3
trellis eval profile-context --arm session --trials 3
bun experiments/profile-context/check.ts
```

Corpus: [`corpus/tasks.jsonl`](corpus/tasks.jsonl) (frozen 2026-09-23, 15 tasks).

### L1 results (2026-09-24)

| arm | smoke (no profile) | rubric pass |
| --- | ------------------ | ----------- |
| `off` | 15/15 | 8/15 (53.3%) |
| `session` | 15/15 pass overall | 15/15 (100%) |

`bun experiments/profile-context/check.ts` → **PROMOTE** on rubric adherence. Default arm remains `off` until L2.

Committed manifest: [`runs/manifest.jsonl`](runs/manifest.jsonl).

## L2 — live multi-IDE (manual cohort)

Run matched wedges with env arm pinned per session. Record outcomes in `~/.trellis/profile-context-eval/events.jsonl`.

### Cursor

```bash
export TRELLIS_PROFILE_CONTEXT_ARM=off
/tr-pipeline
# complete one wedge, note issue id + REJECT/HANDOFF outcome

export TRELLIS_PROFILE_CONTEXT_ARM=session
/tr-pipeline
# repeat comparable wedge
```

### OpenCode / Pi

Same env var — plugins call shared `buildSessionStartContext()` from `~/.cursor/hooks/trellis-session-context.mjs`.

```bash
export TRELLIS_PROFILE_CONTEXT_ARM=session
# opencode or pi session with /tr-pipeline bind
```

### Report

```bash
node ~/.cursor/scripts/profile-context-report.mjs --days 14
```

## L2 results (pending)

| arm | IDE | slices | REJECT rate | re-ask | notes |
| --- | --- | ------ | ----------- | ------ | ----- |
| off | Cursor | — | — | — | baseline week |
| session | Cursor | — | — | — | |
| session | OpenCode | — | — | — | |

## Promotion decision

- **Gate:** `experiments/profile-context/check.ts` (L1) + 14d L2 report
- **Default arm stays `off`** until gate passes
- Record promote/hold in `docs/performance/experiment-inventory.md` when decided

## Metrics

**Outcome:** preference rubric pass (L1), issue REJECT rate (L2), human re-asks
**Process:** `profile_context_chars`, `context_chars` (pipeline-benchmark), `profile_learnings_count` cohorts
