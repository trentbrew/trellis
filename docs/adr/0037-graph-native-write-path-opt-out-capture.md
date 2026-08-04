# ADR 0037: Graph-native write path — opt-out capture by default

**Status:** Proposed
**Date:** 2026-08-03
**Related:** [0014](./0014-git-materialization-and-lane-worktrees.md) (git as mirror),
`docs/planning/git-ssot-fault-line-checkpoint-2026-08-03.md` (dual-SSoT fault line),
`docs/planning/trellis-tui-fork-cycle.md` (desk harness)

**Impacted components:** `src/engine.ts` (`journalWorkingTreeToOps`),
`src/watcher/fs-watcher.ts` (`FileWatcher`), `src/watcher/ingestion.ts` (`Ingestion`),
`src/cli/index.ts` (`git journal catch-up`)

## Context

The op-log is the carrier of record — ADR 0014 established git as a
rebuildable blob-tree mirror, not an authoritative SSoT. Practice drifted:
agents edit files directly on disk, the op-log lags, and `syncGitIntegration`
assumes op-log-first — producing the **9801056-class silent revert**
(documented in `docs/planning/git-ssot-fault-line-checkpoint-2026-08-03.md`).

The safety floor (`journalWorkingTreeToOps` + refuse-before-clobber, shipped
in `b941575`) catches the clobber before it materializes. But the underlying
gap remains: the write path is implicitly **opt-in**. Nothing gets journaled
until something explicitly triggers reconciliation — the `PostToolUse` hook in
the OpenCode plugin (2026-08-03), the pre-sync catch-up in `git sync`, or a
manual CLI invocation. Any new write path (a different agent harness, a human
hand-edit, a script) defaults to **silently missing** from the op-log.

The 9801056 class was not a bug in one code path — it was the default itself.

## Decision

**The op-log is the mandatory write path. Capture is opt-out by default.**

Every file change that lands on disk is journaled into the op-log unless
explicitly excluded. The exclusion list becomes the design surface — not a
guard gate on what gets in, but a declaration of what stays out.

This inverts the failure mode:

| Model | Default | Worst case |
|-------|---------|------------|
| Opt-in (current) | Files not journaled | Silent loss (9801056 class) |
| **Opt-out (target)** | **Everything journaled** | **Noise in the op-log** |

Silent loss is unrecoverable. Noise is scrubbable post-hoc. That is the
correct trade-off under the Phase C invariant: _the op-log may never
materialize over state it has not journaled._

The A/B framing from the checkpoint doc conflated two axes:

| Axis | Answer |
|------|--------|
| Local ownership — what's canonical on one machine | **Graph-first (B).** Decided by ADR 0014 + the shape of refuse-before-clobber. Decidable today, no new infra. |
| Distributed sync — TrellisHub/Iroh, multi-peer | **Deferred.** A separable scaling concern. Does not gate local correctness. |

Git is a one-way export. TrellisHub is a later distribution problem. Neither
changes who owns the truth locally.

## Mechanism

### Continuous FileWatcher daemon

The `FileWatcher` in `src/watcher/fs-watcher.ts` already provides
per-file change events with content hashing and debounce. Instead of only
firing during a pre-sync reconciliation, the watcher runs as a standing
daemon — every file change is journaled incrementally at the moment it lands
on disk, agnostic to whether the write came from Claude Code, opencode,
Cursor, or a human in vim.

```text
Disk write        FileWatcher          Ingestion          Op-log
    │                 │                    │                  │
    ├─ file:add ──────►├─ hash + diff ─────►├─ vcs:fileAdd ────►│
    ├─ file:modify ───►├─ hash + diff ─────►├─ vcs:fileModify ─►│
    ├─ file:delete ───►├─ detect missing ──►├─ vcs:fileDelete ─►│
    │                 │                    │                  │
    │            per-path filter:    hash/valid/not-excluded
    │            .trellisignore
    │            self-observation: exclude .trellis/ops.json, .trellis/blobs/, .trellis/lanes/
    │            worktree → lane resolve
```

This sits **beneath** all agent harnesses — unlike the `PostToolUse` hook,
which is harness-specific and needs separate wiring for each IDE/agent.

### Self-observation: excluding the op-log's own storage, not the worktrees

The op-log (`.trellis/ops.json`), blob store (`.trellis/blobs/`), and
per-lane journals (`.trellis/lanes/`) are the engine's own storage. If the
watcher observed any of these, every op-log append would be itself a disk
write, which the watcher would see, which would produce another op, which
would write again — unbounded recursion for `ops.json`, and a cascade for
blob storage.

The current `FileWatcher` code in `src/engine.ts:417` uses the bare pattern
`'.trellis'`, which matches the **entire** directory:

```
ignorePatterns: [...this.config.ignorePatterns, '.trellis']
```

For a batch catch-up scan this is correct — no self-observation, and
worktree content isn't relevant during a one-shot reconciliation. For a
continuous daemon it is **too broad**: it excludes `.trellis/worktrees/`,
which is where all lane-scoped writes land. Silently dropping lane edits is
the 9801056 class relocated one level down.

