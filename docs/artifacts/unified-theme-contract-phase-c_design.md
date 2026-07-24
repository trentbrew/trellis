---
version: alpha
name: Unified theme contract — Phase C
description: Design artifact for TRL-164 — activate fractal vantage hooks on L3 runtime (scalar + shell snap; dual-shell prep only)
source:
  tool: greenfield
  mock: docs/artifacts/unified-theme-contract-phase-c_mockup.html
  research: Phase B artifacts + demo/realtime-app fractal shell registry + essay graph-overlay-one-surface
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
  vantage-scrubber:
    backgroundColor: "{colors.surface-raised-base}"
  shell-node:
    backgroundColor: "{colors.entity-issue}"
  shell-row:
    backgroundColor: "{colors.surface-raised-base}"
  shell-card:
    backgroundColor: "{colors.surface-raised-base}"
    rounded: "{rounded.lg}"
vantage:
  default: 8
  detents: [2, 5, 8]
---

# Design: Unified theme contract Phase C

**Status:** Design complete (handoff to Architect)  
**Parent:** TRL-164  
**Prior:** Phase B shipped (TRL-159…163)  
**Mock:** [unified-theme-contract-phase-c_mockup.html](./unified-theme-contract-phase-c_mockup.html)  
**Essay:** [graph-overlay-one-surface.md](../essays/graph-overlay-one-surface.md)

---

## Overview

Phase B activated Studio dark values, inset substrate, and glass on L3 runtime
surfaces. Phase C **activates the fractal hooks** already documented in
`runtime-theme.css` comments — on L3 operator chrome only:

1. Live **`--ui-vantage`** scalar (0–21 range; L3 UI exposes **three detents**).
2. **`data-ui-vantage="{n}"`** on the focal container.
3. **`data-trellis-shell="node|row|card"`** on morphing widgets (snap, not blend).
4. **Dual-shell crossfade** stays **prep / annotated only** (TRL-25 full engine).

Tone: dense L3 operator. Inset ladder (`--surface-1/2/3`) remains containment
depth — **not** shell names. Deck present/edit stays `data-deck-mode` (out of
scope). Context-pack CLI vantage (`boot|edit|review`) is orthogonal.

---

## Colors

Carry Phase B Studio dark unchanged. Phase C adds **no new palette tokens** —
vantage modulates **disclosure / layout**, not fill hue.

Glass chrome (`--tml-glass-surface`) stays **invariant** across vantage (sticky
operator shell). Entity accents (`--entity-*`) remain readable at every shell.

---

## Typography

System stacks from Phase B. Shell labels and scrubber readout use mono
`--font-family-mono` at 11px. Territory name (e.g. “Kanban card”) uses sans
header weight at 12–13px.

---

## Layout

### Naming (locked)

| Role | Canonical (contract) | Demo alias (do not invent third) |
| ---- | -------------------- | -------------------------------- |
| Scalar CSS | `--ui-vantage` | demo `--vantage` → map to `--ui-vantage` |
| Focal attr | `data-ui-vantage` | demo `data-trellis-vantage` → alias optional for parity |
| Shell attr | `data-trellis-shell` | same |

### Detents (L3 Phase C)

Align with `demo/realtime-app` shell registry ranges, expose **three stops**.
**Default locked: `8` / card** (L3 kanban density; matches mock).

| Detent | `--ui-vantage` | Shell | Label | Default |
| ------ | -------------- | ----- | ----- | ------- |
| Node | `2` | `node` | Labeled node | |
| Row | `5` | `row` | Row | |
| Card | `8` | `card` | Kanban card | **yes** |

Full 0–21 continuous scrub + named territories table = TRL-25 / Phase C+.

### Mount semantics

**One live shell at a time.** The morph host’s `data-trellis-shell` **snaps**
among `node|row|card` — do not render three concurrent shell nodes.

```
html[data-trellis-band="L3"]
  └─ [data-ui-vantage="8"]              ← focal root (main / mock stage)
       └─ [data-trellis-shell="card"]   ← single morphing thing (snaps)
```

Separate **static** specimen (right rail): always `data-trellis-shell="card"` as
tml-lanes `.issue-card` anatomy reference — **not** driven by scrubber.

Glass `#topbar` / drawer sit **outside** the morphing host (invariant chrome).

### Surfaces in scope

| Surface | Phase C change |
| ------- | -------------- |
| `client.html` | Primary: scrubber + one morphing entity on graph/stage |
| `tml-lanes` `.issue-card` | Secondary specimen: `data-trellis-shell="card"` |
| `lanes.html` | Optional later; mock uses cropped card column only |
| Dual-shell layers | Annotated prep panel — not interactive |

### Delivery (for Architect)

1. Promote live `--ui-vantage: 8` (locked default card detent) in
   `runtime-theme.css`; update unit test that currently forbids live property.
2. CSS rules for `[data-trellis-shell="node|row|card"]` disclosure (size, meta
   visibility) driven by shell attr (and optionally `var(--ui-vantage)`).
3. Minimal JS on `client.html` (and optionally tml-lanes): set
   `data-ui-vantage` + `--ui-vantage` + resolve shell on scrubber change.
4. Do **not** port full `demo/realtime-app` fractal engine.

---

## Elevation & Depth

