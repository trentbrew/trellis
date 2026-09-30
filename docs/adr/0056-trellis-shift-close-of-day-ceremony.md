# ADR 0056: `trellis shift` — a derived, gated close-of-day ceremony

**Status:** Proposed
**Date:** 2026-09-30
**Issues:** TRL-88 (lane hygiene), TRL-89 (host↔OS parity), TRL-90 (briefing)
**Depends on:** [0050](./0050-notes-and-derived-operator-surface.md) (derived operator
surface), [0015](./0015-agent-handoff-protocol.md) (`whereami` re-entry),
[0052](./0052-agent-liveness-census.md) (census), [0051](./0051-session-metrics.md)
**Related:** [0046](./0046-agent-forum.md), [0044](./0044-plan-artifact-capture.md)
**Impacted components:** `src/cli/` (new `shift`), `src/operator/` (`buildShift`),
desk `justfile`, agent-ops session-end hooks

## Context

Multi-agent desks lose context at end of day. The morning briefing rotted
precisely because it was a **hand-cached derived artifact with no refresh** (ADR
0050 d3 anti-pattern) — so the "re-entry" read was stale. Closing up today is
ad-hoc: some sessions commit, some leave dirty trees, some leave unpushed commits,
and per-session intent ("what I was about to do next") is lost with the process.

A close-of-day ceremony must therefore be the **mirror of the morning briefing**:
a *derived, gated* read plus durable checkpoints — never a hand-written note we
remember to produce.

## Decision

### 1. Close is a derived read + durable checkpoints

`trellis shift close` composes existing derived surfaces and records checkpoints:
- **Per agent:** a milestone for the wedge; `whereami checkpoint` (WAITING ON YOU
  / ACTIVE / next action, ADR 0015); lane disposition (session-end hook /
  `lane gc`); explicit WIP (commit, or a recorded reason not to).
- **Desk:** census (who is here) + hygiene (unpushed / dirty / stale lanes) +
  `wip` (active / queue / shipped / next) + open threads → renders `SHIFT.md` and
  writes a graph handoff entity.

### 2. Close is gated

Refuse a clean close when hygiene fails: unpushed commits, unresolved dirty lanes,
or a stale briefing source. The gate is the point — derived-without-a-gate is
theater (ADR 0050 d4).

### 3. Open is the inverse read

`trellis shift open` = `whereami` + truthful briefing + `wip` + census. One command
to re-enter, one to leave.

### 4. Exported generator

The read is `buildShift(engine, { … })` on `trellis/operator`, so host and OS
(turtleOS) render the identical close (ADR 0050/0052 d5).

## Alternatives considered

| Option | Why not |
| ------ | ------- |
| Hand-written nightly note | rots exactly like the briefing did |
| Nothing | context lost with the process |
| Only `whereami` | per-agent, no desk-level hygiene gate |

## Consequences

**Good** — context survives; the ceremony cannot rot because it is derived and
gated; re-entry is one command.

**Costs** — a generator is more work than a note once; the gate can annoy (must
gate something real, e.g. unpushed commits).

## Implementation phases

- **P0:** `trellis shift close`/`open` (derived read + `SHIFT.md`); `just close`.
- **P1:** hygiene gate (unpushed/dirty/stale lanes) + graph handoff entity.
- **P2:** per-agent checkpoints wired into the session-end hook; turtleOS view.
