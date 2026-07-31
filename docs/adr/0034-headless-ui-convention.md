# ADR 0034: Headless UI convention — behavior cores, thin adapters, a component registry

**Status:** Proposed
**Date:** 2026-07-31
**Context:** Trellis 3.4.2+
**Builds on:** ADR 0033 (`trellis/forms` — descriptor contract + `createFormCore` engine + react/vue/svelte/vanilla adapters), `src/svelte/stores.ts` (store-contract adapters), `src/react/schema-hooks` + `src/vue/schema-hooks` (framework-reactive entity data), `src/client/reactive.ts` (`Signal`).
**Planning seed:** forms post-ship reflection — "the UI is a compiler for a visual runtime": as much of every UI affordance as possible implemented headlessly, with thin framework bindings on top.

## Problem Statement

The forms wedge proved a pattern: a pure, Node-testable behavior core (`createFormCore`) with four mechanical adapters. Every other UI affordance in Trellis — timeline scrubbers, rich text, stacked dialogs, command palettes, toasts, menus, drag-drop — is today (or would be) reimplemented per client and per framework:

1. **Behavior is re-derived everywhere.** Studio (React), the cloud sprite (Vue), and realtime-app (Svelte) would each hand-write playhead math, dialog stacking, palette querying. Three copies of every bug, three copies of every fix.
2. **Behavior is untestable where it lives.** State transitions buried in components can only be exercised through a browser. The forms engine's entire behavior suite runs in vitest with zero DOM — that is the property we want everywhere.
3. **Sprite fragility.** The forms work died twice before it became a library module. Framework-adjacent code is the fragile part; framework-free cores survive.
4. **Fractal responsiveness is a rendering problem.** Layout, scale, and inset hierarchy (the visual-runtime concern) should be solved once in the renderer, not re-solved inside every component. Separating behavior from rendering makes that possible — components become thin projections of descriptors + cores.

## Decision

### 1. The convention: every UI domain is a behavior core + thin adapters

A UI domain ships as:

- **`src/<domain>/core/`** — framework-free, DOM-free behavior: types, a `create<Domain>Core(config)` factory, state, actions, and domain accessors. Zero imports from `react`/`vue`/`svelte` and zero Node-only imports (browser-safe by construction).
- **`src/<domain>/react|vue|svelte|vanilla/`** — adapters, ~100 lines each, mapping the core's bridge to the framework idiom.
- **Tests** — behavior tests in `test/core/<domain>.test.ts` run in Node (vitest, bun); adapters get smoke tests (module imports, exports surface) unless a framework test environment is set up.
- **Packaging** — `trellis/<domain>` exports the core (root), `trellis/<domain>/react` etc. export adapters. Framework-importing adapters never enter the `trellis/browser` bundle; cores always do.

### 2. The bridge contract (the heart of the convention)

Every core exposes the same minimal surface, so adapters are mechanical:

```ts
interface HeadlessCore<S> {
  /** Latest state — pull. Recompute derived fields (isValid/isDirty-style) here. */
  readonly state: S;
  /** Subscribe to mutations — push. `listener` fires after every state change. */
  subscribe(listener: () => void): () => void;
  /** Domain accessors, e.g. form.field(name), timeline.marks, palette.query(text). */
}
```

Adapter mapping (as built in ADR 0033):

- **React** — `useSyncExternalStore(core.subscribe, () => core.state)` + a context provider per domain (see `src/forms/react/index.ts`). Cores are created once per mount (`useRef`), never per render.
- **Vue** — `reactive(core.state)` + `subscribe(() => Object.assign(state, core.state))`.
- **Svelte** — store contract only: `{ subscribe(run) { run(get()); return core.subscribe(() => run(get())); } }`. No `svelte` import — works across Svelte 4/5 (see `src/svelte/stores.ts` `toStore`, forms `createFormStore`).
- **Vanilla** — direct `core.state`/`subscribe`, plus optional DOM glue where the domain needs it (forms `bindFormToDOM`).

