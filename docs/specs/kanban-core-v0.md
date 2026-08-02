# Spec: kanban-core — dynamic board projection (ADR 0034 wedge 13)

**Status:** Draft\
**Date:** 2026-08-02\
**Builds on:** ADR 0034 (headless UI convention), ADR 0033 (`trellis/forms`), `trellis/table` (row/entity model), `trellis/undo-history` (service core), `src/surface/` (schema → field projection, `headless-schema-to-surface.md`)\
**Replaces:** the static 3-column kanban embedded in `src/ui/admin.html` (Backlog / In Progress / Done hard-wired to `ISSUE_COLUMNS`)\
**Test bed:** `demo/wedge-smoke/components/kanban.ts` (gallery entry), `test/core/kanban.test.ts`

---

## 1. Intent

Build the **dynamic board projection** the admin UI's kanban view should have always been, as a proper headless core. The admin kanban is static today: three hard-coded columns mapping issue `status` values, rendered by a TML query. Notion-style boards generalize that:

- **any property can drive the columns** — group rows by `status`, `priority`, `owner`, a `select`, a `date` granularity, or a boolean — and you can switch the grouping field live;
- **columns are not fixed** — create, rename, reorder, sort, hide, collapse, and color-code them;
- **cards are entity rows** — moving a card across columns updates that entity's group property, which is **one EQL-S write = one op** (the graph write-surface pattern already proven by `table-core`);
- **boards are saved views** — many boards over one dataset, each a pure JSON descriptor.

The core is framework-free and DOM-free (ADR 0034 §4.2 Tier 2): the row model adopts `@tanstack/table-core` (filter/sort/group), the same engine `table-core` wraps, and `undo-history-core` composes the transient edit layer. Visual rendering — drag-and-drop, column chrome, card layout — is adapter-tier DOM glue over core state.

## 2. Non-goals (v0)

- Drag-and-drop **input** handling (HTML5 DnD / pointer) — adapters own it; the core exposes `moveCard`/`reorderCard`/`moveColumn` as pure actions and `dragState` as core data for drop-target affordances.
- Card content editing beyond a draggable preview (delegated to `table-core`/`editor-core`/`forms-core` — the board composes them at the renderer).
- Nested multi-level grouping (group by two fields). The board has exactly one group field; multi-board presets cover the "several ways to slice this dataset" use case.
- Durable persistence of board descriptors (they are app-layer entities — `view-state-core` territory, per ADR 0034 wedge 11). The core holds presets in memory; an app persists them.
- Formula/rollup columns in the group field (surface fields with `affordance: 'code'`/`readonly` are not groupable in v0).

## 3. Module layout

```
src/kanban/
  core/
    index.ts           # createKanbanCore(config)
    types.ts           # KanbanConfig, KanbanState, KanbanActions, BoardDescriptor,
                       #   KanbanColumnView, KanbanCardView, KanbanGroupValue, KanbanColumnSort
  react/  vue/  svelte/  vanilla/   # mechanical adapters (bridge contract, ADR 0033 pattern)
  index.ts             # re-export core + adapter types
test/core/kanban.test.ts            # pure Node behavior suite (vitest/bun, zero DOM)
```

**Package exports:**

```json
"trellis/kanban":            "./dist/kanban/index.js",
"trellis/kanban/core":       "./dist/kanban/core/index.js",
"trellis/kanban/react":      "./dist/kanban/react/index.js",
"trellis/kanban/vue":        "./dist/kanban/vue/index.js",
"trellis/kanban/svelte":     "./dist/kanban/svelte/index.js",
"trellis/kanban/vanilla":    "./dist/kanban/vanilla/index.js"
```

Framework-importing adapters never enter the `trellis/browser` bundle; the core always does. Browser-safe by construction (no Node-only imports).

## 4. The board model

A board is a **projection of a row set through one group field**. The row model is shared with `table-core`:

