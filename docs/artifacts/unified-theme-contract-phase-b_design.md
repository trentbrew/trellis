---
version: alpha
name: Unified theme contract — Phase B
description: Design artifact for TRL-159 — client.html migration, Studio dark value alignment, inset surface ladder
source:
  tool: greenfield
  mock: docs/artifacts/unified-theme-contract-phase-b_mockup.html
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
  surface-info-strong: "#edb2f1"
  tml-accent-glow: "rgba(157, 190, 254, 0.12)"
  tml-glass-surface: "rgba(22, 22, 22, 0.75)"
  tml-glass-border: "rgba(255, 255, 255, 0.04)"
  entity-file: "#00ceb9"
  entity-milestone: "#2090f5"
  entity-issue: "#edb2f1"
  entity-branch: "#fcd53a"
  entity-default: "rgba(255, 255, 255, 0.618)"
  primary: "#9dbefe"
typography:
  body:
    fontFamily: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace
    fontSize: 11px
    fontWeight: 500
    letterSpacing: 0.04em
  header:
    fontFamily: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif
    fontSize: 14px
    fontWeight: 700
    letterSpacing: -0.02em
rounded:
  sm: 6px
  md: 8px
  lg: 10px
  pill: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
components:
  topbar:
    backgroundColor: "{colors.tml-glass-surface}"
    height: 48px
  drawer:
    backgroundColor: "{colors.tml-glass-surface}"
    width: 340px
  tab-active:
    textColor: "{colors.text-interactive-base}"
    backgroundColor: "{colors.tml-accent-glow}"
---

# Design: Unified theme contract Phase B

**Status:** Design complete (handoff to Architect)  
**Parent:** TRL-159  
**Prior:** TRL-156 / TRL-157 Phase A (shipped)  
**Mock:** [unified-theme-contract-phase-b_mockup.html](./unified-theme-contract-phase-b_mockup.html)

---

## Overview

Phase A extracted a shared `runtime-theme.css` for `lanes.html` and `tml-lanes.html` while **preserving purple-runtime pixels**. Phase B does three things:

1. **Migrate** `client.html` (System Visualizer, `trellis ui --legacy`) onto the same contract.
2. **Align values** in `runtime-theme.css` to Studio dark (affects all three surfaces).
3. **Activate inset substrate** (`--surface-1/2/3` via oklch `color-mix`) and glass tokens.

Tone stays L3 operator chrome: dense, dark-first, no metaphor. Fractal vantage remains Phase C (TRL-25).

## Colors

### Studio dark targets (normative for Phase B)

| Token | Phase A | Phase B |
| ----- | ------- | ------- |
| `--background-base` | `#09090b` | `#101010` |
| `--background-weak` | `#0f1015` | `#1e1e1e` |
| `--surface-raised-base` | `#15161b` | `#1c1c1c` (opaque D3-safe) |
| `--surface-inset-base` | `#1a1b22` | `#161616` (opaque; keeps `--surface2` alias safe for lanes) |
| `--surface-inset-alpha` | — | `rgba(0,0,0,0.5)` (Studio inset; use via `--surface-1` mixes, not `--surface2`) |
| `--border-base` | `#25262e` | `rgba(255,255,255,0.195)` |
| `--border-strong` | `#32333d` | `rgba(255,255,255,0.266)` |
| `--text-strong` | `#e4e4e7` | `rgba(255,255,255,0.936)` |
| `--text-base` | `#a1a1aa` | `rgba(255,255,255,0.618)` |
| `--text-weak` | `#63637a` | `rgba(255,255,255,0.422)` |
| `--text-interactive-base` | `#6d5bfa` | `#9dbefe` |
| `--surface-brand-base` | `#dcde8d` | `#fab283` |
| Status colors | Tailwind-ish | Studio `#12c905` / `#fcd53a` / `#fc533a` / `#edb2f1` |

### Inset ladder (new)

```css
--background: var(--background-base);
--card: var(--surface-raised-base);
--surface-1: color-mix(in oklch, var(--card) 25%, var(--background));
--surface-2: color-mix(in oklch, var(--card) 50%, var(--background));
--surface-3: var(--card);
```

| Token | Use in visualizer |
| ----- | ----------------- |
| `--surface-1` | Sticky chrome frame, kanban body inset substitute where appropriate |
| `--surface-2` | Scroll regions, secondary panels |
| `--surface-3` | Cards, raised panels |

