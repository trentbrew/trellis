---
version: alpha
name: trellis admin v1.1 — playground AffordanceShell host
description: >-
  Design for TRL-178/TRL-179 — host trellis admin inside fractal-playground
  AppShell (AffordanceShell family) as Operate/VCS; kernel remains TML/theme/SSE
  source and /admin fallback.
source:
  tool: greenfield
  mock: docs/artifacts/trellis-admin-v1.1-playground_mockup.html
  research: >-
    trellis-admin_design.md + mockup; admin.html (TRL-175); runtime-theme.css;
    fractal-playground AppShell / OPERATE_NAV / embed.ts; trellisdb-console;
    browse-unify ?view=; design-research TRL-178
colors:
  # Kernel island (normative for TML / admin content) — Phase B SSOT
  background-base: "#101010"
  background-weak: "#1e1e1e"
  surface-raised-base: "#1c1c1c"
  surface-inset-base: "#161616"
  border-base: "rgba(255, 255, 255, 0.195)"
  text-strong: "rgba(255, 255, 255, 0.936)"
  text-base: "rgba(255, 255, 255, 0.618)"
  text-weak: "rgba(255, 255, 255, 0.422)"
  text-interactive-base: "#9dbefe"
  surface-brand-base: "#fab283"
  surface-success-strong: "#12c905"
  surface-warning-strong: "#fcd53a"
  surface-critical-strong: "#fc533a"
  tml-glass-surface: "rgba(22, 22, 22, 0.75)"
  rail-bg: "#0c0c0c"
  live-dot: "#12c905"
  # Playground chrome (illustrative OKLCH — do not apply inside island)
  playground-bg: "oklch(0.14 0.005 285)"
  playground-rail: "oklch(0.12 0.005 285)"
  playground-border: "oklch(0.28 0.01 285)"
  playground-text: "oklch(0.93 0 0)"
  playground-muted: "oklch(0.62 0.01 285)"
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
  playground-mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: 12px
    fontWeight: 500
rounded:
  sm: 6px
  md: 8px
  lg: 10px
  playground: 0px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
components:
  primary-rail:
    width: 56px
    backgroundColor: "{colors.playground-rail}"
  kernel-island:
    backgroundColor: "{colors.background-base}"
  admin-header:
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
  degraded-banner:
    backgroundColor: "{colors.surface-warning-strong}"
---

# Design: trellis admin v1.1 — playground host

**Status:** Design complete (handoff to Architect)  
**Parent proposal:** TRL-178 · **Design issue:** TRL-179 · **Epic:** TRL-173  
**Depends on:** TRL-175 PASS (kernel `/admin` fallback)  
**Mock:** [trellis-admin-v1.1-playground_mockup.html](./trellis-admin-v1.1-playground_mockup.html)

## Overview

v1.1 puts **`trellis admin` chrome inside fractal-playground** so Operate feels
like one product: Collections · Storage · … · **VCS**. Kernel stays the
**behavioral and token SSOT** for boards, theme, and SSE. Playground owns the
**Operate rail** (`AppShell` / `PrimarySidebar`); admin content is a **kernel
island** (iframe to `/admin?embed=1`).

**Thesis:** one outer rail (playground Operate), one inner console (kernel
admin). No double rail. No playground OKLCH on TML surfaces.

**Signature:** the **theme seam** — playground chrome may stay sharp OKLCH /
Geist; the island loads only `runtime-theme.css`. The seam is a quiet edge, not
a second brand.

Audience: operators and agents already in playground Console. Tone: instrument
panel continuity with trellisdb-console / browse-unify density.

## Colors

**Island (normative):** Phase B tokens from kernel `runtime-theme.css` — same
hex as TRL-174 / TRL-175 (`#101010`, `#9dbefe`, entity pips, glass).

**Playground chrome (non-normative for TML):** existing Console OKLCH. Document
only so Architect does not “unify” by forking island tokens into `globals.css`.

## Typography

Island: system UI + mono data (TRL-174). Playground rail tooltips/labels: Geist
Mono OK. Do not restyle island type to Geist.

## Layout

### Information architecture (locked)

| Slot | Owner | Content |
| ---- | ----- | ------- |
| Primary rail (56px) | **Playground** `PrimarySidebar` | `OPERATE_NAV` + **VCS** peer (`/vcs`); demos stay collapsed |
| Secondary sidebar | Playground | **Hidden** on `/vcs` (TRL-174: empty/not required) |
| Default AppShell header | Playground | **Suppressed** on `/vcs` — island owns admin header |
| Kernel island | **Kernel** iframe | `admin.html?embed=1` — header · lock · projection · op-log |
| Console embed bar | Playground | When playground itself is `?embed=1` on `/vcs` |

