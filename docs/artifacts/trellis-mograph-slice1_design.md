---
version: alpha
name: trellis mograph explainer — slice 1
description: >-
  Design for TRL-429 — Two Trellis education demos in the Anime.js mograph engine:
  Matthew genealogy BFS (reuse TreeVisualizer) and EAV fact assert (new FactTriplePanel).
  1920×1080 scrubbable canvas, MP4-export ready.
source:
  tool: greenfield
  mock: docs/artifacts/trellis-mograph-slice1_mockup.html
  research: design-research TRL-429; BFSExample/SortExample/EInkExample; mograph/tokens.js
colors:
  base: "#0a0a0a"
  canvas: "#0f0f0f"
  surface: "#111111"
  surface-alt: "#1a1a1a"
  border: "#222222"
  border-alt: "#333333"
  text: "#e5e5e5"
  text-muted: "#666666"
  text-faint: "#888888"
  entity: "#c084fc"
  attribute: "#34d399"
  value: "#facc15"
  highlight: "#facc15"
  visited: "#34d399"
  syntax-keyword: "#c084fc"
  syntax-string: "#34d399"
  syntax-number: "#facc15"
typography:
  body:
    fontFamily: Inter, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  mono:
    fontFamily: JetBrains Mono, monospace
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.6
  header:
    fontFamily: Inter, sans-serif
    fontSize: 20px
    fontWeight: 600
  nav-label:
    fontFamily: Inter, sans-serif
    fontSize: 10px
    fontWeight: 500
    letterSpacing: 0.08em
    textTransform: uppercase
rounded:
  sm: 4px
  md: 6px
  lg: 8px
spacing:
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
components:
  sidebar:
    width: 220px
    backgroundColor: "{colors.surface}"
  canvas:
    width: 1920px
    height: 1080px
    backgroundColor: "{colors.canvas}"
  scrubber:
    height: 32px
    backgroundColor: "{colors.surface}"
  fact-row:
    height: 56px
    gap: 12px
  code-tracer:
    lineHeight: 24px
    padding: 16px
  tree-node:
    size: 48px
---

# Design: Trellis mograph explainer — slice 1

**Status:** Design verified — ready for Architect  
**Parent:** TRL-429  
**Mock:** [trellis-mograph-slice1_mockup.html](./trellis-mograph-slice1_mockup.html)  
**Impl repo:** `DevTools/ANIMEJS/clients/react`

---

## Overview

Add a **Trellis** nav group to the existing Anime.js React mograph dashboard. Slice 1 ships two scrubbable explainer scenes on the established 1920×1080 virtual canvas:

1. **Genealogy Traversal** — Matthew begats as BFS over a link graph (reuse `TreeVisualizer` + `CodeTracer`)
2. **EAV Facts** — Composer task seed flattened to `(entity, attribute, value)` triples (new `FactTriplePanel` + `CodeTracer`)

Emotional tone: same craft as E-Ink — dark inset surfaces, purposeful motion, pedagogical clarity. Not admin shell; not a marketing page. Export-safe for MP4 pipeline.

## Colors

Inherit `mograph/tokens.js` — do not introduce a second palette.

| Role | Token | Use |
| ---- | ----- | --- |
| Page / shell | `{colors.base}` | App background outside canvas |
| Canvas | `{colors.canvas}` | Inner 1920×1080 surface |
| Panels | `{colors.surface}` | CodeTracer block, scrubber |
| Cells | `{colors.surface-alt}` | Fact row background, tree nodes |
| Entity column | `{colors.entity}` / `syntax.keyword` | First cell in triple row |
| Attribute column | `{colors.attribute}` / `syntax.string` | Middle cell |
| Value column | `{colors.value}` / `syntax.number` | Third cell |
| Active row | `{colors.highlight}` at 15% bg + 1px border | Playbook `highlight` step |
| Visited node | `{colors.visited}` | BFS `visit` event on tree |

Admin causal-graph tokens (`#101010`) intentionally **not** ported — mograph canvas stays on `#0a0a0a` SSOT.

## Typography

- **Headers** (`content-header h2`): Inter 20px/600, `{colors.text}`
- **Subtitles**: Inter 14px/400, `{colors.text-muted}`
- **CodeTracer**: JetBrains Mono 12px, syntax colors from tokens
- **FactTriplePanel**: JetBrains Mono 12px; entity/attribute/value color-coded
- **Scrubber**: JetBrains Mono 11px uppercase buttons, `{colors.text-faint}`

## Layout

### App shell (unchanged)

```
┌─────────────┬──────────────────────────────────────────┐
│ Sidebar     │ content-header (title + subtitle)          │
│ 220px       ├──────────────────────────────────────────┤
│             │ canvas-wrapper (letterboxed 1920×1080)     │
│             │   ├─ scene panels (absolute)               │
│             │   └─ ScrubberUI (bottom 32px)              │
└─────────────┴──────────────────────────────────────────┘
```

