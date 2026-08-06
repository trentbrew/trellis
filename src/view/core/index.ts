/**
 * View core — manages projection view modes (grid/table/kanban/card) with
 * seamless morphing and persistent state (ADR 0034 / Phase C).
 *
 * The view core is the bridge between the fractal vantage system and the
 * entity-list rendering layer. It owns:
 *
 *  - `mode`: the active view mode (grid, table, kanban, card).
 *  - `columns`: which entity fields to show as table columns, in order.
 *  - `sortBy` / `filter`: table-specific display state.
 *  - `vantage`: the current fractal vantage (0–21; detents 2/5/8).
 *
 * View mode + column layout persist to localStorage so a node's configuration
 * survives page reload. The vantage follows the global `--ui-vantage` CSS var,
 * but the view mode is independent — switching to "table" at any vantage is
 * supported, and the shell morphing (node→row→card) works within the table
 * context.
 *
 *   const view = createViewCore({
 *     entityType: 'issue',
 *     persistKey: 'issue-list-view',
 *     defaultMode: 'table',
 *     defaultColumns: ['title', 'status', 'assignee'],
 *   });
 *   view.actions.setMode('kanban');          // morphs grid → kanban
 *   view.actions.setColumnOrder(['assignee', 'title', 'status']);
 *   view.actions.setVantage(5);              // morphs card → row
 *
 * @module trellis/view
 */

import type { ViewConfig, ViewMode, ViewState, ViewActions, UseViewReturn } from './types.js';

export type {
  ViewConfig,
  ViewMode,
  ViewState,
  ViewActions,
  UseViewReturn,
} from './types.js';

const STORAGE_PREFIX = 'trellis-view';

export function createViewCore<T extends Record<string, unknown> = Record<string, unknown>>(
  config: ViewConfig<T>,
): UseViewReturn<T> {
  let mode: ViewMode = config.defaultMode ?? 'table';
  const entityType = config.entityType ?? 'entity';
  const persistKey = config.persistKey ?? `${STORAGE_PREFIX}-${entityType}`;

  // ---- column setup -------------------------------------------------------

  let columns: string[] = [...config.defaultColumns];

  // ---- vantage / sort / filter (transient, not persisted) -------------------
  let vantage = config.initialVantage ?? 8;
  let sortBy: { key: string; desc: boolean } | null = null;
  let globalFilter = '';

  // ---- persistence (browser-safe — localStorage optional) ------------------
  let ls: Storage | undefined;
  try {
    ls = typeof window !== 'undefined' ? window.localStorage : undefined;
  } catch {
    ls = undefined;
  }
  const isBrowser = Boolean(ls);
  let persistedMode: ViewMode | null = null;
  let persistedColumns: string[] | null = null;

  try {
    if (isBrowser && ls) {
      const raw = ls.getItem(persistKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.mode && isValidMode(parsed.mode)) {
          persistedMode = parsed.mode;
        }
        if (Array.isArray(parsed.columns) && parsed.columns.length) {
          persistedColumns = parsed.columns;
        }
      }
    }
  } catch {
    // ignore parse errors
  }

  if (persistedMode) {
    mode = persistedMode;
  }
  if (persistedColumns && persistedColumns.length) {
    columns = [...persistedColumns];
  }

  // ---- subscribe infrastructure ------------------------------------------
  const subscribers = new Set<() => void>();
  const notify = () => subscribers.forEach((fn) => fn());

  function isValidMode(m: string): m is ViewMode {
    return m === 'grid' || m === 'table' || m === 'kanban' || m === 'card';
  }

  function persist() {
    try {
      if (isBrowser && ls) {
        ls.setItem(
          persistKey,
          JSON.stringify({ mode, columns }),
        );
      }
    } catch {
      // ignore
    }
  }

  function deriveState(): ViewState {
    return {
      mode,
      vantage,
      columns,
      sortBy: sortBy ? { ...sortBy } : null,
      globalFilter,
      canMorph: true,
    };
  }

  let state = deriveState();

  function refresh() {
    state = deriveState();
    notify();
  }

  const actions: ViewActions = {
     setMode: (next) => {
      if (next === mode) return false;
      const prev = mode;
      mode = next;
      state = { ...state, mode: next };
      notify();
      persist();
      return prev;
    },

    setVantage: (v) => {
      if (v === vantage) return;
      vantage = v;
      refresh();
    },

    setColumns: (next) => {
      if (JSON.stringify(next) === JSON.stringify(columns)) return false;
      columns = [...next];
      refresh();
      persist();
      return true;
    },

     setColumnOrder: (next) => {
       const filtered = next.filter((n) => columns.includes(n));
       return actions.setColumns([...filtered, ...columns.filter((c) => !filtered.includes(c))]);
     },

    addColumn: (col) => {
      if (columns.includes(col)) return false;
      columns = [...columns, col];
      refresh();
      persist();
      return true;
    },

    removeColumn: (col) => {
      if (!columns.includes(col)) return false;
      columns = columns.filter((c) => c !== col);
      refresh();
      persist();
      return true;
    },

    setSort: (spec) => {
      const same =
        sortBy === null
          ? spec === null
          : spec !== null && sortBy.key === spec.key && sortBy.desc === spec.desc;
      if (same) return;
      sortBy = spec ? { ...spec } : null;
      refresh();
    },

    clearSort: () => {
      if (sortBy === null) return;
      sortBy = null;
      refresh();
    },

    setGlobalFilter: (text) => {
      if (text === globalFilter) return;
      globalFilter = text;
      refresh();
    },

    clearGlobalFilter: () => {
      if (globalFilter === '') return;
      globalFilter = '';
      refresh();
    },
  };

  const core: UseViewReturn<T> = {
    get state() {
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