### 3. A shared `trellis/headless` module

The convention needs shared furniture, kept deliberately tiny (~100 lines):

- `HeadlessCore<S>` interface (above).
- `toSvelteStore(core)` / `toReactiveState(core)` bridge helpers (lifted from the forms adapters).
- `ComponentRegistry` types (section 4).

Domains depend on it; it has no other dependencies.

### 4. The component registry — "the compiler" for the visual runtime

The registry is how descriptors become rendered UI, once per framework:

- Each domain's core defines a **descriptor** — a pure JSON shape describing *what* to render (`FormDescriptor` is the model: modes, sections, controls, validation — serializable, derivable, remote-safe).
- A **`HeadlessComponentType`** identifies each affordance (`form`, `palette`, `dialog`, `timeline`, `richtext`, `toast`, `menu`, `combobox`, `upload`, `table`, `code`, `colorpicker`, `flow`, `layout`, …).
- Each framework registers visual components under those types:

```ts
// trellis/headless
interface RegistryEntry {
  type: HeadlessComponentType;
  // Render a descriptor (and bind a core if provided) with the framework's idioms.
  component: unknown; // framework-specific: ReactElement factory, Vue component, svelte file, …
}
```

- A renderer for each framework resolves `type + descriptor + (core | coreFactory)` → visual component. Clients compose: `<Renderer type="timeline" descriptor={marksDescriptor} />`.
- **Cores are never instantiated inside visual components.** The registry contract passes them in, so the same descriptor renders identically under all three frameworks.
- **Layout stays in the visual runtime.** Visual components receive tokens (fractal scale, inset hierarchy, theme) from the renderer, never from cores. The renderer owns spacing/scale/a11y once; cores own behavior.

### 4.1 The anatomy contract — the visual half of a registry entry

A registry entry is complete only when it pairs the behavior core with a documented **part anatomy**: the slot tree a visual component must expose for that type, plus its states and a11y notes. Without the anatomy half, every client invents its own layout of the same component. Reference for novel-composite anatomy: the ui-thing catalog (Attachment/Bubble/Message/Timeline — Reka-UI-backed copy-paste components, the "AI-friendly open code" model).

The contract:

1. **Part-slot trees.** A visual component is a fixed part tree with named slots — `attachment` → `media | content(title, description) | actions(action*) | trigger`, `bubble` → `content | reactions`, `timeline` → `marker* | date | content`. Parts map 1:1 onto core data: `AttachmentActions` renders descriptors/actions, `AttachmentTrigger` opens a dialog or link.
2. **`as` / `as-child` polymorphism on every part** (Primitive convention): any part renders as another element or merges its props onto the child — triggers become links, content becomes buttons, parts compose nested primitives (an attachment trigger inside a dialog trigger). This is how novel components compose existing ones instead of re-implementing them.
3. **State-variant styling only.** `state`-style props (`idle | uploading | error`, variant, size, orientation) map onto core state and drive *styling* — shimmer, destructive treatment — never behavior. Transitions are computed by the core; the component renders them.
4. **Per-part a11y notes ship with the anatomy** — aria-labels for icon-only actions, `role="group"` + `tabindex` for scrollable rows, "meaning beyond color" notes. A11y data that can be computed lives in core state; the notes document what the visual layer must add by hand.
5. **Agent-generatable.** A descriptor + anatomy spec is all a coding agent needs to produce the visual component for any framework — the registry entry *is* the prompt. The open-code/AI-friendly property becomes structural, not incidental.

### 4.2 Ecosystem positioning — two tiers of "headless"

The ecosystem now has two tiers of headless, and this convention is deliberately the second:

- **Tier 1 — unstyled framework logic** (`@shadcn/react`, Radix, Reka UI): behavior lives in framework hooks and is DOM-bound (scroll events, position math on real elements). Ships no styles; still single-framework and untestable in Node.
- **Tier 2 — framework-free, DOM-free cores** (this convention): pure state machines, Node-testable, adapter-mapped. DOM-bound details become adapter/DOM-glue work over core state.

