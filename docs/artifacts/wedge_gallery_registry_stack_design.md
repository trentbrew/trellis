---
version: alpha
name: Wedge gallery registry stack
description: Design artifact for TRL-420 — wire <trellis-icon> + theme tokens into demo/wedge-smoke
source:
  tool: greenfield
  mock: docs/artifacts/wedge_gallery_registry_stack_mockup.html
colors:
  background: "#0c0e12"
  surface: "#14171d"
  text: "#e6e9ef"
  text-muted: "#8b93a3"
  accent: "#6ea8ff"
  border: "#262b35"
typography:
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    fontSize: 11px
    fontWeight: 600
    letterSpacing: 0.08em
rounded:
  sm: 6px
  md: 8px
  lg: 10px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
components:
  nav:
    width: 220px
    position: fixed
    backgroundColor: "{colors.surface}"
  toolbar:
    backgroundColor: "{colors.surface}"
    padding: "{spacing.sm} {spacing.md}"
    height: auto
  canvas:
    backgroundColor: "{colors.background}"
  controls-panel:
    width: 320px
    backgroundColor: "{colors.surface}"
  theme-switcher:
    kind: select
    options: [default, dark, uithing, minimal]
    mechanism: data-theme
  trellis-icon:
    kind: web-component
    attributes: [name, size, color]
    packToken: --icon-pack
---

# Design: Wedge gallery registry stack

**Status:** Design complete (handoff to Architect)
**Parent:** TRL-419
**Mock:** [wedge_gallery_registry_stack_mockup.html](./wedge_gallery_registry_stack_mockup.html)

---

## Overview

Wire the four-spec UI registry stack (TRL-413/414/415/416) into
`demo/wedge-smoke`: `<trellis-icon>` semantic aliases in the nav + toolbar, a
live theme switcher (default / dark / uithing / minimal) proving the
`--icon-pack` re-render model, and motion/prose tokens replacing every hardcoded
duration/easing in the gallery CSS. This makes the stack **demo-ready and
provable in-browser** — the wedge-smoke gallery is the natural integration
surface for every headless component, so it is where developers and designers
see the theme-decides-pack model live.

The gallery shell (Storybook-like: left nav, toolbar, canvas, controls panel,
fullscreen toggle, collapsible sidebar) is the target layout; the mockup
reproduces the chrome at design fidelity with placeholder icons that swap under
theme changes to prove the concept.

## Colors

The gallery inherits its established dark palette (`#0c0e12` background,
`#14171d` surfaces) and extends it with the `uithing` theme block from
TRL-416 — a soft, low-chroma light theme that owns all pixels (`oklch` hues,
rounded radii, slower motion, system-sans typography). The `minimal` theme is a
toy pack-demonstration: it overrides `--icon-pack: tabler` without changing
colors. All three themes (default/dark/uithing/minimal) are selectable via a
toolbar `<select>`, applied as `data-theme` on `<html>`.

## Typography

System sans stack for UI chrome (unchanged from the existing gallery). The
typeset `--prose-*` tokens (`--prose-size: 1em`, `--prose-leading: 1.75`,
`--prose-flow: 1.25em`) are adopted in the mockup's `:root` and are the
contract for prose surfaces inside component canvases (editor output, markdown
sections — out of scope for this wedge but the tokens ship in the CSS).

## Layout

Three-band shell (ADR 0011):
- **Nav** — fixed left, 220px, collapsible (`body.nav-collapsed` hides with
  translateX + opacity transition). Contains search filter, component count, and
  a nav list where each item carries a `<trellis-icon>` alias (entity-issue,
  core-search, status-in-progress, etc.) before its label.
- **Toolbar** — flex row: nav-collapse toggle `◧`, prev `‹` / next `›`, component
  title + type chip, **theme switcher** `<select>`, fullscreen toggle `⛶`.
- **Content** — flexible canvas (`flex: 1`) + right controls panel (320px). The
  canvas hosts the active component's vanilla renderer and a live `--icon-pack`
  indicator proving the re-render. The controls panel has About (description +
  framework badges), State (live JSON), Actions (action buttons + reset).

Fullscreen: `⛶` toggles `body.fullscreen` — hides nav + controls panel,
expands canvas to viewport edge. Works alongside `body.nav-collapsed`.

## Components

| Component | Anatomy | Theme token coupling |
|---|---|---|
| `<trellis-icon>` | `name` attribute = bare name or semantic alias; `size` = px or token (xs-xl) | `--icon-pack` decides the Iconify set; re-renders on theme change via MutationObserver |
| Theme switcher | `<select>` in toolbar, options map to `data-theme` blocks | Sets `data-theme` attribute on `<html>`; all `--icon-pack` / `--motion-*` / `--prose-*` tokens cascade from it |
| Nav items | `<button class="nav-item">` with `<trellis-icon name="entity-issue">` prepended | Icons follow `--icon-pack`; `entity-*` / `status-*` aliases resolve to Lucide by default, or per-pack override |
| Gallery CSS | All `transition:` declarations reference `var(--motion-duration-*)` + `var(--motion-ease-*)` | Zero hardcoded duration/easing values; theme-owns-motion contract |
| Fullscreen button | `⛶` glyph (or `<trellis-icon name="core-fullscreen">`) toggles `body.fullscreen` | Icon follows the active pack |

