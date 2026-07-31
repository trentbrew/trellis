/**
 * Combobox core types — the autocomplete/selection contract (ADR 0034 §6, wedge 2).
 *
 * @module trellis/combobox
 */

export interface ComboboxItem {
  /** Stable id; also the key for selection and grouping. */
  id: string;
  label: string;
  /** Extra searchable terms beyond the label. */
  keywords?: string[];
  description?: string;
  icon?: string;
  disabled?: boolean;
}

export interface ComboboxState {
  open: boolean;
  query: string;
  /** Full item list (what was set, order preserved). */
  items: ComboboxItem[];
  /** Query-filtered items, best fuzzy match first (stable for ties). */
  results: ComboboxItem[];
  /** Index into `results`; -1 when results is empty. */
  activeIndex: number;
  /** The committed selection id (null = nothing selected). */
  selectedId: string | null;
  /** Derived: the selected item, or null. */
  selectedItem: ComboboxItem | null;
  loading: boolean;
  /** Derived: open, not loading, and no results. */
  empty: boolean;
  /** Per-result matched-char ranges (from fuzzy highlight); one entry per result, empty when no match. */
  highlight: Array<Array<[number, number]>>;
}

export interface ComboboxActions {
  open(): void;
  close(): void;
  toggle(): void;
  setQuery(query: string): void;
  move(delta: number): void;
  setActiveIndex(index: number): void;
  /** Invoke the handler for the selected item; returns it (or null). */
  select(id?: string): ComboboxItem | null;
  clear(): void;
  setLoading(loading: boolean): void;
  /** Apply an (async) result set — clears query selection state safely. */
  setItems(items: ComboboxItem[]): void;
  /** Programmatic selection without opening or firing onSelect. */
  setValue(id: string | null): void;
}

export type ComboboxFilter = (
  query: string,
  items: ComboboxItem[],
) => ComboboxItem[];

export interface ComboboxConfig {
  items: ComboboxItem[];
  /** Invoked by `select()` for the chosen item (unless disabled). */
  onSelect?: (item: ComboboxItem) => void;
  /** Close the combobox after a successful select (default: true). */
  closeOnSelect?: boolean;
  /** Selection wraps around the result list (default: true). */
  wrap?: boolean;
  /** Custom filter; defaults to fuzzy matching over label + keywords. */
  filter?: ComboboxFilter;
  /** Initial selected id (controlled value). */
  value?: string | null;
  /** Reset query to empty on close (default: true). */
  resetQueryOnClose?: boolean;
}

export interface UseComboboxReturn {
  readonly state: ComboboxState;
  readonly actions: ComboboxActions;
  subscribe(listener: () => void): () => void;
}