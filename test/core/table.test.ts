/**
 * Table core tests (ADR 0034 wedge 6) — grid engine, inline editing,
 * undo composition, bridge adapters. All deterministic, zero timers.
 */

import { describe, expect, it } from 'vitest';
import { createUndoHistoryCore } from '../../src/undo-history/core/index.js';
import { createTableCore } from '../../src/table/core/index.js';
import type { TableColumn, TableState } from '../../src/table/core/index.js';
import { createTableStore } from '../../src/table/svelte/index.js';
import { createVanillaTable } from '../../src/table/vanilla/index.js';
import { useTable } from '../../src/table/react/index.js';

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'done';
  priority: number;
}

const seed: Task[] = [
  { id: 't1', title: 'Alpha', status: 'todo', priority: 3 },
  { id: 't2', title: 'Beta', status: 'done', priority: 1 },
  { id: 't3', title: 'Gamma', status: 'todo', priority: 2 },
];

const columns: TableColumn<Task>[] = [
  { id: 'title', accessorKey: 'title', header: 'Title' },
  { id: 'status', accessorKey: 'status', header: 'Status' },
  { id: 'priority', accessorKey: 'priority', header: 'Priority', type: 'number' },
  { id: 'meta', accessorFn: (r) => `${r.title}!`, header: 'Meta' },
];

const makeTable = (
  config: Partial<Parameters<typeof createTableCore<Task>>[0]> = {},
) =>
  createTableCore({
    data: seed,
    columns,
    ...config,
  });

const ids = (s: TableState) => s.rows.map((r) => r.id);
const cell = (s: TableState, rowId: string, columnId: string) =>
  s.rows.find((r) => r.id === rowId)?.cells[columnId];

describe('table core — grid projection', () => {
  it('projects columns, rows, and pager from seed data', () => {
    const t = makeTable();
    expect(t.state.columns.map((c) => c.id)).toEqual([
      'title',
      'status',
      'priority',
      'meta',
    ]);
    expect(t.state.columns[0]).toMatchObject({
      id: 'title',
      header: 'Title',
      editable: true,
      type: 'text',
    });
    // accessorFn columns are read-only by default
    expect(t.state.columns[3]).toMatchObject({ id: 'meta', editable: false });
    expect(ids(t.state)).toEqual(['t1', 't2', 't3']);
    expect(cell(t.state, 't1', 'title')).toBe('Alpha');
    expect(cell(t.state, 't2', 'priority')).toBe(1);
    expect(t.state.totalRows).toBe(3);
    expect(t.state.pageCount).toBe(1);
    expect(t.state.pageIndex).toBe(0);
    expect(t.state.pageSize).toBe(10);
    expect(t.state.paginated).toBe(true);
    expect(t.state.sorting).toEqual([]);
    expect(t.state.globalFilter).toBe('');
    expect(t.state.selectedRows).toEqual([]);
    expect(t.state.allSelected).toBe(false);
    expect(t.state.someSelected).toBe(false);
    expect(t.state.editing).toBeNull();
    expect(t.state.editDraft).toBeNull();
    expect(t.state.canUndo).toBe(false);
    expect(t.state.canRedo).toBe(false);
  });

  it('supports custom getRowId', () => {
    const t = createTableCore({
      data: seed,
      columns,
      getRowId: (r) => `k-${r.id}`,
    });
    expect(ids(t.state)).toEqual(['k-t1', 'k-t2', 'k-t3']);
    expect(t.actions.addRow({ id: 't9', title: 'Zeta', status: 'todo', priority: 9 })).toBe('k-t9');
    expect(t.state.totalRows).toBe(4);
  });

  it('collapses the pager when enablePagination is false', () => {
    const t = makeTable({ enablePagination: false });
    expect(t.state.paginated).toBe(false);
    expect(t.state.pageCount).toBe(1);
    expect(t.state.pageIndex).toBe(0);
    expect(t.state.pageSize).toBe(3);
    expect(ids(t.state)).toHaveLength(3);
  });
});

