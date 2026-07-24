---
version: alpha
name: Unified theme contract — runtime surfaces
description: Design artifact for TRL-156 — shared token contract for static HTML runtime surfaces (lanes, TML kanban, client)
source:
  tool: greenfield
  mock: docs/artifacts/unified-theme-contract_mockup.html
colors:
  background-base: "#09090b"
  background-weak: "#0f1015"
  surface-raised-base: "#15161b"
  surface-inset-base: "#1a1b22"
  border-base: "#25262e"
  border-strong: "#32333d"
  text-strong: "#e4e4e7"
  text-base: "#a1a1aa"
  text-weak: "#63637a"
  text-interactive-base: "#6d5bfa"
  surface-brand-base: "#dcde8d"
  surface-success-strong: "#34d399"
  surface-warning-strong: "#fbbf24"
  surface-critical-strong: "#f87171"
  surface-info-strong: "#60a5fa"
  accent-glow: "rgba(109, 91, 250, 0.12)"
  tml-glass-surface: "rgba(21, 22, 27, 0.75)"
  tml-glass-border: "rgba(255, 255, 255, 0.04)"
typography:
  body:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace
    fontSize: 11px
    fontWeight: 500
    letterSpacing: 0.04em
  header:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
    fontSize: 16px
    fontWeight: 700
    letterSpacing: -0.02em
rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 10px
  pill: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  kanban-col:
    minWidth: 300px
    maxWidth: 340px
    headBackground: "{colors.surface-raised-base}"
    bodyInset: "rgba(255, 255, 255, 0.02)"
  issue-card:
    background: "{colors.surface-raised-base}"
    border: "1px solid {colors.border-base}"
    radius: "{rounded.lg}"
    padding: 14px
  badge-status:
    radius: "{rounded.pill}"
    fontSize: 10px
    textTransform: uppercase
---

# Design: Unified theme contract for runtime surfaces

**Status:** Design complete (handoff to Architect)  
**Parent:** TRL-156  
**Mock:** [unified-theme-contract_mockup.html](./unified-theme-contract_mockup.html)

---

## Overview

Kernel runtime pages (`lanes.html`, `tml-lanes.html`, `client.html`) are **L3 operator** surfaces (ADR 0011). They ship today as static HTML with duplicated inline `:root` blocks: a zinc-dark palette, purple accent, Inter/JetBrains from Google Fonts. That palette diverges from **Trellis Studio** (`studio/packages/ui/src/styles/theme.css`), which BRAND.md names canonical.

This design defines a **unified theme contract**: one vendored CSS file, Studio-aligned **semantic token names**, and a **legacy alias layer** so Phase A migration changes names and source location only, not pixels. TML v0.1 Kanban (`tml-v0.1-kanban.md`) requires visual parity with `lanes.html`; both must consume the same contract file in the same phase. Phase A therefore retains the existing Inter and JetBrains Mono webfonts. Font removal and Studio system-stack alignment move to Phase B.

Tone: terse operator chrome. No metaphor in UI copy. Dark-first. System font stacks (no Berkley OTF, no external font CDN in the contract default).

## Colors

### Canonical semantic ladder (normative)

| Role | Token | Phase A value | Studio dark target (Phase B) |
| ---- | ----- | ------------- | ---------------------------- |
| Page | `--background-base` | `#09090b` | `#101010` |
| Page alt | `--background-weak` | `#0f1015` | `--background-weak` |
| Raised panel | `--surface-raised-base` | `#15161b` | `#1c1c1c` |
| Inset / nested | `--surface-inset-base` | `#1a1b22` | `--surface-inset-base` |
| Border | `--border-base` | `#25262e` | Studio `--border-base` |
| Border emphasis | `--border-strong` | `#32333d` | Studio `--border-strong` |
| Primary text | `--text-strong` | `#e4e4e7` | `#fff` / strong |
| Body text | `--text-base` | `#a1a1aa` | `rgba(255,255,255,0.618)` |
| Muted | `--text-weak` | `#63637a` | `--text-weaker` |
| Interactive | `--text-interactive-base` | `#6d5bfa` (runtime purple) | `#034cff` (Studio blue) |
| Brand wash | `--surface-brand-base` | `#dcde8d` | reserved, not used in v0 runtime |
| Success | `--surface-success-strong` | `#34d399` | Studio success |
| Warning | `--surface-warning-strong` | `#fbbf24` | Studio warning |
| Critical | `--surface-critical-strong` | `#f87171` | Studio critical |
| Info | `--surface-info-strong` | `#60a5fa` | Studio info |

