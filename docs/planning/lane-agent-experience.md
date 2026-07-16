# Spec: Lane coherence for agent experience

**Status:** Implementing (AC1 `lane split` + AC2 issue⇄promote boundary shipped)
**Date:** 2026-07-15
**Issue:** TRL-117
**Relates to:** ADR 0014 (lane worktree bind), ADR 0015 (agent handoff protocol),
AGENTS.md "Agent Lanes" section.

## Problem

Lanes isolate an **agent session** well:

- each agent gets an isolated op journal (`lane-{uuid}`);
- optional per-lane worktree (`lanes.worktreeBind`, ADR 0014) edits
  `.trellis/worktrees/<shortId>/` instead of the shared root;
- graph MCP scopes `agent:<id>` writes to the lane; desk-trail markers are
  coordination metadata, not VCS;
- `lane promote` replays a lane onto integration before `issue close`.

But the **unit of isolation** (the session) is not the **unit of coherence**
(the task / domain you milestone and promote). A session that hops domains —
e.g. "rename docs to TQL" → "CLI display strings" → "design TML" → "edit a
separate repo's docs site" — collapses into one catch-all lane with no clean
promote boundary. That is why it feels unclear _when to milestone or promote_:
there is no coherent unit to promote.

The fix is mostly **convention**, plus a few small signals. No lane-tooling
rewrite is proposed.

## Principles

1. **Lane ≈ domain, not session.** Open a new lane when the topic changes.
2. **Lane ⇄ issue by default.** `issue start` already creates+enters a lane, so
   the promote boundary is the issue boundary.
3. **Promote == milestone.** Promoting a coherent unit _is_ the milestone; the
   "when to milestone?" question should not exist as a separate decision.
4. **Cross-agent boundaries are structural, not manual.** An agent should not be
   able to silently write into another agent's lane-owned files; it requires a
   handoff (ADR 0015).
5. **Coherence is observable.** The agent should be told when a lane has drifted
   across domains.

## Proposed changes

### 1. Lane per domain (`trellis lane split`)

- **Shipped:** `trellis lane split [--name <slug>]` leaves the current lane (if
  any), forks a fresh isolated journal from the integration head, and enters it.
  No issue required. Optional `--name` stores a domain slug on lane meta. Parent
  lineage is recorded as sibling when splitting from an active lane.
- Convention: when the topic jumps, split — don't continue in the catch-all
  lane.
- Fully independent promote unit (not auto-bound as a child of the parent).

### 2. Lane ⇄ issue binding (verify + document)

- **Verified:** `issue start` creates+enters a lane by default (`--no-lane` to
  opt out). Covered by `test/vcs/issue-start-lane-branch.test.ts` and
  `test/vcs/issue-close-promote-boundary.test.ts`.
- **Verified:** `issue close --confirm` enforces promote replay — auto-promotes
  the linked lane when it has journal ops; `--no-promote` refuses close until
  an explicit `trellis lane promote` (promote boundary == issue boundary).
- Documented in AGENTS.md "Agent Lanes" and CLI help for `issue start` /
  `issue close`.

### 3. Promote == milestone

- `trellis lane promote <lane> -m "<narrative>"` replays onto integration
  **and** creates the milestone in one step.
- Optionally auto-draft the narrative from the lane's op summaries when `-m` is
  omitted, so promotion never blocks on writing prose.

### 4. Structural cross-agent file protection

- A write targeting a file currently owned by another agent's _active_ lane is
  rejected with a prompt to emit an ADR 0015 handoff envelope
  (`trellis protocol send`) instead of proceeding.
- Turns the manual "that's the presence agent's file, I'll defer" pattern into
  an enforced boundary.

### 5. Coherence signal (`trellis lane status`)

- Report the current lane's spread: # of distinct domains (by issue/intent
  label) and # of repos touched.
- When spread > 1 domain, suggest `trellis lane split`.
- Reuses the Idea Garden's cluster-detection (already finds abandoned work) but
  applied live to a single lane.

## Acceptance criteria

See **TRL-117** (5 AC): `lane split`; issue⇄lane promote boundary; promote
creates milestone; cross-agent file rejection + handoff; `lane status` spread
signal.

## Out of scope

- Rewriting the lane engine or worktree mechanism (ADR 0014 stands).
- The actual TQL rename / TML work that prompted this reflection — that work is
  tracked separately and must itself be split across lanes per §Principles.
- Full handoff UX beyond what ADR 0015 already specifies.

## Open questions

- ~~Should `lane split` auto-bind a sub-lane to the parent, or be fully
  independent?~~ **Resolved:** fully independent journal + promote unit; parent
  recorded as sibling lineage only.
- Is auto-drafted milestone narrative good enough, or is a mandatory human
  summary preferred at promote time?
- Does the coherence signal belong in `lane status` or `whereami` (already the
  re-entry dump)? Avoid duplicating ADR 0015's `whereami`.

## Note to implementers

Per Principle 1, **implement this issue inside its own dedicated lane** — do not
fold it into a catch-all session lane.
