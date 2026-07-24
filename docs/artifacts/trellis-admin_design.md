---
version: alpha
name: trellis admin — AffordanceShell + TML projections
description: >-
  Design for TRL-173 — `trellis admin` as Operate/VCS console in fractal-playground;
  TML-mounted projections; kernel theme SSOT; replaces lane watch at parity.
source:
  tool: greenfield
  mock: docs/artifacts/trellis-admin_mockup.html
  research: >-
    browse-unify + trellisdb-console AffordanceShell; lanes.html parity;
    tml-lanes; Phase B/C theme; design-research TRL-173
colors:
  background-base: "#101010"
  background-weak: "#1e1e1e"
  surface-raised-base: "#1c1c1c"
  surface-inset-base: "#161616"
  surface-inset-alpha: "rgba(0, 0, 0, 0.5)"
  border-base: "rgba(255, 255, 255, 0.195)"
  border-strong: "rgba(255, 255, 255, 0.266)"
  text-strong: "rgba(255, 255, 255, 0.936)"
  text-base: "rgba(255, 255, 255, 0.618)"
  text-weak: "rgba(255, 255, 255, 0.422)"
  text-interactive-base: "#9dbefe"
  surface-brand-base: "#fab283"
  surface-success-strong: "#12c905"
  surface-warning-strong: "#fcd53a"
  surface-critical-strong: "#fc533a"
  tml-accent-glow: "rgba(157, 190, 254, 0.12)"
  tml-glass-surface: "rgba(22, 22, 22, 0.75)"
  tml-glass-border: "rgba(255, 255, 255, 0.04)"
  tml-kanban-body-inset: "rgba(255, 255, 255, 0.02)"
  entity-file: "#00ceb9"
  entity-milestone: "#2090f5"
  entity-issue: "#edb2f1"
  entity-branch: "#fcd53a"
  entity-default: "rgba(255, 255, 255, 0.618)"
  rail-bg: "#0c0c0c"
  live-dot: "#12c905"
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
    letterSpacing: -0.02em
  data:
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
  primary-rail:
    width: 56px
    backgroundColor: "{colors.rail-bg}"
  header-toolbar:
    height: 48px
    backgroundColor: "{colors.tml-glass-surface}"
  view-toggle:
    height: 34px
  search:
    height: 34px
  op-log:
    width: 280px
    backgroundColor: "{colors.surface-inset-base}"
  issue-card:
    backgroundColor: "{colors.surface-raised-base}"
    rounded: "{rounded.lg}"
  stats-chip:
    backgroundColor: "{colors.surface-raised-base}"
    rounded: "{rounded.md}"
---

# Design: trellis admin

**Parent:** TRL-173 · **Design issue:** TRL-174  
**Hosts:** fractal-playground (chrome) + kernel TML/theme (materialization)  
**Mock:** [trellis-admin_mockup.html](./trellis-admin_mockup.html)

## Overview

`trellis admin` is the **operator console** for a Trellis repo: lanes, issues, live
ops — eventually the whole-graph admin. It lives visually in
**fractal-playground** (AffordanceShell), but **projections are TML**, and
**tokens come only from** kernel `runtime-theme.css`.

**Thesis:** one Operate destination (VCS), many **projections** (`?view=`),
persistent **op-log** as the heartbeat. Not three routes. Not a second theme.

**End state:** replace `trellis lane watch` after parity. Soft-deprecate with
alias; never steal `trellis watch` (file watcher).

## Colors

Inherit Phase B Studio dark from the theme contract. Interactive accent
`#9dbefe`; live = success green; issue/entity colors for card pips. Do not adopt
playground OKLCH for VCS/TML surfaces.

## Typography

System UI for chrome; monospace for data (lane ids, op kinds, search, view
toggle). Match lanes.html instrument density — not marketing type.

## Layout

### Information architecture (locked)

| Slot | Content |
| ---- | ------- |
| Primary rail (56px) | Operate icons; **VCS** active (peer to Collections/Cron — not buried in Demos) |
| Secondary | Empty / optional filters later — not required for v1 |
| Header | Brand crumb · live · repo path · stats chips · view toggle + search (same height 34px) |
| Content | TML mount: `grid` \| `kanban` \| `table` via `?view=` |
| Detail | **Op-log** always on desktop (≥1100px); drawer below |

**Detail slot ≠ selection inspector.** Op-log is the always-on heartbeat of the
console; selection/inspect uses a **modal** (parity with `lanes.html` dialog),
not a second drawer.

**Multi-route only for Operate modes** (Collections vs VCS vs Auth). Lane
grid/kanban/table are **layout variants of one collection**, same as
browse-unify `?view=`.

**Provisional paths:** fractal-playground `app/(operate)/vcs/page.tsx` (or
`/admin`) wraps AffordanceShell; content slot mounts TML; theme via proxy to
kernel `/theme/runtime-theme.css`. Kernel fallback: `src/ui/admin.html` if CLI
cannot reach playground.

**System Visualizer** (`client.html`): separate Operate destination or VCS
sub-tab later — different data (`/api/graph`). Out of v1 parity for lane watch
replacement.

### Wireframe

