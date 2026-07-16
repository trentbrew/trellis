# TML v0 — Trellis Markup Language

**Status:** Proposed (plan) · **Date:** 2026-07-16
**Issue:** TRL-117 (companion to the lanes dashboard) · **Informed by:** ADR 0025 (DSL-first), `docs/planning/trellis-ui-dsl.md` §11.1
**Test bed:** `src/ui/lanes.html` lanes dashboard, grid projection on a sterile new route

> **One language, two transport adapters.** `tml-*` attributes are identical on web
> and Tauri. The difference is the `TmlDriver` each platform provides. This spec is
> transport-agnostic; the Web driver ships first, the Tauri driver follows TRL-9.

---

## 1. Why TML, and why now

ADR 0025 names TML as the *companion markup language* to TQL — declarative
attributes (`tml-query`, `tml-projection`, `tml-swap`) that bind a TQL query to a
DOM element and project results into it. `trellis-ui-dsl.md` §11.1 sharpens this
into **four primitives** — `query`, `op`, `live`, `ref` — and warns against the
"string form" (raw TQL in an attribute string, invisible to tooling, no
type-check). TML v0 takes that philosophy: **attributes bind scoped field
expressions, not inline code.**

The lanes dashboard (`src/ui/lanes.html`) is the ideal first test bed: it already
has a server-derived snapshot + SSE op stream, a clean data shape (lanes / issues
/ ops), and hand-written projection functions (`renderGrid`, `laneCard`, `onOp`)
that are exactly what TML should replace. We convert **one** projection (grid) on
a **sterile new route** (`/tml-lanes`) so the existing dashboard is untouched.

---

## 2. Design principles

1. **One language, two transport adapters.** `tml-*` attributes are identical on
   web and Tauri. The difference is the `TmlDriver` each platform provides. The
   spec is transport-agnostic.
2. **Attributes, not strings-of-JS.** Bindings reference scoped fields
   (`lane.id`), never inline JS. Per `trellis-ui-dsl.md` §11.1 — "reject the string
   form"; expressions are typed field paths, not raw code.
3. **Snapshots feed a reactive store; live updates mutate the store.** `tml-live`
   re-renders from the store, not by re-running queries against the server.
4. **No build step.** The runtime is a plain ES module loaded by a static HTML
   page, same shape as `lanes.html` (no framework, no bundler).

---

## 3. Attribute vocabulary (v0)

| Attribute | Binds | Example |
|-----------|-------|---------|
| `tml-query` | A TQL query against the store | `tml-query="find ?e where type = 'Lane'"` |
| `tml-each` | Iterate a result set, repeat the element's template | `tml-each="lane of lanes"` |
| `tml-text` | Field → `textContent` | `tml-text="lane.id"` |
| `tml-attr-*` | Field → HTML attribute (`*` = attr name) | `tml-attr-class="lane.status"` |
| `tml-op` | Mutation on `click` → `TmlDriver.op` | `tml-op="promote(lane.id)"` |
| `tml-live` | Re-render this subtree when the store changes | `tml-live` |
| `tml-ref` | Named identity scope for the element's query | `tml-ref="active-lanes"` |
| `tml-if` | Conditional render (expression truthy) | `tml-if="lane.isActive"` |

### 3.1 Scoping rules

- A `tml-each` element introduces a **loop variable** (`lane` in `lane of lanes`).
  Child `tml-text` / `tml-attr-*` / `tml-op` / `tml-if` resolve against that
  variable.
- `tml-query` results are addressable in `tml-each` by a **collection name** —
  the query's logical target. For v0, the query `find ?e where type = 'Lane'`
  exposes its rows under the collection name `lanes` (the type, lowercased). This
  is the minimal convention; a future `as <name>` clause can rename it.
- Outside a `tml-each`, expressions resolve against the element's own `tml-query`
  result row (single-row case) or the store root.

### 3.2 Expressions

Expressions are **dotted field paths** into the current scope:

```
lane.id
lane.status
lane.opCount
issue.title
```

- No function calls, no operators, no string literals in expressions (except the
  `tml-op` action argument, which may be a bare identifier or `scope.field`).
- `tml-op`'s argument form is `<action>(<arg>)` where `<arg>` is a scoped field
  reference, e.g. `promote(lane.id)`.

### 3.3 Primitives ↔ attributes

| Primitive (§11.1) | TML attribute(s) |
|-------------------|------------------|
| `query` (derive)  | `tml-query` + `tml-each` |
| `live` (subscribe)| `tml-live` |
| `op` (mutate)     | `tml-op` |
| `ref` (bind identity) | `tml-ref` |

---

## 4. Driver interface

```ts
interface ResultRow { [key: string]: unknown }

interface RefHandle {
  id: string
  read(): unknown
  write(value: unknown): void
}

interface TmlDriver {
  /** Run a query against the store; resolves to result rows. */
  query(q: string): Promise<ResultRow[]>
  /** Emit a mutation. action is the op name; args are scoped field values. */
  op(action: string, args: Record<string, unknown>): Promise<void>
  /** Subscribe to store changes for a query; returns an unsubscribe fn. */
  live(q: string, cb: (rows: ResultRow[]) => void): () => void
  /** Bind a named identity scope. */
  ref(id: string): RefHandle
}
```

### 4.1 WebDriver (ships in v0)

- `query` → evaluates against a client-side reactive `Store` seeded from
  `GET /api/lanes`.
- `op` → `POST /api/tml-mutations` with `{ action, args }`; the server calls the
  matching engine method (e.g. `promoteLane`).
- `live` → subscribes to SSE `/api/lanes/stream`; on `snapshot`/`op` events the
  store mutates and subscribers re-render.
- `ref` → a named scope object inside the `Store`.

### 4.2 TauriDriver (future, TRL-9)

- `query` → `window.__TAURI__.invoke('query', { q })`.
- `op` → `window.__TAURI__.invoke('op', { action, args })`.
- `live` → `window.__TAURI__.listen('snapshot', cb)`.
- `ref` → local kernel state handle.

The spec does not hardcode transport. Each adapter implements `TmlDriver`; the
runtime is driver-agnostic.

---

## 5. Data model & render lifecycle

1. **Seed.** Page load → `GET /api/lanes` → snapshot → `Store` is populated.
2. **Query.** `tml-query` is evaluated by a **minimal client-side evaluator**
   (type filter + equality/comparison on snapshot fields). Not a full TQL engine —
   v0 covers the grid's needs only.
3. **Project.** `tml-each` clones the element template once per result row;
   `tml-text` / `tml-attr-*` / `tml-if` resolve against each row.
4. **Live.** `tml-live` registers the subtree with the store. On SSE
   `snapshot`/`op`, the store mutates and the subtree re-projects from the new
   query result.
5. **Mutate.** `tml-op` → `TmlDriver.op` → server engine method → new snapshot on
   the next stream push → `tml-live` reflects the change.

---

## 6. Test bed — sterile route

### 6.1 Route

New route **`/tml-lanes`** in `src/ui/lanes-dashboard.ts`, serving
`src/ui/tml-lanes.html` — a clean page that loads `tml-runtime.ts` as an ES module
(no framework, no build, same shape as `lanes.html`). The existing `/` dashboard
is untouched.

### 6.2 Mutation endpoint

`POST /api/tml-mutations` in `lanes-dashboard.ts`:

```ts
{ "action": "promote", "args": { "id": "lane-abc123" } }
```

→ `engine.promoteLane(id, { dryRun: false })` (extendable for other actions).

### 6.3 Declarative grid (the whole point)

