---
version: alpha
name: trellis admin — Operate datatable
description: >-
  Design for TRL-200 — raise admin #view-table / .lanes-table to SpreadsheetTable
  density in TML (sort headers, 42px rows, empty states). No React port.
source:
  tool: greenfield
  mock: docs/artifacts/trellis-admin-datatable_mockup.html
  research: >-
    design-research TRL-200; SpreadsheetTable.tsx; collection-records-projection
    table mode; trellis-admin-toolbar_design.md; trellis-admin-visual-parity_design.md;
    lanes.html sortable table; runtime-theme.css
colors:
  background-base: "#101010"
  surface-raised-base: "#1c1c1c"
  surface-inset-base: "#161616"
  surface-hover: "#222222"
  border-base: "rgba(255, 255, 255, 0.195)"
  border-column: "rgba(255, 255, 255, 0.06)"
  text-strong: "rgba(255, 255, 255, 0.936)"
  text-base: "rgba(255, 255, 255, 0.618)"
  text-weak: "rgba(255, 255, 255, 0.422)"
  text-interactive-base: "#9dbefe"
  surface-success-strong: "#12c905"
  toolbar-bg: "#101010"
typography:
  body:
    fontFamily: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif
    fontSize: 13px
    fontWeight: 400
  data:
    fontFamily: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace
    fontSize: 12px
    fontWeight: 400
  header:
    fontFamily: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace
    fontSize: 10px
    fontWeight: 600
    letterSpacing: 0.04em
    textTransform: uppercase
rounded:
  sm: 6px
  md: 8px
  lg: 10px
  xl: 12px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
components:
  table-wrap:
    borderRadius: "{rounded.xl}"
    border: "{colors.border-base}"
    backgroundColor: "{colors.surface-raised-base}"
  table-header:
    height: 36px
    backgroundColor: "{colors.surface-raised-base}"
    color: "{colors.text-weak}"
  table-row:
    height: 42px
    hoverBackground: "{colors.surface-hover}"
  sort-btn:
    height: 100%
    gap: "{spacing.xs}"
---

# Design: trellis admin — Operate datatable

**Status:** Design verified — ready for Architect  
**Parent:** TRL-200 · **Design issue:** TRL-201  
**Mock:** [trellis-admin-datatable_mockup.html](./trellis-admin-datatable_mockup.html)  
**Canon:** `fractal-playground/components/boards/spreadsheet/SpreadsheetTable.tsx`  
(+ `collection-records-projection.tsx` table mode, `showToolbar={false}`)  
**Amends:** visual-parity table density only — not shell/toolbar chrome  
**Preserves:** OPERATE_NAV, operate-toolbar, statusbar, embed, TML live tbody, row→`#dlg`

---

## Overview

Raise the Operate **table projection** from a bare `.lanes-table` to
**SpreadsheetTable browse density** — still semantic `<table>` + TML, not a React
port. Signature: **42px data rows**, **36px sticky sort headers** with cycle
none→asc→desc, column hairlines, and honest empty / no-match states. Toolbar
owns search; table is an embedded well.

Emotional tone: dense database-tool scan — mono data, uppercase column labels,
muted hover, accent only for focus and active sort.

## Colors

Inherit `runtime-theme.css`. Table well uses `{colors.surface-raised-base}` /
`--surface`. Column dividers use quieter `{colors.border-column}` so the grid
reads without competing with row separators. Row hover uses
`{colors.surface-hover}` (`#222`) — **not** `--surface2` / inset `#161616`
(that token darkens raised rows incorrectly) and **not** accent wash. Active
sort glyph uses `{colors.text-interactive-base}`.

## Typography

| Role | Token | Use |
| ---- | ----- | --- |
| Column header | `{typography.header}` | Uppercase sticky `th` labels |
| Cell data | `{typography.data}` | All six lane columns |
| Empty title | body 13px / 600 / strong | `.table-empty strong` |
| Empty desc | 12px / weak | `.table-empty span` |

## Layout

Shell and toolbar unchanged. Table lives in `#view-table.proj.table-view`:

```
.proj (padding 16px)
  └── .table-wrap (100% width, radius 12px / rounded.xl, overflow auto, min-height 0)
        ├── table.lanes-table (table-layout: fixed)
        │     thead sticky · tbody TML live
        └── .table-empty (body veil when zero visible rows; headers stay interactive)
```

Keep six columns: Lane · Agent · Ops · Files · Branch · Issue. No checkbox /
index / sticky ID rails this wedge.

## Elevation & Depth

