---
version: alpha
name: trellis admin shell — Operate sidebar + index /
description: >-
  Design for TRL-189 — kernel Operate console chrome: labeled sidebar (OPERATE_NAV),
  admin on GET /, VCS live surface; other peers stubs; theme SSOT.
source:
  tool: greenfield
  mock: docs/artifacts/trellis-admin-shell_mockup.html
  research: >-
    design-research TRL-189; OPERATE_NAV modes.ts; primary-sidebar.tsx;
    trellis-admin_design.md; visual-parity; runtime-theme.css
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
  tml-accent-glow: "rgba(157, 190, 254, 0.12)"
  tml-glass-surface: "rgba(22, 22, 22, 0.75)"
  tml-kanban-body-inset: "rgba(255, 255, 255, 0.02)"
  sidebar-bg: "#0c0c0c"
  sidebar-item-hover: "rgba(255, 255, 255, 0.06)"
  sidebar-item-active: "rgba(157, 190, 254, 0.12)"
  live-dot: "#12c905"
  search-input-h: "34px"
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
  nav:
    fontFamily: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif
    fontSize: 13px
    fontWeight: 500
  header:
    fontFamily: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif
    fontSize: 14px
    fontWeight: 700
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
  sidebar:
    width: 200px
    backgroundColor: "{colors.sidebar-bg}"
    zoneLabel: "{typography.label}"
  sidebar-item:
    height: 36px
    rounded: "{rounded.md}"
    iconSize: 16px
  header-toolbar:
    height: 48px
    backgroundColor: "{colors.tml-glass-surface}"
  op-log:
    width: 280px
---

# Design: trellis admin shell — Operate sidebar + index /

**Status:** Design verified — ready for Architect  
**Parent:** TRL-189 · **Design issue:** TRL-190  
**Mock:** [trellis-admin-shell_mockup.html](./trellis-admin-shell_mockup.html)  
**Amends:** [trellis-admin_design.md](./trellis-admin_design.md) (chrome: rail → labeled sidebar; route `/`)  
**Preserves:** [trellis-admin-visual-parity_design.md](./trellis-admin-visual-parity_design.md) projection contracts

---

## Overview

`trellis admin` becomes the kernel **Operate console**: birds-eye over the graph,
same IA family as fractal-playground, authored in static HTML + TML — not a React
AppShell port.

This wedge is **shell only**: labeled primary sidebar + home route. **VCS** is
the only live surface (existing board + op-log). Other `OPERATE_NAV` peers are
visible stubs (“Coming soon”). Rich datatable / collections / graph land later.

Emotional tone: dense L3 operator — dark sidebar, mono zone label, lucide-ish
stroke icons, glass header.

## Colors

Inherit `runtime-theme.css`. Sidebar fill `#0c0c0c` (`sidebar-bg` / prior
`rail-bg`). Active nav: accent tint + `--text-interactive-base`. Do **not** copy
playground OKLCH `--shell-rail`.

## Typography

Zone eyebrow: mono uppercase (`Operate`) at **10px / 600 / 0.08em** — shell-specific;
do not equate with projection label tokens (visual-parity ~11px / 500 / 0.04em).
Nav labels: 13px sans medium. Header brand: 14px bold. Icons: 16px stroke,
currentColor.

## Layout

### Shell grid

| Region | Width / height | Notes |
| ------ | -------------- | ----- |
| Sidebar | **200px** | Labeled Operate nav (not 56px icon rail) |
| Header | 48px | Brand · live · repo · stats · view toggle · search |
| Main | `1fr` | VCS projections (or stub empty state) |
| Op-log | 280px | Unchanged |

```
[ sidebar 200 ] [ header …………………………………… ]
[              ] [ main ………………… | op-log 280 ]
```

### Routes

| Path | Behavior |
| ---- | -------- |
| `GET /` | Serve admin shell (this console) |
| `GET /admin` | Redirect or alias to `/` (same document) |
| `trellis admin` | Opens `/` |

Legacy `lanes.html` on `/` moves aside (Architect: redirect `/lanes` or drop — open question below).

### Sidebar vs playground

Playground `PrimarySidebar` is icon-only (`w-14`) + tooltips. Kernel admin uses a
**labeled 200px sidebar** so standalone `trellis admin` reads as a real console
without React tooltips. Same **`OPERATE_NAV` order and ids**; icons are lucide
shapes as inline SVG (no npm lucide).

### Embed

`?embed=1` / `html.admin-embed`: **hide kernel sidebar** (playground already
provides outer rail). Header + main + op-log remain.

## Elevation & Depth

Sidebar darkest (`#0c0c0c`). Header glass. Main `--bg`. Op-log inset. Active nav
item: soft accent wash + left edge or filled pill.

## Shapes

Nav items `8px` radius, `36px` row height, `8px` icon–label gap.

## Components

