import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const store: Record<string, string> = {};

const mockLocalStorage = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    for (const key of Object.keys(store)) delete store[key];
  }),
};

beforeEach(() => {
  vi.stubGlobal('localStorage', mockLocalStorage);
  vi.stubGlobal('window', { localStorage: mockLocalStorage });
});

afterEach(() => {
  vi.unstubAllGlobals();
  mockLocalStorage.clear.mockClear();
  mockLocalStorage.getItem.mockClear();
  mockLocalStorage.setItem.mockClear();
  mockLocalStorage.removeItem.mockClear();
  vi.restoreAllMocks();
});

import { createViewCore } from '../../src/view/core/index.js';
import type { ViewMode } from '../../src/view/core/index.js';

describe('view core', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    Object.keys(store).forEach((k) => delete store[k]);
  });

  afterEach(() => {
    mockLocalStorage.clear();
    Object.keys(store).forEach((k) => delete store[k]);
  });

  it('starts in the configured default mode', () => {
    const view = createViewCore({
      defaultMode: 'table',
      defaultColumns: ['id', 'title'],
    });
    expect(view.state.mode).toBe('table');
    expect(view.state.columns).toEqual(['id', 'title']);
    expect(view.state.vantage).toBe(8);
    expect(view.state.canMorph).toBe(true);
  });

  it('morphs between view modes', () => {
    const view = createViewCore({
      defaultMode: 'table',
      defaultColumns: ['id', 'title'],
    });
    const prev = view.actions.setMode('grid');
    expect(prev).toBe('table');
    expect(view.state.mode).toBe('grid');

    view.actions.setMode('kanban');
    expect(view.state.mode).toBe('kanban');

    view.actions.setMode('card');
    expect(view.state.mode).toBe('card');
  });

  it('no-ops when switching to the same mode', () => {
    const view = createViewCore({
      defaultMode: 'table',
      defaultColumns: ['id'],
    });
    const prev = view.actions.setMode('table');
    expect(prev).toBe(false);
    expect(view.state.mode).toBe('table');
  });

  it('persists mode + columns to localStorage', () => {
    const view = createViewCore({
      entityType: 'issue',
      defaultMode: 'table',
      defaultColumns: ['title', 'status'],
    });
    view.actions.setMode('kanban');
    view.actions.setColumns(['status', 'title', 'assignee']);

    expect(store['trellis-view-issue']).toBeDefined();
    const stored = JSON.parse(store['trellis-view-issue']);
    expect(stored.mode).toBe('kanban');
    expect(stored.columns).toEqual(['status', 'title', 'assignee']);
  });

  it('hydrates from persisted mode + columns on init', () => {
    store['trellis-view-task'] = JSON.stringify({
      mode: 'card',
      columns: ['priority', 'title', 'status'],
    });

    const view = createViewCore({
      entityType: 'task',
      defaultMode: 'table',
      defaultColumns: ['id', 'title'],
    });

    expect(view.state.mode).toBe('card');
    expect(view.state.columns).toEqual(['priority', 'title', 'status']);
  });

  it('ignores invalid persisted mode', () => {
    store['trellis-view-issue'] = JSON.stringify({ mode: 'invalid', columns: [] });
    const view = createViewCore({
      entityType: 'issue',
      defaultMode: 'table',
      defaultColumns: ['id'],
    });
    expect(view.state.mode).toBe('table');
  });

  it('column operations work', () => {
    const view = createViewCore({
      defaultMode: 'table',
      defaultColumns: ['id', 'title'],
    });

    expect(view.actions.addColumn('status')).toBe(true);
    expect(view.actions.addColumn('status')).toBe(false);
    expect(view.state.columns).toEqual(['id', 'title', 'status']);

    expect(view.actions.removeColumn('title')).toBe(true);
    expect(view.actions.removeColumn('title')).toBe(false);
    expect(view.state.columns).toEqual(['id', 'status']);

    expect(view.actions.setColumnOrder(['status', 'id'])).toBe(true);
    expect(view.state.columns).toEqual(['status', 'id']);
  });

  it('sort state works', () => {
    const view = createViewCore({
      defaultMode: 'table',
      defaultColumns: ['id', 'title'],
    });

    view.actions.setSort({ key: 'title', desc: false });
    expect(view.state.sortBy).toEqual({ key: 'title', desc: false });

    view.actions.setSort({ key: 'title', desc: true });
    expect(view.state.sortBy).toEqual({ key: 'title', desc: true });

    view.actions.clearSort();
    expect(view.state.sortBy).toBeNull();
  });

  it('global filter works', () => {
    const view = createViewCore({
      defaultMode: 'table',
      defaultColumns: ['id'],
    });

    view.actions.setGlobalFilter('bug');
    expect(view.state.globalFilter).toBe('bug');

    view.actions.clearGlobalFilter();
    expect(view.state.globalFilter).toBe('');
  });

  it('subscribes to state changes', () => {
    const view = createViewCore({
      defaultMode: 'table',
      defaultColumns: ['id'],
    });
    let calls = 0;
    const unsub = view.subscribe(() => {
      calls++;
    });

    view.actions.setMode('grid');
    view.actions.setMode('card');
    view.actions.setSort({ key: 'id', desc: true });

    expect(calls).toBe(3);
    unsub();

    view.actions.setMode('table');
    expect(calls).toBe(3);
  });

  it('sets vantage', () => {
    const view = createViewCore({
      defaultMode: 'table',
      defaultColumns: ['id'],
    });
    view.actions.setVantage(5);
    expect(view.state.vantage).toBe(5);

    view.actions.setVantage(2);
    expect(view.state.vantage).toBe(2);
  });
});