| Layer | Token / attr | Behavior |
| ----- | ------------ | -------- |
| Substrate | `--surface-1/2/3` | Fixed containment (Phase B) |
| Glass | `--tml-glass-*` | Invariant operator chrome |
| Morph host | `[data-ui-vantage]` | Owns scalar |
| Thing | `[data-trellis-shell]` | Snap layout for current territory |

---

## Shapes

Reuse Phase B radii. Shell **card** uses `--radius-lg` (10px) to match
`.issue-card`. Node uses pill / circle. Row uses `--radius-md` bar.

---

## Components

| Component | Anatomy | States | Maps to |
| --------- | ------- | ------ | ------- |
| Vantage scrubber | 3 detent buttons + readout | idle / active detent | drawer or stage chrome |
| Territory label | mono + sans | updates with detent | below scrubber |
| Morphing thing | node / row / card shells | snap on detent | graph entity or issue |
| Issue-card specimen | head / meta / status badge | shell=card only | `tml-lanes` `.issue-card` |
| Dual-shell prep | stacked ghost cards | static annotation | out of interactive scope |
| Band pill | `L3 · operator` | fixed | `data-trellis-band` |

### Shell appearance (normative for mock + AC)

**Node (v=2):** ~28–36px disc or short label chip; type pip only; no body copy.

**Row (v=5):** full-width bar; title + type; meta collapsed to one line.

**Card (v=8):** raised `--surface-3` panel; title, status badge, meta row;
matches `.issue-card` density (10px radius, ~14px padding).

---

## Interaction matrix

| Input | States | Output |
| ----- | ------ | ------ |
| Detent Node | idle → active | `--ui-vantage:2`; shell=`node`; label “Labeled node”; focus on Node radio |
| Detent Row | idle → active | `--ui-vantage:5`; shell=`row`; label “Row”; focus on Row radio |
| Detent Card | idle → active | `--ui-vantage:8`; shell=`card`; label “Kanban card”; focus on Card radio |
| Detent hover | idle → hover | text-strong + surface-2 wash (decorative) |
| Keyboard ←/→ on scrubber | focus → change | next/prev detent; roving tabindex; same as activate |
| Tab into scrubber | blur → focus | lands on **checked** radio only (`tabindex=0`) |
| Focus visible | checked radio | 2px interactive outline |
| Reduced motion | `prefers-reduced-motion: reduce` | instant shell snap; no fade/scale blend |
| Dual-shell panel | static | no interaction in Phase C |
| Issue-card specimen | static | always shell=card; scrubber does not change it |

---

## Accessibility

- **Focus order:** scrubber radiogroup (roving — Tab hits selected detent) → optional
  morph host only if it gains real actions (mock: decorative, no tabindex).
- **Radiogroup:** `role="radiogroup"` / `role="radio"`; only checked radio has
  `tabindex="0"`, others `-1`; arrows move check **and** focus.
- **Labels:** `aria-label="UI vantage"` on group.
- **Live region:** territory label via `aria-live="polite"` on change.
- **Motion:** no crossfade under reduced motion; shell replaces instantly.
- **Color:** shell identity via shape/layout, not color alone (entity pip + structure).

---

## Do's and Don'ts

**Do**

- Keep glass chrome invariant across vantage.
- Snap shells at detents; one live shell at a time.
- Update unit tests when `--ui-vantage` goes live.
- Document demo alias (`data-trellis-vantage` / `--vantage`) as non-canonical.

**Don't**

- Implement dual-shell crossfade or full 21-level Studio fractal.
- Conflate `--surface-1/2/3` with `node|row|card`.
- Drive deck present/edit via `--ui-vantage`.
- Collide with context-pack `boot|edit|review` vantage.

---

## Open for Architect

1. **Must:** live `--ui-vantage: 8` default in `runtime-theme.css` (locked default
   card detent); flip `test/ui/runtime-theme.test.ts` Phase C “comment-only”
   assertion to require live property.
2. **Must:** `client.html` focal `[data-ui-vantage]` + **one** morphing entity
   whose `data-trellis-shell` snaps; scrubber sets CSS var + attrs (detents 2/5/8).
3. **Should:** static `.issue-card` specimen with always-on `data-trellis-shell="card"`
   (anatomy reference; not scrubber-driven).
4. **CSS:** shell rules using attr selectors; optional `clamp()` opacity on meta
   (crib `Thing.svelte` pattern) without dual-shell layers.
5. **A11y AC:** radiogroup with roving tabindex; ←/→ moves focus + check.
6. **AC:** unit + e2e — assert `--ui-vantage` present; assert `data-ui-vantage` /
   shell snap on client or `/tml-lanes`; reduced-motion behavioral.
7. **Out of scope:** dual-shell crossfade; band ACL L1/L2; full TRL-25 registry;
   lanes.html full-page vantage (unless cheap).
8. **Alias:** optional one-line comment mapping demo `--vantage` → `--ui-vantage`.
   Scrubber mock `data-v` / `data-shell` helpers are **not** contract tokens.

## Handoff checklist

- [x] `docs/artifacts/unified-theme-contract-phase-c_design.md`
- [x] `docs/artifacts/unified-theme-contract-phase-c_mockup.html`
- [x] Design child issue on graph (TRL-165)
- [x] Paths in handoff SUMMARY
