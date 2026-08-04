# Trellis TUI Fork — Harness Integration Cycle

> **Date:** 2026-08-02
> **Status:** Executing (Step 0 done → Phase 1)
> **Repos:** trellis-node (kernel/authority) + turtlecode/ide (`packages/opencode` fork, the desk harness)
> **Relates:** `docs/planning/trellis-opencode-fork-scope.md` (superseded by this doc's decisions),
> `docs/planning/lane-gc-regression-recovery.md` (TRL-409 incident), ADR 0014, ADR 0015, ADR 0036

## 1. Purpose

The Turtlecode fork (`turtlecode/ide/packages/opencode`, a deep opencode fork with a custom
`@opentui` TUI, whole-TUI rewrite, vendored providers) becomes the daily-driver desk harness for
Trellis development. The fork gets subtle Trellis affordances for pipeline, VCS, and lifecycle —
**real in-core hooks**, not the plugin API (this fork's plugin API cannot block tools).

## 2. Layer split (the enforcement architecture)

```
CONFIG/CONSENT     .trellis policy: hard-deny rules, GC-confirm, transcripts.enabled (default off)
KERNEL (trellis-node)  the authority — owns the rules and the state
   canToolRun(tool, args, ctx) → { allow } | { deny, reason } | { redirect } | { prompt, confirm }
   backed by: lane metas, ownership leases, promote locks, signing material, op-log
HARNESS (fork)     the mechanics only — hook dispatcher calls canToolRun synchronously
                   at preToolUse; zero policy logic in the fork
```

- **One rulebook, every harness.** Cursor/Claude/vanilla-opencode desks call the same
  `canToolRun`; rules are written and tested once, in the kernel where the state lives.
- **Kernel is not an execution point.** It cannot *prevent* a raw `git reset` — prevention is
  layered (zsh alias + PATH shim for the human's hands, fork gate for harness tools) and the
  kernel provides **detection** (watcher flags writes, refuses to journal, blocks promote of
  unjournaled state). Destruction is made *hard*; the lane journal makes it *irrelevant*
  (git is a rebuildable blob-tree mirror per ADR 0014, never the carrier of record).
- **One confirm pipeline.** GC-confirm, hard-deny, and web-app surfaces share one decision
  function so behavior cannot diverge between TUI and Studio.

## 3. Resolved decisions

1. **Enforcement posture: hard-deny.** Destructive git on Trellis-owned trees is denied at the
   tool executor; the sanctioned path is `trellis lane promote` / CLI. Shell hygiene layer
   (zsh alias + PATH shim) added alongside — covers the human's own terminal, is not relied on
   alone.
2. **Promote policy (revises fork-scope decision #2):** *session-end = checkpoint-only*
   (never auto-promote on session end — unchanged); *promote = explicit and AC-gated* —
   auto-promote is sanctioned only as part of `issue close --confirm` after acceptance
   criteria pass, or via explicit `lane promote`. One confirm pipeline.
3. **Headless-first.** Every feature lands in three beats: (a) kernel authority headless +
   unit tests, (b) fork plumbing headless against `Session` (scripted, assertable), (c) TUI
   chrome as the last 10%. The versioned hook-event schema is the stable contract.
4. **Fork stays standalone.** Squashed history, no upstream remote. Cherry-pick critical
   upstream opencode fixes only. Thin-fork discipline (plumbing only, logic in kernel) keeps
   drift cost low. The bin does NOT move into the kernel — kernel exports the contract
   (`canToolRun`, hook schema, op kinds, SDK, MCP); the fork consumes via `sync-trellis-core.ts`
   (`TRELLIS_PACKAGE` override) or npm dist.
5. **Transcripts are a gated op kind.** `chat:message` op kind exists in schema; recording
   gated by `transcripts.enabled` (default **false**); transcript ops are **local-only by
   default** (excluded from peer sync) unless a team opts in. Privacy is the default; sync is
   the decision.
6. **Plan-first is a fork feature.** Before executing a cycle: write/update the plan doc,
   create one Trellis issue per phase with acceptance criteria. A soft plan-first nudge fires
   in sessions with no active issue (nudge, not gate — gates are reserved for destructive ops).
7. **Image analysis is first-class, model-agnostic.** Pasted image → `beforeSubmitPrompt`
   hook → configured analyzer script (stdin: image bytes; stdout: text) → result injected as
   context. Config: `{ "image": { "command": ["ollama", "run", "gemma4"], ... } }`. Template
   for future script-backed analyzers.

## 4. Phases

| Phase | Scope | Deliverables |
| ----- | ----- | ------------ |
| **0** | Desk switch | Local kernel wiring via `sync-trellis-core.ts` (`TRELLIS_PACKAGE`), fork boots as daily driver, session starts in a lane, ops journaled, tree clean |
| **1** | Authority + hooks | Kernel `canToolRun` module + unit tests; `chat:message` op kind (gated, default-off, local-only); fork hook dispatcher (sessionStart/preToolUse/postToolUse/beforeSubmitPrompt/preCompact/stop) wired into `Session` headless; hard-deny gate; session→lane ownership; end-checkpoint; plan-first nudge |
| **2** | Desk affordances | Lane badge + dirty state (footer), whereami re-entry banner, presence panel ("who's here / why"), token rollup per session+lane → EAV, decision-chain view, **lane-op commands + buttons** (promote AC-bound, issue check/close, milestone, garden, lane status), TUI sdiff view (stretch) |
| **3** | Memory & context | @mention graph-entity picker (extends existing autocomplete), kernel context pack in system prompt, `trellis search` as TUI command, pruning policy via preCompact + heat-map, **image analyzer** (ollama/gemma) |
| **4** | Workspace | **Tabs as session entities** (spawn/destroy/lifecycle/naming, DB-backed hydration, render-active-only, soft cap ~8 LRU), transcript wiring, garden revive; pull explorer/editor chrome from parking lot here if the tab surface proves it |

Each phase = one Trellis issue with acceptance criteria (`--ac`).

## 5. Phase 0 operational notes (learned 2026-08-02)

- **Wire command:** `TRELLIS_PACKAGE=/Users/trentbrew/TURTLE/Projects/TRELLIS/trellis-node bun script/sync-trellis-core.ts --skip-trellis-test`
  (trellis-node runs vitest; the script's `bun test` step only works for the trellis-package repo layout).
- **The script's final verify step is stale:** it checks `ide/node_modules/trellis` at the workspace root,
  but bun hoists per-package — the live link is `packages/opencode/node_modules/trellis` → bun cache.
  Expect the script to "fail" at step 4/6 and verify the symlink manually.
- **bun caches `file:` deps by content-hash of package.json, not dist.** After rebuilding trellis-node's dist,
  delete `node_modules/.bun/trellis@file+...TRELLIS+trellis-node*` + the package symlink, then `bun install`
  (full workspace reinstall ~7 min) — otherwise the fork keeps running the stale kernel.
- **Authority availability check:** `grep -c cwdOf packages/opencode/node_modules/trellis/dist/chunk-*.js`
  (the authority lives in a chunk, not dist/vcs/index.js).
- **Pre-existing fork test failures (not kernel regressions):** `test/trellis/semantic-links.test.ts`
  (2) — `parseSemanticLinks` frontmatter parse is a pure function, broken in HEAD (branch `dialog` WIP);
  plus env-dependent failures (tts/music/ripgrep/bridge) unrelated to hooks.

## 5. Known kernel gaps to close (verified)

- No `canToolRun` / decision authority module (build fresh)
- No `chat:message` op kind; no `trellis op add` (build both)
- No token accounting (kernel-side aggregation per session/lane; fork has per-message usage)
- No @mention parser (kernel has `[[wiki-links]]` only — `src/links/parser.ts`)

## 6. Parking lot

- **Neovim embedding** — pty surface, keymap conflicts, state sync; only if TUI sdiff view proves insufficient
- **Explorer/editor chrome in TUI** — "real development demands it" (user-confirmed) but deferred; pull at Phase 4+ when the tab surface proves it; Warp.app is the reference shape
- **Kanban in terminal** — belongs in web app (`packages/app`) / Studio, not a terminal pty
- **Upstream opencode tracking** — rejected; standalone + cherry-picks
- **TUI tab limit tuning, multi-agent desk (fork-scope Phase C):** presence contention, handoff affordances (ADR 0015) in-TUI