Reference: `@shadcn/react/message-scroller` is the Tier-1 model for the scroll dimension of `message-stream-core`. Its behavior spec is adopted as the reference behavior: `autoScroll` defaults **false** (follow only while the reader is at the live edge; wheel/touch/keyboard/explicit jumps release it), per-row `scrollAnchor` (turn boundaries, not "last row"), `defaultScrollPosition: "last-anchor"` (read-resume at last turn), `scrollPreviousItemPeek` (newly anchored turns keep part of the previous item visible), `preserveScrollOnPrepend` (history-loading stability — the windowing math our core must extract), `data-scrollable` / `data-autoscrolling` state attributes (edge fades, styling hooks), live-region contract (`role="log"`, `aria-relevant="additions"`, `aria-busy` while streaming), split visibility subscription (`currentAnchorId`, `visibleMessageIds` — paid only by outline/search consumers), imperative commands returning `false` when unapplicable. The anchor/edge/threshold/prepend math is what Tier 2 extracts; its parts (Provider/Root/Viewport/Content/Item/Button) are Tier-1 anatomy per §4.1.

### 5. Anti-patterns (learned from the form-v1 port — banned)

- No `require()` in ESM adapter code; no module-shim `.d.ts` hacks.
- No monkey-patching of core actions from adapters (sprite's `useForm` patched `actions.validate` — broke on `useSyncExternalStore`).
- Dirty/derived baselines must come from *initialized* state, not raw inputs (forms `isDirty` bug: compared against `{}` instead of the `''`-filled shape).
- Behavior must never depend on which adapter is mounted — cores are adapter-agnostic by construction (test: two adapters mounted on one core observe identical state).

### 6. Wedge queue (each wedge is its own spec, this ADR only fixes the convention)

1. **`palette-core`** — command palette: query state machine, fuzzy filtering (pure), item groups, keyboard navigation state, empty/loading states. Pilot wedge: smallest, immediately useful in Studio + cloud sprite.
2. **`dialog-core`** — stacked dialog manager: stack push/pop, focus-trap contract, esc/backdrop policy, a11y wiring data, async confirm/dismiss. Renders as `render(stack)`.
3. **`timeline-core`** — playhead engine: duration, rate, seek, range, marks, loop — pure time math. Shared by realtime-app and Raster.tv; feeds the DAG-scheduler visualization.
4. **`editor-core`** — rich text: document model + command set + undo history. Candidate: ProseMirror as the document model (it is already headless — a core wrapper standardizes it), with our descriptors as the schema surface.
5. **`upload-core`** — transfer state machine: per-item progress, cancel/retry, concurrency limits, idempotent uploads; `idle | uploading | processing | error | done` lifecycle. Dependency of composer-core attachments (the chat flagship) and the sprite. Anatomy reference: ui-thing Attachment.
6. **`table-core`** — rich datatable (Notion-style, inline editing): **adopt `@tanstack/table-core` as the grid engine** (it is Tier 2 already — framework-free, DOM-free, Node-testable; a core wrapper standardizes it behind the bridge, per the §4.2 adoption rule). The Trellis-specific layer is built, not adopted: schema-derived columns (entity-type attributes, same generator as forms descriptors), rows bound to entities so **cell edit = EQL-S entity write = one op** (undo via undo-history-core + op-log, live updates via entity-delta subscription), and cells rendered by our cores — editor-core instances (per-surface schema constraints for rich cells), combobox-core (relation/select columns), forms controls (checkbox/date). The table is the registry's composer: the payoff demo of descriptor + core + anatomy.
7. **`code-core`** — code editing surfaces (query inputs, formula fields, code blocks, file editing): **adopt CodeMirror 6's pure layer** (`@codemirror/state` + Lezer parsing — same author as ProseMirror, same architecture: pure Node-runnable state, DOM view on top; the two best editors in existence implement this convention's Tier 2 by default; Monaco is the rejected alternative — fused engine+view, Tier-1 wrappers only). View + popups = adapter tier (forms `bindFormToDOM` precedent). Built layer — **schema-aware completions**: EQL-S autocomplete from entity types/attributes is core data, the analog of table's schema-derived columns. Surfaces: EQL-S query inputs (the text surface that compiles to the same descriptor as the structured query-builder-core), formula fields (restricted single-line expression mode; formula column = EQL-S expression evaluated per-row in table-core), code blocks in docs (light node in editor-core; heavy editing swaps a code-core instance in as a NodeView), actual file editing in the desk (file-entity write-back — another graph write surface).
8. **`undo-history-core`** — generic command stack, shared by editor/code/table/composer cores: `push` with grouping (one gesture = one step) and coalescing (adjacent same-type commands merge — typing bursts), depth limit, redo invalidation on new edits, invert contract (`{execute, invert}`) so any domain core plugs in. ProseMirror/CodeMirror built-in histories become implementations behind the interface. Boundary: this is the transient ergonomic layer — durable reversal of applied changes stays in the op-log + semantic diff/merge machinery. `canUndo`/`canRedo` ride state as core data (the a11y-data pattern — buttons/menus/keys read the core).
9. **`colorpicker-core`** — the rare pure-build wedge: no Tier-1 headless exists (Radix/Reka/TanStack all lack a color picker). Adopt `culori`/`colord` for color math (framework-free by nature — Tier 2). Built state machine: **draft/commit** (pick in a dialog → commit on close, the dialog resolver pattern), format persistence, recent-swatch ring, and **contrast computation as core data** (WCAG text-on-color — the a11y-as-core-data pattern). DOM (canvas/sliders/grid) = visual runtime. Consumers: forms color field (schema-derived control), timeline mark colors, design tokens. Anatomy reference: ui-thing Color Picker.
10. **`flow-core`** — node-graph canvas: **adopt `@xyflow/system`** (the framework-agnostic core under React Flow + Svelte Flow — viewport math, edge paths, drag/zoom/pan, selection; Tier 2 by default). View adapters: React Flow (Studio) / Svelte Flow (realtime-app) come free; **Vue gap** — Vue Flow is an independent Tier-1 library, so the sprite adopts it separately or defers flow surfaces. Built layer — graph semantics: nodes are schema-derived entity descriptors (same generator as table columns), **edges are EAV relations — dragging a connection writes a relation op** (the graph write-surface pattern: table rows, file entities, now canvas edges). Flow-core is the rendering surface for `graph-browser-core` (expansion/layout/filter state) and the DAG-scheduler visualization (timeline-core's stated consumer).
11. **`layout-core`** — dashboard/desk grid: item placement ({i, x, y, w, h}), collision resolution, vertical compaction/gravity, snap, bounds clamping, breakpoint reflow (cols per width — the fractal-scale steps) — pure arrangement math, Node-testable. React view layer: **adopt `react-grid-layout` as DOM glue** (controlled `layout` + `onLayoutChange` → `syncFromCore` — its stateful component is Tier 1, its math is ours); vue/svelte get the math free. The desk is the registry's composition surface — tiles are registry renderers (table/timeline/chat/flow/palette), and a desk layout is a persisted entity (view-state-core territory: layout presets as shareable graph entities).
12. **`motion-core`** — animation as state transitions over time. **Not a registry type — a service core, like undo-history-core** (it renders nothing; it augments everything). Pure layer: tween state machine (idle/pending/running/paused/completed, seek), timeline scheduling (sequence/parallel — same time-math shape as timeline-core), easing/spring/stagger math, value interpolation (reusing `culori` from colorpicker-core). DOM application = adapter: **adopt anime.js as the DOM-application layer** (rAF value application — it is Tier 1 by nature, that is its job). Deep links: timeline-core's playhead scrubs motion timelines (Raster.tv preview scrubbing; tween events → timeline marks); motion-core tweens *core state* (drawer progress, palette open, dialog scale, toast enter/exit) so animations are descriptors, not functions; FLIP delta math consumed by layout-core (desk preset reflow) and fractal token transitions (scale/inset morphs).

**Stretch case (not queued):** an Audacity-style DAW editor is the convention's composition stress test. Decomposition: clips/tracks = table-core rows (a session is a graph table — start/end/gain/fades are columns), transport = timeline-core (recording = arming state on track rows), snap/overlap/fade-curve math = pure Node-testable math (the only new core: `audio-clip-core`), waveform = canvas in the visual runtime, and the op-log provides causal, undoable, mergeable session history — non-destructive takes by default, agents editing audio like code. Boundary lesson: hard-real-time DSP/playback is an *engine*, never a core — cores drive engines through adapters, same as ProseMirror.

## Consequences

### Positive

- **Behavior written once, tested in Node, rendered three times.** The forms engine's vitest-only suite is the model for every domain.
- **The compiler framing becomes real:** descriptors + registry + tokens mean new clients and new components stop re-deriving affordance logic; the renderer is the only place layout is solved.
- **Registry entries are agent-generatable:** descriptor + anatomy spec (ADR §4.1) is a complete prompt for producing the visual component in any framework — the same open-code property that makes copy-paste libraries AI-friendly, made structural.
- **Sprite-proofing:** cores survive any client/app/framework churn — the valuable logic is library code.
- **a11y data becomes core data:** focus, esc, aria roles ride the descriptor/state, not per-component hacks.

### Negative

- **A second convention to maintain** (packaging, bridge, registry) until it becomes muscle memory — mitigated by `trellis/headless` and the wedge queue being mechanical.
- **Adapters add framework deps** to subpaths only; root `trellis/<domain>` stays framework-free (same rule as ADR 0033).
- **Registry adds an indirection** before the first visual component exists; the registry contract can be deferred per-domain until a second client needs it (forms shipped without one).

### Security Considerations

- Cores operate on data only; descriptors are JSON derived from registered schemas (no component names, no URLs from user input — same rule as ADR 0033).
- Dialog/palette cores must not enable script injection in vanilla DOM glue — text is set via `textContent` (forms `bindFormToDOM` precedent).

## Implementation sketch

1. `src/headless/core.ts` — `HeadlessCore<S>`, `HeadlessComponentType`, `RegistryEntry` types.
2. `src/headless/store.ts` — `toSvelteStore(core)`, `toReactiveState(core)` (lifted from forms adapters).
3. Refactor `src/forms/*` to use the shared bridge helpers (behavior unchanged; 31 tests stay green).
4. Pilot wedge: `src/palette/core/` + adapters, `test/core/palette.test.ts` (Node-only behavior), package.json exports `./palette`, `./palette/react|vue|svelte|vanilla`.
5. `src/dialog/core/` next; `timeline-core`, `editor-core`, and `upload-core` follow as separate specs.
6. Registry renderer only when a second framework-consumer appears (Studio + sprite palette both exist → registry v1 lands with palette).

## Acceptance sketch

- [ ] `trellis/headless` ships `HeadlessCore` + bridge helpers; forms uses them without behavior change
- [ ] `palette-core` behavior suite passes in vitest with zero DOM; no framework imports in `core/`
- [ ] `trellis/palette` + adapter subpaths import cleanly; browser bundle excludes adapters
- [ ] React/Vue/Svelte adapters mount one shared core and observe identical state (dual-adapter test)
- [ ] Descriptors stay pure JSON; no core state leaks into them
- [ ] `pnpm check` passes for `src/headless/*`, `src/palette/*`, `src/forms/*`

## Open questions

- Registry v1 shape: render-prop `Renderer` per framework vs. a plain `type → component` map per framework? (Lean: plain map + a tiny `resolve(type, descriptor)` per framework, since render props duplicate per framework.)
- Should `trellis/headless` live in this repo or become its own package once editor-core lands? (This repo, until a non-Trellis consumer exists.)
- Does `editor-core` adopt ProseMirror wholesale, or only its document model + commands? (Decision belongs to the editor-core spec; this ADR only fixes the contract it must satisfy.)
