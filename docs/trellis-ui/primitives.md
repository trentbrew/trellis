# Primitive Micro-Cores — @trellis.computer/ui

**Status:** spec
**Date:** 2026-08-02
**Issue:** TRL-325
**References:** ADR 0034 (headless UI convention), TRL-314 (theme contract), TRL-315 (icon registry), TRL-316 (font registry)
**Target:** `packages/core/src/primitives/` in trellis-ui monorepo

## TL;DR

Between the theme tokens and the domain cores there is a missing layer:
**primitive micro-cores**. Small, framework-free behavior cores for universal
affordances — disclosure, tabs, selectable, dismiss, tooltip, scroll, split —
that domain cores (sidebar, accordion, file explorer, editor, app shell)
**compose instead of re-implement**.

The guarantee this buys: the expand/collapse toggle in a file explorer IS the
toggle in an accordion IS the toggle in the editor's outline. One behavior core,
one icon, one motion token — everywhere.

## Layering

```
theme tokens (--icon-pack, --motion-*, --prose-*)     ← shared pixels (TRL-314)
        │
primitive micro-cores (disclosure, tabs, selectable, …) ← shared behavior
        │  composed by
domain cores (sidebar, accordion, editor, file explorer)
        │  rendered by
thin adapters (react / vue / svelte / vanilla)
```

- **Theme owns pixels**: icon identity (`--icon-pack`), animation
  (duration/easing), rhythm (`--prose-*`). Components never hardcode.
- **Primitives own behavior**: state + commands + a11y contract, no DOM, no
  pixels. Node-testable (vitest, zero DOM) like every other core.
- **Domain cores compose primitives** — a sidebar's collapsible group contains
  a disclosure core; the editor outline section is a disclosure core; the file
  tree node is a disclosure core. The state machine is one thing, reused.

## Primitive Registry

| Primitive | Behavior core state | Domain consumers |
|---|---|---|
| `disclosure` | `open`, `toggle()`, `expand()/collapse()`, `aria-expanded`, focus retention | sidebar groups, accordion, file tree nodes, editor outline, dropdown trigger |
| `tabs` | `activeTab`, `setTab()`, `next()/prev()`, roving `tabindex`, `aria-selected`, panel activation | sidebar style-7 project tabs, editor tabs, dashboard panels |
| `selectable` | `selectedIds`, `toggle()`, `select()/deselect()`, range selection | list items, table rows (composed by table-core), tree nodes |
| `dismiss` | `open`, `close(reason)`, dismiss-on-outside, Esc handling | dialogs (composed by dialog-core), menus, popovers, tooltips |
| `tooltip` | `open` (hover/focus/keyboard), `placement`, delay, `aria-describedby` | sidebar rails, icon buttons, truncation |
| `scroll` | scroll container: `autoScroll`, `anchor`, `preserveScrollOnPrepend`, `data-scrollable` | message streams, file lists, kanban, sidebar |
| `split` | panel geometry: sizes (px/ratio), `min`/`max`, `collapsible`+`collapsedSize`, `orientation`, `setPanelSize()`, order | app-shell root (ADR 0011 three bands), two-tier layouts, explorer+editor, datatable rails |
| `badge` | count state only (pure data) — no behavior | notification counts, status chips |
| `avatar` | identity → initials/color resolution (pure data) — no behavior | profile slots, person entities |

`badge` and `avatar` are **data-only primitives** — no state machine, just
deterministic projection (count → display, identity → initials + color). They
exist to keep the *visual vocabulary* shared, not to own behavior.

## Composition Rule

**A domain core may never re-implement a primitive's behavior.** If a sidebar
needs expand/collapse, it composes `disclosure`; if a table needs row
selection, it composes `selectable`. Violations are flagged in review.

Implementation shape — a domain core holds primitive instances:

```ts
// sidebar core (sketch)
const disclosure = createDisclosureCore({ defaultOpen: true })
const tabs = createTabsCore({ tabs: ['recent', 'starred', 'all'] })

core.state = {
  sections: …,           // nav structure
  activeId: …,
  collapsed: …,
  expandedGroups: disclosure.state,   // composed
  projectTabs: tabs.state,            // composed
}
```

## Shared Toggle Guarantee

