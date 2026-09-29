# ADR 0052: Agent liveness census — one derived "who is working right now" read

> **Terminology:** **Presence** = a live heartbeat that an agent session is
> working in a repo (ADR 0024). **Census** = a *derived* read over presence +
> harness-native activity + lanes that answers "who, on what, with which
> harness, provider, and model, right now". **Harness** = the runtime hosting an
> agent: `opencode` | `claude` | `cursor` | `codex` | `gemini` | `tsh`.
> **Liveness** = recency of observed activity, never a stored `status` field.

**Status:** Proposed
**Date:** 2026-09-29
**Issues:** TRL-461 (proposal), TRL-425 (Phase 2 desk affordances), TRL-219 (agents roster)
**Depends on:** [0024](./0024-ambient-agent-presence.md) (presence ledger),
[0050](./0050-notes-and-derived-operator-surface.md) (derived operator surface),
[0051](./0051-session-metrics.md) (per-turn usage at the harness boundary),
[0041](./0041-adoption-signal-without-silent-telemetry.md) (no silent telemetry)
**Related:** [0015](./0015-agent-handoff-protocol.md) (`whereami` re-entry),
[0046](./0046-agent-forum.md) (repo-scoped broadcast), [0011](./0011-agent-session-log.md)
(session JSONL), [0040](./0040-lane-boundary-oss-and-hosted-platform.md) (host vs platform)
**Supersedes:** nothing
**Impacted components:** `src/cli/presence.ts`, `src/cli/index.ts` (`who`, new
`census`/`agents`), `src/core/ontology/` (census projection only — no new
durable entity), harness hooks (`agent-ops/hooks/*`), `src/svelte/` +
`src/vue/` (presence panel, agents roster)

## Context

On 2026-09-29 we asked, of the desk root (`~/TURTLE/OS`), a question the system
cannot yet answer: *how many agents are working right now, on which harness,
provider, and model, and on what?* Producing the answer required hand-stitching
**five sources that disagree**, none of which is authoritative:

1. **`.trellis/presence/*.json` is stale.** ADR 0024 Layer 1 is implemented
   (`trellis who`), but every record on disk was from Aug 20 / Sep 24. The
   heartbeat is written on `issue start` and on running `who`, then never
   refreshed. A working session that does not restart an issue is invisible —
   and `who` for the engine repo printed *"No other agents active"* while three
   agents were, in fact, working.
2. **`presence.status` is self-reported and never expires.** `lane/*/meta.json`
   also carries `status: "active"` forever — lanes from August are still
   "active". Status fields are unreliable by construction; only recency is.
3. **The record cannot express the question.** `PresenceInfo` has `client` but no
   `provider`, no `model`, and no current task beyond `claimedIssueTitle`. The
   census needed exactly those.
4. **The desk trail markers are decorative.** `graph/trail-markers/agent-*.json`
   describe harnesses, not sessions, and are all `status: "paused"`.
5. **The op-log is a stub for identity.** Per ADR 0051 d4, `ops-*.jsonl`
   declares `model`/`tool` but writes `"unknown"`, and carries no lane or
   session. It cannot answer *who is on what*.

The real liveness signal existed only in **harness-native sources**: process
`cwd`, `opencode.db` `session.time_updated`, and Claude Code session-JSONL
mtime. That asymmetry is the finding: **liveness lives at the harness boundary,
and Trellis was not reading it.**

The motivating use is the same as ADR 0051's, one axis over: to *operate* a
multi-agent desk (and to dogfood it in turtleOS), you must see the fleet. ADR 0051
measures **cost** per lane; this ADR measures **presence** per lane. Both are
derived reads, and both must be captured at the same boundary.

## Decision

### 1. The census is a derived read, never a maintained roster

One generator produces the census from (a) the presence ledger, (b) harness-native
adapters, and (c) the lane/issue graph. No `Roster`/`Agent` entity with counters,
no hand-edited list (per ADR 0050 d3). *A roster a human updates is the drift bug
this ADR exists to remove.*

### 2. Liveness is recency, not status

An entry is live iff its **last observed activity** is within the staleness
window (default 5 min, per ADR 0024). `status` is advisory only and never gates
inclusion. A crash that leaves a record behind ages out naturally; a session that
works for six hours stays live without re-announcing.

### 3. The presence ledger is refreshed at the harness boundary, not on `issue start`

