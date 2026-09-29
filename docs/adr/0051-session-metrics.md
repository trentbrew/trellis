# ADR 0051: Session metrics — usage, cost, latency, and errors per lane

> **Terminology:** **Session** = one agent conversation bound to a lane
> (ADR 0011). **Turn** = one model request/response. **Usage** = tokens + cost
> for a turn. **Metric** = a durable per-turn fact; a **rollup** is a *derived*,
> recomputed aggregate (ADR 0050 d3).

**Status:** Proposed
**Date:** 2026-09-29
**Depends on:** [0004](./0004-mutation-tagging.md) (session/agent provenance),
[0011](./0011-agent-session-log.md) (session JSONL), [0018](./0018-explicit-ids-and-field-sync-tiers.md)
(field sync tiers), [0043](./0043-graph-native-eval-ontology.md) (evals),
[0050](./0050-notes-and-derived-operator-surface.md) (derived operator surface)
**Related:** [0019](./0019-graph-native-cron.md) (cron), [0030](./0030-agent-execution-infrastructure.md)
(agent execution infrastructure)
**Impacted components:** `src/vcs/transcript.ts`, `src/vcs/ops.ts`,
`src/vcs/decompose.ts`, `src/vcs/sync-policy.ts`, `src/evals/*`,
`src/cli/` (`report`, `wip`, `admin`)

## Context

Trellis already records **what happened, in what order, under whose authority**:
every durable op carries `agentId`, `sessionId`, and (when bound) `laneId`
(ADR 0004/0011), and ADR 0043 gives an **outcome** signal (`EvalRun`: success,
score, rationale, op-log-delta assertions). What it does **not** record is
**what a session cost**.

Concretely, measured against the tree:

1. **Usage exists but is a stub.** `vcs:chatMessage` carries a single `tokens`
   scalar annotated *"for cost rollups"*, and `decompose.ts` writes it as a fact
   on the message entity with `sessionId` on the lane. But capture is gated off
   by default (`transcripts.enabled = false`) and is **local-only**. There is no
   input/output split, no cost, no latency, no model, no per-tool attribution.
2. **Errors are silent.** A failed turn is not an op fact; the only `error`
   surface is an eval assertion's `errorMessage`.
3. **No rollup exists.** Nothing composes ops + transcripts + evals into a
   per-lane usage view; `report` (ADR 0050) covers activity and intent, not cost.
4. **The desk harness op-log is a stub.** `ops-*.jsonl` schema v1 declares
   `model`, `tool`, `action`, `tool_use_id` but populates them `"unknown"`.

The motivating use is **comparison**: to measure a turtleOS agent against any
other harness, you need three axes per lane, not one:
**outcome** (did it work) × **cost** (tokens, money, latency) × **process**
(what it did, including what it must *not* have done — ADR 0043).

## Decision

### 1. Per-turn usage is a durable fact on the existing turn op

Extend `ChatMessageInput` / the `vcs:chatMessage` payload: `tokensIn`,
`tokensOut`, `costUsd`, `latencyMs`, `model`, `toolName`, `error`, `errorKind`.
Keep legacy `tokens`. `decompose` writes each as a fact on the message entity;
`sessionId` continues to link the lane.

**Only per-turn totals — never per-token deltas.** Streaming deltas belong to
the realtime shadow bus (ADR 0018 tiers); committing them would be log-fatigue,
exactly the split the durability model exists to prevent.

### 2. Errors are first-class

A failed turn records `error` + `errorKind` on the turn op. No new op kind — the
turn is already an op. Failure is data, not silence.

### 3. Rollups are derived, never stored

One generator over ops computes, per lane and per session: tokens in/out, cost,
p50/p95 latency, tool-call counts, error rate, op count. Projections: the
`report` `--usage` view (ADR 0050), a `wip` line, and the `admin` console. **No
`Metrics` entity with maintained counters** — recompute, per ADR 0050 d3.

