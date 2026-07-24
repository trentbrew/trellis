# Admin write surface · agents · pipeline canvas

**Status:** Backlog (not scheduled)  
**Date:** 2026-07-21  
**Issue:** TRL-219  
 
**Relates to:** `docs/specs/trellis-admin.md`, ADR 0014/0015, Cursor pipeline
hooks (`trellis-agent-pipeline`), `docs/planning/lane-agent-experience.md`

## Intent

Grow `trellis admin` from a live **situation room** into a thin **Hokage
surface** — human writes that match what the board already shows — then later
agent roster + configurable pipeline. Do **not** turn admin into a second Studio
or a workflow IDE before pipeline topology is Trellis-owned data.

## Why now (backlog, not build)

Admin v1 already has live kanban/grid/table, op-log, and **promote** via
`POST /api/tml-mutations`. Staring at issues/lanes while bouncing to CLI for
“start / pause / triage” feels like a museum plaque. Writes that close that gap
are high leverage; a full xyflow pipeline editor is not — pipeline today lives
in Cursor hooks + profiles, not as a first-class graph artifact.

## Phasing

### Phase A — Surgical board writes (first wedge when pulled)

Extend `/api/tml-mutations` (and admin UI) so the board can drive the same paths
as CLI for **board-visible** ops:

| In scope | Out of scope |
| -------- | ------------ |
| Issue create, triage, start, pause, resume, status drag | File / code edits |
| Promote (already shipped), clear stale promote lock | Arbitrary graph surgery |
| Issue inspect dialog → mutations | Model / provider config |
| Identity: human admin writes as `agent:human` (or explicit Hokage id), lane-aware | Silent trunk edits from the browser |

**Acceptance sketch**

- Kanban column move calls the same semantics as `trellis issue start|pause|…`
- New issue from header works end-to-end; op-log shows the mutation
- Mutations refuse or warn when they would violate lane ownership (ADR 0015)
- E2E covers at least: create issue, start from backlog, promote still green

### Phase B — Agents roster (read-mostly)

Admin **Agents** (or status-bar expansion): who is bound, which lane, which
issue, last op, optional budget/chakra stub. Manage = inspect + soft controls
(pause lane, request handoff) — not a full agent runtime UI.

Depends on Phase A mutation hygiene (identity + lane).

### Phase C — Pipeline as data (CLI / MCP first)

Roles, handoff edges, and gates (review, design-critic, etc.) become versioned
Trellis-owned config or graph entities — editable via CLI/MCP **before** any
canvas. Cursor hooks become a consumer of that config, not the source of truth.

### Phase D — Workflow canvas (later)

xyflow-esque editor that **reads** Phase C data: hop → hop layout, edit edges
that mean HANDOFF targets / required labels. Park until Phase C exists; a canvas
without durable topology is cosplay.

## Non-goals

- Replacing CLI/MCP as the primary agent write path
- Configuring Cursor profiles from the browser as the first step
- Infinite agent-tab spawning without cost/budget signals

## Metaphor (optional AX framing)

Lanes ≈ shadow clones; promote ≈ dispel; admin writes ≈ Hokage seals; foundation
models ≈ beasts; harness ≈ jinchūriki. Useful for AX copy — not a UI skin
requirement.

## Next step when scheduled

1. Open proposal → design (kanban drag + mutation API shape) → spec → impl for
   **Phase A only**.
2. Leave B–D as child issues or checklist items on the parent.