| Component | Anatomy | States | Maps to codebase |
| --------- | ------- | ------ | ---------------- |
| Operate sidebar | brand chip optional · zone label · 8 nav rows (icon + label) | active / hover / aria-disabled | replace `.rail` in `admin.html`; contract `OPERATE_NAV` |
| Nav item (live) | SVG + label; `aria-current="page"` | VCS only this wedge | `data-nav-id="vcs"` |
| Nav item (stub) | SVG + label; `aria-disabled`; name “… (coming soon)” | Collections…API | no click handler / preventDefault |
| Header | brand · live · meta · stats · **view toggle · search** (that order) | density from admin v1 | existing `.header` + `#search-input` |
| Nav focus | `:focus-visible` accent outline on `.nav-item` (incl. stubs) | keyboard | a11y — stubs stay focusable |
| VCS surface | kanban/grid/table + independent col scroll | visual-parity widths **300–340** | `#view-*` |
| Op-log | 280px | unchanged | `#oplog` |

### OPERATE_NAV order (normative)

Mirror `fractal-playground/lib/shell/modes.ts` `OPERATE_NAV`:

1. Collections — stub  
2. Storage — stub  
3. Pages — stub  
4. History — stub  
5. Cron — stub  
6. Auth — stub  
7. API — stub  
8. **VCS — live** (`aria-current="page"`)

**DEMOS_NAV** out of scope.

### Interaction matrix

| State | Input | Output |
| ----- | ----- | ------ |
| Load `/` | Navigate | Admin shell; VCS surface active; sidebar VCS current |
| Load `/admin` | Navigate | Same shell (redirect/alias to `/`) |
| Idle VCS | Click Grid / Kanban / Table | Projection swap (existing) |
| Idle VCS | Activate stub nav (e.g. Collections) | **No navigation**; item stays disabled visually; accessible name includes “coming soon” |
| Idle | Activate VCS | Ensure VCS surface visible |
| Embed `?embed=1` | Load | Sidebar hidden; focus starts at header → main → op-log |
| Search / dialog / promote | Existing | Unchanged from visual-parity (**search inherited — present in production header; mock may show inert field**) |

### Accessibility

- Sidebar: `<aside>` + inner `<nav aria-label="Operate">`.
- Live item: `aria-current="page"`. Stubs: **`aria-disabled="true"` without native `disabled`** so they stay focusable; accessible name = “{Label} (coming soon)” (visible sr-only or `aria-label`).
- Focus order (standalone): sidebar → header (incl. search) → main → op-log.
- Focus order (embed): header → main → op-log.
- Icon + visible text label — no tooltip dependency for stubs.
- `prefers-reduced-motion`: no nav hover animation beyond color.

## Do's and Don'ts

**Do**

- Keep theme link to `/theme/runtime-theme.css` only.
- Preserve visual-parity projection CSS (dialogs, grid, kanban scroll, table).
- Use inline SVG stroke icons matching lucide silhouettes.

**Don't**

- Port React AppShell / shadcn / npm lucide.
- Add DEMOS_NAV or datatable this wedge.
- Soft-deprecate `lane watch` here.
- Show double nav under embed.

## Open for Architect

1. AC: `GET /` serves admin; `GET /admin` → `/` (301/302 or rewrite); CLI opens `/`.
2. AC: sidebar 200px; 8 `OPERATE_NAV` items; VCS `aria-current`; stubs `aria-disabled` (no native `disabled`), accessible name “… (coming soon)”.
3. AC: e2e — `/` has Operate nav + VCS current; embed hides sidebar; existing admin e2e migrate paths.
4. Decide fate of legacy `lanes.html` on `/` (recommend `/lanes` fallback or keep behind flag).
5. Stub click: **locked** — no navigation; `title` / `aria-label` only (simplest).
6. Out of scope AC: datatable, collections materialization, kill-gate.

### Cohesion (pre-architect · synthesist)

1. **Theme SSOT:** Production keeps only `/theme/runtime-theme.css`; no mock `:root` fork; no playground `--shell-rail` OKLCH. Sidebar fill `#0c0c0c` is chrome-only.
2. **OPERATE_NAV contract:** Normative ids/order from `modes.ts` (`collections` → `storage` → `pages` → `history` → `cron` → `auth` → `apis` → `vcs`); `data-nav-id` must match (esp. `apis`, not `api`).
3. **Embed / no double-nav:** `?embed=1` → `html.admin-embed` hides **sidebar** (rename all `.rail` embed rules); header + main + op-log remain.
4. **Preserve visual-parity:** Shell swap only (56px rail → 200px labeled sidebar). Do not touch projection contracts unless a separate regression fix.
5. **Route cutover:** Spec `GET /` = admin and migrate `lanes.html` (recommend `/lanes`) + update CLI/e2e/`/admin` alias together.

## Design verification

- refs: `docs/artifacts/trellis-admin-shell_design.md`, `docs/artifacts/trellis-admin-shell_mockup.html` (read)
- interaction matrix: 7 rows, 0 empty cells
- a11y: focus order (standalone + embed) + prefers-reduced-motion documented; stubs focusable with “(coming soon)” names; `:focus-visible` on nav
- token parity: YAML ↔ mock `:root` verified (incl. `--search-input-h`, `--live-dot`, sidebar tokens)
- kanban widths: mock 300–340 (visual-parity)
- header order: view toggle then search (matches production / design.md)
- design.md lint: N/A (optional; not run this pass)
- design critique: 2 rounds — prior majors cleared; round-2 PASS (0 blockers, 0 majors)
- cohesion: synthesist pre-architect audit folded into Open for Architect