The daemon narrows the exclusion to the actual metadata paths that cause
recursion:

| Path | Excluded? | Reason |
|------|-----------|--------|
| `.trellis/ops.json` | **Yes** | Integration op-log — self-observation loop |
| `.trellis/blobs/` | **Yes** | Blob store write → watcher sees blob → journals blob → stores blob → cascade |
| `.trellis/lanes/` | **Yes** | Per-lane op-log journals — same cascade as `ops.json` |
| `.trellis/*.json` | **Yes** | Config, locks, registries — non-file-content metadata |
| `.trellis/worktrees/` | **No** | Lane worktree contents — **must remain in scope** |
| `.trellis/reentry-checkpoint.json` | **Yes** | Session metadata, not content |
| `.trellis/agent-ops/` | **Yes** | Agent telemetry, not content |

The daemon's watcher is initialized with:

```
ignorePatterns: [
  ...config.ignorePatterns,
  '.trellis/ops.json',
  '.trellis/blobs/',
  '.trellis/lanes/',
  '.trellis/*.json',
  '.trellis/agent-ops/',
]
```

`.trellis/worktrees/` is deliberately absent from this list. Lane edits are
visible. Self-observation is stopped at the metadata boundary, not the
directory boundary.

### Multi-lane attribution

With ~187 worktrees in flight, a write event must be attributed to the
correct lane. The mechanism is deterministic from the file path:

| Write location | Lane | Op target branch |
|---------------|------|-----------------|
| `<repo root>/src/foo.ts` | None (integration) | Integration branch |
| `.trellis/worktrees/<shortId>/src/foo.ts` | `lane-<fullId>` (resolved via worktree registry) | Lane's target branch |

One daemon instance watches the repo root (including worktrees as subpaths).
Each `FileWatcher` event carries an absolute path. The daemon resolves:

1. If the path is inside `.trellis/{ops.json,blobs/,lanes/,*.json,agent-ops/}`
   → **excluded** (self-observation gate — per the exclusion table above).
2. If the path is inside `.trellis/worktrees/<shortId>/` → resolve to lane
   `lane-<fullId>` via the worktree registry. Journal as a lane-scoped op.
3. Otherwise → journal as an integration-scoped op on the integration branch.

This is the fix that the checkpoint doc's "mid-flight fix" entry describes:
the 2026-08-03 sim-kernel2 run journaled ops onto `issue/TRL-421`
(currentBranch) while the sync target was `main`. The explicit
branch-advance patch (step 4 of `journalWorkingTreeToOps`) ensures that the
sync-target branch head is advanced after journaling, so subsequent
`buildFileStateAtOp` includes the reconciled state. The daemon piggybacks
on this same advance mechanism: after journaling a lane-scoped write, it
advances that lane's branch head so the op is visible to all subsequent
reads of that lane's file state.

**Non-worktree writes go to the integration branch.** If a human or tool
edits directly at the repo root (not inside `.trellis/worktrees/`), the
daemon attributes those writes to the integration branch. This matches
`journalWorkingTreeToOps`'s existing default (`branch` parameter defaults to
`this.currentBranch`). Lane-isolated writes require a worktree — the lane
system already enforces this.

**Branch-advance rides the FileWatcher's existing debounce.** `FileWatcher`
groups rapid writes to the same file via `debounceMs`. A refactor touching
50 files produces 50 discrete events across 50 debounce windows — one
advance per file, not one batched advance. Branch-advance ops are small
metadata ops (no blob content); 50 advances in rapid succession is
negligible overhead. If profiling shows it matters, advance coalescing
(debounce advances across files within a short window) can be added without
changing the attribution model.

### Exclusion surface: `.trellisignore`

A new file at the repo root, with `.gitignore`-compatible syntax. Defined
separately from `.gitignore` because the overlap is large but not exact:

| Path | .gitignore | .trellisignore | Reason |
|------|-----------|----------------|--------|
| `dist/` | ignored | **ignored** | Build artifact — never graph-relevant |
| `node_modules/` | ignored | **ignored** | External dependency — never graph-relevant |
| `.git/` | ignored | **ignored** | Git metadata — never graph-relevant |
| `*.swp`, `*~` | may be ignored | **ignored** | Editor swap files — noise |
| `.env.local` | ignored | **may differ** | Could be graph-relevant in some repos |
| `.trellis/{ops.json,blobs/,lanes/,*.json,agent-ops/}` | N/A | **hard-excluded** | Op-log + blob storage — excluded by watcher to prevent self-observation loop; `worktrees/` deliberately in scope |
| Studio/fork | N/A | **explicitly excluded** | Off-limits during cleanup (~1600 files staged) |

### Bridge: PostToolUse hook (shipped 2026-08-03)

