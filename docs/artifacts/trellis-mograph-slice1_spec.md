# Spec: Trellis mograph explainer — slice 1

**Status:** Spec ready for implementation  
**Parent:** TRL-429  
**Design:** [trellis-mograph-slice1_design.md](./trellis-mograph-slice1_design.md)  
**Mock:** [trellis-mograph-slice1_mockup.html](./trellis-mograph-slice1_mockup.html)  
**Impl repo:** `/Users/trentbrew/TURTLE/Projects/DevTools/ANIMEJS/clients/react`  
**Labels:** `spec`, `needs-e2e`, `mograph`

---

## Intent

Ship two Trellis education demos in the existing mograph React app: **Genealogy Traversal** (Matthew begats BFS) and **EAV Facts** (composer task assert). Static JSON fixtures only — no runtime `trellis-node` dependency.

---

## File map (create / modify)

| Path | Action |
| ---- | ------ |
| `src/mograph/fixtures/matthew-genealogy.json` | **create** — topology for TreeVisualizer |
| `src/mograph/fixtures/composer-task-1.json` | **create** — 6 EAV facts for task-1 |
| `src/mograph/fixtures/genealogyTopology.js` | **create** — helper: load fixture + map person names |
| `src/mograph/playbooks/eav-assert.js` | **create** — `generateEAVAssertPlaybook(facts, codeLines?)` |
| `src/mograph/playbooks/eav-assert.test.js` | **create** — unit tests |
| `src/mograph/components/FactTriplePanel.jsx` | **create** — triple row visualizer |
| `src/mograph/components/FactTriplePanel.test.jsx` | **create** — render + row count |
| `src/mograph/components/TreeVisualizer.jsx` | **modify** — optional `title` on nodes, label truncate helper |
| `src/components/examples/GenealogyExample.jsx` | **create** — scene wrapper |
| `src/components/examples/EAVExample.jsx` | **create** — scene wrapper |
| `src/App.jsx` | **modify** — Trellis nav group + tab routes |
| `e2e/mograph-trellis.spec.js` | **create** — seek snapshot tests |

**Do not modify:** `schema.js`, `catalog.js`, `generateScene.js` (deferred slice 2).

---

## Fixtures

### `matthew-genealogy.json`

Export from `trellis-node/src/bible-claims/genealogies.ts` — **connected component only** reachable from `bible:person/abraham` (7 nodes: Abraham → … → Rehoboam). Omit Joseph/Jesus branch (disconnected in abbreviated seed).

Shape (matches `TreeVisualizer` + `generateBFSPlaybook`):

```json
{
  "nodes": [
    { "id": "bible:person/abraham", "value": "Abraham", "title": "Abraham" }
  ],
  "edges": [
    { "from": "bible:person/abraham", "to": "bible:person/isaac" }
  ],
  "root": "bible:person/abraham"
}
```

- `value`: display label (first name); truncate to 6 chars + `…` when longer (`Rehoboam` → `Rehobo…`)
- `title`: full name for DOM `title` attribute

### `composer-task-1.json`

From `demo/graph-composer/composer.ts` `SEED[0]`:

```json
{
  "entity": "task-1",
  "facts": [
    { "e": "task-1", "a": "type", "v": "Task" },
    { "e": "task-1", "a": "title", "v": "Ship the composer wedge" },
    { "e": "task-1", "a": "status", "v": "todo" },
    { "e": "task-1", "a": "priority", "v": 1 },
    { "e": "task-1", "a": "owner", "v": "trent" },
    { "e": "task-1", "a": "updatedAt", "v": "2026-04-11T00:00:00.000Z" }
  ]
}
```

---

## Playbook contracts

### Genealogy — reuse `generateBFSPlaybook(topology)`

No new generator. Import topology from fixture; call existing `generateBFSPlaybook`.

Event types consumed: `visit`, `edge-highlight`, `line`, `pointer` (existing).

### EAV — `generateEAVAssertPlaybook(facts, options?)`

**Input:** `facts: Array<{ e, a, v }>`

**Output:** chronologically ordered events:

| type | fields | purpose |
| ---- | ------ | ------- |
| `assert-fact` | `index`, `entity`, `attr`, `value`, `timeOffset` | Reveal row `index` |
| `highlight-fact` | `index`, `timeOffset` | Active-row pulse (same time as assert) |
| `line` | `target` (0-based line index), `timeOffset` | CodeTracer sync |

**Timing constants:**

```js
const ASSERT_DUR = 500;
const ASSERT_GAP = 800;  // idle between asserts
const CODE_START = 400;  // first line highlight offset within scene
```

- Monotonically increasing `timeOffset`
- One `line` event per assert, targeting the line showing that fact in the code block
- Emit `line` for wrapper lines (open brace, close brace) at start/end if desired

**Unit tests (`eav-assert.test.js`):**

- Returns `facts.length` assert-fact events
- Monotonic `timeOffset`
- Each assert references valid index 0..n-1
- At least one `line` event

---

## Component specs

### `FactTriplePanel`

**Props:**

```js
{
  facts: Array<{ e, a, v }>,  // required
  entityId: string,           // panel header badge, e.g. 'task-1'
  playbook: array,
  startTime: number,          // default 0
}
```

**DOM structure:**

- Header row: `FACT TRIPLES` (muted uppercase) + entity id right-aligned
- Column headers: Entity · Attribute · Value (10px mono uppercase, `color.muted`)
- N rows, each 56px, 12px gap, three cells

