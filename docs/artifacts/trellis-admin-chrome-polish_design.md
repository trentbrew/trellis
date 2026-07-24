---
version: alpha
name: trellis admin — chrome polish (post TRL-229)
description: >-
  Design for TRL-233 — stack collapsible WORK/LOGS zones, header band above secondary,
  icon breadcrumbs with route tab, full-width search, slim view header, oplog day groups.
source:
  tool: greenfield
  mock: docs/artifacts/trellis-admin-chrome-polish_mockup.html
  research: >-
    TRL-233 founder screenshot review; trellis-admin-vcs-layout-ide_design.md;
    admin.html TRL-229 impl; navigation-ia.md Plan/Logs panels
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
  sidebar-item-active: "rgba(157, 190, 254, 0.12)"
  toolbar-track: "#1e1e1e"
  toolbar-active: "#1c1c1c"
  live-dot: "#12c905"
  zone-work: "#9dbefe"
  zone-logs: "#f59e0b"
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
  crumb:
    fontFamily: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace
    fontSize: 11px
    fontWeight: 500
  view-meta:
    fontFamily: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace
    fontSize: 11px
    fontWeight: 500
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
  shell-grid:
    chromeHeight: 56px
    primarySidebarWidth: 200px
    secondaryWidth: 224px
  secondary-zone:
    collapsible: true
    headerHeight: 32px
  breadcrumb:
    iconSize: 14px
    segmentGap: 6px
  board-toolbar:
    controlHeight: 34px
    searchFlex: 1
  oplog-day-group:
    headerHeight: 28px
    disclosureSize: 12px
---

# Design: trellis admin — chrome polish

**Status:** Design verified — ready for Architect  
**Parent:** TRL-233 · **Design issue:** TRL-236 · **Amends:** TRL-229 / [trellis-admin-vcs-layout-ide_design.md](./trellis-admin-vcs-layout-ide_design.md)  
**Mock:** [trellis-admin-chrome-polish_mockup.html](./trellis-admin-chrome-polish_mockup.html)

---

## Overview

Founder UX pass on TRL-229 Work/Logs layout. Fixes three structural mismatches vs IDE mental model: (1) secondary zones splitting 50/50 instead of natural stack, (2) global header sitting beside secondary instead of spanning above it, (3) redundant route titling (`Work · Milestones`) when breadcrumbs should carry wayfinding.

Tone unchanged: dense operator shell, mono labels, 34px controls, honest stubs.

## Colors

Inherit `runtime-theme.css` and TRL-226 tokens. Zone chevrons use `{colors.text-weak}`. Active breadcrumb segment `{colors.text-strong}`; inactive `{colors.text-base}`. Oplog day headers `{colors.text-weak}` on `{colors.surface-inset-base}`.

## Typography

- Zone collapse headers: `{typography.label}` — WORK / LOGS with chevron.
- Breadcrumb trail: `{typography.crumb}` — repo · operate · vcs · **board** (active tab emphasized).
- View meta (when shown): `{typography.view-meta}` — **not** on `work/board` (counts live in header stats only).

## Layout

### Shell grid v2 (normative)

Two-row band above content; primary sidebar full height.

```
┌─────────┬──────────────────────────────────────────────┐
│         │  header: crumb (icons) + stats + notify      │  row 1, cols 2–4
│ primary ├──────────┬───────────────────────┬─────────┤
│ sidebar │ secondary│ main                  │ inspector│  row 2
│ (full)  │ (zones)  │ view-header + body    │ (pin)   │
└─────────┴──────────┴───────────────────────┴─────────┘
```

| Region | Grid placement |
| ------ | -------------- |
| `.sidebar` | col 1 · row 1 / -1 |
| `.header` | col 2 / -1 · row 1 |
| `.secondary` | col 2 · row 2 |
| `.main` | col 3 · row 2 |
| `#oplog.inspector` | col 4 · row 2 (when `html.inspector-pinned`) |

Embed (`?embed=1`): hide primary sidebar; header still spans cols 1 / -1 above secondary+main.

### Secondary sidebar — stacked collapsible zones

Replace equal-height nav split (`flex: 1` on both `.secondary-nav`).

```html
<section class="secondary-zone" data-zone="work">
  <button class="secondary-zone-toggle" aria-expanded="true">… WORK …</button>
  <nav class="secondary-nav">…</nav>
</section>
<section class="secondary-zone" data-zone="logs">
  <button class="secondary-zone-toggle" aria-expanded="true">… LOGS …</button>
  <nav class="secondary-nav">…</nav>
</section>
```

- Zones stack **inline** (intrinsic height); secondary column scrolls as a unit when overflow.
- Each zone toggle collapses its nav only (not whole secondary rail).
- Persist: `trellis-admin-zone-work-collapsed`, `trellis-admin-zone-logs-collapsed` (`0`/`1`).
- **Remove** `#secondary-toggle` from view-header (hidden; no global secondary rail collapse in this wedge).

### View header (slim)

- **Remove** `#view-title` block (`Work · …`) — route lives in breadcrumbs.
- **Hide** `#view-meta` on `work/board` always; show contextual meta only on routes that need it:
  - `logs/ops`: op count + live state
  - stubs: "Coming soon"
  - `work/milestones`: optional count (not duplicate of header stats — use milestone count only)
- Board toolbar row: view picker + **flex-1 search** + filters/export/new issue.

### Breadcrumbs (icon segments)

Trail: `{repo}` / `{operate}` / `{vcs}` / `{tab}`

