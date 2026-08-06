/**
 * View core types — headless view-mode manager (ADR 0034 / Phase C).
 *
 * Manages view mode (grid / table / kanban / card), column layout,
 * sorting, and vantage. Follows the same HeadlessCore contract as
 * every other headless UI core.
 *
 * @module trellis/view
 */

/** Canonical view modes available in the Trellis projection surface. */
export type ViewMode = 'grid' | 'table' | 'kanban' | 'card';

/**
 * Column descriptor for entity projection.
 * `accessor` is the field key on the entity (defaults to `id`).
 */
export interface ViewColumn<T = unknown> {
  id: string;
  header?: string;
  accessor?: keyof T & string;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
}

/** Sort specification for a single column. */
export interface ViewSortSpec {
  key: string;
  desc: boolean;
}

/** Projected state for render — pure data, framework-free. */
export interface ViewState {
  mode: ViewMode;
  /** Fractal vantage scalar (0–21; detents 2/5/8). Drives shell morphing. */
  vantage: number;
  /** Ordered column ids for table view. */
  columns: string[];
  /** Active sort spec (null = unsorted). */
  sortBy: ViewSortSpec | null;
  /** Global filter text (case-insensitive substring). */
  globalFilter: string;
  /** Always true — the view core supports seamless morphing. */
  canMorph: boolean;
}

/** Actions that mutate view state. */
export interface ViewActions {
  /** Switch view mode (triggers morph). Returns the previous mode. */
  setMode(next: ViewMode): ViewMode | false;
  /** Set fractal vantage — drives per-node shell morphing. */
  setVantage(v: number): void;
  /** Replace the column set. */
  setColumns(cols: string[]): boolean;
  /** Reorder existing columns to a new order. */
  setColumnOrder(cols: string[]): boolean;
  /** Add a column (no-op if already present). */
  addColumn(col: string): boolean;
  /** Remove a column (no-op if not present). */
  removeColumn(col: string): boolean;
  /** Set sort column + direction. Pass null to clear. */
  setSort(spec: ViewSortSpec | null): void;
  /** Clear active sort. */
  clearSort(): void;
  /** Set global filter text. */
  setGlobalFilter(text: string): void;
  /** Clear global filter. */
  clearGlobalFilter(): void;
}

/** Configuration for `createViewCore`. */
export interface ViewConfig<T extends Record<string, unknown> = Record<string, unknown>> {
  /** Entity type this view is scoped to (e.g. 'issue', 'lane'). */
  entityType?: string;
  /** Storage key for persistence (defaults to `trellis-view-<entityType>`). */
  persistKey?: string;
  /** Default view mode when no persisted value exists. */
  defaultMode: ViewMode;
  /** Default columns for table view. */
  defaultColumns: string[];
  /** Initial vantage (defaults to 8 = card). Not persisted — follows global `--ui-vantage`. */
  initialVantage?: number;
}

/** Return type of `createViewCore` — follows the HeadlessCore contract. */
export interface UseViewReturn<T = unknown> {
  readonly state: ViewState;
  readonly actions: ViewActions;
  subscribe(listener: () => void): () => void;
}
