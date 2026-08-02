# Trellis-aware Harness — Fork Scope

> **Date:** 2026-08-02
> **Status:** Scoping (open decisions at bottom)
> **Trigger:** TRL-409 lane-gc regression — a reset destroyed ~100 files of
> in-flight kernel work because (a) git was the carrier of record, (b) the
> guard layer was shell-level and bypassable, (c) sessions/lanes were never
> lifecycle-owned by anything Trellis could trust.
> **Relates:** ADR 0014 (git materialization), TRL-117 (`lane-agent-experience.md`),
> `docs/planning/lane-gc-regression-recovery.md` (incident post-mortem)

## 1. The problem

Third-party harnesses (opencode, Claude Code, Cursor) own session lifecycle.
Trellis only sees the side effects. That inversion produced the TRL-409
regression class:

| Failure in the incident | Where control was |
| ----------------------- | ----------------- |
| `git add -A` swept 100 unlaned dirty files into a promote commit | `src/git/git-sync.ts` (Trellis, buggy) |
| A raw `git reset` destroyed the committed carrier of the work | shell (harness-owned, guard bypassed) |
| Work sat in the shared tree with **no lane** for weeks | no session→lane ownership anywhere |
| Recovery depended on 7 lane branches accidentally pinning `9801056` | luck, not design |

The root gap is the same in every row: **nothing in the harness knows Trellis
state, and nothing in Trellis controls the harness.** Lane guards are
`.cursor`/Claude/OpenCode shell hooks — conventions, not enforcement.

## 2. Requirements (derived, not aspirational)

1. **Session → lane ownership.** A session starts in a lane (or explicitly
   opts out). On session end/abort/compaction, the lane is checkpointed —
   never left dangling with uncommitted state and no record of where it was.
2. **Tool-layer git enforcement.** Destructive git on the shared tree is
   denied/redirected at the **tool executor**, not via shell aliases. A forced
   `git reset --hard` cannot run against a tree Trellis owns.
3. **No carrier of record outside Trellis.** In-flight work lives in lane
   journals; git is a promote-only blob-tree mirror (ADR 0014). The fork
   reinforces this by construction.
4. **Visual lane affordances.** Statusline shows lane/issue/dirty state; lane
   color coding; reentry banner (`whereami`-style) on session resume.
5. **Human gate on destructive GC.** Lane drop/garden/promote dispositions
   require an explicit confirm at the permission layer.
6. **Dirty-tree awareness.** A session starting while the shared tree has
   untracked files gets a loud warning + lane suggestion before work begins.

## 3. What a plugin already buys (no-fork baseline)

opencode's plugin surface covers a surprising amount (see
`customize-opencode` skill):

- `event()` — session start/end, tool execution, compaction
- `tool.execute.before/after` — mutate args / deny before a tool runs
- `permission.ask` — gate destructive ops
- `chat.message`, `shell.env`, `experimental.*` transforms
- Custom tools via `tool: {}` registration

So the **enforcement logic** (reqs 2, 3, 5, 6) is implementable as a
default-enabled plugin bundle today, in any harness with an equivalent hook
surface. That is Phase A below.

## 4. The fork delta — what plugins cannot do

| Capability | Plugin | Fork |
| ---------- | ------ | ---- |
| Enforce at tool-executor layer (bypass-proof) | Partial (hook is in-process, disable-able) | Yes — enforcement lives in the executor, not the plugin |
| TUI chrome: statusline lane badge, colors, keybinds | No | Yes |
| Block session close while lane dirty | Observe only | Yes — lifecycle is owned |
| Ship Trellis built-in (no plugin install/config) | No | Yes |
| Deep control of session lifecycle (spawn/abort/compaction policy) | Observe only | Yes |

**Minimal fork = TUI visual layer + lifecycle ownership + bundled default
plugins.** Everything else stays in the plugin layer so it upgrades without
re-forking.

## 5. Architecture sketch (fork points)

