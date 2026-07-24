# Agent coordination backlog

Items deferred from the git adapter / session-lane wedge.

## Init-time scaffold (not yet)

**Goal:** On `trellis init`, materialize project-local agent coordination when
global/user hooks are absent.

- Copy or symlink `.cursor/hooks/trellis-*.mjs` from
  `templates/trellis-harness/` (or detect `~/.cursor/hooks` and skip)
- Optional `.cursor/trellis-profiles/` workspace overrides
- `just trellis-coordination-smoke` wrapper

**Why backlog:** Requires manifest of hook files, merge policy (never overwrite
user edits), and desk vs spoke path rules. Global hooks at `~/.cursor/hooks`
cover Trent's desk today.

**Workaround:** Run `node scripts/trellis-coordination-smoke.mjs` after init;
enable defaults via `.trellis/config.json` (now automatic on init).

## Existing repos migration

One-time merge for repos initialized before 3.2.4:

```json
{
  "lanes": { "worktreeBind": true },
  "git": { "syncOnPromote": true, "remote": "origin" }
}
```

Or re-run smoke against the repo path.

## Touch manifest (shipped)

Kernel releases sync downstream via `docs/kernel-touch-manifest.json`:

```bash
just sync-downstream    # copy skills, bump create-trellis pins
just ship-check         # smoke + drift check
```

See `docs/release-checklist.md` before npm publish.

```bash
just ship                      # dry-run full release
just ship --verify             # run gates (test:ship, build, ship-check)
just ship-release              # commit + publish + turtlecode sync
just ship-release --skip-publish   # commit only
just ship --verify --full-test     # full npm test gate
```

Ship failures print a step summary + write `rug/ship-report-*.json`. Ensure
≥512MB free disk before `--verify` / `--execute` (preflight checks Data volume).

## Lane dashboard (shipped)

```bash
trellis lane watch              # http://localhost:3939 — SSE updates ~1s
trellis lane watch --no-open --port 3940
# prefer:
trellis admin
```

Shows active lanes, session ids, op/file counts, worktrees, promote lock, and
in-progress issues with claims. Useful for demos and multi-tab sanity checks.

## Admin write surface / agents / pipeline canvas (backlog)

**Issue:** TRL-219 · **Doc:** `docs/planning/admin-write-agents-pipeline.md`

Phased: (A) surgical board writes via `tml-mutations`; (B) agents roster;
(C) pipeline as Trellis-owned data; (D) xyflow canvas — park until C.

## VCS remote peer / GitHub analog seed (backlog)

**Issue:** TRL-222 · **Doc:** `docs/planning/vcs-oplog-sprite-backup.md`

**Thesis:** a ledger needs ≥2 peers holding the chain to count as truth; default
remote peer = sprite (not backup sidecar). Seed for `trellis remote push|pull`
and the GitHub analog on causal op journals.

## Tab-close abandonment (`sessionEnd` hook) (not yet)

**Goal:** Trellis knows when a Cursor Agent tab closes without promoting lane
work — so unpromoted journals don't linger as phantom active lanes.

**Cursor surface:** No dedicated `tabClose` hook. Use `sessionEnd`
(fire-and-forget) with `reason: "user_close"` or `"window_close"`. Cannot block
close or show a promote-first modal. `stop` is per-turn only — not tab disposal.

**Proposed wiring:**

1. `~/.cursor/hooks.json` → `sessionEnd: hooks/trellis-session-end.mjs`
2. Handler reads `session_id`, looks up lane via `findLaneForSession`
3. If lane `status === 'active'` and has unpromoted ops → mark abandoned (not
   `drop` — preserve journal for Idea Garden / manual revive)
4. Release issue claim (`claimedSessionId`) when applicable
5. Optional CLI: `trellis lane abandon --session <id>` (idempotent)

**Pair with existing:**

- `sessionStart` + `trellis-session-lane.mjs` already provisions per-tab lanes
- Lane dashboard (`trellis lane watch`) surfaces active lanes for manual triage
- Idea Garden can later ingest `abandoned` lane status as a cluster signal

**Why backlog:** Needs lane status enum extension (`abandoned`?), abandon vs
drop semantics, readonly-role skip, and desktop-only caveat (cloud agents lack
`sessionEnd`). Global hook lives at `~/.cursor/hooks`, not trellis-node scaffold
yet.

**Workaround:** `trellis lane watch` + periodic `trellis lane status` on stale
session ids; promote or `lane drop` manually before closing tab.