- **rows** are entity records with an `id` (same shape `table-core` consumes);
- **columns** (`TableColumn`) describe how card previews and the card list read values — schema-derived via `src/surface` `deriveSurfaceFields`, same generator as table/form projections;
- **the group field** (`groupFieldId`) selects which surface field produces the column universe;
- **columns** are the distinct values of the group field over the (filtered) row set, plus configured extras;
- **cards** are rows bucketed into columns by their group-field value.

```ts
/** A group value = one column's membership key. Pure data. */
export type KanbanGroupValue =
  | { kind: 'option'; value: string }        // select/status option value
  | { kind: 'boolean'; value: boolean }      // checkbox field
  | { kind: 'date'; bucket: 'day' | 'week' | 'month'; start: string } // ISO start
  | { kind: 'relation'; targetId: string }   // people/relation → one column per target
  | { kind: 'none'; value: null };           // rows without a value (Notion "No status")

/** One projected column. */
export interface KanbanColumnView {
  id: string;               // canonical key derived from the group value (URL-safe)
  title: string;            // human label (option label, "True/False", bucket label, target title, "No <field>")
  color: string | null;     // color token id from the board's columnColors (null = default)
  count: number;
  collapsed: boolean;
  hidden: boolean;
  cards: KanbanCardView[];
}

/** One projected card — a row plus its membership key and optional rank. */
export interface KanbanCardView {
  id: string;               // row id
  columnId: string;         // membership
  cells: Record<string, unknown>;   // card-preview values, post-filter
  rank: number | null;      // manual order within column when a rank field is configured
}

/** Board sort for columns themselves. */
export type KanbanColumnSort = 'manual' | 'name' | 'count';
```

### 4.1 Group field → column universe

