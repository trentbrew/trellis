/**
 * Combobox core — headless autocomplete state machine (ADR 0034 wedge 2).
 *
 * Framework-free and DOM-free: fuzzy filtering, keyboard navigation,
 * selection state, highlight ranges, loading/empty states — all live
 * here and are verified in Node. Adapters (`trellis/combobox/react|vue|svelte|vanilla`)
 * bind it per framework.
 *
 * @module trellis/combobox
 */

import { fuzzyScore, fuzzyRanges } from '../../headless/fuzzy.js';
import type {
  ComboboxActions,
  ComboboxConfig,
  ComboboxItem,
  ComboboxState,
  ComboboxFilter,
  UseComboboxReturn,
} from './types.js';

function defaultFilter(query: string, items: ComboboxItem[]): ComboboxItem[] {
  const scored: Array<{ item: ComboboxItem; score: number }> = [];
  for (const item of items) {
    const score = fuzzyScore(query, item.label);
    if (score > 0) scored.push({ item, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.map(({ item }) => item);
}

export function createComboboxCore(
  config: ComboboxConfig,
): UseComboboxReturn {
  const {
    items = [],
    onSelect,
    closeOnSelect = true,
    wrap = true,
    filter = defaultFilter,
    value = null,
    resetQueryOnClose = true,
  } = config;

  const baseState: Omit<ComboboxState, 'results' | 'activeIndex' | 'empty' | 'selectedItem' | 'highlight'> = {
    open: false,
    query: '',
    items,
    loading: false,
    selectedId: value,
  };

  let state = deriveState({ ...baseState, results: items, activeIndex: 0 });
  const subscribers = new Set<() => void>();
  const notify = () => subscribers.forEach((fn) => fn());

  function deriveState(
    partial: Omit<ComboboxState, 'empty' | 'selectedItem' | 'highlight'>,
  ): ComboboxState {
    const results = filter(partial.query, partial.items);
    let activeIndex = partial.activeIndex;
    if (results.length === 0) {
      activeIndex = -1;
    } else if (activeIndex < 0) {
      activeIndex = 0;
    } else if (activeIndex >= results.length) {
      activeIndex = wrap ? 0 : results.length - 1;
    }
    const selectedItem = partial.items.find((i) => i.id === partial.selectedId) ?? null;
    const highlight = results.map((item) => fuzzyRanges(partial.query, item.label));
    return {
      ...partial,
      results,
      activeIndex,
      selectedItem,
      empty: partial.open && !partial.loading && results.length === 0,
      highlight,
    };
  }

  const actions: ComboboxActions = {
    open: () => {
      state = deriveState({ ...state, open: true });
      notify();
    },
    close: () => {
      state = deriveState({
        ...state,
        open: false,
        query: resetQueryOnClose ? '' : state.query,
        activeIndex: -1,
      });
      notify();
    },
    toggle: () => {
      state = deriveState({
        ...state,
        open: !state.open,
        query: !state.open ? '' : state.query,
        activeIndex: !state.open ? -1 : state.activeIndex,
      });
      notify();
    },
    setQuery: (query) => {
      state = deriveState({ ...state, query, activeIndex: 0 });
      notify();
    },
    move: (delta) => {
      if (state.results.length === 0) return;
      const next = state.activeIndex + delta;
      let activeIndex: number;
      if (wrap) {
        activeIndex = ((next % state.results.length) + state.results.length) % state.results.length;
      } else {
        activeIndex = Math.min(Math.max(next, 0), state.results.length - 1);
      }
      state = deriveState({ ...state, activeIndex });
      notify();
    },
    setActiveIndex: (index) => {
      state = deriveState({ ...state, activeIndex: index });
      notify();
    },
    select: (id) => {
      const item = id !== undefined
        ? state.items.find((i) => i.id === id)
        : state.results[state.activeIndex];
      if (!item || item.disabled) return null;
      if (onSelect) onSelect(item);
      state = deriveState({
        ...state,
        selectedId: item.id,
        open: closeOnSelect ? false : state.open,
        query: closeOnSelect && resetQueryOnClose ? '' : state.query,
        activeIndex: -1,
      });
      notify();
      return item;
    },
    clear: () => {
      state = deriveState({ ...state, selectedId: null, query: '' });
      notify();
    },
    setLoading: (loading) => {
      state = deriveState({ ...state, loading });
      notify();
    },
    setItems: (nextItems) => {
      state = deriveState({
        ...state,
        items: nextItems,
        activeIndex: 0,
        loading: false,
      });
      notify();
    },
    setValue: (id) => {
      state = deriveState({ ...state, selectedId: id });
      notify();
    },
  };

  const core: UseComboboxReturn = {
    get state(): ComboboxState {
      return state;
    },
    actions,
    subscribe: (listener: () => void) => {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
  };

  return core;
}

export type {
  ComboboxActions,
  ComboboxConfig,
  ComboboxFilter,
  ComboboxItem,
  ComboboxState,
  UseComboboxReturn,
} from './types.js';