---
title: Ship blocker — pre-existing pnpm check break + leaked cross-lane files
description: Root-cause fix (TRL-406) unblocking TRL-370 and identity wedge ships from shared pnpm check break and leaked lane files.
created: 2026-08-02
updated: 2026-08-02
status: proposal
---

# Ship blocker — pre-existing `pnpm check` break + leaked cross-lane files (2026-08-02)

**Status:** FIX ISSUED — TRL-406. Do not resolve in a lane that does not own the
leaked files without explicit user approval.

## What is blocked

Two wedges cannot ship because `pnpm check` exits 1 on integration type errors
in **other lanes' files**:

- **TRL-370 (docs spine)** — verification gate refuses HANDOFF until `pnpm
  check` exit 0. The wedge's own code (`.mjs` scripts, `.md` docs) passes in
  isolation.
- **Identity wedge** (see `docs/planning/identity-wedge-ship-blocker.md`) —
  lists the same files as its pre-existing break; primary blocker there is
  commit mechanics (empty lane journal), but the type break is shared.

## Root cause (shared across both wedges)

`pnpm check` fails on files that **no active wedge touched**:

| File | Error class |
|---|---|
| `src/cli/pipeline-cli.ts:278` | `Record<string, unknown>` not assignable to `Record<string, Atom>` in `updateEntity` |
| `src/cli/workflow-cli.ts:251` | same class |
| `src/core/agents/dag-scheduler.ts:188` | same class |
| `src/core/agents/worker-pool.ts:354` | same class |
| `src/combobox/core/index.ts:51,54` | `activeIndex` / `highlight` property mismatch |
| `src/sync/ws-transport.ts:121` | `SyncTransport` connect/disconnect signature |
| `src/ui/admin-kanban.ts` (+ `test/ui/admin-kanban.test.ts`) | **untracked** — leaked from another lane's worktree into the shared repo root |

Two distinct mechanisms are at play:

1. **Pre-existing integration type errors** (committed HEAD state) — the
   `updateEntity`/Atom signature drift, combobox props, ws-transport signature.
2. **Lane leak** — `admin-kanban.ts` + its test are untracked files written by a
   cross-domain session into the wrong lane (the exact failure class TRL-405,
   context-aware lane routing, is designed to prevent). They type-break
   `pnpm check` and are not owned by this wedge.

## Verified state (recorded)

- `node scripts/docs-frontmatter.mjs --check` → exit 0
- `node scripts/docs-index.mjs` → exit 0
- `git diff --name-only` shows TRL-370 changes are `.md` / `.mjs` / `justfile`
  only — none of the failing `src/` files are edited by this wedge.
- `pnpm check` error lines reproduced: the 6 files above, all untouched.
- `src/ui/admin-kanban.ts` + `test/ui/admin-kanban.test.ts` confirmed untracked
  via `git status --short`.

## Resolution (TRL-406)

1. Resolve the leaked `admin-kanban.ts` + test — commit under its **owning
   lane** or remove from the shared root.
2. Fix the pre-existing TS errors (or pin as accepted) so `pnpm check` exits 0.
3. Re-run the TRL-370 gate: `pnpm check` + `trellis issue check TRL-370`.

**Boundaries:** do not touch `.trellis/`; do not modify docs-spine wedge files
(`scripts/docs-*.mjs`, `docs/INDEX.md`, `llms.txt`, `docs/devlog/`,
`docs/FRONTMATTER.md`).

## Prevention (TRL-405)

Context-aware lane routing: when a request topic does not reference the active
lane's issue/domain, the agent must `trellis issue start` or `trellis lane
split` before any write — never write cross-domain into the bound lane. This
leak is the motivating case.
