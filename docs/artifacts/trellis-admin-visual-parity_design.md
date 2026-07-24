---
version: alpha
name: trellis admin — visual parity harden
description: >-
  Design for TRL-183 — bring kernel /admin projections (dialog, grid, kanban, table)
  to visual/layout parity with lanes.html / tml-lanes; CSS/markup only; theme SSOT.
source:
  tool: greenfield
  mock: docs/artifacts/trellis-admin-visual-parity_mockup.html
  research: >-
    design-research TRL-183; trellis-admin_design.md; unified-theme-contract;
    admin.html vs lanes.html / tml-lanes.html CSS deltas
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
  surface-critical-strong: "#fc533a"
  tml-accent-glow: "rgba(157, 190, 254, 0.12)"
  tml-kanban-body-inset: "rgba(255, 255, 255, 0.02)"
  tml-glass-surface: "rgba(22, 22, 22, 0.75)"
  dialog-backdrop: "rgba(0, 0, 0, 0.6)"
  rail-bg: "#0c0c0c"
typography:
  body:
    fontFamily: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace
    fontSize: 11px
    fontWeight: 500
    letterSpacing: 0.04em
  header:
    fontFamily: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif
    fontSize: 14px
    fontWeight: 700
  data:
    fontFamily: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace
    fontSize: 12px
    fontWeight: 400
rounded:
  sm: 6px
  md: 8px
  lg: 10px
  xl: 12px
  dialog: 14px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
components:
  dialog:
    maxWidth: 560px
    rounded: "{rounded.dialog}"
    backdrop: "{colors.dialog-backdrop}"
  grid:
    minTrack: 320px
    gap: 14px
  kanban-col:
    minWidth: 300px
    maxWidth: 340px
  table-wrap:
    rounded: "{rounded.xl}"
    backgroundColor: "{colors.surface-raised-base}"
  op-log:
    width: 280px
---

# Design: trellis admin — visual parity harden

**Status:** Design complete (handoff to Architect)  
**Parent:** TRL-183 · **Design issue:** TRL-184  
**Mock:** [trellis-admin-visual-parity_mockup.html](./trellis-admin-visual-parity_mockup.html)  
**Amends:** [trellis-admin_design.md](./trellis-admin_design.md) (projection chrome only)  
**Surfaces:** `src/ui/admin.html` (primary); reference `lanes.html`, `tml-lanes.html`

---

## Overview

Kernel `/admin` already has the right shell (AffordanceShell-lite + TML projections +
op-log). This wedge is **layout honesty**: make Grid / Kanban / Table / Dialog read as
the same operator language as `lane watch`, without inventing new components or
porting playground `SpreadsheetTable`.

Emotional tone stays L3 operator: dense, dark, mono labels, inset kanban bodies.
The signature of this pass is **full-bleed projections** — content uses the main pane
width; dialogs sit in the viewport center, not the origin.

## Colors

Inherit `runtime-theme.css` / prior admin design. No new palette. Dialog backdrop is
`rgba(0,0,0,0.6)` matching lanes. Kanban body inset stays `--tml-kanban-body-inset`
on **column bodies only**, not the whole `.proj` stage.

## Typography

Unchanged: body/header sans; labels + data mono. Kanban column titles use sans
uppercase (lanes `.col-title`), not mono-only heads.

## Layout

Shell grid unchanged: rail | main | op-log (`280px`). Embed mode unchanged.

### Projection stage (`.proj`)

| View | Padding | Background | Content layout |
| ---- | ------- | ---------- | -------------- |
| Grid | `16px` | `--bg` (not kanban inset) | CSS grid `auto-fill / minmax(320px, 1fr)` |
| Kanban | `16px` | `--bg` | flex row; columns `300–340px`; inset on col-body only |
| Table | `16px` | `--bg` | `.table-wrap` border shell fills content box (`width: 100%`) |

**Do not** paint `--tml-kanban-body-inset` on the entire `.proj` (current admin bug —
washes the stage and fights lanes).

### Dialog (locked)

**Chosen:** keep native `<dialog id="dlg">` already in `admin.html`. Center with
explicit `dialog { margin: auto; }` (and `max-width: 560px`) so the universal
`* { margin: 0 }` reset cannot pin it top-left. Use `dialog::backdrop` for
`rgba(0,0,0,0.6)`. `showModal()` / `close()` keep focus trap + Esc.

