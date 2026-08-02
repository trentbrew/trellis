# Lane GC Regression — Recovery Findings & Plan

> **Date:** 2026-08-02
> **Status:** Investigation complete — recovery **not yet executed**
> **Reporter:** OpenCode session `ses_03bad3940ffeTR5fmNiEN7nH1I` (misc profile, lane `lane-5bb3f9d7`)
> **Related:** TRL-407/408/409 (lane gc + session-end disposition), TRL-422 (wedge gallery), ADR 0014

## 1. What happened (the regression)

The trellis-node `main` branch lost ~100 files of kernel work in a botched
lane-gc reshuffle:

1. Commit `9801056` ("TRL-409: Impl: trellis lane gc + session-end lane
   disposition") bundled **two independent bodies of work**:
   - the lane-gc code (TRL-407/408/409), and
   - ~100 files of kernel work (headless cores: colorpicker/kanban/table/
     upload/undo-history/editor, the ADR 0034 inspector registry +
     entries, demos, docs, tests).
2. A `git reset` back to `d7a4204` followed, then re-commits
   `0e4c332 → bc302a8 → 54fdc04` that carried **only the lane-gc files**,
   dropping the ~100 kernel files from `main`.

**Recovery status:** all dropped files are intact in `9801056` (reachable
from 7 lane branches) and on disk in lane worktrees. The `justfile` was
never lost (false alarm — matches HEAD, 32 recipes). This was a
main-branch **regression**, not data loss.

## 2. Topology (verified read-only, 2026-08-02)

- Common ancestor of `HEAD` and `9801056`: **`d7a4204`** (direct parent of
  `9801056`; ancestor of `HEAD`).
- Files changed on **both** sides since `d7a4204` (true 3-way conflict
  set, 9 files):
  `src/cli/lane.ts`, `src/engine.ts`,
  `src/inspector/react/hooks/use-inspector-state.ts`,
  `src/inspector/react/types.ts`,
  `src/inspector/registry/inspector-registry.ts`,
  `src/vcs/decompose.ts`, `src/vcs/lane-gc.ts`, `src/vcs/types.ts`,
  `test/vcs/lane-gc.test.ts`.
- Files changed **only in `9801056`** (pure kernel restore, no conflict):
  **150 files**.
- `9801056` parent = `d7a4204`; `HEAD` parent = `bc302a8`.

### Per-file divergence verdicts

| File | Verdict | Evidence |
| ---- | ------- | -------- |
| `src/vcs/lane-gc.ts` | **Keep HEAD** | byte-identical to 9801056 (0 diff lines) |
| `test/vcs/lane-gc.test.ts` | **Keep HEAD** | byte-identical to 9801056 (0 diff lines) |
| `src/vcs/decompose.ts` | **Keep HEAD** | HEAD is superset: has `vcs:laneGc` + `vcs:repoAttest` cases; 9801056 lacks them |
| `src/vcs/types.ts` | **Keep HEAD** | HEAD is superset: has `vcs:laneGc`, `vcs:repoAttest`, `gcDisposition`/`gcReason`, ADR 0031/32 `repoId`/`repoOwner`/`repoName`/`project` fields; 9801056 lacks them |
| `src/engine.ts` | **3-way merge** (base `d7a4204`) | Genuine two-way divergence: HEAD has lane-gc + 54fdc04 tsc fixes + ADR 0031/32 identity/project work (`resolveRepoIdentity`, `createProjectAttestation`); 9801056 has kernel work (`loadIdentity`, `startWatcherAt`, `integrateOps`, blob-resolver wiring). 194 HEAD-only lines |
| `src/cli/lane.ts` | **3-way merge** (base `d7a4204`) | Same shape: HEAD has lane-gc + tsc fixes; 9801056 has `--dev` dashboard mode, `--force-lock`, richer status output. 159 HEAD-only lines |

### The inspector fork (not a merge — a fork)

`HEAD` and `9801056` contain **two different inspector architectures**:

| | HEAD (old) | 9801056 (new, ADR 0034) |
| --- | --- | --- |
| Files | `inspector.ts`, `react/*`, `hooks/`, `types.ts` | `dom.ts`, `entries/{colorpicker,combobox,dialog,editor,forms,kanban,palette,table,timeline,undo-history,upload}.ts` |
| Registry API | `getComponentTypes`/`getRenderer`/`isRegistered`/`clear`, `defaultDescriptor` | `listComponents()`, `create()`, `defaultConfig`, `actions`, `GalleryAction`, `HeadlessFramework`, `VisualRenderer<TConfig,TCore>` |
| Consumers | nothing outside the module (verified via `git grep`) | **the wedge gallery** (TRL-422) imports it |

**The wedge decides the direction.** `demo/wedge-smoke/gallery.ts`
(in-flight, uncommitted) imports `../../src/inspector/index.js`
(`inspectorRegistry.listComponents()`), `../../src/inspector/entries/index.js`
(side-effect registration of 11 cores), and `RegisteredComponent.create/`
`defaultConfig` — all 9801056-only API.

**Critical trap:** `54fdc04` gutted `src/headless/core.ts` to
`HeadlessCore<T> = any` + `HeadlessComponentType = string` to silence the
*old* inspector's tsc errors. 9801056 (and `d7a4204`) carry the real ADR
0034 contract: `HeadlessCore<S>` interface + the 14-type
`HeadlessComponentType` union. A naive "restore only the 150 files"
would **miss `src/headless/core.ts`** (it changed only on HEAD's side), so
it must be **explicitly** restored. The wedge's `inspect.ts` imports
`HeadlessCore`; the entries' cores implement the real contract.

## 3. Recovery plan (not yet executed)

1. Restore the **150 files only-in-9801056** wholesale from `9801056`.
2. Keep HEAD for: `lane-gc.ts`, `lane-gc.test.ts`, `decompose.ts`,
   `types.ts`.
3. 3-way merge (base `d7a4204`, keep kernel work from 9801056 + lane-gc/
   tsc fixes from HEAD): `src/engine.ts`, `src/cli/lane.ts`.
4. Inspector fork:
   - Restore 9801056 wholesale: `src/inspector/index.ts`,
     `src/inspector/registry/inspector-registry.ts`, `src/inspector/dom.ts`,
     `src/inspector/entries/*`, **`src/headless/core.ts`** (explicit!).
   - **Delete** HEAD-only old architecture: `src/inspector/react/*`,
     `src/inspector/inspector.ts`, `src/inspector/types.ts`,
     `src/inspector/hooks/*`.
5. Verify: `pnpm check`, `pnpm test`, then rebuild `gallery.js` via
   `pnpm smoke:wedge` and verify the wedge renders in-browser.

### Open questions for execution

- Did `54fdc04`'s tweaks to `src/combobox/*`, `src/dialog/svelte/index.ts`,
  `src/forms/svelte/index.ts`, `src/palette/svelte/index.ts`,
  `src/timeline/svelte/index.ts` (2–6 lines each) accommodate the gutted
  types? They need re-checking against the restored real contract.
- Exact `src/headless/index.ts` / `src/headless/store.ts` diff between
  trees (both export `HeadlessCore`-adjacent surface).

## 4. Systemic hazards found (all still live)

1. **`git add -A` in `syncIntegrationToGit`** (`src/git/git-sync.ts`) sweeps
   ALL dirty/untracked files into promote/close commits — a direct
   violation of ADR 0014 ("Never `git add -A` on the shared tree").
   `syncIntegrationToGit` also does `git checkout ${branch}` +
   `materializeToDisk(rootPath, …)` on the **shared root**, so the per-lane
   worktree isolation is bypassed wholesale. This is the proximate cause
   of the 100-file bundle.
2. **`removeLaneWorktree`** → `git worktree remove --force` + `git branch -D`
   force-deletes lane branches with unmerged work.
3. **Lane GC dispositions** (`drop`/`garden`) auto-executable with
   `--apply`; only an op-count dirty-guard exists (0-op lanes drop
   silently). `promote` disposition auto-promotes on GC.
4. **Git mutation guard is shell-level only** (Cursor/Claude/OpenCode
   hooks) — a forced/direct git command bypasses it. There is no git-native
   hook layer and no reconcile check.
5. **Sprawl**: 300 lane journals (241 active), 245 `worktreePath` metas,
   180 git worktrees, 211+ `lane/*` branches. The git layer is a 1:1
   redundant clone of the journals; the worktrees are mostly stale shells
   sitting at base commits with 0–1 dirty files.

## 5. Decisions made (session 2026-08-02)

- **W3 direction: journal-only lanes.** Lane = `.trellis/lanes/<id>/`
  journal only. No per-lane git branch, no per-lane worktree. Git mirrors
  `main` only, from blobs, on promote/close. In-flight work never lives in
  git, so a reset cannot strand it.
- **Recovery first:** Phase 0 (this document's plan) executes before any
  refactoring.
- **Detect over sandbox:** `trellis git verify` reconcile check + git-native
  pre-commit/pre-push hooks (trailer-gated) rather than trying to make
  git commands impossible.

## 6. Follow-up

Scoping a custom opencode fork (or pi / little-coder harness) that
automates lane handling end-to-end: automatic lane create/enter/promote/
drop, visual lane indicators, and Trellis affordances for multi-agent
desks. See `docs/planning/lane-agent-experience.md` for the broader agent
experience context.
