/**
 * Kanban core types — dynamic board projection (ADR 0034 wedge 13).
 *
 * A board is a projection of a row set through one group field. The row
 * model is shared with `table-core` (`@tanstack/table-core` wrapped behind
 * the standard bridge); the group-field universe + card bucketing is the
 * Trellis-specific layer built here.
 *
 *   - rows are entity records with an `id` (same shape table-core consumes);
 *   - columns are the distinct values of the group field over the filtered
 *     row set, plus configured extras (select options, relation targets);
 *   - cards are rows bucketed into columns by their group-field value
 *     (multi_select rows carry several memberships);
 *   - boards are pure JSON `BoardDescriptor` views — many boards over one
 *     dataset, switched from the board toolbar;
 *   - moving a card writes the entity's group field — one EQL-S write when
 *     the app performs it in `onCardMove` (the graph write-surface pattern);
 *     undo stays in the transient layer via `undoHistory` (view-state
 *     column ops are board-descriptor edits, not undo steps).
 *
 * Boundary: schema-derived fields (surface projection) and durable entity
 * writes live in the app layer.
 *
 * @module trellis/kanban
 */

import type {
  SortSpec,
  TableColumn,
  UndoCommandLike,
  UndoLike,
} from '../../table/core/index.js';

/**
 * Grouping affordance of a field — drives the column universe
 * (spec §4.1). `select`/`status` are option-backed: one column per
 * `options[]` entry plus a `none` column.
 */
export type KanbanFieldAffordance =
  | 'select'
  | 'status'
  | 'multi_select'
  | 'boolean'
  | 'date'
  | 'people'
  | 'relation'
  | 'text'
  | 'number';

/**
 * A group value = one column's membership key. Pure data
 * (spec §4, `KanbanGroupValue`).
 */
export type KanbanGroupValue =
  /** select/status option value (also multi_select memberships). */
  | { kind: 'option'; value: string }
  /** checkbox field. */
  | { kind: 'boolean'; value: boolean }
  /** ISO start of the date bucket. */
  | { kind: 'date'; bucket: 'day' | 'week' | 'month'; start: string }
  /** people/relation → one column per target. */
  | { kind: 'relation'; targetId: string }
  /** rows without a value (Notion "No status"). */
  | { kind: 'none'; value: null };

/**
 * One projected column (spec §4). `hidden` columns stay in the projected
 * list with `hidden: true` so the board state is the single source for
 * hide/unhide affordances; renderers omit them.
 */
export interface KanbanColumnView {
  /** Canonical key derived from the group value (URL-safe). */
  id: string;
  /** Human label (option label, "True/False", bucket label, target title, "No <field>"). */
  title: string;
  /** Color token id from the board's columnColors (null = default). */
  color: string | null;
  count: number;
  collapsed: boolean;
  hidden: boolean;
  cards: KanbanCardView[];
}

/** One projected card — a row plus its membership key and optional rank. */
export interface KanbanCardView {
  /** Row id. */
  id: string;
  /** Membership column id. */
  columnId: string;
  /** Card-preview values (post filter). */
  cells: Record<string, unknown>;
  /** Manual order within column when a rank field is configured. */
  rank: number | null;
}

/** Board sort for columns themselves (spec §4). */
export type KanbanColumnSort = 'manual' | 'name' | 'count';

/**
 * The saved view — pure JSON (spec §5.2). The core holds presets in
 * memory; an app persists them (view-state-core territory).
 */
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
  /** Within-column card order (null = rank/data order). */
  cardSort: SortSpec | null;
  /** Date grouping granularity. */
  groupDateBy?: 'day' | 'week' | 'month';
  /** Hide the implicit "no value" column. */
  hideNoValueColumn?: boolean;
}

/**
 * A groupable field the app exposes (schema-derived surface field —
 * the `deriveSurfaceFields` boundary). The picker surfaces these, and
 * the active one drives the column universe.
 */