**Rejected alternate:** migrating to lanes’ `.dialog-backdrop` flex div — visual
twin only; not required if native dialog centers correctly. Mock demos the
**native** path so Executor does not thrash markup.

## Elevation & Depth

Cards / table wrap on `--surface` / `--surface-raised-base`. Dialog above backdrop
(z ≥ 900). Op-log stays right rail — not part of this polish.

## Shapes

Card / col head `10px`; table wrap `12px`; dialog `14px` — match lanes.

## Components

| Component | Anatomy | States | Maps to codebase |
| --------- | ------- | ------ | ---------------- |
| Centered dialog | native `<dialog>` + `::backdrop` + head + body + promote CTA | open / closed; Esc / backdrop / × | `admin.html` `#dlg` — `margin: auto` fix |
| Lane grid | host + lane cards filling tracks | hover / focus-visible / flash | `#view-grid` `.grid-host` → lanes `.grid` |
| Issue kanban | 3 cols + head (title + optional count) + body + cards | empty col | `#view-kanban` → lanes / `tml-lanes` `.kanban*` |
| Lanes table | `.table-wrap` > `table.lanes-table` | row hover; sticky th | `#view-table` → lanes `.table-wrap` + `table.lanes-table` |

### Interaction matrix

| State | Input | Output |
| ----- | ----- | ------ |
| Any view idle | Click view toggle (Grid / Kanban / Table) | One `.proj.active`; URL `?view=` + localStorage |
| Grid idle | Click / Enter on lane card | Centered native dialog with lane detail + Promote |
| Grid empty | Snapshot has zero lanes | Empty stage message inside grid host (no phantom card) |
| Kanban idle | Click / Enter on issue card | Centered dialog with issue detail + lanes list |
| Kanban empty col | Column query returns [] | Col body shows empty hint (lanes `.kanban-empty` tone) |
| Table idle | Click / Enter / Space on row | Same as grid (lane detail dialog) |
| Table empty | Zero lanes | Empty row or empty-state cell inside `.table-wrap` |
| Filtered empty | Search matches nothing | Existing `.hidden-by-search`; optional “no matches” (inherited) |
| Dialog open | Esc / × / backdrop click | `dialog.close()`; focus returns to opener |
| Dialog open | Promote lane | Toast + close (existing behavior) |
| Search active | Type in search | Filter cards/rows (**behavior inherited — not re-mocked**) |
| Embed `?embed=1` | Load | Rail hidden; projections still full-bleed (**inherited — not re-mocked**) |

### Accessibility

- **Focus order:** toolbar controls → projection cards/rows → dialog (when open) → op-log.
- **Dialog:** native `showModal()` focus trap; restore focus to triggering card/row on close.
- **Table rows:** activatable via keyboard (`tabindex="0"` + Enter/Space) or equivalent button affordance.
- **Labels:** view toggles keep `aria-pressed`; dialog close has `aria-label="Close"`.
- **Motion:** under `prefers-reduced-motion: reduce`, no transform and no opacity animation on dialog open (instant appear).
- **Contrast:** sticky table headers on `--surface`; do not drop border contrast below theme `--border-base`.

## Do's and Don'ts

**Do**

- Copy lanes/tml-lanes layout blocks literally where they already solve the bug.
- Keep TML bindings on inner hosts (`.grid-host` / col-body / tbody) — outer `#view-*` ids stay unique.
- Make table columns share width (`table-layout: fixed` or % widths) so the wrap is visually full-bleed.

**Don't**

- Port `SpreadsheetTable` / React table board.
- Soft-deprecate `lane watch` in this wedge.
- Invent a second dialog system if native dialog + margin restore is enough.
- Re-tint the whole projection stage with kanban inset.

## Open for Architect

1. Encode the four layout contracts as AC (dialog center measure, grid ≥2 tracks at ≥1100px main, kanban `display:flex`, table wrap width 100%, stage padding `16px` all views).
2. Dialog is **locked** to native `<dialog>` + `margin: auto` + `::backdrop` — do not migrate to backdrop div unless native centering fails in target browsers.
3. e2e smoke: open dialog → assert `getBoundingClientRect` roughly viewport-centered; grid host computed `grid-template-columns` has 2+ tracks when viewport wide; table wrap `clientWidth` ≈ main content box.
4. Out of scope AC: kill-gate, SpreadsheetTable, playground chrome, search/embed re-mocks.
