---
version: alpha
name: TML Phase 4 — vantage shell resolution
description: >-
  Design for TRL-270 — collapse grid/kanban/table into shell registry resolution;
  shellForVantage(kind, --ui-vantage); single collection query; one binding site per entity kind.
source:
  tool: greenfield
  mock: docs/artifacts/tml-phase-4-vantage-shell_mockup.html
  research: >-
    design-research TRL-270; tml-phase-3-shell-registry §8; unified-theme-contract-phase-c;
    trellis-admin-shell_design.md; client.html vantage scrubber
colors:
  background-base: "#101010"
  background-weak: "#1e1e1e"
  surface-raised-base: "#1c1c1c"
  surface-inset-base: "#161616"
  border-base: "rgba(255, 255, 255, 0.195)"
  text-strong: "rgba(255, 255, 255, 0.936)"
  text-base: "rgba(255, 255, 255, 0.618)"
  text-weak: "rgba(255, 255, 255, 0.422)"
  text-interactive-base: "#9dbefe"
  surface-success-strong: "#12c905"
  entity-issue: "#e85d4c"
  entity-lane: "#9dbefe"
  tml-accent-glow: "rgba(157, 190, 254, 0.12)"
  tml-glass-surface: "rgba(22, 22, 22, 0.75)"
  shell-resolver-bg: "rgba(157, 190, 254, 0.06)"
  binding-highlight: "rgba(232, 93, 76, 0.18)"
typography:
  body:
    fontFamily: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace
    fontSize: 10px
    fontWeight: 600
    letterSpacing: 0.08em
  mono:
    fontFamily: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace
    fontSize: 12px
    fontWeight: 400
rounded:
  sm: 6px
  md: 8px
  lg: 10px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
components:
  view-toggle:
    height: 32px
    backgroundColor: "{colors.surface-inset-base}"
    activeGlow: "{colors.tml-accent-glow}"
  shell-resolver:
    backgroundColor: "{colors.shell-resolver-bg}"
    borderColor: "{colors.text-interactive-base}"
    font: "{typography.mono}"
  issue-card-shell:
    padding: "{spacing.md}"
    minWidth: 280px
    bindingSite: "issue.title (single template)"
  lane-row-shell:
    height: 42px
    bindingSite: "lane.id, lane.targetBranch, lane.issueId"
---

# Design: TML Phase 4 — vantage shell resolution

**Status:** Design verified — ready for Architect  
**Parent:** TRL-270 · **Design issue:** TRL-277  
**Epic:** TRL-269 · **Mock:** [tml-phase-4-vantage-shell_mockup.html](./tml-phase-4-vantage-shell_mockup.html)  
**Builds on:** [tml-phase-3-shell-registry](../specs/tml-phase-3-shell-registry.md) · [trellis-admin-shell_design.md](./trellis-admin-shell_design.md)

---

## Epic AC amendment (TRL-269)

Epic wording “grid/kanban/table share one `issue.title` binding site” means **one
binding site per entity kind**, not one global grep across all views:

| Entity kind | Single binding template | Views that hydrate it |
| ----------- | ----------------------- | --------------------- |
| Issue | `#shell-issue-card` → `tml-text="issue.title"` | Kanban (`issue.card`) |
| Lane | `#shell-lane-card` / `#shell-lane-row` | Grid (`lane.card`), Table (`lane.row`) |

Grid and table in MVP project **lanes**, not issues — `issue.row` deferred to
Phase 4b when issues appear in table. Architect AC must grep per kind, not
assert `issue.title` inside `#view-table`.

## Overview

Phase 3 proved **one shell template, many slots** for kanban issue cards. Phase 4
completes the Thing/Shell model: **view mode selects a projection host**, not a
parallel TML template fork. `shellForVantage(kind, vantage)` resolves which
registered shell (`issue.card`, `lane.card`, `lane.row`) hydrates each slot.

Operator goal: edit `issue.title` once in `#shell-issue-card` — kanban, grid,
and future table issue rows all reflect the change. Lane entities get
`lane.card` (grid) vs `lane.row` (table) shells with shared binding sites.

Emotional tone: same dense Operate console — this wedge is **architecture made
visible** in the board toolbar (resolver readout), not a new visual language.

## Colors