```
┌────┬──────────────────────────────────────────┬──────────┐
│rail│ header: live · stats · [Grid|Kanban|Table] search │ op-log │
│ VCS│──────────────────────────────────────────│          │
│    │ lock banner (if any)                     │  ops…    │
│    │ TML projection (kanban default)          │          │
└────┴──────────────────────────────────────────┴──────────┘
```

### Chrome vs TML

| Layer | Owner |
| ----- | ----- |
| AffordanceShell rail, header glass, op-log chrome | playground (or static mock → later Next) |
| Issue cards, lane cards, column queries | **TML** (`tml-query` / `tml-each` / `tml-live`) |
| Theme | kernel `GET …/theme/runtime-theme.css` (proxy OK) |

## Elevation & Depth

Inset ladder: page = `--background-base`; cards = raised; op-log column =
`--surface-inset-base`; kanban body uses `--tml-kanban-body-inset`. Glass header
per Phase B. Issue cards expose `data-trellis-shell="card"` (Phase C).

## Components

### View toggle + search

Same control height (`34px`), shared toolbar row. Active view = accent fill.
URL sync: `?view=grid|kanban|table` (default `kanban` for issue-forward ops;
persist last choice in `localStorage` key `trellis-admin-view`).

### Stats chips

Active lanes · total lanes · integration branch · issues — compact mono,
non-interactive in v1.

### Issue card (TML)

`data-trellis-shell="card"`; id · title · status badge · optional priority ·
**lane badge(s)** (or “no lane”); click → detail dialog (attached lanes +
promote). Parity with `lanes.html` kanban cards.

### Lane card (Grid / Table row)

Lane id · agent · session · ops/files counts · branch · worktree · linked
issue — parity with `lanes.html` grid/table.

### Op-log row

`time · kind · detail · 8-char hash` (not HTTP status codes). Live append on
SSE `op`; toast + card flash on promote/claim events.

### Live indicator

Green pulse when SSE connected; dim + “reconnecting…” on disconnect.
`prefers-reduced-motion`: static dot, no pulse.

## Interaction matrix

| State | Input | Output |
| ----- | ----- | ------ |
| Default | open `/admin` or `trellis admin` | shell + `?view=kanban` default (was grid on lane watch) or persisted + SSE connect |
| View switch | click Grid / Kanban / Table | URL `?view=` update; TML remount/swap; `aria-pressed` |
| Search | type in search | filter lanes + issues + op-log (client-side v1) |
| Search clear | clear control / Escape in empty | restore full lists |
| Search miss | query with no hits | empty state copy in projection + op-log |
| Empty board | no issues/lanes | empty column / empty grid message |
| Empty op-log | no ops yet | “No ops yet” in detail slot |
| Kanban card | click issue | dialog: meta + lane badges + promote |
| Grid lane card | click lane | dialog or inline expand (parity: open issue/lane detail) |
| Op event | SSE `op` | append op-log (`time·kind·detail·hash`); toast; flash card |
| SSE disconnect | stream drop | live → “reconnecting…”; dim dot; no pulse |
| SSE reconnect | stream resume (`since` / Last-Event-ID) | live restored; catch-up ops |
| Promote lock live | lock held by active promote | warning banner (live copy) |
| Promote lock stale | lock file aged / orphaned | warning banner (stale copy) |
| Narrow &lt;1100px | resize | op-log → bottom drawer; rail icons only |
| Embed `?embed=1` | query | hide primary rail; keep toolbar + projection + op-log — **v1.1** |
| Kill gate | N/A | soft-deprecate `lane watch` only after parity checklist |

## Accessibility

- Focus order: rail → brand/live (skip if inert) → stats (skip) → view toggle → search → clear → projection → op-log → dialog.
- View toggle: `role="group"` + `aria-label="Projection"`; buttons `aria-pressed`.
- Search: labeled; clear button labeled “Clear search”.
- Live region: `aria-live="polite"` on toast stack and live label (incl. reconnecting).
- Dialog: focus trap; Escape closes; restore focus to card.
- `prefers-reduced-motion`: no live pulse; no card flash animation (instant border OK).

## Open for Architect

1. **Host wiring:** Does `trellis admin` spawn playground-dev + proxy to kernel
   SSE, or serve AffordanceShell-lite from kernel with TML (playground as design
   target only for v1)? Prefer: CLI opens playground route when available, falls
   back to kernel-hosted admin HTML that mirrors this shell.
2. **SSE hybrid:** TML kanban may use `events=snapshot`; op-log needs full op
   stream — dual subscription or one stream + split bindings.
3. **Parity checklist (must pass before remove `lane watch`):** grid, kanban,
   table, search, stats, lock banner, op-log live, issue dialog, lane card
   fields, promote mutation, SSE reconnect. Orphans section: **cut** unless
   wired (currently stub in lanes.html).
4. **Theme proxy:** playground must not fork `:root`; link/proxy kernel CSS.
5. **Deprecation:** `trellis lane watch` → alias to `trellis admin` after parity;
   never rename `trellis watch`.

## Do's and Don'ts

**Do**

- One VCS shell + `?view=` projections
- TML for board/list bodies; shell for chrome
- Kernel theme SSOT
- Match toolbar control heights (34px)

**Don't**

- Split grid/kanban/table into separate rail destinations
- Invent a playground-only palette for admin
- Claim lane watch replaced before parity
- Collide with `trellis watch` (file watcher)
- Build a daisyUI-scale component catalog in this wedge
