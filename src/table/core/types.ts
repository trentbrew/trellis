/**
 * Table core types — the headless datatable contract
 * (ADR 0034 §6, wedge 6).
 *
 * A registry type core for the composer: `@tanstack/table-core` is adopted
 * as the grid engine (framework-free, DOM-free, Node-testable — Tier 2,
 * per ADR 0034 §4.2), wrapped behind the standard bridge. The
 * Trellis-specific layer is built, not adopted:
 *
 *   - rows are bound to entities (any record with an id), so a cell edit
 *     is one row mutation — in an app, `onCellEdit` performs the EQL-S
 *     entity write (one op); the local update is the optimistic mirror;
 *   - `undoHistory` composes the undo-history service core, so
 *     edit/add/remove are one undo step each (transient layer; durable
 *     reversal stays in the op-log + semantic diff machinery);
 *   - cell value types (`text`/`number`/`boolean`/`date`) drive commit
 *     coercion and the future editor cores (forms, combobox, editor).
 *
 * Boundary: schema-derived columns (entity-type attributes, same generator
 * as forms descriptors) and durable writes live in the app layer.
 *
 * @module trellis/table
 */

/** Value semantics of a column — drives commit coercion and editors. */
export type CellValueType = 'text' | 'number' | 'boolean' | 'date';

export interface TableColumn<T> {
  /** Stable id (key into `cells` of the row view). */
  id: string;
  /** Header label (defaults to `id`). */
  header?: string;
  /** Read the value from this row key (editable by default). */
  accessorKey?: string;
  /** Compute the value from the row (read-only by default). */
  accessorFn?: (row: T) => unknown;
  /** Editable cells only (default: `true` for `accessorKey`, `false` for `accessorFn`). */
  editable?: boolean;
  /** Value semantics (default `'text'`). */
  type?: CellValueType;
  /** Preferred column width (unitless number or CSS length). */
  width?: number | string;
  /** Cell content alignment. */
  align?: 'left' | 'center' | 'right';
}

export interface SortSpec {
  id: string;
  desc: boolean;
}

/** The cell being edited (draft lives in `TableState.editDraft`). */
export interface EditingCell {
  rowId: string;
  columnId: string;
}

/** One visible row projected for render — pure data. */
export interface TableRowView {
  id: string;
  /** columnId → cell value (post sort/filter/page). */
  cells: Record<string, unknown>;
  /** Selected on the current page scope. */
  selected: boolean;
}

/** Projected column model for render. */
export interface TableColumnView {
  id: string;
  header: string;
  editable: boolean;
  type: CellValueType;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
}

export interface TableState {
  columns: TableColumnView[];
  /** Rows on the current page, after sort + filter. */
  rows: TableRowView[];
  /** Filtered row count across all pages. */
  totalRows: number;
  pageCount: number;
  pageIndex: number;
  pageSize: number;
  /** `enablePagination: false` collapses the pager (pageCount 1, all rows). */
  paginated: boolean;
  sorting: SortSpec[];
  globalFilter: string;
  /** Selected row ids (across pages — selection survives filtering). */
  selectedRows: string[];
  /** All rows on the current page selected (false on empty pages). */
  allSelected: boolean;
  /** At least one row on the current page selected. */
  someSelected: boolean;
  editing: EditingCell | null;
  editDraft: string | null;
  /** Undo availability — projected from the composed undo core. */
  canUndo: boolean;
  canRedo: boolean;
}

export type SortDirection = 'asc' | 'desc' | 'none';

export interface TableActions<T> {
  /**
   * Sort by a column. Without `dir`, cycles none → asc → desc → none.
   * Single-column sort (TanStack multi-sort stays available via the
   * wrapped engine for advanced use).
   */
  sort(columnId: string, dir?: SortDirection): void;
  clearSorting(): void;
  /** Filter rows by substring (case-insensitive); empty string clears. */
  setGlobalFilter(text: string): void;
  setPageSize(size: number): void;
  nextPage(): void;
  previousPage(): void;
  /** Clamped to `[0, pageCount - 1]`. */
  setPageIndex(index: number): void;
  toggleRowSelected(rowId: string, force?: boolean): void;
  /** Toggle every row on the current page (force overrides). */
  toggleAllSelected(force?: boolean): void;
  /** Begin inline editing; no-op for read-only columns or missing rows. */
  startEdit(rowId: string, columnId: string): void;
  /** Update the edit draft (string form of the future value). */
  setEditDraft(value: string): void;
  /**
   * Commit the draft: coerce per column type, apply locally, run
   * `onCellEdit` (external write; `false` rejects), push one undo step.
   * Returns false when nothing is editing, the value is rejected by
   * `onCellEdit`, or coercion fails (number columns).
   */
  commitEdit(): boolean;
  cancelEdit(): void;
  /** Mutate one row (entity mirror); returns false for unknown ids. */
  updateRow(rowId: string, patch: Partial<T>): boolean;
  /** Append a row; returns its id. */
  addRow(row: T): string;
  /** Remove a row; returns false for unknown ids. */
  removeRow(rowId: string): boolean;
  /** Delegate to the composed undo core; false when none is composed. */
  undo(): boolean;
  /** Delegate to the composed undo core; false when none is composed. */
  redo(): boolean;
}

/** Structural slice of the undo-history service core (decoupled). */
export interface UndoCommandLike {
  label?: string;
  execute(): void;
  invert(): UndoCommandLike;
}

export interface UndoLike {
  readonly state: { canUndo: boolean; canRedo: boolean };
  readonly actions: {
    push(command: UndoCommandLike, opts?: { coalesce?: boolean }): void;
    undo(): boolean;
    redo(): boolean;
  };
  subscribe(listener: () => void): () => void;
}

export interface TableConfig<T> {
  /** Seed rows — the core owns its own copy. */
  data: T[];
  columns: TableColumn<T>[];
  /** Row identity (default: `row.id ?? index`). */
  getRowId?: (row: T, index: number) => string;
  initialState?: {
    sorting?: SortSpec[];
    globalFilter?: string;
    pageSize?: number;
    pageIndex?: number;
  };
  /**
   * External write hook — an app performs the EQL-S entity write here
   * (one op per cell edit). Returning `false` rejects the commit (data
   * unchanged, editor stays open). Default: local-only edit.
   */
  onCellEdit?: (rowId: string, columnId: string, value: unknown, row: T) => boolean | void;
  /** Compose the undo-history service core (edit/add/remove = one step). */
  undoHistory?: UndoLike;
  /** Grid pagination (default `true`). */
  enablePagination?: boolean;
}

export interface UseTableReturn<T> {
  readonly state: TableState;
  readonly actions: TableActions<T>;
  subscribe(listener: () => void): () => void;
}