### Legacy aliases (deprecate after Phase A)

Runtime HTML today uses shorthand names. The contract file defines aliases **only** for backward compatibility during migration:

```css
--bg: var(--background-base);
--surface: var(--surface-raised-base);
--surface2: var(--surface-inset-base);
--border: var(--border-base);
--text: var(--text-strong);
--text2: var(--text-base);
--text3: var(--text-weak);
--accent: var(--text-interactive-base);
--green: var(--surface-success-strong);
--yellow: var(--surface-warning-strong);
--red: var(--surface-critical-strong);
--blue: var(--surface-info-strong);
--font: var(--font-family-sans);
--mono: var(--font-family-mono);
```

### Component-scoped tokens

| Component token | Derives from | Use |
| --------------- | ------------ | --- |
| `--tml-badge-success-bg` | `color-mix(in srgb, var(--surface-success-strong) 15%, transparent)` | `.lane-badge`, `.badge.active` |
| `--tml-badge-success-border` | `color-mix(in srgb, var(--surface-success-strong) 30%, transparent)` | success badge borders |
| `--tml-badge-warning-bg` | `color-mix(in srgb, var(--surface-warning-strong) 15%, transparent)` | `.priority-badge.medium`, `.badge.promoting` |
| `--tml-badge-warning-border` | `color-mix(in srgb, var(--surface-warning-strong) 30%, transparent)` | warning badge borders |
| `--tml-badge-critical-bg` | `color-mix(in srgb, var(--surface-critical-strong) 15%, transparent)` | `.priority-badge.high`, `.badge.dropped` |
| `--tml-badge-critical-border` | `color-mix(in srgb, var(--surface-critical-strong) 30%, transparent)` | critical badge borders |
| `--tml-badge-info-bg` | `color-mix(in srgb, var(--surface-info-strong) 15%, transparent)` | `.badge.promoted` |
| `--tml-badge-info-border` | `color-mix(in srgb, var(--surface-info-strong) 30%, transparent)` | info badge borders |
| `--tml-badge-neutral-bg` | `color-mix(in srgb, var(--text-weak) 15%, transparent)` | `.priority-badge.low`, `.lane-badge.none` |
| `--tml-accent-glow` | `rgba(109, 91, 250, 0.12)` | `.card.active`, tab active |
| `--tml-kanban-body-inset` | `rgba(255, 255, 255, 0.02)` | `.kanban-col-body` |
| `--tml-glass-surface` | `rgba(21, 22, 27, 0.75)` | `client.html` topbar |
| `--tml-glass-border` | `rgba(255, 255, 255, 0.04)` | glass chrome |

## Typography

| Level | Token / class | Size | Weight | Font |
| ----- | ------------- | ---- | ------ | ---- |
| Page title | `h1` | 16–18px | 700 | `--font-family-header` (system mono fallback) |
| Subtitle | `h1 span` | 12–13px | 400 | `--font-family-sans`, `--text-weak` |
| Body | default | 14px | 400 | `--font-family-sans` |
| Metadata / badge | `.badge`, `.priority-badge` | 10px | 600 | `--font-family-mono`, uppercase |
| Issue id | `.issue-id` | 12px | 600 | `--font-family-mono`, interactive color |

**Font delivery:** Phase A keeps Inter and JetBrains Mono plus the existing Google Fonts links to preserve metrics. Phase B removes those links and maps to Studio system stacks. Berkley Mono remains Studio-only.

