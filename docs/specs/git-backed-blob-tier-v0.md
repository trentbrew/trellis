# Spec: Git-backed blob tier + init storage guardrails (v0)

**Status:** Spec · **Date:** 2026-07-24  
**Proposal:** storage-sustainability (disk audit) · **Related:** TRL-222 (sprite v0)  
**Planning context:** ~280 GB `.trellis` system-wide audit (2026-07-24)

> **Semantics in ops; bytes where they already live.** Trellis owns the causal
> chain (`ops.json`). Git repos already own file bytes (`.git/objects`). This
> spec adds a **local byte resolver** so Trellis stops duplicating git-tracked
> content in `.trellis/blobs/`, and **init guardrails** so accidental graph roots
> cannot blob entire umbrella trees again.

---

## 1. Problem

### 1.1 Disk (bytes)

A system-wide audit found **~280 GB** across **332** top-level `.trellis`
directories. Primary drivers:

| Driver | Example | Mechanism |
| ------ | ------- | --------- |
| Eager init indexing | `Projects/Apps/.trellis` (23 GB) | `indexWorkspace: true` default → full tree scan → every file blobbed |
| Blob retention | `trellis-client` (69 GB) | Content referenced in op log forever; `storage --prune` only drops unreferenced |
| Media uploads | trellis-client voice/files | Large blobs via `/blob` PUT; same store as VCS file snapshots |
| Lane worktree sprawl | `trellis-node` (107 worktrees) | Full checkouts + per-lane graphs (separate issue; related disk leak) |

The blob store design (`src/vcs/blob-store.ts`) is sound — SHA-256,
content-addressed, idempotent `put`. The **policy and lifecycle** are not.

### 1.2 Restore gap (semantics + bytes)

[TRL-222 / sprite v0](vcs-oplog-remote-sprite-v0.md) adds **peer #2 for the op
log** — push/pull/install of `ops.json` JSONL. v0 **non-goals** explicitly
exclude blob sync.

After `trellis remote install`, materialize still calls `blobStore.get(hash)`
(`src/vcs/lane-disk-materialize.ts`). Missing local blobs → **silent skip**
(lines 66–67). Restore recovers semantics but not file content unless bytes
exist elsewhere.

For git repos, **git is already the local byte witness**. This spec wires that
into the read path and documents the combined restore sequence.

### 1.3 Naming clarity (git remote ≠ git byte tier)

Planning for TRL-222 states *“Git remote — wrong object model (text commits, not
op chain)”* for the **Trellis GitHub analog** (named remotes for op journals).
That does **not** forbid reading **local** `.git/objects` when resolving
`contentHash` for materialize/diff/merge. This spec is **local byte tier only**
— no `git push` as Trellis remote.

---

## 2. Storage layer model

```text
┌─────────────────────────────────────────────────────────────┐
│ L4  Witness peer #2     sprite — ops.json only (TRL-222)    │
├─────────────────────────────────────────────────────────────┤
│ L3  Semantic truth        .trellis/ops.json (+ lane logs)   │
├─────────────────────────────────────────────────────────────┤
│ L2  File content refs     contentHash on vcs:file* ops      │
│     Byte tier A           .trellis/blobs/  (uploads, non-git)│
│     Byte tier B           .git/objects/    (git-backed v0)  │
│     Byte tier C           media / quotas   (future)         │
├─────────────────────────────────────────────────────────────┤
│ L1  Working tree          checked-out files                 │
└─────────────────────────────────────────────────────────────┘
```

**Restore after wipe (git repo + sprite configured):**

```bash
git clone <url> .                    # or existing checkout
trellis remote pull
trellis remote install
trellis open                         # replay; resolver fills bytes from git + blobs
```

Sprite restores **L3**. Git restores **L2B** for tracked paths. Local blobs
retain **L2A** (uploads, never-git files).

---

## 3. Goals (v0)

### 3.1 Git-backed byte resolver

1. **`BlobResolver`** (or extend `BlobStore`) with ordered lookup:
   1. `.trellis/blobs/{sha256}` — always wins (explicit upload / override)
   2. **Git object** — when repo has `.git` and path + hash match
   3. `null` — miss
2. **Wire resolver** into all read paths that today call `blobStore.get`:
   - `materializeToDisk` (`src/vcs/lane-disk-materialize.ts`)
   - `diff` / `merge` / `git-sync` materialize
   - Realtime blob **GET** (unchanged source of truth for uploads)