### Sidebar IA

Insert new group **between Engines and AI Generate**:

| Group | Items |
| ----- | ----- |
| Engines | QuickSort, BFS Tree Search, E-Ink Hardware *(unchanged)* |
| **Trellis** | **Genealogy Traversal**, **EAV Facts** |
| AI Generate | Generate Scene *(unchanged)* |
| UI Primitives | *(unchanged)* |

Tab keys: `trellis-genealogy`, `trellis-eav`.

### Scene A — Genealogy Traversal

Two-panel layout (match `BFSExample.jsx` coords):

| Panel | Position | Scale | Component |
| ----- | -------- | ----- | --------- |
| Code | `top:280, left:120` | 1.3 | `CodeTracer` — BFS pseudocode |
| Graph | `top:280, left:780` | 1.2 | `TreeVisualizer` 520×340 — Matthew begats |

**Header copy:**
- Title: `Matthew Genealogy — BFS Traversal`
- Subtitle: `1920×1080 · Link graph from trellis-node bible-claims seed`

**Tree labels:** Person first names only (Abraham, Isaac, …). `nodeRadius={24}` (48px diameter). Labels truncate to 6 chars + ellipsis with full name in `title` tooltip. Long names (e.g. "Rehoboam") → "Rehobo…".

### Scene B — EAV Facts

Two-panel layout (BFS Y baseline):

| Panel | Position | Scale | Component |
| ----- | -------- | ----- | --------- |
| Code | `top:280, left:120` | 1.3 | `CodeTracer` — `kernel.mutate('addFacts', …)` |
| Facts | `top:280, left:780` | 1.2 | `FactTriplePanel` — 6 rows for `task-1` |

**Header copy:**
- Title: `EAV Facts — Entity Assert`
- Subtitle: `1920×1080 · Composer task seed → (entity, attribute, value) triples`

### FactTriplePanel anatomy

```
┌─────────────────────────────────────────────────────────────┐
│  FACT TRIPLES                                    task-1     │
│  Entity          Attribute        Value                     │  ← column headers
├─────────────────────────────────────────────────────────────┤
│ ┌──────────┐  ┌──────────┐  ┌────────────────────────────┐ │
│ │ task-1   │  │ type     │  │ Task                       │ │  ← row (inactive)
│ └──────────┘  └──────────┘  └────────────────────────────┘ │
│ ┌──────────┐  ┌──────────┐  ┌────────────────────────────┐ │
│ │ task-1   │  │ title    │  │ Ship the composer wedge    │ │  ← row (active/highlight)
│ └──────────┘  └──────────┘  └────────────────────────────┘ │
│ ...                                                         │
└─────────────────────────────────────────────────────────────┘
```

| Element | Spec |
| ------- | ---- |
| Row height | 56px (compact; causal-graph 72px too tall for 6 rows) |
| Cell gap | 12px |
| Entity cell | min-width 100px, `{colors.entity}` text, `{colors.surface-alt}` bg |
| Attribute cell | min-width 80px, `{colors.attribute}` text |
| Value cell | flex 1, `{colors.value}` text, truncate with title tooltip |
| Row border | 1px `{colors.border}`, radius `{rounded.sm}` |
| Active row | bg `highlight` @ 15% opacity, border `{colors.highlight}` |
| Column headers | Entity · Attribute · Value — mono 10px uppercase, `{colors.text-muted}` |

Max visible rows: 8 (slice 1 seed = 6). Panel width ~640px.

## Elevation & Depth

- CodeTracer: `{colors.surface}` block, 1px `{colors.border}`, `{rounded.md}`, inset feel
- FactTriplePanel: no outer card — rows float on canvas `{colors.canvas}`
- Tree nodes: `{colors.surface-alt}` fill, 1px `{colors.border-alt}`; visit glow `{colors.visited}`

## Shapes

- Nav buttons: existing `.nav-btn` pattern (no new chrome)
- Fact cells: `{rounded.sm}` 4px
- Tree nodes: circle 48px (existing `TreeVisualizer`)

## Components

| Component | Anatomy | States | Maps to codebase |
| --------- | ------- | ------ | ---------------- |
| `GenealogyExample` | Canvas + Director + Scene + 2 positioned divs | idle, scrubbing, playing | New example; clones `BFSExample` structure |
| `EAVExample` | Same shell | idle, scrubbing, playing | New example |
| `FactTriplePanel` | Column headers + N triple rows | entering (opacity 0), active (highlight), settled (opacity 1) | **New** `src/mograph/components/FactTriplePanel.jsx` |
| `CodeTracer` | Syntax lines + highlight bar | line highlight per playbook | Existing — no changes |
| `TreeVisualizer` | Nodes + edges | visit, edge-highlight | Existing — no changes |
| `ScrubberUI` | Play + range + time | playing, paused, dragging | Existing — no changes |

