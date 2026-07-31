/**
 * Palette core types — the command-palette contract (ADR 0034 §6, wedge 1).
 *
 * @module trellis/palette
 */

export interface PaletteItem {
  /** Stable id; also the key for selection and grouping. */
  id: string;
  label: string;
  /** Optional section header (e.g. "Graph", "Navigation"). */
  group?: string;
  /** Extra searchable terms beyond the label. */
  keywords?: string[];
  description?: string;
  icon?: string;
  disabled?: boolean;
}

export interface PaletteGroup {
  id: string;
  title: string;
  items: PaletteItem[];
}

export interface PaletteState {
  open: boolean;
  query: string;
  /** Full item list (what was set, order preserved). */
  items: PaletteItem[];
  /** Query-filtered items, best fuzzy match first (stable for ties). */
  results: PaletteItem[];
  /** Index into `results`; always in range when results is non-empty. */
  selectedIndex: number;
  loading: boolean;
  /** Derived: open, not loading, and no results. */
  empty: boolean;
  /** Derived: items grouped by `group`, group order = first-appearance. */
  groups: PaletteGroup[];
}

export interface PaletteActions {
  open(): void;
  close(): void;
  toggle(): void;
  setQuery(query: string): void;
  moveSelection(delta: number): void;
  setSelectedIndex(index: number): void;
  /** Invoke the handler for the selected item; returns it (or null). */
  select(): PaletteItem | null;
  setLoading(loading: boolean): void;
  /** Apply an (async) result set — clears query selection state safely. */
  setItems(items: PaletteItem[]): void;
}

export type PaletteFilter = (
  query: string,
  items: PaletteItem[],
) => PaletteItem[];

export interface PaletteConfig {
  items: PaletteItem[];
  /** Invoked by `select()` for the chosen item (unless disabled). */
  onSelect?: (item: PaletteItem) => void;
  /** Close the palette after a successful select (default: true). */
  closeOnSelect?: boolean;
  /** Selection wraps around the result list (default: true). */
  wrap?: boolean;
  /** Custom filter; defaults to fuzzy matching over label + keywords. */
  filter?: PaletteFilter;
}

export interface UsePaletteReturn {
  readonly state: PaletteState;
  readonly actions: PaletteActions;
  subscribe(listener: () => void): () => void;
}