3. **Lazy blobbing on write:** do **not** `put` to `.trellis/blobs/` when git
   can attest the same SHA-256 at `filePath` (see §4.2).
4. **Keep SHA-256 in ops** — no op-log migration; git uses different object
   names internally; resolution is at read/write boundary only.
5. **`trellis storage`** reports bytes by tier: local blobs / git-resolved /
   unreferenced / missing-referenced.

### 3.2 Init storage guardrails

1. **Default `indexWorkspace: false`** in `DEFAULT_CONFIG` and non-interactive
   init (align with interactive “minimal setup” today).
2. **Pre-init scan gate:** if discover + hash would touch **> 500 files** or
   **> 50 MB** total, require `--index-workspace` or interactive confirm.
3. **Umbrella path warning:** init under path segments matching
   `Projects`, `Apps`, `Packages`, `Sandbox` **without** a repo marker
   (`.git`, `package.json`, etc.) → warn + suggest `--no-index` (v0: warn only).
4. **Expanded default ignores:** add `.vercel`, `.next`, `coverage`, `target/`,
   `*.sqlite`, `.turbo`, `.output` to `DEFAULT_CONFIG.ignorePatterns`.
5. **Post-promote hook (optional v0):** run `trellis storage --prune` dry-run
   summary to stderr (no auto-delete in v0).

### 3.3 Retention policy (spec + partial impl)

Document three classes; v0 implements **orphan** prune only (existing):

| Class | Definition | v0 action |
| ----- | ---------- | --------- |
| **Live** | Referenced from integration head file state | Keep |
| **Historical** | Referenced only from old ops, not at head | Keep (document; v1 GC) |
| **Orphan** | On disk, not in any op | `storage --prune` |

v1 (non-goal here): `--prune-historical` with `--keep-days` or snapshot refs.

---

## 4. Design

### 4.1 Hash identity

- Ops continue to store **SHA-256 hex** of raw file bytes (`contentHash`).
- Git blob objects use SHA-1 object ids internally — **do not** store git oids
  in ops for v0.
- Resolution: given `(contentHash, filePath?)`, read worktree file at path,
  hash with SHA-256, compare; or `git hash-object` / cat-file pipeline when
  path unavailable.

### 4.2 Write path (lazy blobbing)

```text
on file change (watcher / indexExistingFiles):
  hash ← sha256(file bytes)
  if isGitRepo(root) and file tracked-or-present in git:
    if sha256(worktree or git cat-file) === hash:
      record op with contentHash; skip blobStore.put
      return
  blobStore.put(bytes)   // uploads, non-git, binary without git
  record op
```

**Init (`indexWorkspace`):** when enabled, same rule — record ops, skip put
when git attests hash. Never blob entire trees by default.

### 4.3 Read path (materialize)

```text
get(contentHash, filePath?):
  if blobStore.has(contentHash):
    return blobStore.get(contentHash)
  if isGitRepo(root) and filePath:
    bytes ← readWorktreeOrGit(filePath)
    if sha256(bytes) === contentHash:
      return bytes
  return null
```

Update `materializeToDisk` signature to pass `relPath` into resolver (today only
passes hash).

### 4.4 Config

`.trellis/config.json` (persisted):

```json
{
  "storage": {
    "gitBackedBlobs": true,
    "indexWorkspace": false
  }
}
```

Default `gitBackedBlobs: true` when `.git` exists at repo root; false otherwise.

### 4.5 CLI

```bash
trellis storage [-p .]              # tier breakdown (extend existing)
trellis storage --prune [-p .]      # unchanged — orphan only
trellis init [--index-workspace]    # opt-in indexing; gate on size
```

---

## 5. Non-goals (v0)

- Sprite / remote **blob** sync (TRL-222 L1+ separate issue)
- Cross-repo shared blob pool (Campus-level dedup)
- SQLite blob table migration (noted in `blob-store.ts` comment — defer)
- Media tier quotas / external object storage (trellis-client — separate)
- Lane worktree TTL / prune (separate issue)
- Rewriting historical ops or blob re-import from git history
- Using **git remote** as Trellis remote (op chain witness)

---

## 6. Surfaces