```
opencode (fork: "trellis-opencode")
├── packages/tui          → statusline lane/issue badge, lane colors, whereami keybind
├── packages/core         → session lifecycle: start-in-lane, end-checkpoint
│                           tool executor: git guard pre-hooks (bypass-proof)
└── packages/plugin       → trellis bundle: lane tools, milestone nudge,
                            verify gate, GC confirm (default-enabled)
```

Lift, don't fork wildly: keep upstream opencode as a remote; carry a thin
diff. Fork only `packages/tui` (visual) and `packages/core` (lifecycle +
executor guards); put all Trellis logic in a plugin the fork ships
default-enabled. Upgrade path = rebase the thin diff onto upstream.

## 6. Harness comparison

| | opencode fork (recommended) | pi | little-coder |
| --- | --- | --- | --- |
| Session lifecycle control | Fork owns it | Depends on harness internals | Depends on harness internals |
| TUI affordances | Full (Ink/React) | Minimal | Minimal |
| Plugin/hook surface | Rich (event, tool.execute, permission) | TBD — evaluate | TBD — evaluate |
| Ecosystem / models | Broad | Narrow | Narrow |
| Fit with Trellis | Existing lane guard hooks already target opencode | Rebuild guards | Rebuild guards |
| Cost | Highest (fork maintenance) | Low | Low |

If the evaluation shows pi/little-coder expose a tool-execution hook and
session lifecycle hooks, the same plugin bundle (Phase A) ports over and the
fork question becomes purely "do we need the TUI layer."

## 7. Phasing

**Phase A — Plugin bundle (no fork, this week):**
- Trellis lane/milestone/verify tools registered as built-ins
- `tool.execute.before` git guard: deny `add -A`, `reset`, `checkout`, stash
  on Trellis-owned trees; redirect to `trellis lane promote`
- `event()` session-end checkpoint → `whereami checkpoint` + lane status
- `permission.ask` GC-confirm gate
- Dirty-tree warning on session start (req 6)

**Phase B — Fork (after Phase A proves the logic):**
- Statusline lane/issue/dirty badge + lane colors
- Session lifecycle ownership (start-in-lane, end-checkpoint)
- Executor-level guards (moved from plugin hook to core)
- Default-enabled bundle; thin-diff maintenance model

**Phase C — Multi-agent desk:** presence indicators, lane contention surface
(who owns which file), handoff affordances (ADR 0015) rendered in TUI.

## 8. Decisions (resolved 2026-08-02)

1. **Enforcement posture: hard-deny.** The fork refuses destructive git on
   Trellis-owned trees; the only path is `trellis lane promote`/CLI. Matches
   the incident lesson — the reset was "forced" by bypassing a guard.
2. **Session-end policy: checkpoint-only.** Always checkpoint lane state +
   `whereami` record on session end; never auto-promote. Promote remains a
   human decision at a coherent boundary.
3. **Evaluation: spike first.** Audit pi/little-coder hook surfaces before
   committing to the fork. If they expose tool-execution + lifecycle hooks,
   the Phase A plugin bundle ports over and the fork is only needed for the
   TUI layer.
4. **Target scale:** open — phase A/B serve the solo desk; Phase C (multi-
   agent desk) gated on the spike and Phase A outcomes.
5. **Dependency order:** the git-mirror fix + journal-only lanes (W3) land
   first; the fork assumes lanes are journals.

## 9. Next actions

1. **Phase 0 recovery** (see `lane-gc-regression-recovery.md`) — restore the
   150 files + inspector fork + `headless/core.ts`, verify `pnpm check`/`test`.
2. **Phase A spike:** audit pi + little-coder hook surfaces (tool-execution
   interception, session lifecycle, permission gating). Deliverable: one-page
   comparison deciding plugin-bundle portability.
3. **Phase A plugin bundle** for opencode: lane tools, tool-layer git guard
   (hard-deny), session-end checkpoint, GC confirm gate, dirty-tree warning.
4. **Phase B fork decision** after Phase A + spike evidence.
