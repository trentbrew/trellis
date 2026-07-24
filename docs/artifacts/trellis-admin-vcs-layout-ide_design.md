---
version: alpha
name: trellis admin — VCS layout IDE-aligned Work/Logs
description: >-
  Design for TRL-225 — regroup VCS secondary nav to Work (Board · Milestones · Workflows)
  and Logs (Ops · Decisions · Branches); per-view AffordanceShell header; fold always-on
  op-log into Logs/Ops main with optional pin inspector.
source:
  tool: greenfield
  mock: docs/artifacts/trellis-admin-vcs-layout-ide_mockup.html
  research: >-
    design-research TRL-225; navigation-ia.md; PlanPanel/LogsPanel trellis.tsx;
    trellis-admin-shell_design.md; trellis-admin-toolbar_design.md; admin.html chrome v2
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
  view-title:
    fontFamily: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif
    fontSize: 15px
    fontWeight: 600
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
  secondary-sidebar:
    defaultWidth: 224px
    minWidth: 160px
    maxWidth: 360px
    collapsedRailWidth: 48px
    backgroundColor: "{colors.sidebar-bg}"
  view-header:
    minHeight: 48px
    controlHeight: 34px
    backgroundColor: "{colors.background-base}"
  route-nav-item:
    height: 32px
    rounded: "{rounded.md}"
  pin-inspector:
    width: 280px
    backgroundColor: "{colors.surface-inset-base}"
---

# Design: trellis admin — VCS layout IDE-aligned Work/Logs

**Status:** Design verified — ready for Architect  
**Parent:** TRL-225 · **Design issue:** TRL-226  
**Mock:** [trellis-admin-vcs-layout-ide_mockup.html](./trellis-admin-vcs-layout-ide_mockup.html)  
**Amends:** [trellis-admin-shell_design.md](./trellis-admin-shell_design.md), [trellis-admin-toolbar_design.md](./trellis-admin-toolbar_design.md) (IA + chrome placement)  
**Preserves:** visual-parity projection contracts, OPERATE_NAV primary sidebar, runtime-theme.css SSOT, embed `?embed=1`

---

## Overview

Align kernel admin **VCS chrome** with turtlecode IDE **Plan / Logs** mental model: shallow siblings as **route tabs inside a resizable secondary sidebar**, tools in a **per-view header** (AffordanceShell analogue), not a global operate row.

**Work** is where issues live (board projections). **Logs** is where causal history lives (ops timeline). Flat Milestones · Issues · Lanes · Workflows peers are retired — lanes remain board metadata; issues are the board.

Emotional tone: same dense L3 operator shell as prior admin wedges — dark sidebars, mono zone eyebrows, 34px controls, honest stubs.

## Colors

Inherit `runtime-theme.css`. Secondary sidebar uses `{colors.sidebar-bg}` (`#0c0c0c`). Zone eyebrows reuse Operate mono label color (`text-weak`). Active route tab: `{colors.sidebar-item-active}` accent tint. Logs live badge: `{colors.live-dot}` on Ops nav when stream connected.

## Typography

- Zone labels **WORK** / **LOGS**: `{typography.label}` — 10px mono uppercase, 0.08em tracking (matches Operate eyebrow).
- View header title: `{typography.view-title}` — e.g. `Work · Board`, `Logs · Ops`.
- View meta: `{typography.view-meta}` — e.g. `131 issues · 4 lanes`, `346 ops · live`.
- Route nav items: 13px sans medium (same as primary `.nav-item`).

## Layout

### Shell grid (normative default)

```
[ primary sidebar ] [ secondary 224 ] [ main (view header + body) ]
```

**No always-visible 280px op-log column** in default layout. Ops content fills **main** under Logs → Ops. Optional **Pin live tail** opens a collapsible right inspector (280px) — companion pattern, not fourth permanent column.

Embed (`?embed=1`): hide **primary** sidebar only; secondary + main (+ optional pin) remain.

### Secondary sidebar anatomy

| Zone | Route tabs | Main content |
| ---- | ---------- | ------------ |
| **WORK** | **Board** (default), Milestones, Workflows (stub) | Board → TML projections; Milestones → list panel; Workflows → empty state |
| **LOGS** | **Ops** (default), Decisions (stub), Branches (stub) | Ops → op timeline (reuse `.op` row styling); stubs → coming soon |

- Remove `data-secondary="issues"` and `data-secondary="lanes"` — both map to **Board**.
- Secondary head title: **VCS** → split into zone labels only (no single “VCS” H1 in sidebar head — optional crumb stays `…/vcs`).

### View header (AffordanceShell analogue)

Lives **inside main**, top of active view — replaces global `.operate-toolbar` row.

| Region | Contents |
| ------ | -------- |
| Left | Secondary collapse toggle · view title · meta line |
| Right | Contextual actions (Board only: view picker + search + filter stub + disabled + New issue) |

**Toolbar visibility**

| Route | View header tools |
| ----- | ----------------- |
| Work · Board | Full toolbar (projection picker, search, stubs) |
| Work · Milestones | Title + meta only; optional “+ Milestone” stub disabled |
| Work · Workflows | Title only |
| Logs · * | Title + meta + **Pin live tail** toggle; no search row |