| Surface | Path / command |
| ------- | -------------- |
| Spec | `docs/specs/git-backed-blob-tier-v0.md` (this file) |
| Resolver | `src/vcs/blob-resolver.ts` (new) or methods on `BlobStore` |
| Git helper | `src/git/blob-resolve.ts` (new) — worktree read, optional cat-file |
| Materialize | `src/vcs/lane-disk-materialize.ts` — pass path into get |
| Engine | `src/engine.ts` — lazy put in watcher + `indexExistingFiles` |
| Config | `src/vcs/types.ts` — `DEFAULT_CONFIG`, persisted `storage` |
| Init CLI | `src/cli/index.ts` — gate + `--index-workspace` |
| Storage CLI | `src/cli/storage.ts` — tier stats |
| Tests | `test/vcs/blob-resolver.test.ts`, extend `test/p2/blob-store.test.ts` |
| Cross-link | `docs/specs/vcs-oplog-remote-sprite-v0.md` § restore dependency |

---

## 7. Acceptance criteria

### Static (spec issue — run now)

- `pnpm check` passes
- Spec file exists at `docs/specs/git-backed-blob-tier-v0.md`
- `docs/specs/vcs-oplog-remote-sprite-v0.md` links restore dependency to this spec

### Behavioral (impl issue)

| # | Criterion | Test command |
| - | --------- | ------------ |
| 1 | Git repo: file modify records op without new `.trellis/blobs/` entry when git attests SHA-256 | `pnpm exec vitest run test/vcs/blob-resolver.test.ts -t lazy-put` |
| 2 | Materialize resolves content from worktree when blob missing but hash matches | `pnpm exec vitest run test/vcs/blob-resolver.test.ts -t materialize-git` |
| 3 | Upload / non-git file still writes to `.trellis/blobs/` | `pnpm exec vitest run test/vcs/blob-resolver.test.ts -t explicit-put` |
| 4 | `trellis init` defaults `indexWorkspace: false`; gate blocks silent large scan | `pnpm exec vitest run test/cli/init-storage.test.ts` |
| 5 | `trellis storage` reports tier breakdown | `pnpm exec vitest run test/cli/storage.test.ts -t tiers` |
| 6 | Sprite restore + git checkout materialize round-trip (integration) | `pnpm exec vitest run test/vcs/restore-git-sprite.test.ts` (mock remote) |

---

## 8. Dependencies map

| File | Change |
| ---- | ------ |
| `src/vcs/blob-store.ts` | Optional: delegate get to resolver; keep put/delete |
| `src/vcs/blob-resolver.ts` | **New** — ordered lookup |
| `src/git/blob-resolve.ts` | **New** — git worktree / cat-file helpers |
| `src/vcs/lane-disk-materialize.ts` | Pass `relPath` to resolver |
| `src/engine.ts` | Lazy put; init gate delegation |
| `src/vcs/types.ts` | `indexWorkspace: false`; storage config; ignore patterns |
| `src/cli/index.ts` | Init gate + `--index-workspace` |
| `src/cli/storage.ts` | Tier stats |
| `docs/specs/vcs-oplog-remote-sprite-v0.md` | Restore § + link |
| `docs/planning/vcs-oplog-sprite-backup.md` | Footnote: bytes = git + local blobs |

### Sequencing vs TRL-222

| Track | Priority | Rationale |
| ----- | -------- | --------- |
| **Init guardrails** | P0 — ship first slice | Stops recurrence immediately; no resolver dependency |
| **Git-backed resolver** | P1 | Disk savings + completes sprite restore story for git repos |
| **TRL-222 sprite** | P1 parallel | Op durability — orthogonal layer |

---

## 9. Open questions (defer to impl CLARIFY if blocking)

- **Untracked git files:** lazy-put skip only when file exists in worktree at
  op time, or also `git ls-files`? → **v0: worktree read + hash match**
- **Submodules / worktrees:** resolve from lane worktree root, not integration
  root only → **v0: use materialize `rootPath`**
- **Init gate thresholds:** 500 files / 50 MB — tune from audit? → **defaults
  above; `--index-workspace` override**
- **Binary hash via git:** use `git hash-object --stdin` or read worktree?
  → **prefer worktree read; cat-file for missing worktree file**

---

## 10. Related issues (to file when CLI healthy)

- **Spec:** this document (storage-sustainability)
- **Impl:** git-backed resolver + init guardrails (split or single impl issue)
- **Parallel:** TRL-222 sprite v0 (unchanged scope)
- **Follow-up:** lane worktree TTL; media blob tier / quotas