describe('table core — sorting', () => {
  it('cycles none → asc → desc → none', () => {
    const t = makeTable();
    t.actions.sort('priority');
    expect(t.state.sorting).toEqual([{ id: 'priority', desc: false }]);
    expect(ids(t.state)).toEqual(['t2', 't3', 't1']);
    t.actions.sort('priority');
    expect(t.state.sorting).toEqual([{ id: 'priority', desc: true }]);
    expect(ids(t.state)).toEqual(['t1', 't3', 't2']);
    t.actions.sort('priority');
    expect(t.state.sorting).toEqual([]);
    expect(ids(t.state)).toEqual(['t1', 't2', 't3']);
  });

  it('sorts by explicit direction and computed columns', () => {
    const t = makeTable();
    t.actions.sort('priority', 'desc');
    expect(ids(t.state)).toEqual(['t1', 't3', 't2']);
    t.actions.sort('meta', 'asc');
    expect(t.state.sorting).toEqual([{ id: 'meta', desc: false }]);
    expect(ids(t.state)).toEqual(['t1', 't2', 't3']);
  });

  it('clears sorting', () => {
    const t = makeTable();
    t.actions.sort('title');
    t.actions.clearSorting();
    expect(t.state.sorting).toEqual([]);
    expect(ids(t.state)).toEqual(['t1', 't2', 't3']);
  });
});

describe('table core — global filter', () => {
  it('filters case-insensitively and clears', () => {
    const t = makeTable();
    t.actions.setGlobalFilter('ALPHA');
    expect(ids(t.state)).toEqual(['t1']);
    expect(t.state.totalRows).toBe(1);
    t.actions.setGlobalFilter('gam');
    expect(ids(t.state)).toEqual(['t3']);
    // the filter runs across all columns — 'o' also matches status cells
    t.actions.setGlobalFilter('o');
    expect(ids(t.state)).toEqual(['t1', 't2', 't3']);
    t.actions.setGlobalFilter('');
    expect(ids(t.state)).toEqual(['t1', 't2', 't3']);
  });
});

describe('table core — pagination', () => {
  it('pages forward, back, and clamps indices', () => {
    const t = makeTable({ initialState: { pageSize: 2 } });
    expect(t.state.pageCount).toBe(2);
    expect(ids(t.state)).toEqual(['t1', 't2']);
    t.actions.nextPage();
    expect(t.state.pageIndex).toBe(1);
    expect(ids(t.state)).toEqual(['t3']);
    t.actions.previousPage();
    expect(ids(t.state)).toEqual(['t1', 't2']);
    t.actions.setPageIndex(99);
    expect(t.state.pageIndex).toBe(1);
    t.actions.setPageIndex(-3);
    expect(t.state.pageIndex).toBe(0);
  });

  it('clamps pageIndex when filtering shrinks the page count', () => {
    const t = makeTable({ initialState: { pageSize: 2 } });
    t.actions.nextPage();
    expect(t.state.pageIndex).toBe(1);
    t.actions.setGlobalFilter('beta');
    expect(t.state.pageCount).toBe(1);
    expect(t.state.pageIndex).toBe(0);
    expect(ids(t.state)).toEqual(['t2']);
  });
});

describe('table core — selection', () => {
  it('toggles rows and reports page-scope flags', () => {
    const t = makeTable();
    t.actions.toggleRowSelected('t1');
    expect(t.state.selectedRows).toEqual(['t1']);
    expect(t.state.someSelected).toBe(true);
    expect(t.state.allSelected).toBe(false);
    t.actions.toggleRowSelected('t2');
    t.actions.toggleRowSelected('t3');
    expect(t.state.allSelected).toBe(true);
    t.actions.toggleAllSelected();
    expect(t.state.selectedRows).toEqual([]);
    t.actions.toggleAllSelected(true);
    expect(t.state.selectedRows).toEqual(['t1', 't2', 't3']);
    t.actions.toggleRowSelected('t2', false);
    expect(t.state.selectedRows).toEqual(['t1', 't3']);
    expect(t.state.someSelected).toBe(true);
  });

  it('selection survives paging and filtering', () => {
    const t = makeTable({ initialState: { pageSize: 2 } });
    t.actions.toggleRowSelected('t1');
    t.actions.nextPage(); // page 2: only t3
    t.actions.toggleRowSelected('t3');
    expect(t.state.selectedRows).toEqual(['t1', 't3']);
    expect(t.state.someSelected).toBe(true);
    expect(t.state.allSelected).toBe(true); // sole page-2 row is selected
    t.actions.toggleAllSelected(); // page scope: deselects t3
    expect(t.state.selectedRows).toEqual(['t1']);
    t.actions.toggleAllSelected();
    expect(t.state.selectedRows).toEqual(['t1', 't3']);
  });

  it('toggleRowSelected on an unknown id is a no-op', () => {
    const t = makeTable();
    const seen: number[] = [];
    const unsub = t.subscribe(() => seen.push(1));
    t.actions.toggleRowSelected('nope');
    expect(seen).toEqual([]);
    expect(t.state.selectedRows).toEqual([]);
    unsub();
  });
});

