# Op-log safety — local mirror + destructive guards

**Status:** Partial impl (2026-07-21)  
**Issue:** TRL-222 (remote peer) + incident follow-up  
**Relates to:** [`vcs-oplog-sprite-backup.md`](./vcs-oplog-sprite-backup.md)

## Problem

A single-slot `.bak`, array-era `repair`, and unguarded agent shell access allowed
one bad command to truncate a healthy JSONL journal. Issue metadata was
recoverable from hook logs; the **op chain was not**.

## Layered defense (local → remote)

| Layer | Mechanism | Status |
| ----- | --------- | ------ |
| **L0** | Ring backup `.bak` … `.bak.2` on each append | Implemented |
| **L0.5** | `~/.trellis/oplog-mirror/<repoKey>/` append-only journal + snapshot ring | Implemented |
| **L1** | `trellis repair` requires `--confirm-destructive` | Implemented |
| **L1b** | Cursor hook blocks agent `trellis repair` without confirm | Implemented |
| **L1c** | `branch -d` / `lane drop` require `--confirm-destructive` | Implemented |
| **L1d** | Cursor hook blocks agent branch delete / lane drop | Implemented |
| **L2** | Remote default peer (`trellis remote push`) | TRL-222 backlog |
| **L3** | Broader destructive registry (import reset, remote pull --force, …) | Planned |

## Local mirror layout

```text
~/.trellis/oplog-mirror/
  <repoKey>/                 # sha256(realpath(repoRoot)).slice(0,16)
    meta.json                # rootPath, lineCount, lastHash, source path
    journal.jsonl            # append-only copy of integration ops lines
    snapshots/
      ops-<iso>.jsonl        # ring of 8 full copies (every 500 ops)
```

**Scope (v1):** integration journal only (`<repo>/.trellis/ops.json`). Lane
journals are high-volume; mirror those after remote peer exists.

**Not the same as** `~/.trellis/ops.json` at home root — that is a separate
(historical) VCS root and must not be conflated with the mirror directory.

### Env toggles

| Variable | Effect |
| -------- | ------ |
| `TRELLIS_SKIP_OPLOG_MIRROR=1` | Disable mirror writes (tests) |
| `TRELLIS_CONFIRM_DESTRUCTIVE=1` | Human-only escape for repair rewrite |

## Destructive command policy

Any command that **shrinks, replaces, or empties** durable graph state must:

1. Refuse unless `--confirm-destructive` or `TRELLIS_CONFIRM_DESTRUCTIVE=1`
2. Prefer restore from mirror / remote before local rewrite
3. Write timestamped `.corrupted.<ts>` before truncating
4. **Never** write `[]` or an empty journal without explicit confirm

### Implemented

- `trellis repair` — confirm + mirror restore + `.corrupted.<ts>`
- `trellis branch -d` / `--delete` — confirm before `vcs:branchDelete`
- `trellis lane drop` — confirm before lane archive + `vcs:laneDrop`

### Next (same pattern)

| Command | Risk |
| ------- | ---- |
| `trellis import` / reset-style init | Overwrite graph |
| Future `trellis remote pull --force` | Remote clobber |

### Agent hooks

`beforeShellExecution` denies:

- bare `trellis` inside trellis-node checkout (format skew)
- `trellis repair`, `trellis branch -d`, `trellis lane drop` without `--confirm-destructive`

Extend to `-p <path> repair` from non-trellis cwd and other destructive verbs in a follow-up.

Path-targeted skew guard (2026-07-21): bare `trellis -p <repo>` blocked when
target is a Trellis VCS root or trellis package checkout.

## Recovery playbook

1. **Stop writers** — close agents, lane watch, IDE hooks running repair
2. **Check mirror** — `~/.trellis/oplog-mirror/<repoKey>/journal.jsonl`
3. **Compare line counts** — mirror vs repo `.trellis/ops.json`
4. **Restore** — `trellis repair --confirm-destructive` (auto-prefers mirror when longer)
5. **Remote** — `trellis remote pull` when TRL-222 lands
6. **Never** run repair on a journal that parses as valid JSONL without human triage

## Product note

Local mirror is **one machine, one user** — protects against bad CLI and
single-file overwrite, not disk loss or ransomware. Remote peer remains the
cross-machine witness (GitHub-analog seed in TRL-222).