Inherit admin shell tokens. Phase 4 adds **diagnostic accents only in design mock**:

| Token | Role |
| ----- | ---- |
| `shell-resolver-bg` | Resolver panel behind `#tml-root` (dev/design; optional in prod) |
| `binding-highlight` | Annotates single binding site in mock legend |
| `entity-issue` / `entity-lane` | Shell kind badges in resolver readout |

Production admin stays on existing Studio dark + glass header — no new palette fork.

## Typography

Unchanged from admin shell. Resolver readout uses `{typography.mono}` at 12px for
`ShellId` + detent values. Territory labels reuse Phase C convention:
**node (2) · row (5) · card (8)**.

## Layout

### Regions (within existing `#tml-root`)

```text
┌─ view-header (unchanged) ─────────────────────────────────────┐
│ view-toggle │ search │ … │ [optional] vantage scrubber        │
├─ shell-resolver strip (Phase 4 — collapsible in prod) ──────┤
│ host: kanban │ kind: issue │ shell: issue.card │ v: 8        │
├─ projection host (one active) ────────────────────────────────┤
│  kanban │ grid │ table  ← CSS .proj.active, not duplicate TML │
└─ shell templates (#shell-*) — off-screen, single binding ────┘
```

### Projection host map (normative)

| Active view | Host element | Entity in scope | Resolved `ShellId` | `data-trellis-shell` |
| ----------- | ------------ | --------------- | ------------------ | -------------------- |
| Kanban | `.kanban-col-body` | Issue | `issue.card` | `card` |
| Grid | `.grid-host` | Lane | `lane.card` | `card` |
| Table | `tbody` | Lane | `lane.row` | `row` |

**Open question resolved:** Table at high vantage uses **row shell**, not kanban
card — datatable primitive requires 42px `<tr>` semantics (`trellis-admin-datatable`).

### Single collection query

One upstream TML query per entity kind feeds all hosts:

- Issues: single live query ref (kanban columns partition by status filter, not
  by duplicating bindings)
- Lanes: `#grid-lanes` and `#table-lanes` share **one** `tml-ref="lanes-board"`
  query; hosts differ only by shell slot id

Architect encodes query ref unification — design requires **one binding graph**
per kind visible in grep AC.

## Elevation & Depth

Shell swap does not change inset ladder (`--surface-1/2/3`). Kanban columns keep
`--tml-kanban-body-inset`. Table stays full-bleed `.table-view` (no card inset).

Vantage detent modulates **disclosure within shell** via Phase C CSS:

```css
[data-ui-vantage="2"] [data-trellis-shell="node"] { … }
[data-ui-vantage="5"] [data-trellis-shell="row"] { … }
[data-ui-vantage="8"] [data-trellis-shell="card"] { … }
```

Phase 4 MVP: fixed `--ui-vantage: 8` on `#tml-root`; scrubber wiring is stretch
(same hook pattern as `client.html`).

## Shapes

- Issue card shell: `{rounded.md}`, min-width 280px (kanban col parity)
- Lane row shell: 42px row height, square cell corners (datatable contract)
- Lane card shell: `{rounded.lg}` article tile (existing grid)

## Components

| Component | Anatomy | States | Maps to codebase |
| --------- | ------- | ------ | ---------------- |
| View toggle | 3-way radiogroup grid/kanban/table | one `aria-checked="true"` | `admin.html` `.view-toggle`; becomes host switcher only |
| Shell resolver strip | mono readout: host, kind, ShellId, vantage | updates on view change | new `#shell-resolver` (optional prod); mock always visible |
| Vantage scrubber | detents 2/5/8 | `aria-checked` per detent | `client.html` `#vantage-scrubber` pattern |
| `#shell-issue-card` | button.issue-card + bindings | default / in-progress spin | `ShellId issue.card` — **one** `tml-text="issue.title"` |
| `#shell-lane-card` | article.lane-card | focus, promote CTA | `ShellId lane.card` — register + slot in grid |
| `#shell-lane-row` | tr lane row | selected, editable cells | `ShellId lane.row` — slot in table tbody |
| Projection slot | `[data-shell-slot="<ShellId>"]` | hydrated / pending | `hydrateShellSlots()` in `admin-shell.ts` |

## Interaction matrix