| Segment | Icon (14px stroke) | Example |
| ------- | ------------------ | ------- |
| repo | folder / repo mark | trellis-node |
| operate | grid / app | operate |
| vcs | branch / git | vcs |
| tab | route-specific (board grid, milestone flag, ops doc) | milestones |

- Last segment = active route tab; `aria-current="page"` on crumb span.
- `setVcsRoute` updates `#crumb-tab` text + icon, not `#view-title`.

### Live ops inspector — day groups

When `#oplog` pinned, group `.op` rows under collapsible headers:

| Group key | Label |
| --------- | ----- |
| same calendar day as now | Today |
| previous calendar day | Yesterday |
| older | formatted date (`Mon Jul 14`) or "Earlier" bucket for >7d |

- `<details class="oplog-day">` or button+region pattern with `aria-expanded`.
- Default: Today expanded; Yesterday expanded; older collapsed.
- `#ops-main` timeline **unchanged** (flat stream) — day groups **inspector only** in this wedge.
- New ops append to correct day section; create section if missing.

## Elevation & Depth

Header band uses `{colors.tml-glass-surface}` blur (unchanged). Zone toggles inset 1px border on hover. Oplog day headers sticky within inspector scroll.

## Shapes

Zone toggle chevron 12px; breadcrumb icons 14px in 18px hit box; oplog disclosure 12px.

## Components

| Component | Anatomy | States | Maps to codebase |
| --------- | ------- | ------ | ---------------- |
| `secondary-zone` | toggle + nav | expanded / collapsed | `#secondary` children |
| `crumb-segment` | icon + label | default / current | `.header .crumb` |
| `board-toolbar` | picker, search-fill, actions | board route only | `#board-toolbar` |
| `oplog-day` | disclosure + `.ops` list | open / closed | `#oplog .ops` |

## Interaction matrix

| Input | States | Output |
| ----- | ------ | ------ |
| Click WORK zone toggle | expanded ↔ collapsed | nav hidden; chevron rotates; localStorage |
| Click LOGS zone toggle | expanded ↔ collapsed | same |
| Route nav item | any zone | `setVcsRoute`; updates `#crumb-tab` + panels |
| Resize secondary | drag handle | width 160–360px (unchanged) |
| Pin live tail | logs routes | inspector + day groups visible |
| Search input | board route | flex-1 width; filter unchanged |
| Oplog day header | click | toggle section; preserve scroll position |

## Accessibility

### Focus order (documented)

1. `#sidebar-toggle` (primary rail)
2. `#notify-btn`
3. `#zone-work-toggle` → `#secondary-nav-work .route-item` (in DOM order)
4. `#zone-logs-toggle` → `#secondary-nav-logs .route-item`
5. `.view-toggle` radios → `#search-input` → `#board-toolbar` actions
6. Main content (`.view-body` / `#tml-root` / `#ops-main`)
7. `#oplog` day toggles → `.op` rows (when inspector pinned)

Crumb segments are presentational inside `nav[aria-label="Location"]` — not individually tabbable.

### Labels and expanded state

| Control | ARIA |
| ------- | ---- |
| `.secondary-zone-toggle` | `aria-expanded`, `aria-controls="{nav-id}"`, visible label WORK/LOGS |
| `.oplog-day-toggle` | `aria-expanded`, `aria-controls="{day-list-id}"`, `aria-labelledby` on group |
| `#crumb-tab` | `aria-current="page"` when active route |
| `#live-label`, `#stat-lanes`, `#stat-issues` | live region / status in `.header-stats` |

### prefers-reduced-motion (documented)

- Zone chevron + nav collapse: `transition` ≤180ms default; under `@media (prefers-reduced-motion: reduce)` set `transition: none` and toggle `display` instantly.
- Oplog day disclosure: same rule — no height animation when reduced motion preferred.

## Do's and Don'ts

**Do**

- Keep header stats as sole issue/lane counts on board route.
- Keep TRL-229 route model (`?vcs=`, localStorage migration).
- Mirror day-group markup when mirroring ops to inspector.

**Don't**

- Reintroduce `#secondary-toggle` or global secondary rail collapse.
- Duplicate `Work · Tab` titles in view-header.
- Apply day grouping to `#ops-main` (defer if scope creep).

## Open for Architect

- Exact grid CSS for embed + inspector-pinned breakpoints (match TRL-228 §4).
- Crumb icon map per `work/*` and `logs/*` tab — normative SVG paths in spec.
- JS: `updateCrumbTab(zone, tab)` replaces view title updates in `setVcsRoute`.
- Oplog: `groupOpsByDay(ops)` + DOM regroup on pin open (not on every SSE tick if perf issue — batch on append).
- E2e: update crumb assertions, remove secondary-toggle tests, add zone collapse + icon crumb tests.
- Remove dead `.secondary-head` CSS while touching secondary styles.

## Handoff checklist

- [x] `docs/artifacts/trellis-admin-chrome-polish_design.md`
- [x] `docs/artifacts/trellis-admin-chrome-polish_mockup.html`
- [ ] Architect spec child TRL-237+ with AC from interaction matrix

## Design verification

- refs: docs/artifacts/trellis-admin-chrome-polish_design.md, docs/artifacts/trellis-admin-chrome-polish_mockup.html (read)
- interaction matrix: 7 rows, 0 empty cells
- a11y: focus order + prefers-reduced-motion documented
- token parity: YAML ↔ mock :root verified
- design.md lint: N/A — manual Stitch format
- design critique: 1 round, 0 blockers remaining
