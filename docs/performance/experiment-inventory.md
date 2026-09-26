# Performance experiment inventory

Record promote / hold / revert decisions for measured changes.

| Date | Experiment | Control | Candidate | Result | Decision |
| ---- | ---------- | ------- | --------- | ------ | -------- |
| 2026-09-24 | Profile-context injection (`TRELLIS_PROFILE_CONTEXT_ARM`) | `off` | `session` | L1: session rubric 100% vs off 53.3% (`experiments/profile-context/check.ts` PROMOTE). L2 live cohort pending. | **HOLD default `off`** until 14d L2 report; opt-in `session` for cohort |
