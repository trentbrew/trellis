---
version: alpha
name: trellis admin — Operate header/toolbar parity
description: >-
  Design for TRL-194 — bring CollectionBrowseToolbar density into kernel admin VCS:
  full-width toolbar row under brand header; view picker + search + stub actions.
source:
  tool: greenfield
  mock: docs/artifacts/trellis-admin-toolbar_mockup.html
  research: >-
    design-research TRL-194; CollectionBrowseToolbar; CollectionViewPicker;
    trellis-admin-shell_design.md; admin.html header; runtime-theme.css
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
  tml-glass-surface: "rgba(22, 22, 22, 0.75)"
  sidebar-bg: "#0c0c0c"
  toolbar-bg: "#101010"
  toolbar-track: "#1e1e1e"
  toolbar-active: "#1c1c1c"
  live-dot: "#12c905"
typography:
  body:
    fontFamily: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif
    fontSize: 13px
    fontWeight: 400
  toolbar:
    fontFamily: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif
    fontSize: 12.8px
    fontWeight: 500
  brand:
    fontFamily: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif
    fontSize: 14px
    fontWeight: 700
  crumb:
    fontFamily: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace
    fontSize: 11px
    fontWeight: 500
rounded:
  sm: 6px
  md: 8px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
components:
  brand-header:
    height: 40px
    backgroundColor: "{colors.tml-glass-surface}"
  operate-toolbar:
    minHeight: 48px
    controlHeight: 34px
    gap: "{spacing.xs}"
    borderBottom: "{colors.border-base}"
    backgroundColor: "{colors.toolbar-bg}"
  view-picker:
    height: 34px
    rounded: "{rounded.md}"
  search-composite:
    height: 34px
    rounded: "{rounded.md}"
  action-btn:
    height: 34px
    rounded: "{rounded.md}"
---

# Design: trellis admin — Operate header/toolbar parity

**Status:** Design verified — ready for Architect  
**Parent:** TRL-194 · **Design issue:** TRL-195  
**Mock:** [trellis-admin-toolbar_mockup.html](./trellis-admin-toolbar_mockup.html)  
**Canon:** `fractal-playground/components/collections/collection-browse-toolbar.tsx` (`CollectionBrowseToolbar`) + `CollectionViewPicker` toolbar variant  
**Amends:** [trellis-admin-shell_design.md](./trellis-admin-shell_design.md) (header/toolbar placement only)  
**Preserves:** sidebar OPERATE_NAV, visual-parity projections, statusbar telemetry, embed contract

---

## Overview

Raise kernel VCS chrome to the same **Operate browse family** as playground
Collections — not by porting React/shadcn, but by restaging the toolbar as a
**full-width sticky row** under a slim brand header, matching
`CollectionBrowseToolbar` density and L→R order.

Emotional tone: dense L3 operator strip — 34px controls, 4px gaps, muted active
view segment, composite search, honest stubs on the right.

## Colors

Inherit `runtime-theme.css`. Toolbar sits on `--bg` / `{colors.toolbar-bg}` with
a bottom hairline (brand header already supplies the top edge). View picker
**track** = `{colors.toolbar-track}` (`#1e1e1e` / `--background-weak`). **Active
segment** = `{colors.toolbar-active}` (`#1c1c1c` / `--surface-raised`) — raised
on muted track (not accent-filled). Primary **+ New issue** uses accent when
enabled; this wedge ships it **disabled** (coming soon).

## Typography

Brand 14px bold. Crumb `Operate / VCS` mono 11px weak. Toolbar labels ~12.8px
medium sans. Search placeholder sans (drop mono-only search field).

## Layout

### Chrome stack (normative)

```
[ sidebar 200 ] [ brand header 40 ……………………… ]
[              ] [ Operate toolbar full-bleed ……… ]
[              ] [ main projections | op-log 280  ]
[              ] [ statusbar (live · repo · stats) ]
```

| Region | Spec |
| ------ | ---- |
| Brand header | Slim glass bar: brand + optional crumb `Operate / VCS` — **no** view/search |
| Operate toolbar | Full main width; `border-y`; `padding: 8px 16px`; `gap: 4px`; sticky under brand |
| Control height | **34px** (kernel + e2e lock; not playground 32px) |
| Statusbar | Unchanged SSOT for live / repo / stats (do not move into header) |

### L→R toolbar order (normative)

1. **View picker** — Grid · Kanban · Table (icon + **label only when active**)
2. **Search composite** — `flex: 1`; search icon + input + clear
3. **Filters** — ghost icon button; stub menu (table-oriented copy)
4. **Export** — ghost icon; **disabled**; `aria-label="Export"`
5. **+ New issue** — primary; **disabled** this wedge; name “New issue (coming soon)”

**Out of toolbar:** Upload, Physics, Hash/Query search modes, schema view
eligibility, grid column-count control.

### View id map

