/**
 * Combobox core — behavior suite (ADR 0034 wedge 2).
 * All tests run in Node with zero DOM.
 */
import { describe, expect, test } from 'vitest';
import {
  createComboboxCore,
  fuzzyScore,
  fuzzyRanges,
  type ComboboxItem,
} from '../../src/combobox/index.js';
import { toSvelteStore, syncFromCore } from '../../src/headless/index.js';
import { createComboboxStore } from '../../src/combobox/svelte/index.js';
import { createVanillaCombobox } from '../../src/combobox/vanilla/index.js';

const ITEMS: ComboboxItem[] = [
  { id: 'open-task', label: 'Open Task', keywords: ['open', 'task'], group: 'Graph' },
  { id: 'new-note', label: 'New Note', group: 'Graph' },
  { id: 'sync', label: 'Sync with peers', keywords: ['realtime', 'sync'], group: 'Network' },
  { id: 'quit', label: 'Quit', group: 'System' },
];

// ---------------------------------------------------------------------------
// Fuzzy matching + highlight (pure)
// ---------------------------------------------------------------------------

describe('fuzzyScore / fuzzyMatch / fuzzyRanges', () => {
  test('empty query matches everything with score 1', () => {
    expect(fuzzyScore('', 'anything')).toBe(1);
    expect(fuzzyScore('', '')).toBe(1);
  });

  test('exact match scores far above partial matches', () => {
    expect(fuzzyScore('task', 'task')).toBe(1000);
    expect(fuzzyScore('task', 'tasks')).toBeLessThan(1000);
  });

  test('subsequence match: chars in order, gaps cost', () => {
    expect(fuzzyScore('psh', 'push')).toBeGreaterThan(0);
    expect(fuzzyScore('psh', 'pin shed')).toBeGreaterThan(0);
    expect(fuzzyScore('psh', 'push')).toBeGreaterThan(fuzzyScore('psh', 'pin shed'));
  });

  test('out-of-order chars do not match', () => {
    expect(fuzzyScore('ops', 'spot')).toBe(0);
    expect(fuzzyScore('xyz', 'abc')).toBe(0);
  });

  test('fuzzyRanges returns empty for no match', () => {
    expect(fuzzyRanges('xyz', 'abc')).toEqual([]);
  });

  test('fuzzyRanges returns empty for empty query', () => {
    expect(fuzzyRanges('', 'anything')).toEqual([]);
  });

  test('fuzzyRanges returns contiguous ranges for consecutive matches', () => {
    expect(fuzzyRanges('ab', 'abc')).toEqual([[0, 2]]);
  });

  test('fuzzyRanges returns separate ranges for gapped matches', () => {
    const ranges = fuzzyRanges('pt', 'prompt');
    expect(ranges).toEqual([[0, 1], [5, 6]]);
  });

  test('fuzzyRanges returns separate ranges for gapped matches', () => {
    const ranges = fuzzyRanges('psh', 'push');
    expect(ranges.length).toBeGreaterThan(0);
    for (const [start, end] of ranges) {
      expect(end).toBeGreaterThan(start);
    }
  });
});

// ---------------------------------------------------------------------------
// Core behavior
// ---------------------------------------------------------------------------