describe('table core — inline editing', () => {
  it('starts editing with the current value as draft', () => {
    const t = makeTable();
    t.actions.startEdit('t1', 'title');
    expect(t.state.editing).toEqual({ rowId: 't1', columnId: 'title' });
    expect(t.state.editDraft).toBe('Alpha');
    t.actions.setEditDraft('Zed');
    expect(t.state.editDraft).toBe('Zed');
    expect(t.actions.commitEdit()).toBe(true);
    expect(cell(t.state, 't1', 'title')).toBe('Zed');
    expect(t.state.editing).toBeNull();
    expect(t.state.editDraft).toBeNull();
  });

  it('cancelEdit discards the draft', () => {
    const t = makeTable();
    t.actions.startEdit('t2', 'title');
    t.actions.setEditDraft('Nope');
    t.actions.cancelEdit();
    expect(cell(t.state, 't2', 'title')).toBe('Beta');
    expect(t.state.editing).toBeNull();
  });

  it('ignores read-only columns and unknown rows', () => {
    const t = makeTable();
    const seen: number[] = [];
    const unsub = t.subscribe(() => seen.push(1));
    t.actions.startEdit('t1', 'meta');
    t.actions.startEdit('nope', 'title');
    expect(seen).toEqual([]);
    expect(t.state.editing).toBeNull();
    unsub();
  });

  it('committing an unchanged draft is a no-op success', () => {
    const t = makeTable();
    t.actions.startEdit('t1', 'title');
    expect(t.actions.commitEdit()).toBe(true);
    expect(cell(t.state, 't1', 'title')).toBe('Alpha');
  });

  it('coerces drafts by column type', () => {
    const t = makeTable();
    t.actions.startEdit('t1', 'priority');
    t.actions.setEditDraft('42');
    expect(t.actions.commitEdit()).toBe(true);
    expect(cell(t.state, 't1', 'priority')).toBe(42);

    t.actions.startEdit('t2', 'priority');
    t.actions.setEditDraft('');
    expect(t.actions.commitEdit()).toBe(true);
    expect(cell(t.state, 't2', 'priority')).toBeNull();

    t.actions.startEdit('t3', 'priority');
    t.actions.setEditDraft('abc');
    expect(t.actions.commitEdit()).toBe(false);
    expect(cell(t.state, 't3', 'priority')).toBe(2);
    expect(t.state.editing).toEqual({ rowId: 't3', columnId: 'priority' });
  });

  it('coerces boolean columns from "true"/"1"', () => {
    const boolCols: TableColumn<{ id: string; active: boolean }>[] = [
      { id: 'active', accessorKey: 'active', header: 'Active', type: 'boolean' },
    ];
    const t = createTableCore({
      data: [{ id: 'b1', active: true }],
      columns: boolCols,
    });
    t.actions.startEdit('b1', 'active');
    expect(t.state.editDraft).toBe('true');
    t.actions.setEditDraft('false');
    expect(t.actions.commitEdit()).toBe(true);
    expect(cell(t.state, 'b1', 'active')).toBe(false);
    t.actions.startEdit('b1', 'active');
    t.actions.setEditDraft('1');
    expect(t.actions.commitEdit()).toBe(true);
    expect(cell(t.state, 'b1', 'active')).toBe(true);
  });

  it('grid moves cancel the editor', () => {
    const t = makeTable();
    t.actions.startEdit('t1', 'title');
    t.actions.setEditDraft('Zed');
    t.actions.sort('title');
    expect(t.state.editing).toBeNull();
    expect(cell(t.state, 't1', 'title')).toBe('Alpha');

    t.actions.startEdit('t1', 'title');
    t.actions.setGlobalFilter('alpha');
    expect(t.state.editing).toBeNull();

    t.actions.startEdit('t1', 'title');
    t.actions.nextPage(); // single page — no-op, but editor still closes
    expect(t.state.editing).toBeNull();
  });
});