| Surface field affordance | Universe | v0 |
| ------------------------ | -------- | -- |
| `select`, `status`       | one column per `options[]` entry, plus a `none` column for rows with no value | ✅ |
| `multi_select`           | one column per distinct option a row has (rows can appear in several columns — a card's membership is multi-valued) | ✅ |
| `boolean`                | `true` / `false` columns + `none` | ✅ |
| `date`                   | buckets by `day`/`week`/`month` (config `groupDateBy`) over the row set's date range | ✅ |
| `people`, `relation`     | one column per distinct target id (`relation.targetSchema`) | ✅ |
| `text`, `number`         | distinct values (capped by `maxColumns`, see §5.4) | stretch |

Unknown/absent group values fold into a `none` column titled `No <field label>` (Notion's "No status"). The `none` column can be hidden via `hideNoValueColumn`.

## 5. State and actions

### 5.1 State

```ts
export interface KanbanState {
  /** Active board descriptor (view state — the "saved board"). */
  board: BoardDescriptor;
  /** All board presets in memory, keyed by id (the "grouping boards" feature). */
  boards: Record<string, BoardDescriptor>;
  /** Projected columns, in display order, post column-sort + hide. */
  columns: KanbanColumnView[];
  /** Total visible cards across all columns (post row filter). */
  totalCards: number;
  /** Group field option universe (derived) — for "add column" pickers. */
  groupFieldOptions: { value: string; label: string }[];
  /** Row-level global filter (delegates to the wrapped row engine). */
  globalFilter: string;
  /** Group field switching — which surface fields are groupable. */
  groupableFields: { id: string; label: string; affordance: string }[];
  /** Undo availability — projected from the composed undo core. */
  canUndo: boolean;
  canRedo: boolean;
}
```

### 5.2 BoardDescriptor (pure JSON — the saved view)

```ts
export interface BoardDescriptor {
  id: string;
  name: string;
  /** The surface field that drives the columns. */
  groupFieldId: string;
  /** Explicit column order (KanbanColumnSort='manual'). Empty = derived order. */
  columnOrder: string[];
  /** columnId → color token id. */
  columnColors: Record<string, string>;
  /** Hidden column ids. */
  hiddenColumns: string[];
  /** Collapsed column ids. */
  collapsedColumns: string[];
  /** How columns are ordered when not 'manual'. */
  sortColumnsBy: KanbanColumnSort;
  /** Within-column card order. */
  cardSort: SortSpec | null;              // reuse table SortSpec
  /** Date grouping granularity. */
  groupDateBy?: 'day' | 'week' | 'month';
  /** Hide the implicit "no value" column. */
  hideNoValueColumn?: boolean;
}
```

### 5.3 Actions

**Board level**

- `setGroupField(fieldId)` — **remap the whole board to another property**. Recomputes the column universe from the new field; preserves `columnColors` for values that exist in both universes; resets stale manual `columnOrder` entries; cards re-bucket. This is the "mapping columns to other properties" affordance.
- `createBoard(descriptor)` / `duplicateBoard(id)` / `activateBoard(id)` / `renameBoard(id, name)` / `deleteBoard(id)` — the "grouping boards" feature: many saved slices over one dataset, switched from the board toolbar.
- `saveBoard()` — commit the current view state into the active descriptor (view-state edits are applied live; `saveBoard` marks them saved).

**Column level** (view state — not undo steps)

- `createColumn(opts)` — add a column from an option not present in data (Notion "add value"). Options: `{ label, color? }`. When the group field is `select`/`status`, this also appends to `groupFieldOptions` and calls the `onCreateOption` write hook (§6.1).
- `renameColumn(columnId, label)` — rename the column; calls `onRenameOption` for option-backed fields.
- `deleteColumn(columnId, opts?)` — remove a column. `opts.moveCardsTo?: columnId` moves surviving cards there (default: to the `none` column). Cards without a valid destination are removed with the column (guarded by `onCardDelete`).
- `moveColumn(columnId, index)` — reorder a column (sets `sortColumnsBy='manual'`).
- `sortColumns(mode: KanbanColumnSort)` — `name` (by title) / `count` (by card count, desc) / `manual` (explicit `columnOrder`).
- `setColumnColor(columnId, color: string | null)` — color-code a column.
- `setColumnCollapsed(columnId, collapsed)` / `setColumnHidden(columnId, hidden)` — collapse / hide.

**Card level** (data mutations — each is one undo step)

- `addCard(columnId, draft)` — create a row with the group field set to the column's value; `onCardAdd` write hook → one op.
- `moveCard(cardId, fromColumnId, toColumnId, opts?)` — **set the row's group-field value to the destination column's value**; `onCardMove(rowId, fieldId, value)` → one EQL-S entity write. If a rank field is configured, `opts.index` writes the rank (combined into the same step when the write hook reports an entity write).
- `reorderCard(cardId, columnId, index)` — manual order within a column; requires a configured `rankField`, else returns `false`.
- `removeCard(cardId)` — delete the row; `onCardDelete` → one op.

**Row level** (delegated to the wrapped engine)

- `setGlobalFilter(text)` / `clearGlobalFilter()` — substring filter across card preview fields.
- `setCardSort(spec)` — within-column sort (falls back to data order when null).

### 5.4 Guardrails

- `maxColumns` (default 50) — a group field with more distinct values than this refuses `setGroupField` (returns `false`), forcing the picker to surface "too many values, choose a different field".
- `setGroupField` to a `text`/`number` affordance is allowed only when distinct values ≤ `maxColumns` (stretch grouping).
- `moveCard` to the `none` column clears the group field (sets `null`).
- `deleteColumn` with `moveCardsTo` a hidden column still succeeds (hidden ≠ absent).

## 6. Composition and write hooks

### 6.1 Write hooks (app layer — the graph surface)

The core is optimistic; the app owns durable writes. Hooks mirror `table-core`'s `onCellEdit`:

```ts
export interface KanbanWriteHooks<T> {
  onCardMove?(rowId: string, fieldId: string, value: KanbanGroupValue): void;  // one EQL-S entity write
  onCardAdd?(draft: Partial<T>, columnValue: KanbanGroupValue): void;
  onCardDelete?(rowId: string): void;
  /** Option-backed fields (select/status): persist a new/renamed value. */
  onCreateOption?(fieldId: string, value: string, color?: string): void;
  onRenameOption?(fieldId: string, from: string, to: string): void;
}
```

The board is the graph write-surface pattern applied to grouping: **drag a card → entity op**. Undo stays in the transient layer (`undo-history-core`); durable reversal stays in the op-log + semantic diff machinery (ADR 0034 wedge 8 boundary).

### 6.2 Undo boundary

Data-affecting actions (`addCard`, `moveCard`, `reorderCard`, `removeCard`) push undo steps. **View-state actions are not undo steps** — column reorder/color/collapse/hide, sort mode, group-field switch are board-descriptor edits committed by `saveBoard` (matching Notion: reordering columns isn't an undo action; moving a task is). The undo core is composed via the standard `UndoLike` contract (`table-core` precedent):

```ts
const undo = createUndoHistoryCore();
const board = createKanbanCore({
  data, columns,
  groupFieldId: 'status',
  undoHistory: undo,
  rankField: 'boardRank',
  onCardMove: (rowId, fieldId, value) => kernel.writeRow(rowId, { [fieldId]: value.value }),
});
board.actions.moveCard('t1', 'todo', 'done');
board.actions.undo();   // local row reverts; op-log reverses durably
```

### 6.3 The row engine

`createKanbanCore` adopts `@tanstack/table-core` internally (same engine as `table-core`, per ADR 0034 §4.2): `getCoreRowModel` + `getFilteredRowModel` + `getSortedRowModel` (no pagination — a board shows all rows, column-virtualized at the renderer). Grouping is our layer on top: `@tanstack` grouping is row-level and hides rows; a board needs multi-valued membership and visible per-column buckets, so the group field universe + card bucketing is built (the "Trellis-specific layer is built, not adopted" rule).

## 7. Anatomy (ADR 0034 §4.1)

The visual contract a vanilla/React/Vue/Svelte renderer must expose:

```
board
├── board-toolbar                    # groupFieldPicker · sort · filter · addColumn · saveBoard · boardSwitcher
│   ├── group-field-picker          #   → setGroupField(fieldId); enabled per §5.4
│   ├── column-sort                  #   → sortColumns('name'|'count'|'manual')
│   ├── board-switcher              #   → createBoard/activateBoard/duplicateBoard/deleteBoard
│   └── add-column                   #   → createColumn({ label })
├── board-scroll
│   └── column*                      # one per KanbanColumnView (hidden ones omitted)
│       ├── column-header            # title · count · color chip · overflow menu
│       │   └── column-menu          #   rename · sort · color* · collapse · hide · delete
│       ├── column-body              # drop target (dragState.overColumnId drives affordance)
│       │   └── card*                # one per KanbanCardView
│       │       └── card-preview     # title field + cells; composition point for editor/forms
│       └── column-footer            # add-card → addCard(columnId, draft)
└── board-status                     # totalCards · active board name · undo/redo hints
```

- **`as`/`as-child` polymorphism** on every part (Primitive convention): a `column-header` title can render as a button when click-to-rename; a `card` can render as a link or a checkbox row; `column-menu` is a `menu-core` instance when that wedge lands.
- **State-variant styling only**: `collapsed`, `hidden`, `color`, `drag-over`, `drag-source`, `can-drop` are core state attributes → styling, never behavior.
- **DnD as core data**: `dragState: { cardId?, columnId?, overColumnId?, sourceColumnId? } | null` rides state so adapters render drop affordances and keyboard reorder without duplicating membership math.

### a11y notes (per-part)

- `board-scroll` → `role="list"`; each `column` → `role="listitem"` with `aria-label="<title>, <count> items"`; `aria-setsize`/`aria-posinset` on columns when `sortColumnsBy='manual'`.
- `column-body` cards → `role="list"`/`listitem`; card title is focusable (`tabindex="0"`), Arrow keys navigate, Space/Ctrl+Arrow reorders (keyboard DnD fallback is adapter DOM glue reading `dragState`).
- **Color is never sole meaning**: `column-color` chips carry `aria-label="<color>"` and the title text is always present (WCAG 1.4.1).
- `board-status` is `aria-live="polite"` for count changes; drag announcements (`aria-live` on moveCard success) are adapter glue.
- `column-menu` must be keyboard-openable (Enter/Space), Escape closes, focus returns to the header trigger.

## 8. Tests (acceptance sketch)

`test/core/kanban.test.ts` — pure Node, zero DOM (the forms/table precedent):

- [ ] Grouping: select/status field → one column per option + `none`; boolean → true/false/none; date → day/week/month buckets; multi_select → multi-membership; relation → per-target columns.
- [ ] `setGroupField` remaps the board: universe recomputes, colors preserved for shared values, stale manual order cleared, cards re-bucket.
- [ ] `moveCard` updates the row's group field, writes via `onCardMove`, and is one undo step; `moveCard` to `none` clears the value.
- [ ] `createColumn` adds an option column + calls `onCreateOption`; `renameColumn`/`deleteColumn` (with and without `moveCardsTo`) behave per §5.3.
- [ ] Column ops are view-state: not undo steps; `saveBoard` persists the active descriptor; `createBoard`/`duplicateBoard`/`activateBoard`/`deleteBoard` manage presets.
- [ ] `sortColumns('name'|'count'|'manual')` orders columns correctly; `moveColumn` flips to manual.
- [ ] `reorderCard` writes ranks only when `rankField` is configured (else returns `false`).
- [ ] Guardrails: `setGroupField` to >`maxColumns` returns `false`; `globalFilter`/`cardSort` delegate to the wrapped row model.
- [ ] Dual-adapter test: two adapters mounted on one core observe identical state (ADR 0034 anti-pattern §5).
- [ ] `pnpm check` passes for `src/kanban/*`, `src/headless/*`.

## 9. Registry entry

`demo/wedge-smoke/components/kanban.ts` registers `{ type: 'kanban', name: 'Kanban', … }` with the gallery's `TASKS` dataset, actions for `setGroupField`, `createColumn`, `sortColumns`, `moveColumn`, `setColumnColor`, and a vanilla renderer. The admin UI's static `ISSUE_COLUMNS` kanban becomes a consumer: `createKanbanCore({ data: issues, columns, groupFieldId: 'status', board: { …Backlog/In Progress/Done mapping… } })` — same visible three columns, now dynamic.

## 10. Open questions

- **Option persistence**: should `onCreateOption` write to the schema's `PropertyValueSpecification.options` (a schema mutation) or to an entity-backed select (status values as entities)? Lean: schema options for v0 (matches `deriveSurfaceFields` reading `options`), entity-backed select deferred to the relation/ontology work.
- **Column color tokens**: color ids (`'blue' | 'red' | …`) from the theme contract (ADR unified-theme), not hex, so the renderer maps tokens → palettes. Confirm the token set at impl time.
- **Empty board UX**: when `setGroupField` yields zero columns (all rows filtered out), the board renders a `board-empty` state with a "create column" prompt — confirm copy in the vanilla adapter.
- **Virtualization**: `columns` project all cards; a large dataset needs per-column virtualization at the renderer. Does the core expose `visibleCardIds` (windowed) like `message-stream-core`'s split visibility subscription, or is virtualization pure DOM glue for v0? Lean: pure DOM glue in v0; windowed ids only if the desk hits real scale.
- **Cross-board card moves**: dragging a card to a *different board* (same dataset, different group field) is a Notion edge. v0 keeps it out of scope (reorder across boards = set the source board's field, then the target board shows it under its own field — the natural consequence of shared rows).