**Route name (locked):** `/vcs` — Operate peer, **not** Demos `/issues` stub.

**Wireframe (desktop ≥1100px):**

```
┌────┬─────────────────────────────────────────────┐
│ PG │ ← kernel island (iframe, no rail)           │
│rail│ ┌─────────── admin header 48px ───────────┐ │
│ …  │ │ brand·live·stats·[Grid|Kanban|Table] 🔍 │ │
│VCS●│ ├─────────────────────────────────────────┤─┤
│ …  │ │ lock?  │ TML projection      │ op-log   │ │
│    │ │        │                     │ 280px    │ │
└────┴──────────┴─────────────────────┴──────────┘
```

**Narrow &lt;1100px:** island internal layout matches TRL-175 (op-log → bottom
drawer). Outer playground rail stays icon-only.

### Chrome vs island

| Layer | Owner | Maps to codebase |
| ----- | ----- | ---------------- |
| Operate rail, demos split | playground | `AppShell` · `PrimarySidebar` · `OPERATE_NAV` |
| Admin header, views, search, op-log, dialog | kernel | `src/ui/admin.html` embed mode |
| Issue/lane cards, queries | kernel TML | `tml-query` / `tml-each` / `tml-live` |
| Theme inside island | kernel | `GET /theme/runtime-theme.css` |
| Theme outside island | playground | existing `globals.css` / ThemeProvider |

### Mount strategy (locked)

**Primary:** same-origin or cross-origin **iframe** →
`{kernelBase}/admin?embed=1&view={view}`.

Why iframe (not inline React TML remount):

1. Theme isolation — no OKLCH bleed into cards/op-log
2. Dual SSE stays in kernel page (snapshot + full ops) without Next proxy on day one
3. Behavioral SSOT — one `admin.html` for CLI fallback and playground host

**Fallback:** if iframe cannot load (kernel down, CSP), show **degraded panel**
in playground main: short copy + link/button “Open kernel admin” + remind CLI
falls back to `:3939/admin`.

**Proxy (optional Architect path):** Next rewrites `/kernel-admin/*` → kernel for
same-origin iframe when cross-origin cookies/SSE are painful. Not required to
lock design.

### Embed modes

| Context | Behavior |
| ------- | -------- |
| Playground `/vcs` normal | Show playground primary rail; iframe `embed=1` hides **kernel** rail |
| Playground `/vcs?embed=1` | Console embed: hide playground primary rail + secondary; keep ConsoleEmbedBar; iframe still `embed=1` |
| Kernel-only `trellis admin` | Full `admin.html` with kernel rail (TRL-175) — unchanged |
| Kernel `?embed=1` alone | Hide kernel rail; 2-column shell (main \| op-log) for Studio embeds |

Register `/vcs` (and `/vcs/*`) in `isConsoleEmbedPath`.

### CLI open order (locked)

1. If `TRELLIS_ADMIN_URL` set → open it  
2. Else probe playground `http://localhost:3000/vcs` (or config port) — on 2xx open  
3. Else open kernel `http://localhost:3939/admin`  
4. Always ensure kernel dashboard can run when playground hosts (SSE/TML origin);
   Architect chooses “auto-start kernel” vs “require already running”

Never open Demos `/issues`. Never touch `trellis watch` (file watcher).

### View / URL sync

- Playground URL may carry `?view=grid|kanban|table`; pass through to iframe.  
- Iframe remains source of truth for `localStorage` key `trellis-admin-view`.  
- Optional later: `postMessage` view changes up to parent for shareable playground URLs — **not** blocking v1.1.

## Elevation & Depth

Island inset ladder unchanged (TRL-174/175). Playground rail sits outside the
island — do not nest AffordanceShell detail drawers around op-log (op-log stays
inside island).

## Shapes

Island: Phase B radii (`8px` / `10px`). Playground chrome: sharp OKLCH console
radii OK on rail only.

## Components