describe('table core — onCellEdit external write hook', () => {
  it('receives (rowId, columnId, value, row) and can reject', () => {
    const calls: Array<{ rowId: string; columnId: string; value: unknown; row: Task }> = [];
    const t = makeTable({
      onCellEdit: (rowId, columnId, value, row) => {
        calls.push({ rowId, columnId, value, row });
        return false;
      },
    });
    t.actions.startEdit('t1', 'title');
    t.actions.setEditDraft('Zed');
    expect(t.actions.commitEdit()).toBe(false);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ rowId: 't1', columnId: 'title', value: 'Zed' });
    expect(calls[0]!.row.title).toBe('Alpha');
    // rejected: local data untouched, editor stays open, no undo step
    expect(cell(t.state, 't1', 'title')).toBe('Alpha');
    expect(t.state.editing).toEqual({ rowId: 't1', columnId: 'title' });
    expect(t.state.canUndo).toBe(false);
  });
});

describe('table core — undo-history composition', () => {
  it('cell edits push one undo step each', () => {
    const undo = createUndoHistoryCore();
    const t = makeTable({ undoHistory: undo });
    t.actions.startEdit('t1', 'title');
    t.actions.setEditDraft('Zed');
    expect(t.actions.commitEdit()).toBe(true);
    expect(t.state.canUndo).toBe(true);
    expect(t.actions.undo()).toBe(true);
    expect(cell(t.state, 't1', 'title')).toBe('Alpha');
    expect(t.state.canRedo).toBe(true);
    expect(t.actions.redo()).toBe(true);
    expect(cell(t.state, 't1', 'title')).toBe('Zed');
  });

  it('edit commands carry the column header label', () => {
    const undo = createUndoHistoryCore();
    const table = makeTable({ undoHistory: undo });
    table.actions.startEdit('t1', 'priority');
    table.actions.setEditDraft('9');
    table.actions.commitEdit();
    expect(undo.state.undoLabel).toBe('Edit Priority');
  });

  it('addRow and removeRow are undoable and preserve order', () => {
    const undo = createUndoHistoryCore();
    const t = makeTable({ undoHistory: undo });
    t.actions.removeRow('t2');
    expect(ids(t.state)).toEqual(['t1', 't3']);
    expect(t.actions.undo()).toBe(true);
    expect(ids(t.state)).toEqual(['t1', 't2', 't3']); // position restored
    expect(t.actions.redo()).toBe(true);
    expect(ids(t.state)).toEqual(['t1', 't3']);

    t.actions.addRow({ id: 't4', title: 'Delta', status: 'todo', priority: 0 });
    expect(ids(t.state)).toEqual(['t1', 't3', 't4']);
    expect(t.actions.undo()).toBe(true);
    expect(ids(t.state)).toEqual(['t1', 't3']);
    expect(t.actions.redo()).toBe(true);
    expect(ids(t.state)).toEqual(['t1', 't3', 't4']);
  });

  it('stays fresh for external pushes on the composed undo core', () => {
    const undo = createUndoHistoryCore();
    const t = makeTable({ undoHistory: undo });
    expect(t.state.canUndo).toBe(false);
    const noop: Parameters<typeof undo.actions.push>[0] = {
      execute: () => {},
      invert: () => noop,
    };
    undo.actions.push(noop);
    expect(t.state.canUndo).toBe(true);
    undo.actions.undo();
    expect(t.state.canUndo).toBe(false);
    expect(t.state.canRedo).toBe(true);
  });

  it('undo/redo without a composed core are false no-ops', () => {
    const t = makeTable();
    expect(t.actions.undo()).toBe(false);
    expect(t.actions.redo()).toBe(false);
  });
});

