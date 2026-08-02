/**
 * Table core — headless datatable behind the standard bridge
 * (ADR 0034 wedge 6).
 *
 * Framework-free, DOM-free, timer-free: the grid engine is
 * `@tanstack/table-core` (adopted per ADR 0034 §4.2 — Tier 2, no DOM,
 * Node-testable), wrapped behind the HeadlessCore contract so every
 * behavior is deterministic. The Trellis-specific layer is built:
 *
 *   - rows are bound to entities — `updateRow`/cell edit mutate one row
 *     (one op when an app writes through `onCellEdit`);
 *   - `undoHistory` composes the undo-history service core:
 *     edit/add/remove each push one reversible command, and the table
 *     projects `canUndo`/`canRedo` (live, even for external pushes);
 *   - inline editing: `startEdit` → `setEditDraft` → `commitEdit` with
 *     per-column-type coercion (`number` rejects non-finite drafts) and an
 *     external write hook that can reject; grid moves cancel the editor.
 *
 *   const undo = createUndoHistoryCore();
 *   const table = createTableCore({ data: tasks, columns, undoHistory: undo });
 *   table.actions.startEdit('t1', 'title');
 *   table.actions.setEditDraft('Ship it');
 *   table.actions.commitEdit();     // one undo step; onCellEdit writes the op
 *   table.actions.undo();           // local row reverts; op-log reverses durably
 *
 * Boundary: schema-derived columns (forms-descriptor generator) and
 * durable entity writes live in the app layer.
 *
 * @module trellis/table
 */

import {
  createTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type TableState as TsTableState,
} from '@tanstack/table-core';

import type {
  CellValueType,
  EditingCell,
  SortDirection,
  SortSpec,
  TableActions,
  TableColumn,
  TableColumnView,
  TableConfig,
  TableRowView,
  TableState,
  UndoCommandLike,
  UndoLike,
  UseTableReturn,
} from './types.js';

export type {
  CellValueType,
  EditingCell,
  SortDirection,
  SortSpec,
  TableActions,
  TableColumn,
  TableColumnView,
  TableConfig,
  TableRowView,
  TableState,
  UndoCommandLike,
  UndoLike,
  UseTableReturn,
} from './types.js';

type RowOf<T> = T;

/** Coerce the draft string to the column's value type. */
function coerce(
  type: CellValueType,
  draft: string,
): { ok: true; value: unknown } | { ok: false } {
  switch (type) {
    case 'number': {
      const text = draft.trim();
      if (text === '') return { ok: true, value: null };
      const n = Number(text);
      return Number.isFinite(n) ? { ok: true, value: n } : { ok: false };
    }
    case 'boolean':
      return { ok: true, value: draft === 'true' || draft === '1' };
    default:
      return { ok: true, value: draft };
  }
}