**Inset ≠ fractal.** These answer containment depth only.

**Legacy `--surface2` (blocker fix):** Keep `--surface2: var(--surface-inset-base)` on the **opaque** `#161616` step. Do not alias `--surface2` to Studio's alpha inset — that would wash lanes hover/chrome. Alpha inset is consumed only via `--surface-1` / `--surface-inset-alpha`.

### Badge tokens (re-derive)

All `--tml-badge-*` must be rebuilt with `color-mix` from Phase B status tokens (not leftover Tailwind rgba):

```css
--tml-badge-success-bg: color-mix(in oklch, var(--surface-success-strong) 15%, transparent);
--tml-badge-success-border: color-mix(in oklch, var(--surface-success-strong) 30%, transparent);
--tml-badge-warning-bg: color-mix(in oklch, var(--surface-warning-strong) 15%, transparent);
--tml-badge-critical-bg: color-mix(in oklch, var(--surface-critical-strong) 15%, transparent);
--tml-badge-info-bg: color-mix(in oklch, var(--surface-info-strong) 15%, transparent);
--tml-badge-neutral-bg: color-mix(in oklch, var(--text-weak) 15%, transparent);
--tml-accent-glow: color-mix(in oklch, var(--text-interactive-base) 12%, transparent);
```

### Glass

Promote into contract. Value `rgba(22,22,22,0.75)` is Studio `--surface-float-base` `#161616` at ~75% opacity (intentional L3 chrome).

```css
--tml-glass-surface: rgba(22, 22, 22, 0.75);
--tml-glass-border: rgba(255, 255, 255, 0.04);
--glass: var(--tml-glass-surface);
--glass-border: var(--tml-glass-border);
```

### Entity colors (JS → CSS)

| Entity | Token | Value |
| ------ | ----- | ----- |
| file | `--entity-file` | `#00ceb9` |
| milestone | `--entity-milestone` | `#2090f5` |
| issue | `--entity-issue` | `#edb2f1` |
| branch | `--entity-branch` | `#fcd53a` |
| default | `--entity-default` | `var(--text-base)` |

`ENTITY_COLORS` in `client.html` must read via `getComputedStyle(document.documentElement)`. Do not overload `--surface-info-strong` for both issues and milestones.

### Client-only aliases

```css
--bg2: var(--background-weak);
--border2: var(--border-strong);
--accent2: color-mix(in oklch, var(--text-interactive-base) 85%, white);
--accent-glow: var(--tml-accent-glow);
--tml-accent-glow: color-mix(in oklch, var(--text-interactive-base) 12%, transparent);
```

Page-local layout (stay in page `<style>`, not contract): `--nav-w: 56px`, `--top-h: 48px`.

## Typography

Phase B removes Google Fonts from `client.html`. System stacks only (BRAND allows this when Berkley cannot ship).

| Role | Stack |
| ---- | ----- |
| Sans / header | `-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif` |
| Mono | `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace` |

**Font strategy (locked — option A):** Update `--font-family-*` to system stacks in `runtime-theme.css` and **remove Google Fonts `<link>` from all runtime HTML** (`client.html`, `lanes.html`, and any other Phase B-touched pages). No deferred lanes exception.

## Layout

### Delivery

1. Update `src/ui/theme/runtime-theme.css` values + inset + glass + entity tokens.
2. Migrate `src/ui/client.html`: link theme, drop `:root`, `data-trellis-band="L3"`.
3. Extend **`src/ui/server.ts`** (`trellis ui --legacy`) to serve `GET /theme/runtime-theme.css` (same resolver pattern as `lanes-dashboard.ts`). Prefer shared helper.

### Surface impact

| Surface | Phase B change |
| ------- | -------------- |
| `client.html` | First consume of contract |
| `lanes.html` / `tml-lanes.html` | Pixel shift to Studio dark values (intentional) |
| Fractal demo | Untouched |

## Elevation & Depth

| Depth | Token | Visualizer example |
| ----- | ----- | ------------------ |
| Base | `--background-base` | body / graph canvas |
| Surface-1 | `--surface-1` | subtle inset fills |
| Surface-2 | `--surface-2` | scroll panes |
| Surface-3 / raised | `--surface-3` | cards, cmd palette |
| Glass float | `--tml-glass-surface` | `#topbar`, `#drawer` |

## Shapes

Align client `--radius` / `--radius-lg` (today 8/12) to contract `--radius-md` / `--radius-lg` (8/10). Radius stays on the Phase A contract scale; full BRAND Studio radius remap (6/8) is out of scope.