```html
<div id="lanes" class="grid">
  <article class="card"
      tml-query="find ?e where type = 'Lane'"
      tml-each="lane of lanes"
      tml-live
      tml-ref="active-lanes">
    <div class="card-head">
      <div class="lane-id" tml-text="lane.id"></div>
      <span class="badge" tml-text="lane.status" tml-attr-class="lane.status"></span>
    </div>
    <div class="row"><span class="k">Agent</span><span class="v" tml-text="lane.agentId"></span></div>
    <div class="row"><span class="k">Ops / files</span><span class="v" tml-text="lane.opCount + ' / ' + lane.fileCount"></span></div>
    <div class="row"><span class="k">Branch</span><span class="v" tml-text="lane.targetBranch"></span></div>
    <div class="row" tml-if="lane.issueId"><span class="k">Issue</span><span class="v" tml-text="lane.issueId"></span></div>
    <button tml-op="promote(lane.id)">Promote</button>
  </article>
</div>
```

This replaces the hand-written `renderGrid` / `laneCard` / `onOp` for the grid with
pure markup. All four primitives are exercised: `query`, `live`, `op`, `ref`.

---

## 7. Implementation plan

| # | Work | File |
|---|------|------|
| 1 | **Write this spec** | `docs/specs/tml-v0.md` |
| 2 | TML runtime: attribute parser + reactive `Store` + minimal query evaluator + `WebDriver` + render lifecycle | `src/ui/tml-runtime.ts` |
| 3 | Unit tests: parse, evaluate (type/eq/comparison), live subscription, op dispatch | `test/tml-runtime.test.ts` |
| 4 | Add `/tml-lanes` route + `POST /api/tml-mutations` | `src/ui/lanes-dashboard.ts` |
| 5 | Sterile test page with grid in TML | `src/ui/tml-lanes.html` |
| 6 | Update `trellis-ui-dsl.md` §11.1 → `tml-*` vocabulary, two-driver model, resolve open question | `docs/planning/trellis-ui-dsl.md` |

### 7.1 `tml-runtime.ts` shape (sketch)

```ts
export interface TmlDriver { /* §4 */ }

export class Store {
  seed(snapshot: LanesSnapshot): void
  mutate(fn: (s: LanesSnapshot) => void): void
  subscribe(q: string, cb: (rows: ResultRow[]) => void): () => void
}

export function evaluateQuery(q: string, store: Store): ResultRow[]

export function mount(root: HTMLElement, driver: TmlDriver): void
// walks the DOM, collects tml-* attributes, wires live/op, renders each tml-query subtree
```

---

## 8. Out of scope (v0)

- **TauriDriver** — deferred to TRL-9 (desktop shell prototype).
- **Full TQL client engine** — v0 evaluator is minimal (type + eq/comparison).
- **`/api/query` server-side TQL endpoint** — would replace the client evaluator;
  future work once the projection model is proven.
- **Other projections in TML** — kanban, table, stats stay in `lanes.html` for v0.
- **SemType / Block Protocol integration** — separate workstreams.

---

## 9. Verification

1. `trellis lane watch --port 3939`, open `http://localhost:3939/tml-lanes`.
2. Grid renders from the snapshot.
3. Make a lane op in another tab → SSE push → grid re-renders live (`tml-live`).
4. Search/filter still works (client evaluator over the store).
5. Click **Promote** on a lane → `POST /api/tml-mutations` → engine promotes →
   next stream snapshot shows the new status.
6. `bun test test/tml-runtime.test.ts` is green.

---

## 10. Relationship to prior art

- **ADR 0025** — TML is the "companion markup language." This spec names the
  concrete `tml-*` attributes (`tml-query` realized via `tml-query` + `tml-each`).
- **`trellis-ui-dsl.md` §11.1** — takes the four primitives (`query`, `op`,
  `live`, `ref`) and resolves the open question: bind them to **scoped field
  expressions** (typed, tooling-visible) rather than raw TQL strings.
- **§3 Option A / Option C** — explicitly rejected the novel-language and
  string-attribute forms; TML v0 is the attribute DSL with typed bindings, aligned
  with the embedded-DSL recommendation.