`journalWorkingTreeToOps` is exposed as a standalone CLI command
(`trellis git journal catch-up`), and the OpenCode plugin's
`tool.execute.after` hook spawns it after every `Write | Edit | Bash` tool
invocation. This is the correct **first step** — it closes the gap for the
primary agent harness today — but it is harness-specific and not the final
answer. When the daemon lands, the hook becomes a belt-and-suspenders
backstop rather than the sole write path.

## Consequences

### Positive

1. **Silent loss is impossible.** A write path that isn't explicitly excluded is
   journaled. The 9801056 class cannot recur.
2. **Git is a real mirror, by construction.** `syncGitIntegration` never
   encounters un-journaled drift because the daemon journaled it at source.
3. **Lane accretion is killed for free.** Once a worktree is a disposable
   render of an op-log branch, there's nothing to GC — regenerate it when
   needed, throw it away when not, like a build artifact. (The
   231-branch/191-worktree cleanup of 2026-08-03 demonstrated the cost of the
   old model.)
4. **Agent-agnostic.** The daemon captures edits from any tool, IDE, or human.
   No per-harness wiring required.

### Negative / trade-offs

1. **Noise in the op-log.** Every editor swap file, partial write mid-save,
   and debounced keystroke is captured. This is scrubbable (compaction,
   deduplication, `.trellisignore`) but increases op-log size and replay cost.
2. **Validation at journal-write time becomes the safety boundary.** Under
    opt-in, few ops get in, so validation is trivial. Under opt-out, every
    file change hits validation. _Invalid ops must not contaminate the
    graph_ (hard product constraint from the checkpoint doc). The daemon step
    (step 2 below) includes a **validation floor** — the step is not shipped
    without it. See [migration path](#migration-path) for the split between
    floor validation and advanced validation.
3. **Race-condition surface.** A continuous daemon contends with live writes
   in a way a batch pre-sync scan never had to. The FileWatcher's debounce
   and per-path deduplication handle most of this, but the
   write→hash→journal window is a new class of race that doesn't exist in
   the batch model.
4. **Startup replay cost.** A long-running daemon accumulates ops. Replay
   time grows. Mitigated by blob-store snapshots and thermal decay (ADR
   0017), but the steady-state op-log size is larger under opt-out.

## Current state (2026-08-03)

| Component | Status |
|-----------|--------|
| `journalWorkingTreeToOps` | Shipped in `b941575`. Scans disk, diffs vs op-log, journals divergences. |
| `trellis git journal catch-up` | Shipped in `5155578`. Standalone CLI wrapper. |
| OpenCode PostToolUse hook | Shipped. Spawns `git journal catch-up` after Write/Edit/Bash. |
| Continuous FileWatcher daemon | **Not yet implemented.** The `FileWatcher` exists but only runs in batch (pre-sync) or manual (CLI) mode. |
| `.trellisignore` | **Not yet implemented.** |
| Validation floor (gates above) | **Assembly required.** Individual gates exist in batch path; daemon wiring + `.trellisignore` parser needed. |
| Docs site write-path page | Draft at `apps/docs/content/3.architecture/5.write-path.md`. |

## Migration path

**Constraint:** _Client must not allow invalid ops that contaminate the graph_
(hard product constraint, per checkpoint doc). No step ships without the
validation gates it requires. Validation is split into two tiers: a
**validation floor** that ships with the daemon, and **advanced validation**
that follows.

### Validation floor (ships with step 2)

These gates are zero-config, deterministic, and necessary for correctness
under opt-out. Without them, garbage lands in the op-log un-checked.

| Gate | Mechanism | Catches |
|------|-----------|---------|
| Metadata exclusion | `.trellis/{ops.json,blobs/,lanes/,*.json,agent-ops/}` hardcoded in watcher ignore patterns; `worktrees/` in scope | Self-observation loop, cascade |
| `.trellisignore` | Per-path glob match before journaling | Build artifacts, swap files, user-declared excludes |
| Content hash integrity | `event.contentHash` vs re-hash on read (already in `journalWorkingTreeToOps`) | Corrupt writes, truncated files |
| Valid path | No null bytes, no parent-dir traversal (`../`) | Malformed events |
| Blob store write success | `blobStore.put()` returns without error | Disk-full, permission failures |

These gates are already present in the batch `journalWorkingTreeToOps` path.
The daemon carries them forward at each journal event.

### Steps

1. **Today:** PostToolUse hook catches agent writes. CLI `journal catch-up`
   available for manual reconciliation.
2. **Next:** Stand up the daemon in `trellis watch` / `trellis daemon start`.
   FileWatcher auto-journals per change with the validation floor above.
   `.trellisignore` file shipped. → **This step is not complete until the
   validation floor gates are in place.**
3. **Later:** Advanced validation (file size caps, binary detection, content
   type allow/deny lists). Compaction and deduplication of noise ops (editor
   swap files, write→save→write flurries).
4. **Eventually:** TrellisHub — the daemon becomes the local ingestion edge
   of a distributed op-log; git export is one-way; peer sync is Iroh-native.

---

*Written 2026-08-03 as companion to `git-ssot-fault-line-checkpoint-2026-08-03.md`.*