| Component | Anatomy | States | Maps to codebase |
| --------- | ------- | ------ | ---------------- |
| Operate rail + VCS | 56px icons; VCS active | enabled peer; demos collapsed | `OPERATE_NAV` + new `{ id: 'vcs', href: '/vcs', icon: GitBranchIcon }` · `navItemIsActive` |
| AppShell `/vcs` mode | PrimarySidebar + full-bleed main; no secondary; no default breadcrumb header | normal / console-embed | `AppShell.tsx` branch on pathname `/vcs` |
| Kernel island iframe | Full viewport of main column | loading · live · degraded | `app/(operate)/vcs/page.tsx` (or `app/vcs/page.tsx`) |
| Admin embed shell | Header + lock + projection + op-log; **no** `.rail` | `?embed=1` | `admin.html` CSS/JS |
| Degraded panel | Title · reason · CTA to kernel admin | kernel unreachable | playground page empty state |
| Console embed bar | Room · pop out · close | playground `?embed=1` | `ConsoleEmbedBar` · `embed.ts` |

## Interaction matrix

| State | Input | Output |
| ----- | ----- | ------ |
| Default | open `/vcs` or `trellis admin` → playground | AppShell + iframe `/admin?embed=1&view=kanban` (or persisted view) |
| Iframe loading | island pending | playground shows loading affordance in main (skeleton/pulse); keep rail usable |
| Iframe load timeout / error | load error or timeout | transition to degraded panel (same as kernel unreachable) |
| CLI playground up | `trellis admin` | opens playground `/vcs`; kernel SSE origin available |
| CLI playground down | `trellis admin` | opens kernel `/admin` (TRL-175 full chrome) |
| CLI override | `TRELLIS_ADMIN_URL` | opens that URL |
| View switch | click Grid/Kanban/Table **in island** | island URL/`localStorage` update; parent may mirror `?view=` later |
| Search / clear | island search | filter projection + op-log (TRL-175 behavior) |
| Kanban / lane click | island card | island dialog + promote |
| Op event | kernel full SSE | island op-log append · toast · flash |
| SSE disconnect | stream drop | island live → reconnecting |
| Kernel unreachable | iframe error / timeout | playground degraded panel; no blank main |
| Narrow &lt;1100px | resize | island op-log drawer; playground rail remains |
| Playground embed | `/vcs?embed=1` | hide playground rail; ConsoleEmbedBar; island embed |
| Double chrome guard | N/A | never show kernel rail + playground rail together |
| Kill lane watch | N/A | **out of this wedge** — separate parity harden |

## Accessibility

- Focus order (playground `/vcs`): primary rail → (embed bar if any) → **into iframe** (browser iframe focus) → island order per TRL-174 (header toolbar → projection → op-log → dialog).
- VCS nav item: tooltip “VCS”; `aria-current` via existing `navItemIsActive`.
- Degraded panel: heading + descriptive text + focusable CTA; not color-only.
- Island: retain TRL-174 a11y (view `aria-pressed`, search labels, `aria-live`, dialog focus trap, `prefers-reduced-motion`).
- Do not trap focus in playground chrome when dialog opens inside iframe — dialog a11y stays in-island.

## Open for Architect

1. **Kernel auto-start:** Does `trellis admin` spawn lanes-dashboard when opening playground, or require kernel already on `:3939`?
2. **Same-origin proxy:** Prefer raw cross-origin iframe vs Next rewrite `/kernel-admin` — pick for SSE + cookie story.
3. **`admin.html` embed implementation:** CSS hide `.rail` + grid columns vs separate embed template — prefer minimal CSS/JS flag on existing file.
4. **AppShell header suppression:** cleanest hook so `/vcs` does not double brand/live.
5. **Config:** ports + `TRELLIS_ADMIN_URL` + playground base — document in CLI help.
6. **E2E host:** playground Playwright vs kernel-only until playground CI exists — may keep kernel e2e as SSOT and add playground smoke later.
7. **Promote CORS:** `POST /api/tml-mutations` from iframe = kernel origin (OK); if proxy path, forward mutations.

## Do's and Don'ts

**Do**

- Add VCS to **Operate** rail; reuse `AppShell` slots
- Iframe kernel `admin?embed=1` as content island
- Keep kernel `/admin` + CLI fallback
- Inherit TRL-174 IA and Phase B tokens inside the island

**Don't**

- Put VCS under Demos or revive `/issues` stub as the host
- Load playground OKLCH into TML/admin island `:root` (island loads `runtime-theme.css` only)
- “Unify” by copying Phase B tokens into playground `globals.css` for this wedge
- Show two rails (playground + kernel) at once
- Soft-deprecate `lane watch` in this wedge
- Import turtlecode Solid `AffordanceShell` into Next
- Rebuild kanban/grid in React as a second implementation