Inset Hierarchy: table is a **raised well** on the stage (`--bg`), not a floating
card. Sticky header shares well surface with bottom hairline on the last header
cell row. No multi-layer shadows.

## Shapes

- Wrap radius `{rounded.xl}` (**12px**) — same as visual-parity `rounded.xl`; do
  **not** redefine theme `--radius-lg` (10px) to 12px  
- Internal cells: no radius; hairline column borders only  
- Sort control: text button flush in `th` (no pill)

## Components

| Component | Anatomy | States | Maps to codebase |
| --------- | ------- | ------ | ---------------- |
| Table well | `.table-wrap` | scroll | `admin.html` `.table-wrap` |
| Data table | `table.lanes-table` | fixed cols | keep class; tighten CSS |
| Sort header | `<th><button>` + sort icon | none / asc / desc · `aria-sort` | new; lanes.html `setSort` pattern |
| Data row | `tr[data-kind=lane]` | hover, focus-visible, hidden-by-search | existing + hover color change |
| Empty | `.table-empty` | zero lanes vs no matches | new; lanes.html empty |
| Detail | `#dlg` | open on row activate | preserve |

### Interaction matrix

| State / input | Output |
| ------------- | ------ |
| Click / Enter / Space on row | Open existing `#dlg` lane detail |
| Dialog close / Esc | Restore focus to activating row (preserve admin.html `lastFocus`) |
| Click sort button on header | Cycle sort: none → asc → desc → none; reorder visible rows; update `th[aria-sort]` + icon |
| Toolbar `#search-input` filter | Existing `.hidden-by-search` on rows; if all hidden → show “No matches” empty |
| Zero lanes from TML | Show “No lanes” empty inside wrap (empty tbody); sort headers remain interactive |
| Empty veil visible | Body overlay only (`pointer-events: none`); headers stay clickable/focusable |
| View toggle → table | `#view-table` visible; prefer persist sort key/dir in session |
| Keyboard: Tab to sort btn | Inset focus ring; Enter/Space activates sort cycle |
| `prefers-reduced-motion` | No row motion; instant sort reorder OK |

## Accessibility

**Focus order:** sidebar → brand → operate-toolbar (view · search · stubs) →
table sort headers → table rows → op-log → statusbar → dialog when open.

- Semantic `<table>`, `<th scope="col">`, optional `<caption class="sr-only">`
- Sortable headers: `<button type="button">` inside `th`; put
  `aria-sort="none|ascending|descending"` **only on the `th`** (not the button)
- Rows: keep `tabindex="0"` + Enter/Space → dialog
- Empty: `.table-empty` with `role="status"` when visible
- Sticky header: maintain contrast on `--surface`
- `prefers-reduced-motion: reduce`: no animated transforms on table/dialog

## Open for Architect

1. Encode CSS: `--table-row-h: 42px`, `--table-header-h: 36px`, column
   `border-right` via quiet `--border-column`; hover `{colors.surface-hover}` /
   `#222` (never `--surface2`); wrap radius **12px** = visual-parity
   `{rounded.xl}` (not theme `--radius-lg`).
2. Sort JS: single-key cycle; **re-apply sort comparator after TML live
   updates**.
3. Empty states: `.table-empty` sibling; toggle on zero lanes / all
   `.hidden-by-search`; headers remain interactive under veil.
4. e2e: table view sort click updates `th[aria-sort]`; row height ~42px; empty /
   no-match; shell/toolbar/parity cases green.
5. Out of scope AC: cell edit, column resize, checkbox selection, Filters model,
   New-issue wire, export, React SpreadsheetTable import, sticky ID rail.

### Cohesion (synthesist pre-architect)

- Hover ≠ `--surface2`; radius alias `xl`/12px; accent wash in current
  `admin.html` is impl debt this wedge fixes.
- Focus rings: inset interactive for table (mock); do not force chrome outward
  offset onto cells.

## Do's and Don'ts

**Do**

- Keep semantic `<table>` (a11y over div-grid SpreadsheetTable DOM)
- Match SpreadsheetTable **row/header rhythm** and sort cycle
- Leave search on operate-toolbar (`showToolbar={false}` pattern)

**Don't**

- Import React/shadcn/lucide
- Add second search bar inside the table
- Port checkbox rails, cell edit, or column filter menus this wedge
- Change shell grid, sidebar, or toolbar contracts

---

## Design research (summary)

Full research: design-research TRL-200. Anchors — SpreadsheetTable
`ROW_HEIGHT=42` / header `h-9`; collection projection `showToolbar={false}`;
admin `.lanes-table` sticky but unsorted; lanes.html sortable + `.table-empty`.
