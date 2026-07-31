/**
 * Palette core — headless command palette state machine (ADR 0034 pilot).
 *
 * Framework-free and DOM-free: query filtering, selection, grouping, and
 * empty/loading states live here and are verified in Node. Adapters
 * (`trellis/palette/react|vue|svelte|vanilla`) bind it per framework.
 *
 *   const palette = createPaletteCore({
 *     items: [{ id: 'tr-1', label: 'Open Task', keywords: ['task', 'open'], group: 'Graph' }],
 *     onSelect: (item) => navigate(item.id),
 *   });
 *   palette.subscribe(() => render(palette.state));
 *   palette.actions.open();
 *   palette.actions.setQuery('open ta');
 *   palette.actions.select();
 *
 * @module trellis/palette
 */

import { fuzzyMatch } from './fuzzy.js';
import type {
  PaletteActions,
  PaletteConfig,
  PaletteGroup,
  PaletteItem,
  PaletteState,
  UsePaletteReturn,
} from './types.js';

export type {
  PaletteActions,
  PaletteConfig,
  PaletteFilter,
  PaletteGroup,
  PaletteItem,
  PaletteState,
  UsePaletteReturn,
} from './types.js';

function defaultFilter(query: string, items: PaletteItem[]): PaletteItem[] {
  const scored: Array<{ item: PaletteItem; score: number }> = [];
  for (const item of items) {
    const score = fuzzyMatch(query, [item.label, ...(item.keywords ?? [])]);
    if (score > 0) scored.push({ item, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.map(({ item }) => item);
}

function groupItems(items: PaletteItem[]): PaletteGroup[] {
  const groups: PaletteGroup[] = [];
  const byId = new Map<string, PaletteGroup>();
  for (const item of items) {
    const key = item.group ?? '';
    let group = byId.get(key);
    if (!group) {
      group = {
        id: key,
        title: key || 'All',
        items: [],
      };
      byId.set(key, group);
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}

export function createPaletteCore(
  config: PaletteConfig,
): UsePaletteReturn {
  const { items = [], onSelect, closeOnSelect = true, wrap = true } = config;
  const filter = config.filter ?? defaultFilter;

  const baseState: Omit<PaletteState, 'results' | 'selectedIndex' | 'empty' | 'groups'> = {
    open: false,
    query: '',
    items,
    loading: false,
  };

  let state = deriveState({ ...baseState, results: items, selectedIndex: 0 });
  const subscribers = new Set<() => void>();
  const notify = () => subscribers.forEach((fn) => fn());

  function deriveState(
    partial: Omit<PaletteState, 'empty' | 'groups'>,
  ): PaletteState {
    const results = filter(partial.query, partial.items);
    let selectedIndex = partial.selectedIndex;
    if (results.length === 0) {
      selectedIndex = 0;
    } else if (selectedIndex >= results.length) {
      selectedIndex = wrap ? 0 : results.length - 1;
    } else if (selectedIndex < 0) {
      selectedIndex = wrap ? results.length - 1 : 0;
    }
    return {
      ...partial,
      results,
      selectedIndex,
      empty: partial.open && !partial.loading && results.length === 0,
      groups: groupItems(results),
    };
  }

  const actions: PaletteActions = {
    open: () => {
      state = deriveState({ ...state, open: true });
      notify();
    },
    close: () => {
      state = deriveState({ ...state, open: false, query: '' });
      notify();
    },
    toggle: () => {
      state = deriveState({ ...state, open: !state.open, query: !state.open ? '' : state.query });
      notify();
    },
    setQuery: (query) => {
      state = deriveState({ ...state, query, selectedIndex: 0 });
      notify();
    },
    moveSelection: (delta) => {
      if (state.results.length === 0) return;
      const next = state.selectedIndex + delta;
      let selectedIndex: number;
      if (wrap) {
        selectedIndex = ((next % state.results.length) + state.results.length) % state.results.length;
      } else {
        selectedIndex = Math.min(Math.max(next, 0), state.results.length - 1);
      }
      state = deriveState({ ...state, selectedIndex });
      notify();
    },
    setSelectedIndex: (index) => {
      state = deriveState({ ...state, selectedIndex: index });
      notify();
    },
    select: () => {
      const item = state.results[state.selectedIndex];
      if (!item || item.disabled) return null;
      if (onSelect) onSelect(item);
      if (closeOnSelect) {
        state = deriveState({ ...state, open: false, query: '' });
        notify();
      }
      return item;
    },
    setLoading: (loading) => {
      state = deriveState({ ...state, loading });
      notify();
    },
    setItems: (nextItems) => {
      state = deriveState({
        ...state,
        items: nextItems,
        selectedIndex: 0,
        loading: false,
      });
      notify();
    },
  };

  const core: UsePaletteReturn = {
    get state(): PaletteState {
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