export interface KanbanGroupField {
  /** Field id — the active board's `groupFieldId` selects one of these. */
  id: string;
  /** Human label ("Status", "Priority", …). */
  label: string;
  affordance: KanbanFieldAffordance;
  /** Read the raw row value (default: `row[fieldId]`). */
  accessorKey?: string;
  accessorFn?: (row: unknown) => unknown;
  /**
   * Inverse of `accessorFn` (or plain writes) — converts a group value
   * to the raw row value a move writes. Needed when the accessor
   * projects a derived key (e.g. several statuses fold into one column:
   * the board must write the graph value, not the column key). Default:
   * the group value's own raw form (`gv.value` etc.). The stored
   * location is `row[accessorKey]` (default `row[fieldId]`).
   */
  writeAccessorFn?: (row: unknown, gv: KanbanGroupValue) => unknown;
  /** Option universe for select/status fields (schema options). */
  options?: { value: string; label?: string }[];
  /** Target universe for people/relation fields (in display order). */
  relationTargets?: { id: string; title?: string }[];
}

/**
 * DnD as core data (spec §7 anatomy): adapters own drag input and write
 * this via `setDragState`; the core never touches the DOM.
 */
export interface KanbanDragState {
  /** The dragged card, once a drag starts. */
  cardId?: string;
  /** The column the card currently belongs to. */
  columnId?: string;
  /** The column the pointer is over (drop-target affordance). */
  overColumnId?: string | null;
  /** The column the drag originated in. */
  sourceColumnId?: string;
}

/**
 * Board state (spec §5.1) plus `dragState` (spec §7). `columns` is the
 * projected board — display order, post column-sort; hidden columns are
 * included with `hidden: true`.
 */
export interface KanbanState {
  /** Active board descriptor (view state — the "saved board"). */
  board: BoardDescriptor;
  /** All board presets in memory, keyed by id ("grouping boards"). */
  boards: Record<string, BoardDescriptor>;
  /** Projected columns, in display order (hidden ones flagged, not dropped). */
  columns: KanbanColumnView[];
  /** Total visible cards across all columns (post row filter). */
  totalCards: number;
  /** Group field option universe (derived) — for "add column" pickers. */
  groupFieldOptions: { value: string; label: string }[];
  /** Row-level global filter (delegates to the wrapped row engine). */
  globalFilter: string;
  /** Which surface fields are groupable (the group-field picker). */
  groupableFields: { id: string; label: string; affordance: string }[];
  /** Drag state (core data for drop-target affordances). */
  dragState: KanbanDragState | null;
  /** Undo availability — projected from the composed undo core. */
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * Write hooks — the app layer owns durable writes; the core is the
 * optimistic mirror (spec §6.1). Mirrors table-core's `onCellEdit`.
 */
export interface KanbanWriteHooks<T> {
  /** One EQL-S entity write — `false` rejects the local move. */
  onCardMove?(rowId: string, fieldId: string, value: KanbanGroupValue): void | boolean;
  /** Create the entity with the column's group value; `false` rejects. */
  onCardAdd?(draft: Partial<T>, columnValue: KanbanGroupValue): void | boolean;
  /** Delete the entity; `false` rejects the removal. */
  onCardDelete?(rowId: string): void | boolean;
  /** Option-backed fields (select/status): persist a new value. */
  onCreateOption?(fieldId: string, value: string, color?: string): void;
  /** Option-backed fields: persist a value rename. */
  onRenameOption?(fieldId: string, from: string, to: string): void;
}

export interface KanbanConfig<T> {
  /** Seed rows — the core owns its own copy. */
  data: T[];
  /** Card-preview fields (schema-derived via the app; same shape as table). */
  columns: TableColumn<T>[];
  /** Groupable surface fields (the group-field picker + universe definitions). */
  groupFields: KanbanGroupField[];
  /** Active board's group field (default: `board.groupFieldId`). */
  groupFieldId?: string;
  /** Initial active board descriptor. */
  board?: Partial<BoardDescriptor> & { id: string; name: string };
  /** Board presets (the "grouping boards" feature). */
  boards?: BoardDescriptor[];
  /** Row identity (default: `row.id ?? index`). */
  getRowId?: (row: T, index: number) => string;
  /** Compose the undo-history service core (card ops = one step each). */
  undoHistory?: UndoLike;
  /** Manual within-column order field (reorderCard requires this). */
  rankField?: string;
  /** A group field with more distinct values than this refuses `setGroupField`. */
  maxColumns?: number;
  /** External write hooks (spec §6.1) — flat, like table's `onCellEdit`. */
  onCardMove?: KanbanWriteHooks<T>['onCardMove'];
  onCardAdd?: KanbanWriteHooks<T>['onCardAdd'];
  onCardDelete?: KanbanWriteHooks<T>['onCardDelete'];
  onCreateOption?: KanbanWriteHooks<T>['onCreateOption'];
  onRenameOption?: KanbanWriteHooks<T>['onRenameOption'];
}

export interface KanbanActions<T> {
  /** Remap the whole board to another group field; false when refused (§5.4). */
  setGroupField(fieldId: string): boolean;
  /** Register a preset; false when the id is taken. */
  createBoard(descriptor: BoardDescriptor): boolean;
  /** Copy a preset under a new id; returns the new id or false. */
  duplicateBoard(id: string): string | false;
  /** Switch the active board to a preset; false for unknown ids. */
  activateBoard(id: string): boolean;
  /** Rename a preset (also the active board when targeted). */
  renameBoard(id: string, name: string): boolean;
  /** Delete a preset; false when it is the active board. */
  deleteBoard(id: string): boolean;
  /** Commit the current view state into the active descriptor. */
  saveBoard(): boolean;