The file-explorer example, made concrete:

- **Behavior**: one `disclosure` core → file tree node, accordion item, editor
  outline section all share `toggle()`, `aria-expanded`, focus retention.
- **Icon**: one alias `core-chevron-down` → `--icon-pack` resolves the glyph;
  the renderer rotates it on `open` (pixels are the adapter's job).
- **Motion**: one `--motion-duration-fast` token → every expand/collapse feels
  the same, per theme.

## Streaming Contract (prose + chat)

Content surfaces (editor output, chat, docs) render with the `prose` renderer
composition. Its styling contract is **append-stable** — adding a block never
restyles earlier blocks:

- No forward-looking selectors: `:last-child`, `:has()`, `:empty` are excluded
  from layout rules.
- Spacing flows one direction: `margin-block-start` only.
- Table separators live on the cells being added.
- Applies to: editor-core document rendering, message-stream rendering,
  markdown renderers.

This is a core-level contract: `editor-core` and the message stream must not
emit DOM shapes that require such selectors to look correct.

## Split — the app-shell root primitive

`split` is the structural primitive every app layout wraps itself in at the
root. It models **panel geometry only** — sizes, min/max constraints, collapse,
order, orientation — never panel contents, and never free-form placement
(that is `layout-core`'s desk grid). The model follows the reka-ui/radix
splitter contract (PanelGroup → Panel → ResizeHandle), extracted to Tier-2:

- Panel sizes as ratios with `min`/`max` clamping and collapse thresholds;
  constraint clamping + redistribution math is pure Node-testable geometry.
- `orientation` (horizontal/vertical), `setPanelSize()` (drag or imperative),
  double-click reset, keyboard resize via arrow keys on the handle.
- The DOM-only bits (pointer capture, `touch-action`, handle hit-box) are
  adapter glue over core state.

**Composition with the app shell (ADR 0011):** the three bands are a splitter
tree — `split(sidebar | split(main | operator-inset))` — and every layout
beneath it (two-tier, explorer+editor, datatable rails) is a nested split.
Shells, not pages, wrap themselves in it.

**Bridge to `layout-core` (the desk grid):** split and grid are orthogonal and
compose by **nesting, not merging**:

```
split (shell root)
├── sidebar panel
└── main panel
    └── grid (layout-core → react-grid-layout adapter)   ← desk tiles
        └── tile → split (nested splits inside a widget)
```

The single bridge value is the panel's measured width (`clientWidth` via
ResizeObserver) fed to the grid's `width` prop. When a splitter drag shrinks a
panel past a grid breakpoint, `layout-core`'s breakpoint-reflow math handles
it — which is why that reflow lives in the core, not the adapter.
`react-grid-layout` (the `Responsive` component) is `layout-core`'s react DOM
glue per ADR 0034 §4.11 — controlled `layout` + `onLayoutChange` →
`syncFromCore`, the same pattern as every adapter.

## Do's and Don'ts

- **Do** compose primitives inside domain cores.
- **Do** keep primitives DOM-free and Node-testable.
- **Do** let renderers map `open → rotation`, `active → styling` — pixels are
  adapter + theme work.
- **Don't** put `--prose-*`, `--motion-*`, or `--icon-pack` values in core
  code — cores know state, not pixels.
- **Don't** add behavior to `badge`/`avatar` — they are data-only.

## Acceptance Criteria

1. `disclosure`, `tabs`, `selectable`, `dismiss`, `tooltip`, `scroll`, `split`
   exist as framework-free cores with vitest coverage (zero DOM).
2. `badge`, `avatar` exist as data-only projections.
3. Sidebar core composes `disclosure` (+ `tabs` for style-7 project tabs);
   accordion core composes `disclosure`; the registry forbids duplicated
   expand/collapse state.
4. The shared-toggle guarantee is demonstrated: one disclosure core renders
   identically (behaviorally) in file-tree node, accordion, and editor outline.
5. Prose renderer adheres to the streaming contract (no forward-looking
   selectors, one-direction spacing).
6. `split` composes at the app-shell root (ADR 0011 bands); its panel width is
   the bridge into `layout-core`'s grid via measured `clientWidth`.
7. `pnpm check` passes; primitives import nothing from any framework.