describe('createComboboxCore', () => {
  test('initial state: closed, empty query, all items as results, no selection', () => {
    const core = createComboboxCore({ items: ITEMS });
    const s = core.state;
    expect(s.open).toBe(false);
    expect(s.query).toBe('');
    expect(s.results).toEqual(ITEMS);
    expect(s.activeIndex).toBe(0);
    expect(s.selectedId).toBeNull();
    expect(s.selectedItem).toBeNull();
    expect(s.loading).toBe(false);
    expect(s.empty).toBe(false);
    expect(s.highlight).toEqual(ITEMS.map(() => []));
  });

  test('open / close / toggle', () => {
    const core = createComboboxCore({ items: ITEMS });
    core.actions.open();
    expect(core.state.open).toBe(true);
    core.actions.close();
    expect(core.state.open).toBe(false);
    core.actions.toggle();
    expect(core.state.open).toBe(true);
    core.actions.toggle();
    expect(core.state.open).toBe(false);
  });

  test('setQuery filters results by fuzzy score', () => {
    const core = createComboboxCore({ items: ITEMS });
    core.actions.open();
    core.actions.setQuery('task');
    expect(core.state.results.length).toBeGreaterThan(0);
    expect(core.state.results[0].id).toBe('open-task');
  });

  test('setQuery resets activeIndex to 0', () => {
    const core = createComboboxCore({ items: ITEMS });
    core.actions.open();
    core.actions.setQuery('task');
    expect(core.state.activeIndex).toBe(0);
  });

  test('empty query returns all items', () => {
    const core = createComboboxCore({ items: ITEMS });
    core.actions.open();
    core.actions.setQuery('');
    expect(core.state.results).toEqual(ITEMS);
  });

  test('move navigation with wrap (default)', () => {
    const core = createComboboxCore({ items: ITEMS });
    core.actions.open();
    core.actions.setQuery('');
    core.actions.move(1);
    expect(core.state.activeIndex).toBe(1);
    core.actions.move(1);
    expect(core.state.activeIndex).toBe(2);
    core.actions.move(-1);
    expect(core.state.activeIndex).toBe(1);
  });

  test('move wraps around when wrap is true', () => {
    const core = createComboboxCore({ items: ITEMS, wrap: true });
    core.actions.open();
    core.actions.setQuery('');
    core.actions.move(-1);
    expect(core.state.activeIndex).toBe(ITEMS.length - 1);
  });

  test('move clamps when wrap is false', () => {
    const core = createComboboxCore({ items: ITEMS, wrap: false });
    core.actions.open();
    core.actions.setQuery('');
    core.actions.move(-1);
    expect(core.state.activeIndex).toBe(0);
  });

  test('no-op move when results are empty', () => {
    const core = createComboboxCore({ items: ITEMS });
    core.actions.open();
    core.actions.setQuery('xyznonexistent');
    expect(core.state.results.length).toBe(0);
    core.actions.move(1);
    expect(core.state.activeIndex).toBe(-1);
  });

  test('select returns the active item and fires onSelect', () => {
    const selected: ComboboxItem[] = [];
    const core = createComboboxCore({ items: ITEMS, onSelect: (item) => selected.push(item) });
    core.actions.open();
    core.actions.setQuery('');
    core.actions.move(1);
    const result = core.actions.select();
    expect(result).toEqual(ITEMS[1]);
    expect(selected).toEqual([ITEMS[1]]);
    expect(core.state.selectedId).toBe('new-note');
  });

  test('select by id', () => {
    const core = createComboboxCore({ items: ITEMS });
    core.actions.select('open-task');
    expect(core.state.selectedId).toBe('open-task');
    expect(core.state.selectedItem).toEqual(ITEMS[0]);
  });

  test('select disabled item returns null', () => {
    const items = [{ id: 'a', label: 'A', disabled: true }];
    const core = createComboboxCore({ items });
    core.actions.open();
    core.actions.setQuery('');
    expect(core.actions.select()).toBeNull();
  });

  test('closeOnSelect defaults to true', () => {
    const core = createComboboxCore({ items: ITEMS });
    core.actions.open();
    core.actions.setQuery('');
    core.actions.move(1);
    core.actions.select();
    expect(core.state.open).toBe(false);
  });

  test('closeOnSelect false keeps open after select', () => {
    const core = createComboboxCore({ items: ITEMS, closeOnSelect: false });
    core.actions.open();
    core.actions.setQuery('');
    core.actions.move(1);
    core.actions.select();
    expect(core.state.open).toBe(true);
  });

  test('resetQueryOnClose defaults to true', () => {
    const core = createComboboxCore({ items: ITEMS });
    core.actions.open();
    core.actions.setQuery('ta');
    core.actions.close();
    expect(core.state.query).toBe('');
  });

  test('resetQueryOnClose false keeps query on close', () => {
    const core = createComboboxCore({ items: ITEMS, resetQueryOnClose: false });
    core.actions.open();
    core.actions.setQuery('ta');
    core.actions.close();
    expect(core.state.query).toBe('ta');
  });

  test('clear resets selectedId and query', () => {
    const core = createComboboxCore({ items: ITEMS });
    core.actions.select('open-task');
    core.actions.clear();
    expect(core.state.selectedId).toBeNull();
    expect(core.state.query).toBe('');
  });

  test('setLoading + setItems resets activeIndex to 0', () => {
    const core = createComboboxCore({ items: ITEMS });
    core.actions.setLoading(true);
    expect(core.state.loading).toBe(true);
    core.actions.setItems(ITEMS);
    expect(core.state.loading).toBe(false);
    expect(core.state.activeIndex).toBe(0);
  });

  test('setValue updates selection without closing or firing onSelect', () => {
    const selected: ComboboxItem[] = [];
    const core = createComboboxCore({ items: ITEMS, onSelect: (item) => selected.push(item) });
    core.actions.setValue('open-task');
    expect(core.state.selectedId).toBe('open-task');
    expect(core.state.open).toBe(false);
    expect(selected).toEqual([]);
  });

  test('empty derived state when open + loading + no results', () => {
    const core = createComboboxCore({ items: ITEMS });
    core.actions.open();
    core.actions.setLoading(true);
    core.actions.setQuery('xyz');
    expect(core.state.empty).toBe(false);
    core.actions.setLoading(false);
    expect(core.state.empty).toBe(true);
  });

  test('empty is false when not open', () => {
    const core = createComboboxCore({ items: ITEMS });
    core.actions.setQuery('xyz');
    expect(core.state.empty).toBe(false);
  });

  test('selectedItem is null when nothing selected', () => {
    const core = createComboboxCore({ items: ITEMS });
    expect(core.state.selectedItem).toBeNull();
  });

  test('highlight ranges align with results', () => {
    const core = createComboboxCore({ items: ITEMS });
    core.actions.open();
    core.actions.setQuery('ta');
    expect(core.state.highlight.length).toBe(core.state.results.length);
    for (const ranges of core.state.highlight) {
      for (const [start, end] of ranges) {
        expect(start).toBeLessThan(end);
        expect(end).toBeLessThanOrEqual(core.state.query.length + 10);
      }
    }
  });

  test('empty query produces empty highlight arrays', () => {
    const core = createComboboxCore({ items: ITEMS });
    core.actions.open();
    expect(core.state.highlight.every((h) => h.length === 0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Bridge contract (dual-adapter test — svelte + vanilla on one core)
// ---------------------------------------------------------------------------

describe('bridge contract', () => {
  test('dual adapter: svelte + vanilla mounted on one shared core agree', () => {
    const core = createComboboxCore({ items: ITEMS });
    const svelte = createComboboxStore(core);
    const vanilla = createVanillaCombobox(core);

    let svelteState: ComboboxState | null = null;
    let vanillaState: ComboboxState | null = null;
    const unsubSvelte = svelte.state.subscribe((s) => { svelteState = s; });
    const unsubVanilla = vanilla.subscribe((s: ComboboxState) => { vanillaState = s; });

    // Svelte store fires immediately; vanilla subscribe does not
    expect(svelteState).not.toBeNull();
    if (svelteState) {
      expect(svelteState.open).toBe(core.state.open);
      expect(svelteState.query).toBe(core.state.query);
      expect(svelteState.results).toEqual(core.state.results);
      expect(svelteState.activeIndex).toBe(core.state.activeIndex);
      expect(svelteState.selectedId).toBe(core.state.selectedId);
      expect(svelteState.highlight).toEqual(core.state.highlight);
    }

    core.actions.open();
    core.actions.setQuery('ta');
    core.actions.move(1);

    expect(svelteState).not.toBeNull();
    expect(vanillaState).not.toBeNull();
    if (svelteState && vanillaState) {
      expect(svelteState.open).toBe(core.state.open);
      expect(svelteState.query).toBe(core.state.query);
      expect(svelteState.results).toEqual(core.state.results);
      expect(svelteState.activeIndex).toBe(core.state.activeIndex);
      expect(svelteState.selectedId).toBe(core.state.selectedId);
      expect(svelteState.highlight).toEqual(core.state.highlight);
      expect(vanillaState.open).toBe(core.state.open);
      expect(vanillaState.query).toBe(core.state.query);
      expect(vanillaState.results).toEqual(core.state.results);
      expect(vanillaState.activeIndex).toBe(core.state.activeIndex);
      expect(vanillaState.selectedId).toBe(core.state.selectedId);
      expect(vanillaState.highlight).toEqual(core.state.highlight);
    }

    unsubSvelte();
    unsubVanilla();
  });

  test('toSvelteStore + syncFromCore work for combobox', () => {
    const core = createComboboxCore({ items: ITEMS });
    const store = createComboboxStore(core);

    let storeState: ComboboxState | null = null;
    const unsub = store.state.subscribe((s) => { storeState = s; });

    expect(storeState).not.toBeNull();
    if (storeState) {
      expect(storeState.open).toBe(false);
      expect(storeState.query).toBe('');
      expect(storeState.results).toEqual(ITEMS);
    }

    core.actions.open();
    core.actions.setQuery('ta');

    expect(storeState).not.toBeNull();
    if (storeState) {
      expect(storeState.open).toBe(true);
      expect(storeState.query).toBe('ta');
      expect(storeState.results.length).toBeGreaterThan(0);
      expect(storeState.highlight.length).toBeGreaterThan(0);
    }
    unsub();
  });
});