### 4. Outcome joins evals

The rollup left-joins `EvalRun` (ADR 0043) by lane/session, yielding the
**outcome × cost × process** table per lane — the comparison unit.

### 5. Capture is agent-agnostic, at the harness boundary

Usage is captured where a **turn is observed** — the CLI `ask`/console, harness
hooks, and ACP hosts — never inside a model SDK. Any host (Claude, Cursor,
Gemini, Codex, OpenCode, turtleOS `tsh`) is therefore measured identically. This
is the precondition for the comparison to be science rather than anecdote.

### 6. Privacy default

Usage facts inherit transcript policy: **local-only** unless `transcripts.sync`
is set (ADR 0011's posture — "privacy is the default; sync is the decision").
Aggregates may sync; raw message text never leaves the desk by default.

## Consequences

**Good**

- Sessions become **measurable**: cost, latency, error rate, tool mix per lane.
- Comparison against any other agent has a defined, identical instrument.
- No drift risk — every number is a derived read over the op-log.

**Costs / risks**

- Requires harness cooperation to emit per-turn totals; partial coverage until
  every host emits them (state coverage explicitly in the rollup).
- Latency semantics must be pinned: per-turn wall-clock vs per-tool; define both.
- The privacy boundary must hold — usage facts are as sensitive as transcripts.

**If we don't**

- Cost and latency stay invisible; agent comparisons stay anecdotal.
- Regressions in efficiency go unnoticed until they become architectural.
- ADR 0043 evals measure *outcome* with no *price* — half the comparison.

## Implementation phases

- **P0:** extend `vcs:chatMessage` usage fields; emit per-turn usage from the CLI
  `ask`/console path; write facts in `decompose`.
- **P1:** `report --usage` per-lane/per-session rollup (tokens, cost, p50/p95,
  tool counts, error rate).
- **P2:** left-join `EvalRun` → outcome × cost × process table.
- **P3:** populate the desk harness op-log (`model`/`tool`/`error`) so IDE sessions
  contribute, or scope the experiment to harness-driven lanes.

## Addenda

### 2026-09-29 — review (pre-implementation; proposed amendments)

Review while authoring [0052](./0052-agent-liveness-census.md). Decision text above
is unchanged; these are amendments to fold in before P0 begins.

1. **Coverage is inverted vs d5.** P0–P2 light up only the CLI `ask`/console path
   and P3 (the desk op-log stub of d4) is last — but a 2026-09-29 desk census found
   three working agents, *none* via `ask`. P0–P2 would measure the smallest slice
   of real work. Promote harness-boundary coverage ahead of the rollup, or state
   the CLI-only scope explicitly in P0's definition of done.
2. **`costUsd` should not be a stored fact.** Per d1 it is written per turn; prices
   are provider- and date-specific, so a stored cost drifts — contradicting d3's
   derived principle. Store raw token counts + `model`, compute cost in the
   rollup. The d1 split must include **cache read/write** (opencode already emits
   `cache_read`/`cache_write`); without them Anthropic-style cost is wrong.
3. **`latencyMs` semantics must be pinned before P0.** The Consequences already
   flag per-turn wall-clock vs per-tool as open. Wall-clock on a lane-bound
   session includes human think-time and is not an efficiency metric — define it
   as model/tool time, or emit both fields distinctly.
4. **No session-end boundary.** Rollups are per lane/session but nothing records a
   session closing, so per-session numbers cannot finalize. Same missing trigger
   as **TRL-407** (session-end disposition hook); cite and share the hook.
5. **Privacy wording (d6) is loose.** "Aggregates may sync" should require
   lane-level or k-anonymous aggregation — per-session cost + timing is
   behaviorally revealing even without message text.

Coupling: [0052](./0052-agent-liveness-census.md) reuses d5's harness boundary so
one hook serves presence *and* usage; 0052 P3 depends on this ADR's P3.
