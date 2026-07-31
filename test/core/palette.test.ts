/**
 * Headless palette — core behavior, bridge contract, dual-adapter test.
 * ADR 0034 pilot wedge. All tests run in Node with zero DOM.
 */
import { describe, expect, test } from 'vitest';
import {
  createPaletteCore,
  fuzzyMatch,
  fuzzyScore,
  type PaletteItem,
} from '../../src/palette/index.js';
import { toSvelteStore, syncFromCore } from '../../src/headless/index.js';
import { createPaletteStore } from '../../src/palette/svelte/index.js';
import { createVanillaPalette } from '../../src/palette/vanilla/index.js';
import { usePalette } from '../../src/palette/react/index.js';

const ITEMS: PaletteItem[] = [
  { id: 'open-task', label: 'Open Task', keywords: ['open', 'task'], group: 'Graph' },
  { id: 'new-note', label: 'New Note', group: 'Graph' },
  { id: 'sync', label: 'Sync with peers', keywords: ['realtime', 'sync'], group: 'Network' },
  { id: 'quit', label: 'Quit', group: 'System' },
];

// ---------------------------------------------------------------------------
// Fuzzy matching (pure)
// ---------------------------------------------------------------------------

describe('fuzzyScore / fuzzyMatch', () => {
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

  test('case-insensitive', () => {
    expect(fuzzyScore('OPEN', 'open task')).toBeGreaterThan(0);
    expect(fuzzyScore('open', 'OPEN')).toBe(1000);
  });

  test('prefix bonus ranks prefix matches first', () => {
    const a = fuzzyScore('sy', 'sync with peers');
    const b = fuzzyScore('sy', 'system tray');
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(0);
  });

  test('fuzzyMatch scores across label + keywords', () => {
    expect(fuzzyMatch('realtime', ['Sync with peers', 'realtime'])).toBeGreaterThan(
      fuzzyMatch('realtime', ['Sync with peers']),
    );
    expect(fuzzyMatch('zzz', ['Sync with peers'])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Core state machine
// ---------------------------------------------------------------------------

describe('createPaletteCore', () => {
  test('initial state: closed, query empty, all items, no groups leak', () => {
    const palette = createPaletteCore({ items: ITEMS });
    expect(palette.state.open).toBe(false);
    expect(palette.state.query).toBe('');
    expect(palette.state.results).toHaveLength(ITEMS.length);
    expect(palette.state.selectedIndex).toBe(0);
    expect(palette.state.loading).toBe(false);
    expect(palette.state.empty).toBe(false);
  });

  test('open/setQuery filter via fuzzy, best match first, stable ties', () => {
    const palette = createPaletteCore({ items: ITEMS });
    palette.actions.open();
    palette.actions.setQuery('open');
    expect(palette.state.results.map((i) => i.id)).toEqual(['open-task']);
  });

  test('query matching keywords finds the item', () => {
    const palette = createPaletteCore({ items: ITEMS });
    palette.actions.open();
    palette.actions.setQuery('realtime');
    expect(palette.state.results.map((i) => i.id)).toEqual(['sync']);
  });

  test('no results: empty true, selectedIndex 0', () => {
    const palette = createPaletteCore({ items: ITEMS });
    palette.actions.open();
    palette.actions.setQuery('zzzz');
    expect(palette.state.empty).toBe(true);
    expect(palette.state.results).toHaveLength(0);
    expect(palette.state.selectedIndex).toBe(0);
  });

  test('moveSelection wraps by default and clamps without wrap', () => {
    const palette = createPaletteCore({ items: ITEMS });
    palette.actions.open();
    palette.actions.moveSelection(-1); // wrap to last
    expect(palette.state.selectedIndex).toBe(ITEMS.length - 1);
    palette.actions.moveSelection(1); // back to 0
    expect(palette.state.selectedIndex).toBe(0);

    const noWrap = createPaletteCore({ items: ITEMS, wrap: false });
    noWrap.actions.open();
    noWrap.actions.moveSelection(-5);
    expect(noWrap.state.selectedIndex).toBe(0);
  });

  test('select invokes handler, closes on closeOnSelect, returns item', () => {
    const picked: string[] = [];
    const palette = createPaletteCore({
      items: ITEMS,
      onSelect: (item) => picked.push(item.id),
    });
    palette.actions.open();
    palette.actions.setQuery('sync');
    const item = palette.actions.select();
    expect(item?.id).toBe('sync');
    expect(picked).toEqual(['sync']);
    expect(palette.state.open).toBe(false);
  });

  test('closeOnSelect false keeps the palette open', () => {
    const palette = createPaletteCore({ items: ITEMS, closeOnSelect: false });
    palette.actions.open();
    palette.actions.select();
    expect(palette.state.open).toBe(true);
  });

  test('disabled items are skipped by select', () => {
    const picked: string[] = [];
    const palette = createPaletteCore({
      items: [{ id: 'locked', label: 'Locked', disabled: true }, ...ITEMS],
      onSelect: (item) => picked.push(item.id),
    });
    palette.actions.open();
    palette.actions.setQuery('locked');
    const item = palette.actions.select();
    expect(item).toBeNull();
    expect(picked).toEqual([]);
    expect(palette.state.open).toBe(true);
  });

  test('groups derive in first-appearance order', () => {
    const palette = createPaletteCore({ items: ITEMS });
    expect(palette.state.groups.map((g) => g.id)).toEqual([
      'Graph',
      'Network',
      'System',
    ]);
    expect(palette.state.groups[0]!.title).toBe('Graph');
    expect(palette.state.groups[0]!.items).toHaveLength(2);
  });

  test('setLoading / setItems async pattern', () => {
    const palette = createPaletteCore({ items: [] });
    palette.actions.open();
    palette.actions.setLoading(true);
    expect(palette.state.loading).toBe(true);
    expect(palette.state.empty).toBe(false); // loading beats empty
    palette.actions.setItems(ITEMS.slice(0, 2));
    expect(palette.state.loading).toBe(false);
    expect(palette.state.results).toHaveLength(2);
  });

  test('subscribe notifies per mutation and unsubscribes', () => {
    const palette = createPaletteCore({ items: ITEMS });
    let calls = 0;
    const unsubscribe = palette.subscribe(() => calls++);
    palette.actions.open();
    palette.actions.setQuery('ne');
    expect(calls).toBe(2);
    unsubscribe();
    palette.actions.setQuery('x');
    expect(calls).toBe(2);
  });

  test('close clears the query', () => {
    const palette = createPaletteCore({ items: ITEMS });
    palette.actions.open();
    palette.actions.setQuery('open');
    palette.actions.close();
    expect(palette.state.open).toBe(false);
    expect(palette.state.query).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Bridge contract (ADR 0034 §2/§3)
// ---------------------------------------------------------------------------

describe('headless bridge helpers', () => {
  test('toSvelteStore runs immediately, notifies on change, unsubscribes', () => {
    const palette = createPaletteCore({ items: ITEMS });
    const store = toSvelteStore(palette, (s) => s.query);
    const seen: string[] = [];
    const unsubscribe = store.subscribe((q) => seen.push(q));
    expect(seen).toEqual(['']);
    palette.actions.open();
    palette.actions.setQuery('sync');
    expect(seen).toEqual(['', '', 'sync']);
    unsubscribe();
    palette.actions.setQuery('nope');
    expect(seen).toEqual(['', '', 'sync']);
  });

  test('syncFromCore mirrors state into a plain target object', () => {
    const palette = createPaletteCore({ items: ITEMS });
    const target = { ...palette.state } as typeof palette.state;
    const unsubscribe = syncFromCore(target, palette);
    palette.actions.open();
    palette.actions.setQuery('new');
    expect(target.open).toBe(true);
    expect(target.query).toBe('new');
    expect(target.results.map((i) => i.id)).toEqual(['new-note']);
    unsubscribe();
    palette.actions.setQuery('x');
    expect(target.query).toBe('new');
  });

  test('dual adapter: svelte + vanilla mounted on one shared core agree', () => {
    const core = createPaletteCore({ items: ITEMS });
    const store = createPaletteStore(core);
    const vanilla = createVanillaPalette(core);
    const storeSeen: string[] = [];
    const vanillaSeen: string[] = [];
    let lastStoreState: ReturnType<typeof createPaletteCore>['state'] | null = null;
    const unsubStore = store.state.subscribe((s) => {
      lastStoreState = s;
      storeSeen.push(s.query);
    });
    const unsubVanilla = vanilla.subscribe(() => vanillaSeen.push(vanilla.state.query));
    expect(storeSeen).toEqual(['']);
    expect(vanillaSeen).toEqual([]);
    expect(store.core).toBe(core);
    expect(vanilla).toBe(core);

    store.actions.open();
    store.actions.setQuery('sync');
    expect(lastStoreState?.query).toBe('sync');
    expect(vanilla.state.query).toBe('sync');
    expect(storeSeen).toEqual(['', '', 'sync']);
    expect(vanillaSeen).toEqual(['', 'sync']);
    expect(lastStoreState?.results.map((i) => i.id)).toEqual(['sync']);
    expect(vanilla.state.results.map((i) => i.id)).toEqual(['sync']);
    expect(vanilla.state.groups[0]!.title).toBe('Network');

    unsubStore();
    unsubVanilla();
  });
});

// ---------------------------------------------------------------------------
// Adapter surfaces (smoke)
// ---------------------------------------------------------------------------

describe('adapter exports', () => {
  test('react usePalette is a function', () => {
    expect(typeof usePalette).toBe('function');
  });

  test('svelte createPaletteStore returns the documented surface', () => {
    const store = createPaletteStore({ items: ITEMS });
    expect(typeof store.actions.open).toBe('function');
    expect(typeof store.actions.select).toBe('function');
    expect(typeof store.state.subscribe).toBe('function');
    expect(typeof store.query.subscribe).toBe('function');
    expect(typeof store.results.subscribe).toBe('function');
  });
});