**Cell styling:** import from `tokens.js`:

- entity → `color.syntax.keyword`
- attribute → `color.syntax.string`
- value → `color.syntax.number`
- background → `color.surfaceAlt`, border → `color.border`, radius 4px
- active row → bg `color.highlight` @ 15% opacity (`rgba(250,204,21,0.15)`), border `color.highlight`

**Animation (via `Director.registerSequence`):**

Per `assert-fact` at `absoluteStartTime + step.timeOffset`:

1. Row entrance: `opacity [0→1]`, `translateY [-20→0]`, 500ms, `easeOutElastic(1,0.6)`, stagger 120ms × index
2. Optional `highlight-fact`: scale `[1→1.02→1]`, 200ms, `easeInOutQuad`

Initial row state: `opacity: 0` (entering). After assert time, row stays opacity 1 (settled).

**Reduced motion:** if `window.matchMedia('(prefers-reduced-motion: reduce)').matches`, use 80ms opacity-only entrance; skip scale pulse.

**Value cells:** `title={String(v)}` for truncation tooltip.

### `TreeVisualizer` (minimal delta)

Add to node render:

```jsx
title={node.title ?? undefined}
```

Optional prop `truncateLabels={6}` — when set, truncate `String(node.value)` for display only (keep `title` as full name).

GenealogyExample passes `nodeRadius={24}`, `truncateLabels={6}`.

### `GenealogyExample.jsx`

Clone `BFSExample.jsx` structure:

- Import fixture topology
- `generateBFSPlaybook(topology)`
- BFS pseudocode (same as BFSExample or genealogy-specific comment line)
- Scene name: `"Trellis: Matthew Genealogy"`
- Layout per design: Code `280/120/1.3`, Tree `280/780/1.2`, tree `520×340`
- CodeTracer `startTime={400}`, TreeVisualizer `startTime={800}`

### `EAVExample.jsx`

- Import fixture facts
- `generateEAVAssertPlaybook(facts.facts)`
- Code block (~8 lines):

```js
await kernel.mutate('addFacts', {
  facts: [
    { e: 'task-1', a: 'type', v: 'Task' },
    // ...
  ],
});
```

- Scene name: `"Trellis: EAV Facts"`
- Same panel coords as Genealogy
- FactTriplePanel `startTime={800}`, CodeTracer `startTime={400}`

### `App.jsx`

Insert nav group **Trellis** between Engines and AI Generate:

| Tab key | Label | Component |
| ------- | ----- | --------- |
| `trellis-genealogy` | Genealogy Traversal | `GenealogyExample` |
| `trellis-eav` | EAV Facts | `EAVExample` |

Headers per design doc (title + subtitle in `content-header`).

Existing `key={activeTab}` on content wrapper handles tab unmount (pause/reset timeline).

---

## E2E (`e2e/mograph-trellis.spec.js`)

Follow `e2e/mograph-timeline.spec.js` pattern:

```js
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__MOGRAPH_API__ != null);
});
```

**Test 1 — Genealogy tab mounts API:**

- Click nav "Genealogy Traversal" (or set tab via button text)
- Wait for `__MOGRAPH_API__`
- `getDuration()` > 0

**Test 2 — EAV tab seek shows fact rows:**

- Click "EAV Facts"
- Seek to 50% duration
- Assert ≥1 fact row visible with text `task-1`

**Test 3 — Genealogy seek visits node:**

- Genealogy tab, seek to mid-duration
- Scene `[data-scene-name="Trellis: Matthew Genealogy"]` contains node text `Abraham`

Run: `npm run test:e2e e2e/mograph-trellis.spec.js`

---

## Dependency graph

```
fixtures/*.json
    ↓
playbooks/eav-assert.js ←── EAVExample
generateBFSPlaybook     ←── GenealogyExample
    ↓
FactTriplePanel (new)
TreeVisualizer (minor)
CodeTracer (unchanged)
Director / ScrubberUI / Canvas (unchanged)
    ↓
App.jsx
```

---

## Acceptance criteria

### Behavioral

1. Sidebar shows **Trellis** group with Genealogy Traversal and EAV Facts tabs
2. Genealogy tab renders Matthew chain (≥7 nodes) with scrubbable BFS timeline
3. EAV tab renders 6 fact rows for `task-1` with column headers Entity/Attribute/Value
4. Scrubbing EAV timeline reveals rows sequentially; seeking backward hides unasserted rows
5. Both scenes use 1920×1080 canvas with ScrubberUI
6. No imports from `trellis-node` package at runtime

### Automated

```bash
# from clients/react
test:npm run lint
test:npm run test:run
test:npm run test:e2e e2e/mograph-trellis.spec.js
```

---

## Out of scope

- `catalog.js` / AI generate integration
- Op-chain, sync, lane promote demos
- MP4 export script changes
- Live kernel / Web Worker bridge

---

## Open questions (non-blocking)

- **Q1:** Register `FactTriplePanel` in catalog now vs slice 2? → **Defer** (out of scope)
- **Q2:** Include `updatedAt` fact in animation? → **Yes** (all 6 facts animate)

---

## Handoff checklist

- [x] Spec mirrors design artifact
- [x] Machine-testable AC listed
- [x] File map with create/modify paths
- [x] Playbook event contract defined
- [ ] `trellis issue check TRL-SPEC` (CLI blocked — Executor validates locally)