ADR 0024 keyed heartbeats to the canonical "heads down" moment. That is too
coarse. The heartbeat is (re)written wherever a **turn is observed** — the same
boundary ADR 0051 d5 already establishes for usage — so one hook serves both
metrics and presence. Extend `PresenceInfo` with: `provider`, `model`,
`harness`, `task` (short, derived from lane/issue/plan title), and `dir`
(the workspace subtree, so a sub-repo like `OS/admin` is distinguishable).

### 4. Harness adapters absorb non-cooperating runtimes (read-only, local)

Not every harness will announce, and third-party IDEs never will. A census
adapter derives liveness from each harness's native record when no heartbeat is
fresh: `opencode` → `opencode.db` `session.time_updated`; `claude` → session
JSONL mtime; any → process `cwd` under the scope root. Adapters are **local,
read-only, and best-effort** — they supplement the ledger, never replace it.
Adapters report `verified: false` (see d7) because activity is inferred, not
asserted.

### 5. Scope is a directory tree, and host == turtleOS

The census resolves against a **scope path** (default: the repo root; override
`--path ~/TURTLE/OS`), matching any session whose `dir` is under it — so
"agents working in `~/TURTLE/OS`" includes `OS/admin`. The **same generator**
backs both projections: the host CLI (`trellis who --census`, alias
`trellis agents`) and turtleOS surfaces (desk presence panel, admin roster,
TRL-219 B). There is no host-only code path — dogfooding the host is the
acceptance test for the product.

### 6. Local-first; no silent telemetry

The census reads local files and local process state only. Nothing is emitted,
phoned home, or written to the op log. Sync/share of a census (e.g. a desk
broadcast, ADR 0046) is opt-in, per ADR 0041.

### 7. Model/provider/harness are claimed facts, marked as such

Provider and model may be reported by the harness, inferred from the session
record, or unknown. The census renders **verified** (harness-reported) vs
**inferred** (adapter-derived) vs **unknown**, rather than presenting all three
identically. Precision beats a confident wrong label.

## Alternatives considered

| Option | Pros | Cons | Why not |
| ------ | ---- | ---- | ------- |
| A — derived census over ledger + adapters (chosen) | Always current; no maintenance; works for non-cooperating IDEs | More code; adapters are per-harness | Only option that survives third-party harnesses |
| B — extend ADR 0024 ledger only, require heartbeat | Simple; one mechanism | Depends on every harness cooperating; blind to Cursor/Codex | Fails the case that motivated this (3 agents, 0 heartbeats) |
| C — hand-maintained roster entity | Trivial to read | Drifts immediately (ADR 0050 d3) | This is the bug being removed |
| D — put presence in the op log | Queryable like everything else | Pollutes milestones/garden/sync (ADR 0024 alt) | Already rejected in 0024; liveness is ephemeral |

## Consequences

**Good**

- One command answers "who is on what, with which harness/model, right now",
  on the host and in turtleOS, from the same generator.
- ADR 0024's ledger becomes load-bearing again because the heartbeat is refreshed
  per turn; ADR 0051 gains its missing identity dimension for free (same hook).
- Non-cooperating harnesses are visible without asking them to change.

**Costs / risks**

- **Adapter fragility.** Harness-native formats (db schema, JSONL layout) are
  private and can change; each adapter needs a cheap degrade-to-unknown path.
- **Verification ambiguity.** Inferred model/provider can be wrong; mitigated by
  d7's tri-state, but the UI must not imply certainty.
- **Boundary discipline.** The heartbeat hook must stay cheap and non-blocking
  (as `issue start` announce already is) — a census that slows a turn is worse
  than no census.
- **Privacy.** Presence reveals work patterns even without content; keep local,
  and keep ADR 0051 d6's posture.

**If we don't**

- The desk stays blind to its own fleet; "who is working" remains a manual
  `ps`/mtime archaeology exercise.
- turtleOS ships a presence panel with no trustworthy liveness source.
- ADR 0051's comparison story stays identity-blind (cost per *what*?).

## Implementation phases

- **P0:** extend `PresenceInfo` (`provider`, `model`, `harness`, `task`, `dir`);
  refresh heartbeat at the opencode/claude turn boundary; `trellis who --census`
  with `--path` scope + `--json`.
- **P1:** harness adapters (opencode.db, claude JSONL, process cwd) with
  tri-state verification and staleness pruning; `trellis agents` alias.
- **P2:** turtleOS projections — desk presence panel (TRL-425) and admin agents
  roster (TRL-219 B) reading the same generator.
- **P3:** opt-in desk broadcast of a census snapshot (ADR 0046), and populate the
  desk op-log identity fields (ADR 0051 P3) so census and metrics share one
  capture.