export function createTableCore<T extends object>(
  config: TableConfig<T>,
): UseTableReturn<T> {
  const paginated = config.enablePagination ?? true;
  const pageSize =
    config.initialState?.pageSize ??
    (paginated ? 10 : Number.POSITIVE_INFINITY);

  const getRowId = (row: RowOf<T>, index: number): string => {
    if (config.getRowId) return config.getRowId(row, index);
    const id = (row as { id?: unknown }).id;
    return String(id ?? index);
  };

  const columnViews: TableColumnView[] = config.columns.map((col) => ({
    id: col.id,
    header: col.header ?? col.id,
    editable: col.editable ?? col.accessorFn === undefined,
    type: col.type ?? 'text',
    ...(col.width !== undefined ? { width: col.width } : {}),
    ...(col.align !== undefined ? { align: col.align } : {}),
  }));

  let rows: RowOf<T>[] = [...config.data];

  // The controlled state object lives outside the table: every TanStack
  // mutation flows through onStateChange into it (same-reference merges),
  // and it is seeded from table.initialState so feature state slices
  // (columnPinning, columnVisibility, …) always exist.
  const tsState = {} as TsTableState;

  const tsColumns = config.columns.map((col) => ({
    id: col.id,
    header: col.header ?? col.id,
    ...(col.accessorKey !== undefined ? { accessorKey: col.accessorKey } : {}),
    ...(col.accessorFn !== undefined ? { accessorFn: col.accessorFn } : {}),
  })) as ColumnDef<T>[];

  const table = createTable({
    data: rows,
    columns: tsColumns,
    state: tsState,
    onStateChange: (updater) => {
      Object.assign(
        tsState,
        typeof updater === 'function' ? updater(tsState) : updater,
      );
    },
    getRowId,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(paginated ? { getPaginationRowModel: getPaginationRowModel() } : {}),
  } as Parameters<typeof createTable<T>>[0]);

  Object.assign(tsState, table.initialState, {
    sorting: [...(config.initialState?.sorting ?? [])] as SortingState,
    globalFilter: config.initialState?.globalFilter ?? '',
    pagination: {
      pageIndex: config.initialState?.pageIndex ?? 0,
      pageSize,
    } as PaginationState,
    rowSelection: {} as RowSelectionState,
  });

  const undoHistory = config.undoHistory ?? null;
  let editing: EditingCell | null = null;
  let editDraft: string | null = null;

  const subscribers = new Set<() => void>();
  const notify = () => subscribers.forEach((fn) => fn());

  function valueOf(row: RowOf<T>, columnId: string): unknown {
    const col = config.columns.find((c) => c.id === columnId);
    if (!col) return undefined;
    if (col.accessorKey !== undefined) {
      return (row as Record<string, unknown>)[col.accessorKey];
    }
    return col.accessorFn ? col.accessorFn(row) : undefined;
  }

  function indexOfRow(rowId: string): number {
    return rows.findIndex((row, i) => getRowId(row, i) === rowId);
  }

  function syncData(): void {
    table.setOptions((prev) => ({ ...prev, data: rows }));
    clampPage();
    refresh();
  }

  function clampPage(): void {
    if (!paginated) return;
    const pi = table.getState().pagination.pageIndex;
    const last = Math.max(0, table.getPageCount() - 1);
    if (pi > last) {
      table.setPagination({ ...table.getState().pagination, pageIndex: last });
    }
  }

  /** Close the editor; returns true when one was open (caller must refresh). */
  function cancelEditing(): boolean {
    if (editing === null) return false;
    editing = null;
    editDraft = null;
    return true;
  }

  /** Apply one cell value to the local row (used by edit, undo, redo). */
  function applyCellValue(rowId: string, columnId: string, value: unknown): void {
    const index = indexOfRow(rowId);
    if (index === -1) return;
    const col = config.columns.find((c) => c.id === columnId);
    if (!col || col.accessorKey === undefined) return;
    const row = rows[index] as Record<string, unknown>;
    rows = rows.map((r, i) =>
      i === index ? ({ ...row, [col.accessorKey!]: value } as RowOf<T>) : r,
    );
    syncData();
  }

  function makeEditCommand(
    rowId: string,
    columnId: string,
    to: unknown,
    from: unknown,
    label: string,
  ): UndoCommandLike {
    const command: UndoCommandLike = {
      label,
      execute: () => applyCellValue(rowId, columnId, to),
      invert: () => ({
        label,
        execute: () => applyCellValue(rowId, columnId, from),
        invert: () => command,
      }),
    };
    return command;
  }

  function deriveState(): TableState {
    const rowModel = table.getRowModel();
    const pageRows = rowModel.rows;
    const filteredCount = table.getFilteredRowModel().rows.length;
    const selection = tsState.rowSelection;
    const selectedIds = Object.keys(selection).filter((id) => selection[id]);

    return {
      columns: columnViews,
      rows: pageRows.map(
        (r): TableRowView => ({
          id: r.id,
          cells: Object.fromEntries(
            r.getVisibleCells().map((c) => [c.column.id, c.getValue()]),
          ),
          selected: r.getIsSelected(),
        }),
      ),
      totalRows: filteredCount,
      pageCount: paginated ? table.getPageCount() : 1,
      pageIndex: paginated ? tsState.pagination.pageIndex : 0,
      pageSize: paginated ? tsState.pagination.pageSize : filteredCount,
      paginated,
      sorting: tsState.sorting.map((s) => ({ ...s })),
      globalFilter: tsState.globalFilter,
      selectedRows: selectedIds,
      allSelected: pageRows.length > 0 && pageRows.every((r) => r.getIsSelected()),
      someSelected: pageRows.some((r) => r.getIsSelected()),
      editing,
      editDraft,
      canUndo: undoHistory?.state.canUndo ?? false,
      canRedo: undoHistory?.state.canRedo ?? false,
    };
  }

  let state = deriveState();

  function refresh(): void {
    clampPage();
    state = deriveState();
    notify();
  }

  if (undoHistory) {
    undoHistory.subscribe(() => {
      clampPage();
      state = deriveState();
      notify();
    });
  }

  const actions: TableActions<T> = {
    sort: (columnId, dir) => {
      const cancelled = cancelEditing();
      const current = tsState.sorting[0];
      const next = (() => {
        if (dir !== undefined) {
          if (dir === 'none') {
            return current?.id === columnId ? [] : tsState.sorting;
          }
          return [{ id: columnId, desc: dir === 'desc' }];
        }
        if (!current || current.id !== columnId) {
          return [{ id: columnId, desc: false }];
        }
        if (current.desc) return [];
        return [{ id: columnId, desc: true }];
      })();
      if (JSON.stringify(next) === JSON.stringify(tsState.sorting)) {
        if (cancelled) refresh();
        return;
      }
      table.setSorting(next);
      table.setPagination({ ...tsState.pagination, pageIndex: 0 });
      refresh();
    },

    clearSorting: () => {
      const cancelled = cancelEditing();
      if (tsState.sorting.length === 0) {
        if (cancelled) refresh();
        return;
      }
      table.setSorting([]);
      table.setPagination({ ...tsState.pagination, pageIndex: 0 });
      refresh();
    },

    setGlobalFilter: (text) => {
      const cancelled = cancelEditing();
      if (text === tsState.globalFilter) {
        if (cancelled) refresh();
        return;
      }
      table.setGlobalFilter(text);
      table.setPagination({ ...tsState.pagination, pageIndex: 0 });
      refresh();
    },

    setPageSize: (size) => {
      if (size <= 0 || !paginated) return;
      const cancelled = cancelEditing();
      if (size === tsState.pagination.pageSize) {
        if (cancelled) refresh();
        return;
      }
      table.setPageSize(size);
      clampPage();
      refresh();
    },

    nextPage: () => {
      if (!paginated) return;
      const cancelled = cancelEditing();
      const last = Math.max(0, table.getPageCount() - 1);
      if (tsState.pagination.pageIndex >= last) {
        if (cancelled) refresh();
        return;
      }
      table.setPagination({ ...tsState.pagination, pageIndex: tsState.pagination.pageIndex + 1 });
      refresh();
    },

    previousPage: () => {
      if (!paginated) return;
      const cancelled = cancelEditing();
      if (tsState.pagination.pageIndex <= 0) {
        if (cancelled) refresh();
        return;
      }
      table.setPagination({ ...tsState.pagination, pageIndex: tsState.pagination.pageIndex - 1 });
      refresh();
    },

    setPageIndex: (index) => {
      if (!paginated) return;
      const cancelled = cancelEditing();
      const last = Math.max(0, table.getPageCount() - 1);
      const clamped = Math.max(0, Math.min(index, last));
      if (clamped === tsState.pagination.pageIndex) {
        if (cancelled) refresh();
        return;
      }
      table.setPagination({ ...tsState.pagination, pageIndex: clamped });
      refresh();
    },

    toggleRowSelected: (rowId, force) => {
      const row = table.getCoreRowModel().rows.find((r) => r.id === rowId);
      if (!row) return;
      if (force !== undefined && force === row.getIsSelected()) return;
      row.toggleSelected(force);
      refresh();
    },

    toggleAllSelected: (force) => {
      const pageRows = table.getRowModel().rows;
      const target =
        force ?? !(pageRows.length > 0 && pageRows.every((r) => r.getIsSelected()));
      for (const row of pageRows) row.toggleSelected(target);
      refresh();
    },

    startEdit: (rowId, columnId) => {
      const col = columnViews.find((c) => c.id === columnId);
      if (!col || !col.editable) return;
      if (indexOfRow(rowId) === -1) return;
      editing = { rowId, columnId };
      editDraft = String(valueOf(rows[indexOfRow(rowId)]!, columnId) ?? '');
      refresh();
    },

    setEditDraft: (value) => {
      if (editing === null) return;
      if (value === editDraft) return;
      editDraft = value;
      refresh();
    },

    commitEdit: () => {
      if (editing === null) return false;
      const { rowId, columnId } = editing;
      const col = columnViews.find((c) => c.id === columnId);
      const index = indexOfRow(rowId);
      if (!col || index === -1) {
        cancelEditing();
        refresh();
        return false;
      }
      const row = rows[index]!;
      const oldValue = valueOf(row, columnId);
      const draft = editDraft ?? '';
      const coerced = coerce(col.type, draft);
      if (!coerced.ok) return false;
      if (coerced.value === oldValue) {
        cancelEditing();
        refresh();
        return true;
      }
      if (config.onCellEdit && config.onCellEdit(rowId, columnId, coerced.value, row) === false) {
        return false;
      }
      applyCellValue(rowId, columnId, coerced.value);
      if (undoHistory) {
        undoHistory.actions.push(
          makeEditCommand(
            rowId,
            columnId,
            coerced.value,
            oldValue,
            `Edit ${col.header}`,
          ),
        );
      }
      cancelEditing();
      refresh();
      return true;
    },

    cancelEdit: () => {
      if (editing === null) return;
      cancelEditing();
      refresh();
    },

    updateRow: (rowId, patch) => {
      const index = indexOfRow(rowId);
      if (index === -1) return false;
      rows = rows.map((r, i) =>
        i === index ? ({ ...(r as object), ...patch } as RowOf<T>) : r,
      );
      syncData();
      return true;
    },

    addRow: (row) => {
      const id = getRowId(row, rows.length);
      rows = [...rows, row];
      syncData();
      if (undoHistory) {
        const command: UndoCommandLike = {
          label: 'Add row',
          execute: () => {
            rows = [...rows, row];
            syncData();
          },
          invert: () => ({
            label: 'Remove row',
            execute: () => {
              rows = rows.filter((r) => r !== row);
              syncData();
            },
            invert: () => command,
          }),
        };
        undoHistory.actions.push(command);
      }
      return id;
    },

    removeRow: (rowId) => {
      const index = indexOfRow(rowId);
      if (index === -1) return false;
      const row = rows[index]!;
      if (editing?.rowId === rowId) cancelEditing();
      rows = rows.filter((_, i) => i !== index);
      syncData();
      if (undoHistory) {
        const command: UndoCommandLike = {
          label: 'Remove row',
          execute: () => {
            const i = indexOfRow(rowId);
            if (i === -1) return;
            rows = rows.filter((_, x) => x !== i);
            syncData();
          },
          invert: () => ({
            label: 'Add row',
            execute: () => {
              rows = [...rows.slice(0, index), row, ...rows.slice(index)];
              syncData();
            },
            invert: () => command,
          }),
        };
        undoHistory.actions.push(command);
      }
      return true;
    },

    undo: () => {
      if (!undoHistory) return false;
      return undoHistory.actions.undo();
    },

    redo: () => {
      if (!undoHistory) return false;
      return undoHistory.actions.redo();
    },
  };

  const core: UseTableReturn<T> = {
    get state(): TableState {
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