## Interaction matrix

| Input | Context | State | Output |
| ----- | ------- | ----- | ------ |
| Click sidebar "Genealogy Traversal" | App nav | any | Mount `GenealogyExample`; tab entrance fade (existing `Anime.div` key) |
| Click sidebar "EAV Facts" | App nav | any | Mount `EAVExample` |
| Click Play | ScrubberUI | paused | Timeline plays; button → Pause |
| Click Pause | ScrubberUI | playing | Timeline pauses |
| Drag scrubber | ScrubberUI | any | `playbackAPI.seek(ms)`; code line + viz sync |
| Scrub to assert step | EAV scene | scrubbing forward | Matching fact row → `active`; prior rows → `settled` (opacity 1) |
| Scrub backward past assert | EAV scene | scrubbing reverse | Rows after seek point → `entering` (opacity 0); at-or-before → `settled` |
| Scrub t=0 | EAV scene | start | All rows `entering` (opacity 0) — none visible until first assert event |
| Scrub to BFS visit | Genealogy scene | scrubbing | Tree node scales + visited color; edge highlight on traversal |
| Timeline end | either scene | complete | All elements in final settled state |
| Switch Trellis tab while playing | App nav | playing → tab change | Pause timeline, seek 0, unmount scene (existing `key={activeTab}` pattern) |

## Motion

### FactTriplePanel (new playbook events: `assert-fact`, `highlight-fact`)

| Event | Animation | Duration | Easing |
| ----- | --------- | -------- | ------ |
| Row entrance | `opacity [0→1]`, `translateY [-20→0]` | 500ms | `easeOutElastic(1, 0.6)` |
| Stagger between rows | 120ms (compact-row variant; ArrayVisualizer uses 150ms for 48px cells) | — | — |
| Active row highlight | bg `{colors.highlight}` @ 15%, `scale [1→1.02→1]` | 200ms | `easeInOutQuad` |
| Settled row | opacity 1, no glow | — | — |
| Entering (not yet asserted) | opacity 0 | — | — |

Reuse patterns from `ArrayVisualizer` entrance + highlight — timings tightened for 56px rows.

### Genealogy (existing BFS playbook)

No new motion — reuse `generateBFSPlaybook` events: `visit`, `edge-highlight`, `line`, `pointer`.

### Reduced motion

When `prefers-reduced-motion: reduce`:
- Replace elastic entrance with 80ms opacity fade
- Disable scale pulse on highlight; color-only active state
- Scrubber remains functional (essential control)

## Accessibility

- **Focus order:** Sidebar nav → Play/Pause → scrubber range → canvas panels are non-interactive (no click targets on viz)
- **Labels:** Scrubber Play/Pause button text toggles; range input has implicit slider role
- **Live regions:** None v1 — pedagogical content is visual; Architect may add `aria-label` on scene wrapper with scene name
- **Color:** Entity/attribute/value distinguished by position + label header row, not color alone
- **Motion:** Document `prefers-reduced-motion` overrides in component (see Motion section)

## Do's and Don'ts

**Do**

- Reuse BFS two-panel coordinates exactly
- Source fixtures from trellis-node seed data (static JSON)
- Match E-Ink craft: stagger, glow, deliberate timing
- Keep sidebar group label "Trellis" (brand alignment)

**Don't**

- Add runtime trellis-node kernel dependency in v1
- Invent new canvas sizes or break 1920×1080 export contract
- Port admin shell chrome into mograph dashboard
- Combine both scenes into one timeline v1 (separate tabs)

## Open for Architect

- Playbook generator signatures: `generateGenealogyBFSPlaybook(topology)` may alias existing `generateBFSPlaybook`; `generateEAVAssertPlaybook(facts[])` emits `{ type: 'assert-fact', entity, attr, value, timeOffset }` + `{ type: 'line', target, timeOffset }` for CodeTracer
- Fixture paths: `src/mograph/fixtures/matthew-genealogy.json`, `src/mograph/fixtures/composer-task-1.json`
- Register `FactTriplePanel` in `catalog.js` for slice 2 AI path (optional v1)
- `schema.js` enum extension deferred to slice 2+
- Unit test: FactTriplePanel renders N rows; playbook highlight at seek time (jsdom)
- E2e: optional Playwright seek snapshot on EAV scene (follow QuickSort pattern)

## Handoff checklist

- [x] `docs/artifacts/trellis-mograph-slice1_design.md` (this file)
- [x] `docs/artifacts/trellis-mograph-slice1_mockup.html`
- [ ] Design child issue TRL-D (CLI blocked — Architect may fork from TRL-429)
- [x] Interaction matrix complete
- [x] A11y + reduced-motion documented