## Layout

### Delivery shape

```
src/ui/theme/
  runtime-theme.css      # canonical contract (semantic + legacy aliases + components)
  runtime-theme.d.ts     # optional: token name union for tooling (Phase C)
```

Consumption in static HTML:

```html
<link rel="stylesheet" href="/theme/runtime-theme.css">
<!-- page-specific layout only; no :root duplicates -->
```

Bundled via existing `lanes-dashboard.ts` static file server (same path as `/tml-runtime.js`).

### Surface scope

| Phase | Files | Notes |
| ----- | ----- | ----- |
| **A** | `lanes.html`, `tml-lanes.html` | Extract shared tokens; delete duplicate `:root`; retain existing fonts and computed values |
| **B** | `client.html` + all runtime font links | Larger chrome; glass tokens; entity colors; move to Studio system stacks |
| **C** | fractal dev surfaces | `--vantage` hooks on `#app` |

### Operator band attribute

```html
<html lang="en" data-trellis-band="L3">
```

Lanes dashboard and system visualizer are operator surfaces. Published L1 routes omit the attribute or set `L1`. Architect encodes band → chrome depth in spec AC.

## Elevation & Depth

Inset hierarchy (ADR 0011 + Studio inset tokens):

| Depth | Token | Example component |
| ----- | ----- | ----------------- |
| Base | `--background-base` | `body` |
| Raised | `--surface-raised-base` | `.card`, `.kanban-col-head`, `.issue-card` |
| Inset | `--surface-inset-base` | `.kanban-col-body` fill, `.dialog-lane-card`, sidebar |
| Float / glass | `--tml-glass-surface` | `client.html` `#topbar` |

Kanban column body uses `--tml-kanban-body-inset` over raised surface, not a third hex ladder.

## Shapes

| Element | Radius token | Value |
| ------- | ------------ | ----- |
| Inputs, tabs | `--radius-sm` | 6px |
| Cards, dialogs | `--radius-lg` | 10px |
| Badges, pills | `--radius-pill` | 999px |
| Kanban column head | `--radius-lg` top only | 10px 10px 0 0 |

## Components

| Component | Anatomy | States | Maps to codebase |
| --------- | ------- | ------ | ---------------- |
| `.tag` | outline pill, mono 10px uppercase | default | `tml-lanes.html` header |
| `.badge` | status pill on lane card | `active`, `promoting`, `promoted`, `dropped` | `lanes.html` grid |
| `.priority-badge` | issue priority | `critical`, `high`, `medium`, `low` | kanban issue cards |
| `.lane-badge` | linked lane id | default, `.none` empty | kanban issue cards |
| `.issue-card` | Kanban card, 10px radius, 14px padding | default, `:hover` accent border + 1px glow | canonical Kanban selector in `tml-lanes.html`, `lanes.html` |
| `.card` | Lane-grid card, 12px radius, 16px padding | default, `.active` accent ring + drop shadow | `lanes.html` lane grid only |
| `.kanban-col` | column shell | empty `.kanban-empty` | both kanban surfaces |
| `.promote-btn` | primary action on card | default, `:hover`, `:disabled` | TML `tml-op` target |

Status badge colors use component tokens (`--tml-badge-*`), not raw `rgba()` in page CSS.

## Interaction matrix

