# ADR 0038: Git-authoritative file tier — op-log demoted to non-materializing provenance

**Status:** Accepted (Phase 1 implemented, 2026-08-04)
**Date:** 2026-08-04
**Supersedes:** [0037](./0037-graph-native-write-path-opt-out-capture.md) (capture model),
file-authority clauses of [0014](./0014-git-materialization-and-lane-worktrees.md)
(git as rebuildable mirror), replay-promote clauses of [0002](./0002-workspace-promote-algorithm.md)
**Related:** `docs/planning/git-ssot-fault-line-checkpoint-2026-08-03.md` (dual-SSoT fault line),
`docs/planning/lane-nuke-and-recovery-2026-08-04.md` (cost data),
ADR 0031/0032 (ledger identity, person identity)

**Impacted components:** `src/engine.ts` (`journalWorkingTreeToOps`,
`syncGitIntegration`, `materializeLaneWorktree`, `indexExistingFiles`),
`src/watcher/*` (file-op emission), `src/vcs/lane-disk-materialize.ts`,
`src/vcs/lane-materialize.ts`, `src/vcs/lane-promote.ts`, `src/vcs/diff.ts`
(`buildFileStateAtOp`), `src/git/git-sync.ts`, `src/vcs/transcript.ts`,
`.trellis/config.json` surface, `src/cli/index.ts`,
`.config/opencode/plugins/trellis-lanes.ts` (PostToolUse journal hook)

## Context

ADR 0014 established git as a rebuildable blob-tree mirror with the op-log as
carrier of record. ADR 0037 then made the op-log the mandatory write path with
opt-out capture — journaling as the safety mechanism. Practice drifted anyway:
agents edit files directly on disk, and materialization produced the same
failure class **twice** — 9801056, then 5155578 via `trellis git sync`
(reverting 77 files / −8809 lines vs b941575, recovered in 0dbfad4).

The recurrence is the tell. Two systems that can each claim authority over the
same bytes is structurally unsound; guards on an unsound invariant
(refuse-before-clobber, catch-up journaling) fail at whichever path nobody
guarded. "The op-log may never materialize over state it has not journaled"
(Phase C) merely narrows the unguarded surface; it does not remove it.

The isolation lanes were built for — N agents running concurrently, where one
agent's `stash`/`revert`/`checkout` clobbers everyone else's work — was always
mechanical (per-lane worktrees), not semantic (op-log file state). The semantic
layer is what made the clobber possible.

One constraint discovered during planning: `indexWorkspace` is **load-bearing
for the read side**, not init hygiene. The turtlecode IDE
(`packages/opencode/src/trellis/index.ts`) renders the codebase-as-graph from
`eng.trackedFiles()` → `graphFiles(...)`, which is populated by the file ops
`indexWorkspace` emits at init. Retiring it would blind every graph-first
consumer. It must survive — as an annotation emitter, not a byte authority.

## Decision

**Git is the sole authority over file bytes. The op-log never materializes —
architecturally, not config-gated.**

1. **Authority is not config.** The file-materialization write path is deleted.
   No flag, hidden or public, can re-enable it. Config keys that would claim
   byte authority (e.g. `materialize: true`) are rejected by the validator —
   the surface does not exist, loudly.
2. **Capture is config.** The op-log records annotations, opt-in per category.
   Graph entities (issues, milestones, decisions, lane lifecycle) remain
   always-on — they are the product, and they never touch bytes.
3. **Isolation is worktrees.** `lanes.worktreeBind` is load-bearing: a lane
   without a worktree has no file isolation. Overlapping active lanes in a
   shared tree are refused.
4. **Attribution is commits + annotations.** Per-worktree git identity
   (`extensions.worktreeConfig`); annotation ops (`fileNotes`, `agentRuns`,
   `transcripts`) chain to `commitHash`.
5. **`indexWorkspace` survives as an annotation emitter.** It keeps scanning
   the tree and populating the graph for read-side consumers (IDE
   visualization), but its ops are non-materializing annotations — the op-log
   records file *existence and provenance* without claiming byte authority.
6. **Capture stays off until a consumer exists.** Annotation categories default
   off; they are switched on by the read side that needs them (context
   assembly, ADR item 2), never by the write side.

## Mechanism

### Removed from the write path

- Watcher → `vcs:fileAdd` / `fileModify` / `fileDelete` **byte-authority**
  semantics (the watcher observes; git status observes better)
- `journalWorkingTreeToOps` — demoted to a one-time migration/diagnostic CLI
- `syncGitIntegration` materialize step — becomes git commit + chained
  annotation op
- `materializeLaneWorktree` / `lane-disk-materialize`
- Blob store as write source — remains as read-only content cache for semantic
  diff reads

### Indexing (repurposed `indexWorkspace`)

`indexExistingFiles` keeps scanning and emitting per-file graph entities, but
each file op becomes a `vcs:fileNote { filePath, commitHash, agentId, reason }`
annotation hung off the current git commit — the graph stays populated for
`trackedFiles()`/`graphFiles()` consumers while the op-log claims nothing about
byte state.

### Promote (rewrite)

`git merge` of the lane branch onto the target, with the existing three-way
conflict classifier as a pre-merge gate (pure function of blobs), then a
chained `vcs:lanePromoteComplete` annotation carrying the semantic diff and
milestone narrative. No op replay, no reconciliation.

### Sync split

Graph ops sync through existing transports (safe by construction — no file
bytes in ops). File bytes sync via git remotes. Neither can clobber the other's
turf.

### Structural guard

Test asserting the engine's write path never emits byte-authority file ops and
never calls the blob store from sync or promote.

### Migration

One-time `vcs:authoritySwitch { mode: "git", at }` marker op. Historical file
ops become inert history — readable for semantic diff of the past, never
applied.

### Ref guard

Lane guard flips to a sound invariant: refuse ref mutations outside the current
lane's branch and `--force` on shared refs. Residual clobber surface is
explicit git operations only — a named ref with an explicit force flag, not a
background sync deciding a file is stale.

## Consequences

- The 9801056/5155578 class is structurally removed, not guarded
- Recovery is `git reset`/`cherry-pick` — minutes, not days
- Peer sync is simpler and safer (no byte tier in ops)
- Journal-only lanes (shared tree, op-log file separation) die — the mode that
  required byte authority in the first place
- `indexWorkspace` semantics change (annotations) but its read-side contract
  (`trackedFiles()` → graph) is preserved for IDE/Studio consumers
- Test cost: engine/promote/sync suites that encode materialization must be
  rewritten
- The provenance layer's value now hinges on the read side (context assembly,
  ADR item 2) — annotation capture stays off until that consumer exists

## Open questions

1. `indexWorkspace` — **resolved:** survives as annotation emitter (see
   Decision 5); read-side consumers (turtlecode IDE graph view) depend on it.
2. `git.syncOnPromote` — retain as "commit + annotate on promote", default
   true? (recommended: keep, it is byte-tier behavior, not authority)
3. Do decisions/milestones remain always-on capture (recommended — they are the
   product's causal layer), or fold under `provenance.enabled`?