## Interaction matrix

| Trigger | State change | Affected tokens / elements |
|---|---|---|
| `#theme-select` change → `value="uithing"` | `html[data-theme="uithing"]` | `--bg`, `--panel`, `--accent`, `--icon-pack`, `--motion-*`, `--prose-*` — all surface/color/motion values flip in one step |
| `#theme-select` → `"minimal"` | `html[data-theme="minimal"]` | Only `--icon-pack: tabler` and `--accent` change; all `<trellis-icon>` re-render via MutationObserver (_packChanged() guard) |
| Click nav item | `location.hash = #type`; component loads in canvas | Toolbar title + type chip update; nav active state; icon aliases in nav follow same pack (unchanged by navigation) |
| `⛶` click | `body.classList.toggle('fullscreen')` | Nav + controls panel hidden; canvas fills viewport; component re-layouts via CSS |
| `◧` click | `body.classList.toggle('nav-collapsed')` | Nav slides out with `--motion-duration-normal`; main `margin-left` transitions to 0 |
| `←`/`→` keys (non-input focus) | Prev/next component in registry order | Same as nav click (hash + load); guarded against input typing + fullscreen stay |
| `/` key | Focus `#nav-search` | Nav search receives focus; placeholder text "filter…" |
| Esc in fullscreen | Exit fullscreen | `body.classList.remove('fullscreen')`; nav + panel restored |

## Accessibility

- **Focus order**: nav toggle → prev → theme switcher → next → fullscreen → canvas → controls panel (left-to-right, top-to-bottom).
- **Labels**: every interactive control has `aria-label`; the theme switcher has an explicit `<label>`; icons carry `aria-label` set from their name attribute.
- **prefers-reduced-motion**: a `@media (prefers-reduced-motion: reduce)` block zeroes all `transition-duration` values in the gallery CSS — no motion tokens override this contract.
- **Icon fallback**: `<trellis-icon>` renders a dim glyph (never a broken box) when the iconify set name isn't found — so theme switches never hide controls.
- **Keyboard**: `⌘B` toggles nav collapse; Esc exits fullscreen; `←`/`→` cycles components; `/` focuses search; typing in inputs/editors ignores keyboard shortcuts (target tag check).

## Do's and Don'ts

- **Do** reference `var(--motion-duration-*)` and `var(--motion-ease-*)` in every CSS transition.
- **Do** use `<trellis-icon name="entity-issue">` (semantic alias) in the nav, not bare `lucide:git-issue`.
- **Do** let the theme switcher write `data-theme` on `<html>` — it's the single-source-of-truth.
- **Do** keep `prefers-reduced-motion` as a separate override rule (no component logic).
- **Don't** hardcode any duration (`120ms`, `200ms`) or easing (`cubic-bezier`) in gallery CSS — tokens only.
- **Don't** put `lucide:` / `tabler:` prefixes in markup — bare names or aliases only; the theme token owns the pack.
- **Don't** duplicate the theme switcher in every component — it's toolbar chrome, owned by the gallery shell.

## Open for Architect

1. **Dependency wire**: the gallery IIFE bundle must import `@trellis.computer/icons` (for `<trellis-icon>`) and `@trellis.computer/ui/tokens` (for `design-tokens.css`). Since the bundles are in separate repos (trellis-node → trellis-ui), decide import path strategy: workspace symlink / copy-tokens build step / npm workspace reference.
2. **Gallery rebuild**: the current gallery.ts/inspect.ts are the old stacked-sections version. The Storybook shell logic (hash routing, single-component render, fullscreen, collapsible sidebar, keyboard nav, search) must be brought back — it was demonstrated and verified earlier this session but exists only in conversation history (not committed). Architect should create the impl ACs for this rebuild as a dependency of the registry-stack integration.
3. **Offline @iconify-json:** the `@iconify-json/*` deps may not be installable in the current environment (no npm registry). The bundled alias SVGs resolve zero-network (verified); bare names will fall back to the registered glyph until deps are present. Architect should note this as a known constraint — the theme-switcher demo works with aliases; bare `home`/`settings` need the real sets installed.
4. **Reduced-motion verification**: the `prefers-reduced-motion` media query is in the mockup but must survive into the actual bundle CSS without being overridden by gallery.js style injection. Make this an explicit impl AC.
5. **Console-error regression**: the old gallery.js crashed on `$('count')` (missing element). The rebuilt shell must ship with 0 console errors across all 11 components and four theme switches.