describe('table core — row mutation', () => {
  it('updateRow patches one row and returns false for unknown ids', () => {
    const t = makeTable();
    expect(t.actions.updateRow('t1', { status: 'done' })).toBe(true);
    expect(cell(t.state, 't1', 'status')).toBe('done');
    expect(cell(t.state, 't1', 'title')).toBe('Alpha');
    expect(t.actions.updateRow('nope', { title: 'x' })).toBe(false);
  });

  it('addRow appends and removeRow deletes', () => {
    const t = makeTable();
    const id = t.actions.addRow({ id: 't4', title: 'Delta', status: 'todo', priority: 0 });
    expect(id).toBe('t4');
    expect(t.state.totalRows).toBe(4);
    expect(ids(t.state)).toEqual(['t1', 't2', 't3', 't4']);
    expect(t.actions.removeRow('t4')).toBe(true);
    expect(t.state.totalRows).toBe(3);
    expect(t.actions.removeRow('t4')).toBe(false);
  });
});

describe('table core — notify discipline', () => {
  it('no-op actions do not notify', () => {
    const t = makeTable();
    const seen: number[] = [];
    const unsub = t.subscribe(() => seen.push(1));
    t.actions.setGlobalFilter('');
    expect(seen).toEqual([]);
    t.actions.commitEdit();
    expect(seen).toEqual([]);
    t.actions.cancelEdit();
    expect(seen).toEqual([]);
    t.actions.toggleRowSelected('t1', false); // force same as current
    expect(seen).toEqual([]);
    t.actions.updateRow('nope', {});
    expect(seen).toEqual([]);
    t.actions.clearSorting();
    expect(seen).toEqual([]);
    t.actions.setPageIndex(0);
    expect(seen).toEqual([]);
    unsub();
  });
});

// Bridge contract (dual-adapter test — svelte + vanilla on one core)
describe('table adapters', () => {
  it('react useTable is a function', () => {
    expect(typeof useTable).toBe('function');
  });

  it('svelte + vanilla mounted on one shared core agree', () => {
    const core = makeTable();
    const store = createTableStore(core);
    const vanilla = createVanillaTable(core);
    expect(vanilla).toBe(core);

    let storeState: TableState | null = null;
    const unsubStore = store.state.subscribe((s) => {
      storeState = s;
    });
    expect(storeState).not.toBeNull();
    expect(storeState!.rows).toHaveLength(3);

    store.actions.startEdit('t1', 'title');
    expect(vanilla.state.editing).toEqual({ rowId: 't1', columnId: 'title' });
    store.actions.setEditDraft('Zed');
    expect(store.actions.commitEdit()).toBe(true);
    expect(storeState!.rows[0]!.cells.title).toBe('Zed');
    expect(storeState!.canUndo).toBe(false); // no undo core composed
    expect(store.canUndo.subscribe).toBeDefined();
    unsubStore();
  });

  it('svelte createTableStore returns the documented surface', () => {
    const store = createTableStore({
      data: seed,
      columns,
    });
    expect(typeof store.state.subscribe).toBe('function');
    expect(typeof store.canUndo.subscribe).toBe('function');
    expect(typeof store.canRedo.subscribe).toBe('function');
    expect(typeof store.actions.sort).toBe('function');
    expect(typeof store.actions.commitEdit).toBe('function');
    expect(store.core).toBeDefined();
    let captured: TableState | null = null;
    const unsub = store.state.subscribe((s) => {
      captured = s;
    });
    expect(captured!.rows).toHaveLength(3);
    unsub();
  });

  it('vanilla returns the core itself for shared mounts', () => {
    const core = makeTable();
    const vanilla = createVanillaTable(core);
    expect(vanilla).toBe(core);
    const fresh = createVanillaTable({ data: seed, columns });
    expect(fresh).not.toBe(core);
    expect(fresh.state.rows).toHaveLength(3);
  });
});