| Input | States | Output |
| ----- | ------ | ------ |
| Theme mode (dev mock only) | `dark` (default), `light` via `[data-theme="light"]` | CSS variables swap to Studio light values; operator surfaces stay dark-default |
| Kanban issue card hover | default → hover | accent border + `0 0 0 1px var(--tml-accent-glow)`; no translation |
| Lane-grid card active | default → `.active` | accent border + existing 1px ring/drop shadow |
| Status badge | `active`, `promoting`, `promoted`, `dropped` | success, warning, info, critical token pair; visible text retained |
| Priority badge | `critical/high`, `medium`, `low` | critical, warning, neutral background + text |
| Lane badge | linked, `.none` | success background/border or neutral inset |
| Empty Kanban column | zero cards | `.kanban-empty` muted text on inset body |
| Live indicator | `.live`, `.live.off` | success or critical token; visible status text |
| Header tag | default | interactive outline; no hover contract |
| Issue card activation | click | opens existing issue dialog; Phase A preserves current pointer interaction |
| Promote button | default → hover → disabled | existing lane-grid behavior; out of TML Kanban scope |
| Focus ring (interactive controls) | `:focus-visible` | normative 2px `--text-interactive-base` outline with 2px offset |
| Reduced motion | `prefers-reduced-motion: reduce` | disable pulse on `.live-dot`; instant state changes |

## Accessibility

- **Focus order:** header controls → board columns left-to-right → focusable actions in cards top-to-bottom. Existing clickable issue cards are a known keyboard gap preserved by Phase A; remediation belongs in a follow-up a11y wedge.
- **Labels:** status badges pair visible text with color (never color-only); lane badges truncate with `title` attr on impl.
- **Motion:** `@media (prefers-reduced-motion: reduce)` disables `pulse` keyframes on live indicators; fractal crossfade deferred but contract reserves snap behavior.
- **Contrast:** Phase A preserves existing contrast ratios; Phase B accent shift to Studio blue must re-check WCAG on `--text-interactive-base` against `--surface-raised-base`.

## Do's and Don'ts

**Do**

- Add new runtime tokens to `runtime-theme.css` using Studio semantic names.
- Keep `lanes.html` and `tml-lanes.html` on the same stylesheet revision.
- Set `data-trellis-band` on `<html>` for operator surfaces.
- Use `color-mix` for badge tints derived from semantic status colors.

**Don't**

- Copy-paste `:root` blocks into new runtime HTML files.
- Introduce a fourth palette (purple accent is legacy alias until Phase B).
- Remove Google Fonts in Phase A (Phase B only, after parity baselines are captured).
- Change Kanban pixels during Phase A (TML v0.1 parity constraint).

## Open for Architect

1. **File contract:** `src/ui/theme/runtime-theme.css` as single source; server route `/theme/runtime-theme.css`.
2. **Migration phases:** Phase A (alias extract, lanes + tml-lanes), Phase B (client.html + Studio value alignment), Phase C (fractal hooks).
3. **Fractal extension points (document only):** reserve on `#app` or focal root:
   - `--vantage` (0–21 scalar, continuous)
   - `data-shell` (`node` | `row` | `card`)
   - `data-trellis-vantage`, `data-trellis-shell` (dev tooling parity with `demo/realtime-app`)
4. **AC suggestions:** no duplicate `:root` in scoped files; computed-style regression for `.issue-card`, `.lane-badge`, `.priority-badge`, and `.card.active`; font-family and column width baselines unchanged; BRAND.md cross-link.
5. **Entity colors (`client.html`):** map `ENTITY_COLORS` to `--surface-info-strong` family in Phase B spec slice, not Phase A.
6. **Brand plugin:** note alignment path with `src/plugins/brand/` `DesignToken` ontology (future sync, out of v0 scope).
7. **Selector contract:** `.issue-card` is canonical for Kanban; `.card` remains lane-grid-only. Reconcile the stale `.card` wording in `tml-v0.1-kanban.md` as part of the spec.
8. **Radius caution:** Phase A preserves runtime card radii (10px Kanban, 12px lane grid) even though Studio's canonical scale is 8px/10px. Align values only in Phase B.

## Handoff checklist

- [x] `docs/artifacts/unified-theme-contract_design.md` (this file, DESIGN.md format)
- [x] `docs/artifacts/unified-theme-contract_mockup.html` (self-contained; CSS vars mirror YAML tokens)
- [ ] Design child issue on graph (CLI JSON error in agent env; create manually under TRL-156)
- [x] Paths recorded in this handoff SUMMARY