### Op log / Logs relationship

1. **Canonical ops surface:** Logs → Ops **main panel** (IDE `OpTimeline` parity).
2. **Pin live tail:** toggles optional right inspector (`280px`, resizable, `oplog-collapsed` semantics). Default **off**.
3. **Badge:** Ops nav shows live dot + count when stream active and user is on another tab.
4. **Naming:** Nav tab **Ops**; pinned inspector title **Live ops** — avoid duplicate “Op log” in header and nav.

### Collapse / resize

| Control | Behavior |
| ------- | -------- |
| Primary sidebar | Unchanged — icon rail 56px, toggle in app header |
| Secondary | Collapse → **48px icon rail** (keep admin v2 machinery); toggle in **view header** (move from global toolbar) |
| Pin inspector | Collapse → `0px`; X in inspector head; notify bell may reopen (existing pattern) |
| Secondary width | Default **224px** (IDE Plan/Logs); resize 160–360px; persist `trellis-admin-secondary-w` |

`prefers-reduced-motion`: color-only transitions on nav/tab changes.

## Elevation & Depth

View header: bottom hairline `{colors.border-base}`. Main body: `{colors.background-base}`. Pin inspector: inset `{colors.surface-inset-base}` with left border. Kanban columns unchanged (visual-parity).

## Shapes

Route nav items 32px tall (slightly denser than primary 36px). View header controls 34px. Icons 16px stroke inline SVG.

## Components

| Component | Anatomy | States | Maps to codebase |
| --------- | ------- | ------ | ---------------- |
| `secondary-zones` | WORK block + LOGS block with mono eyebrows | expanded / collapsed rail | `#secondary-nav` restructure |
| `route-nav-item` | icon + label + optional badge | default, active, stub disabled | `data-route-zone` + `data-route-tab` |
| `view-header` | toggle · title · meta · actions slot | board-toolbar / logs-minimal | new `.view-header` in main |
| `ops-timeline` | scrollable `.op` list | live / paused / empty | port from `.oplog` body |
| `pin-inspector` | head + stream + resize handle | pinned / hidden | conditional `.oplog` column |

## Interaction matrix

| Input | States | Output |
| ----- | ------ | ------ |
| Click Work · Board | default | Main shows kanban/grid/table; view header shows projection picker + search |
| Click Work · Milestones | — | Main shows milestone list; toolbar hidden |
| Click Work · Workflows | stub | Main shows “Workflows — coming soon” |
| Click Logs · Ops | default | Main shows op timeline; pin toggle available |
| Click Logs · Decisions / Branches | stub | Main shows coming soon empty state |
| View header secondary toggle | expanded ↔ collapsed | `html.secondary-collapsed`; persist localStorage |
| Pin live tail | off ↔ on | Grid adds 280px inspector column; stream mirrors main Ops |
| Projection picker (Board) | grid / kanban / table | TML projection swap (unchanged) |
| Search (Board) | empty / has value | Filter board rows; clear button visible when value |
| Resize secondary | drag handle | `--secondary-w` within min/max |
| Embed `?embed=1` | — | Primary sidebar hidden; Work/Logs secondary retained |

## Accessibility

- **Focus order:** primary nav → secondary route tabs (WORK then LOGS) → view header controls → main content → pin inspector (when open).
- **Labels:** zone blocks `aria-labelledby`; active route `aria-current="page"`; view header `role="region"` + `aria-label` from title (e.g. `Work · Board`).
- **Live region:** Ops meta line `aria-live="polite"` for stream status; pin inspector `aria-label="Live ops stream"`.
- **Motion:** `prefers-reduced-motion: reduce` — no slide animations on pin inspector; instant show/hide.

## Do's and Don'ts

**Do**

- Mirror IDE tab-vs-sidebar policy: Board/Milestones and Ops/Decisions/Branches are **sibling tabs**, not primary rail items.
- Keep OPERATE_NAV primary sidebar unchanged; Work/Logs lives **inside** VCS route.
- Reuse existing collapse/resize localStorage keys and SSE op stream wiring.

**Don't**

- Don't keep Issues and Lanes as separate secondary peers.
- Don't show global `.operate-toolbar` above all views — scope tools to Work · Board only.
- Don't require always-on 280px op-log in default layout (breaks IDE Logs parity).

## Open for Architect

1. **URL/state:** recommend `?vcs=work/board` | `?vcs=logs/ops` query params or hashless JS state with deep-link note in spec.
2. **Crumb route segment:** keep `vcs` or add `work`/`logs` — default keep `vcs`, update `#crumb-route` from active zone optional.
3. **Migrate `setSecondary()`:** replace `data-secondary=milestones|issues|lanes|workflows` with zone+tab model; gate `#tml-root` on `work/board` only.
4. **E2e:** update `admin.spec.cjs` — secondary zone tabs, view header toolbar visibility, Logs/Ops main timeline, pin inspector toggle.
5. **Backward compat:** one release with redirect from old localStorage `trellis-admin-secondary` values if needed.
6. **Synthesist (cohesion):** parent TRL-225 has `cohesion` — pattern audit after spec draft optional.