  /** Add a column from an option not present in data; returns its id. */
  createColumn(opts: { label: string; color?: string; value?: string }): string | false;
  /** Rename an option-backed column (renames the value; rows re-bucket). */
  renameColumn(columnId: string, label: string): boolean;
  /** Remove a column; `moveCardsTo` relocates surviving cards (default: none). */
  deleteColumn(columnId: string, opts?: { moveCardsTo?: string }): boolean;
  /** Reorder a column (flips `sortColumnsBy` to 'manual'). */
  moveColumn(columnId: string, index: number): boolean;
  /** Order columns by name / count (desc) / explicit columnOrder. */
  sortColumns(mode: KanbanColumnSort): void;
  /** Color-code a column (color token id; null clears). */
  setColumnColor(columnId: string, color: string | null): boolean;
  setColumnCollapsed(columnId: string, collapsed: boolean): boolean;
  setColumnHidden(columnId: string, hidden: boolean): boolean;

  /** Create a row with the group field set to the column's value. */
  addCard(columnId: string, draft: Partial<T>): string | false;
  /**
   * Set the row's group-field value to the destination column's value;
   * `opts.index` writes the rank when a rank field is configured. One
   * undo step. `onCardMove` → one EQL-S entity write.
   */
  moveCard(cardId: string, fromColumnId: string, toColumnId: string, opts?: { index?: number }): boolean;
  /** Manual order within a column; false without a configured rankField. */
  reorderCard(cardId: string, columnId: string, index: number): boolean;
  /** Delete the row; `onCardDelete` → one op. */
  removeCard(cardId: string): boolean;

  /**
   * Append a raw row (snapshot sync / import surface). No undo step and
   * no write hook: the row set is snapshot-owned, not user-edited. The
   * user-edit path is `addCard`.
   */
  addRow(row: T): string;
  /**
   * Remove a raw row (snapshot sync). No undo step and no write hook;
   * the user-edit path is `removeCard`.
   */
  removeRow(rowId: string): boolean;
  /**
   * Mutate one row (entity mirror — live snapshot sync). Returns false
   * for unknown ids. Not an undo step; no write hook fires (snapshot
   * sync is not an edit).
   */
  updateRow(rowId: string, patch: Partial<T>): boolean;

  /** Substring filter across card preview fields (row engine). */
  setGlobalFilter(text: string): void;
  clearGlobalFilter(): void;
  /** Within-column sort (null = rank/data order). */
  setCardSort(spec: SortSpec | null): void;

  /** Adapter glue: ride drag state on the core (never an undo step). */
  setDragState(drag: KanbanDragState | null): void;

  /** Delegate to the composed undo core; false when none is composed. */
  undo(): boolean;
  /** Delegate to the composed undo core; false when none is composed. */
  redo(): boolean;
}

export interface UseKanbanReturn<T> {
  readonly state: KanbanState;
  readonly actions: KanbanActions<T>;
  subscribe(listener: () => void): () => void;
}

export type {
  SortSpec,
  TableColumn,
  UndoCommandLike,
  UndoLike,
};
