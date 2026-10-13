# TRL-478 journal

## 2026-10-12 — architect · spec (slice 3)

- Spec authored: graduate `experiments/formula-core-v1` → `src/formula`; export `trellis/formula`; amalgamation `dist/formula/v1.js`; corpus → `test/formula`; drop experiments gate.
- Scope calls: shablon classify import deferred (no `trellis` dep in shablon yet — separate cross-repo wedge); kernel/CMS migration stays slice 4; no `sync-trellis-core` changes (consumer picks up `./formula` automatically).
- Impl child TRL-479 created (queue) with 7 machine ACs; shablon regression AC pre-verified green (4 pass / 6 pass).