| Admin `data-view` / `?view=` | Playground mode | Icon |
| ---------------------------- | --------------- | ---- |
| `grid` | `card-grid` | layout-grid |
| `kanban` | `kanban` | layout-dashboard |
| `table` | `table` | table |

## Elevation & Depth

Brand header: glass. Toolbar: flat `--bg` + hairline `border-y`. Search
composite: inset border field. Primary New: accent (disabled → muted opacity).

## Shapes

Controls `8px` radius; view picker shell bordered with `2px` inner padding;
icon buttons square ~34×34.

## Components

| Component | Anatomy | States | Maps to |
| --------- | ------- | ------ | ------- |
| Brand header | brand · crumb | embed unchanged | slim `.header` |
| Operate toolbar | full-bleed row | sticky | new `.operate-toolbar` (extract from header `.toolbar`) |
| View picker | radiogroup; icon; label if active | `aria-checked` / pressed | restyle `.view-toggle` |
| Search composite | icon · input · clear | has-value | `#search` |
| Filters | icon + optional badge | stub open/close | new |
| Export | icon | disabled | new |
| New issue | label `+ New issue` | disabled coming soon | new |

### Interaction matrix

| State | Input | Output |
| ----- | ----- | ------ |
| Idle VCS | Activate Grid / Kanban / Table | Projection swap; URL `?view=`; localStorage (existing) |
| Idle | Type in search | Client filter lanes/issues/ops (existing) |
| Idle | Clear search | Clear filter + focus input |
| Idle | Activate Filters | Toggle stub note: “Filters coming soon.” (no column-filter claim) |
| Idle | Escape / outside click / re-click Filters | Close stub; focus returns to Filters button |
| Idle | Activate Export / New | No-op; disabled |
| Embed `?embed=1` | Load | Sidebar hidden; brand + toolbar + main + oplog + statusbar remain |
| Narrow width | Resize | Desktop mock normative; responsive wrap deferred (Architect may note) |

### Accessibility

- View picker: `role="radiogroup"` `aria-label="Projection"` with
  `role="radio"` + `aria-checked`; Left/Right arrows move selection (document in
  impl). Alternative `aria-pressed` only if Architect chooses minimal churn —
  then update e2e in-wedge.
- Search: `type="search"`; labeled; clear labeled.
- Filters: `aria-label="Filters"`; stub note uses `role="status"` (not `menu`);
  `aria-expanded` on button; Escape / outside / re-click dismisses; focus returns
  to Filters.
- Export / New: disabled with explicit accessible names including purpose.
- Focus order (standalone): sidebar → brand header → toolbar (picker → search →
  filters → export → new) → main → op-log → statusbar.
- Embed: skip sidebar.
- `prefers-reduced-motion`: no toolbar motion beyond color/opacity.

## Do's and Don'ts

**Do**

- Match CollectionBrowseToolbar **order and density**.
- Keep `--toolbar-control-h: 34px` and existing search/view wiring.
- Keep theme link to `/theme/runtime-theme.css` only.
- Keep statusbar telemetry where e2e expects it.

**Don't**

- Port AppShell breadcrumbs / presence / RoomSelector / shadcn.
- Fake working Filters / Export / New.
- Move live/stats back into the brand header.
- Change visual-parity projection CSS.
- Add datatable / Collections materialization this wedge.

## Open for Architect

1. AC: extract toolbar to full-bleed `.operate-toolbar` under slim `.header` (40px brand).
2. AC: view picker icon + label-on-active; muted track + raised active segment; 3 modes wired.
3. AC: search composite flex-1; keep `#search` / `#search-input`; filter behavior preserved.
4. AC: Filters stub note (“Filters coming soon”) + disabled Export + disabled New issue.
5. AC: e2e — toolbar present; view + search; embed keeps toolbar; 34px heights;
   no live/stats in brand header; migrate selectors with a11y choice.
6. Radiogroup (preferred) vs aria-pressed — pick one; update e2e in-wedge.
7. Out of scope: wire New → `issue create`; real filters; export; datatable; responsive polish.

### Cohesion (pre-architect · synthesist)

1. **Supersede shell header contract:** brand 40 + full-bleed toolbar; amend embed grid so brand + toolbar + main + oplog + statusbar remain. Retire shell “header = brand · live · stats · view · search.”
2. **View picker lock:** muted track / raised active — not accent pill; label-on-active only.
3. **Search continuity:** restyle composite; preserve `#search` / `#search-input` wiring.
4. **Stub honesty:** Filters = “coming soon” only; Export/New disabled with clear names.
5. **Preserve:** OPERATE_NAV sidebar; visual-parity projections; theme SSOT; no AppShell.

## Design verification

- refs: trellis-admin-toolbar_design.md, trellis-admin-toolbar_mockup.html (read)
- interaction matrix: 8 rows, 0 empty cells
- a11y: focus order + prefers-reduced-motion documented
- token parity: YAML ↔ mock :root verified
- design.md lint: N/A — token-only wedge
- design critique: 2 rounds, 0 blockers remaining