| Input | States | Output |
| ----- | ------ | ------ |
| View toggle → Kanban | grid/table hidden | Active host `#view-kanban`; slots request `issue.card`; resolver shows `issue.card @ v8` |
| View toggle → Grid | kanban/table hidden | Active host `#view-grid`; slots request `lane.card` |
| View toggle → Table | kanban/grid hidden | Active host `#view-table`; slots request `lane.row` |
| Vantage detent 2/5/8 (stretch) | focal `#tml-root` | Sets `--ui-vantage` + `data-ui-vantage`; re-run `shellForVantage`; clear `data-shell-hydrated`; re-hydrate slots **without reload** |
| Connect / live push | mount pending | `indexTemplates` → `hydrateShellSlots` → `mount()` (order preserved from Phase 3) |
| Edit shell template | author in `#shell-issue-card` | All kanban columns + any issue slots reflect on next hydrate/mount |
| Issue card click | pointer on `.issue-card` | Existing detail dialog (regression — no change) |
| Lane row click / cell edit | table host | Existing datatable handlers on `tr[data-kind="lane"]` |

### Inherited datatable regressions (preserved)

Normative cross-ref: `trellis-admin-datatable_design.md` §Interaction matrix.
Shell swap must **not** regress:

| Input | States | Output |
| ----- | ------ | ------ |
| Zero lanes in snapshot | table host active | Empty tbody; no phantom rows |
| Search filter | no matches | “No matches” state; shell slots stay empty |
| Sort header click | table host | Column sort cycle unchanged (`aria-sort`) |
| View toggle → table | prior sort persisted | Sort state survives host switch + re-hydrate |
| Cell edit (branch/issue cols) | inline edit | Datatable primitive unchanged on `lane.row` shell |
| Re-hydrate after shell id change | slot cleared | TML live query re-projects rows; focus not lost on unrelated cells |

## Accessibility

- **Focus order:** view toggle (radiogroup) → search → board content → optional
  vantage scrubber → first focusable entity in active host. Hidden `.proj` hosts
  use `hidden` or `inert` — not merely `display:none` with tabbable children.
- **Labels:** view toggle keeps prod string `aria-label="Projection"` (preserve
  `admin.html`); resolver strip `aria-live="polite"` when shell id changes (stretch).
- **Vantage scrubber (stretch):** mirror `client.html` — text labels Node/Row/Card
  on detents 2/5/8 + `#vantage-territory` live readout.
- **Motion:** shell morph uses Phase C transitions; honor `prefers-reduced-motion:
  reduce` — snap shell swap, no crossfade (match `runtime-theme.css`).

## Do's and Don'ts

**Do**

- Register all shells as `<template data-trellis-shell="…">` with single binding sites
- Resolve slot id from `shellForVantage(kind, readVantage(root))` before hydrate
- Share one TML query ref per entity kind across grid/table lane hosts
- Keep table on `lane.row` shell at all vantages

**Don't**

- Fork parallel `#view-*` templates with duplicate `tml-text="issue.title"`
- Put kanban card shell inside `<tr>` for table density
- Full page reload on view or vantage change
- Introduce `<trellis-thing>` CE or user renderer packs (non-goals)

## Open for Architect

1. **Extend `ShellId`:** add `issue.row` when issues appear in table projection (Phase 4b); MVP AC focuses lane row + issue card.
2. **`shellForVantage` signature:** `(kind: 'issue' | 'lane', vantage: number, host?: 'kanban' | 'grid' | 'table')` — host disambiguates table-row vs card when kinds overlap.
3. **Re-hydrate protocol:** clearing `data-shell-hydrated` on slot when resolved id changes; confirm TML `tml-each` row templates survive re-hydrate.
4. **Query unification AC:** grep + vitest asserting one `tml-text="issue.title"` and single `tml-ref` for lanes across grid/table.
5. **Vantage scrubber:** defer to stretch; ship view-toggle → shell map at `--ui-vantage: 8`.
6. **Resolver strip:** design mock includes `#shell-resolver` for operator clarity; prod default `hidden`, toggle via `?debug=shell` or dev-only.

## Handoff checklist

- [x] `docs/artifacts/tml-phase-4-vantage-shell_design.md` (this file)
- [x] `docs/artifacts/tml-phase-4-vantage-shell_mockup.html`
- [ ] Architect spec AC from interaction matrix + Open section