## Components

| Component | Anatomy | States | Maps to |
| --------- | ------- | ------ | ------- |
| `#topbar` | glass bar, 48px | default | `client.html` |
| `.tab` | text button | default, hover, `.active` | interactive + glow |
| `#drawer` | glass side panel | closed / `.open` | slide transition; respect `prefers-reduced-motion` |
| `#cmd-box` | raised modal | open overlay | `--surface-3` |
| Graph nodes | D3 fills | by entity type | `--entity-*` |
| Live dot | success pulse | on / off | `--surface-success-strong` / critical |

## Interaction matrix

| Input | States | Output |
| ----- | ------ | ------ |
| Tab select | idle → active | interactive color + accent-glow wash |
| Tab hover | idle → hover | text-base on surface-2 |
| Drawer open | closed → open | translateX(0); reduced-motion → instant |
| Drawer close | open → closed | translateX(100%); reduced-motion → instant |
| Cmd palette open | closed → open | overlay visible; focus moves to input |
| Cmd palette close | open → closed | overlay hidden; focus restored |
| Cmd item select | hover / selected | accent-glow background |
| Entity node paint | file / milestone / issue / branch / default | fill from `--entity-*` CSS vars |
| Status badge render | success / warn / crit / info / neutral | `--tml-badge-*` color-mix fills |
| Live indicator | on / off | success pulse or critical static |
| Keyboard focus | `:focus-visible` on controls | 2px interactive outline |
| Reduced motion | `prefers-reduced-motion: reduce` | no pulse; instant drawer and cmd transitions |

## Accessibility

- **Focus order:** topbar tabs → cmd trigger → main panel controls → drawer.
- **Contrast:** re-check interactive `#9dbefe` on `#1c1c1c` and glass topbar; WCAG AA for body text at 0.618 opacity on `#101010`.
- **Motion:** disable live-dot pulse and drawer/cmd transitions under `prefers-reduced-motion`.
- **Color:** entity types never color-only in UI chrome (labels remain); graph nodes may keep color coding with legend/tooltip.

## Do's and Don'ts

**Do**

- Serve theme CSS from both `lanes-dashboard.ts` and `server.ts` (or shared helper).
- Keep legacy aliases so page CSS can migrate gradually.
- Use opaque raised hex for D3 fills when alpha breaks SVG.

**Don't**

- Implement `--ui-vantage` / dual-shell (TRL-25).
- Bundle Berkley Mono in Phase B.
- Leave `ENTITY_COLORS` as hardcoded hex after migration.
- Conflate `--surface-1/2/3` with fractal shell names.

## Open for Architect

1. **Must:** shared `resolveRuntimeThemeCss(rootPath)` used by `lanes-dashboard.ts` and `server.ts`; legacy server serves `GET /theme/runtime-theme.css` (200 `text/css`, 404 if missing).
2. AC: `client.html` has no `:root`; links `/theme/runtime-theme.css`; `data-trellis-band="L3"`; **zero** remaining `#6d5bfa` / purple rgba islands (map orphans to contract tokens).
3. AC: `runtime-theme.css` Phase B Studio values; `--surface-1/2/3`; `--surface-inset-base` opaque `#161616` with `--surface2` alias; `--surface-inset-alpha` separate; `--tml-glass-*`; `--entity-*`; **re-derived `--tml-badge-*`** + `--tml-accent-glow` via color-mix.
4. AC: unit tests assert new tokens + badge mixes; e2e `tml-lanes` still green after value shift; smoke theme route via `trellis ui --legacy` or unit-level server handler test.
5. Entity color JS: `getComputedStyle` map — no hardcoded `ENTITY_COLORS` hex.
6. Fonts: system stacks + strip Google Fonts from **all** runtime HTML (locked).
7. Radius: client aliases to contract `--radius-md` / `--radius-lg` (8/10); BRAND 6/8 out of scope.
8. Cmd palette focus-trap + reduced-motion for drawer/live-dot: encode as behavioral AC even if mock is static specimen.
9. Out of scope: `trellis/theme` npm extract; fractal / TRL-25.

## Handoff checklist

- [x] `docs/artifacts/unified-theme-contract-phase-b_design.md`
- [x] `docs/artifacts/unified-theme-contract-phase-b_mockup.html`
- [ ] Design child issue on graph
- [x] Paths in handoff SUMMARY
