/**
 * Kanban core — dynamic board projection (ADR 0034 wedge 13).
 *
 * Framework-free, DOM-free, timer-free: a board projects a row set through
 * one group field. The row model adopts `@tanstack/table-core` (same engine
 * as table-core — filter/sort, no pagination); the group-field universe and
 * card bucketing are the built layer (the board needs multi-valued
 * membership and visible per-column buckets).
 *
 *   - columns are the distinct values of the group field over the filtered
 *     row set, plus configured extras (select options, relation targets);
 *     the `none` column folds rows without a value (hideable);
 *   - cards are entity rows — moving a card writes the entity's group field
 *     (`onCardMove` → one EQL-S write = one op); `undoHistory` composes the
 *     transient layer, and the core projects `canUndo`/`canRedo`;
 *   - boards are pure JSON `BoardDescriptor` views — view-state edits apply
 *     live, `saveBoard` commits them; presets switch from the toolbar;
 *   - drag-and-drop input is adapter DOM glue; the core rides `dragState`
 *     and exposes `moveCard`/`reorderCard`/`moveColumn` as pure actions.
 *
 *   const undo = createUndoHistoryCore();
 *   const board = createKanbanCore({
 *     data: tasks, columns,
 *     groupFields: [{ id: 'status', label: 'Status', affordance: 'select',
 *                     options: [{ value: 'todo' }, { value: 'done' }] }],
 *     groupFieldId: 'status',
 *     undoHistory: undo,
 *     rankField: 'boardRank',
 *     onCardMove: (rowId, fieldId, value) => kernel.writeRow(rowId, { [fieldId]: value.value }),
 *   });
 *   board.actions.moveCard('t1', 'o:todo', 'o:done'); // one op
 *   board.actions.undo();                             // local revert; op-log reverses durably
 *
 * Undo boundary: data-affecting card ops (`addCard`, `moveCard`,
 * `reorderCard`, `removeCard`) push one step each; column/view-state ops
 * are board-descriptor edits committed by `saveBoard` (matching Notion:
 * reordering columns isn't an undo action; moving a task is).
 *
 * @module trellis/kanban
 */

import {
  createTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type ColumnDef,
  type TableState as TsTableState,
} from '@tanstack/table-core';

import type {
  BoardDescriptor,
  KanbanActions,
  KanbanCardView,
  KanbanColumnView,
  KanbanConfig,
  KanbanDragState,
  KanbanFieldAffordance,
  KanbanGroupField,
  KanbanGroupValue,
  KanbanState,
  UseKanbanReturn,
} from './types.js';

export type {
  BoardDescriptor,
  KanbanActions,
  KanbanCardView,
  KanbanColumnSort,
  KanbanColumnView,
  KanbanConfig,
  KanbanDragState,
  KanbanFieldAffordance,
  KanbanGroupField,
  KanbanGroupValue,
  KanbanState,
  KanbanWriteHooks,
  UseKanbanReturn,
} from './types.js';
export type { TableColumn } from '../../table/core/index.js';

const NONE: KanbanGroupValue = { kind: 'none', value: null };

/** Canonical, URL-safe column key derived from a group value. */
function columnIdOf(gv: KanbanGroupValue): string {
  switch (gv.kind) {
    case 'option':
      return `o:${encodeURIComponent(gv.value)}`;
    case 'boolean':
      return `b:${gv.value ? 'true' : 'false'}`;
    case 'date':
      return `d:${gv.bucket}:${gv.start}`;
    case 'relation':
      return `r:${encodeURIComponent(gv.targetId)}`;
    case 'none':
      return 'none';
  }
}

/** Inverse of `columnIdOf` — null for malformed ids. */
function groupValueOfColumnId(id: string): KanbanGroupValue | null {
  if (id === 'none') return NONE;
  if (id.startsWith('o:')) return { kind: 'option', value: decodeURIComponent(id.slice(2)) };
  if (id === 'b:true') return { kind: 'boolean', value: true };
  if (id === 'b:false') return { kind: 'boolean', value: false };
  if (id.startsWith('d:')) {
    const [bucket, ...rest] = id.slice(2).split(':');
    if ((bucket === 'day' || bucket === 'week' || bucket === 'month') && rest.length === 1) {
      return { kind: 'date', bucket, start: rest[0]! };
    }
    return null;
  }
  if (id.startsWith('r:')) return { kind: 'relation', targetId: decodeURIComponent(id.slice(2)) };
  return null;
}

function isoDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** ISO start of a date bucket; null for missing/invalid values. */
function dateStartOf(raw: unknown, bucket: 'day' | 'week' | 'month'): KanbanGroupValue | null {
  if (raw == null || raw === '') return null;
  const d = raw instanceof Date ? raw : new Date(String(raw));
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  if (bucket === 'day') return { kind: 'date', bucket, start: isoDate(y, m, day) };
  if (bucket === 'month') return { kind: 'date', bucket, start: isoDate(y, m, 1) };
  const dow = (d.getUTCDay() + 6) % 7; // 0 = Monday
  const monday = new Date(Date.UTC(y, m, day - dow));
  return {
    kind: 'date',
    bucket,
    start: isoDate(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate()),
  };
}

export function createKanbanCore<T extends object>(
  config: KanbanConfig<T>,
): UseKanbanReturn<T> {
  const maxColumns = config.maxColumns ?? 50;
  const rankField = config.rankField ?? null;

  /** Groupable-field registry, seeded from config; options grow/shrink. */
  const fieldOptions: Record<string, { value: string; label?: string }[]> = {};
  for (const f of config.groupFields) {
    if (f.options) fieldOptions[f.id] = f.options.map((o) => ({ ...o }));
  }
  const optionsOf = (fieldId: string): { value: string; label?: string }[] =>
    (fieldOptions[fieldId] ??= []);

  /** A groupable field, or a synthesized text-like stand-in for unknown ids. */
  function fieldOf(fieldId: string): KanbanGroupField {
    return (
      config.groupFields.find((f) => f.id === fieldId) ?? {
        id: fieldId,
        label: fieldId,
        affordance: 'text',
        accessorKey: fieldId,
      }
    );
  }

  const isOptionBacked = (f: KanbanGroupField): boolean =>
    f.affordance === 'select' || f.affordance === 'status';

  function fieldValue(row: T, field: KanbanGroupField): unknown {
    if (field.accessorFn) return field.accessorFn(row);
    if (field.accessorKey !== undefined) {
      return (row as Record<string, unknown>)[field.accessorKey];
    }
    return (row as Record<string, unknown>)[field.id];
  }

  function colValueOf(row: T, columnId: string): unknown {
    const col = config.columns.find((c) => c.id === columnId);
    if (!col) return undefined;
    if (col.accessorKey !== undefined) return (row as Record<string, unknown>)[col.accessorKey];
    return col.accessorFn ? col.accessorFn(row) : undefined;
  }

  /** The membership key(s) of one row under a field. */
  function groupValuesOf(row: T, field: KanbanGroupField): KanbanGroupValue[] {
    const raw = fieldValue(row, field);
    switch (field.affordance) {
      case 'select':
      case 'status':
        return raw == null || raw === '' ? [NONE] : [{ kind: 'option', value: String(raw) }];
      case 'multi_select': {
        if (raw == null) return [NONE];
        const arr = Array.isArray(raw) ? raw : [];
        return arr.length === 0
          ? [NONE]
          : arr.map((v) => ({ kind: 'option', value: String(v) }));
      }
      case 'boolean':
        return raw == null ? [NONE] : [{ kind: 'boolean', value: Boolean(raw) }];
      case 'date': {
        const d = dateStartOf(raw, board.groupDateBy ?? 'day');
        return d ? [d] : [NONE];
      }
      case 'people':
      case 'relation':
        return raw == null ? [NONE] : [{ kind: 'relation', targetId: String(raw) }];
      case 'text':
      case 'number':
        return raw == null || raw === '' ? [NONE] : [{ kind: 'option', value: String(raw) }];
    }
  }

  function titleOf(gv: KanbanGroupValue, field: KanbanGroupField): string {
    switch (gv.kind) {
      case 'option': {
        const opt = optionsOf(field.id).find((o) => o.value === gv.value);
        return opt?.label ?? gv.value;
      }
      case 'boolean':
        return gv.value ? 'True' : 'False';
      case 'date':
        return gv.bucket === 'week' ? `Week of ${gv.start}` : gv.start;
      case 'relation': {
        const t = (field.relationTargets ?? []).find((x) => x.id === gv.targetId);
        return t?.title ?? gv.targetId;
      }
      case 'none':
        return `No ${field.label}`;
    }
  }

  // ---- seed state -------------------------------------------------------

  const seedBoard: BoardDescriptor = {
    id: 'board-1',
    name: 'Board',
    groupFieldId:
      config.board?.groupFieldId ?? config.groupFieldId ?? config.groupFields[0]?.id ?? '',
    columnOrder: [],
    columnColors: {},
    hiddenColumns: [],
    collapsedColumns: [],
    sortColumnsBy: 'manual',
    cardSort: null,
    ...config.board,
  };

  let board: BoardDescriptor = { ...seedBoard };
  const boards: Record<string, BoardDescriptor> = { [seedBoard.id]: { ...seedBoard } };
  for (const preset of config.boards ?? []) {
    if (!boards[preset.id]) boards[preset.id] = { ...preset };
  }

  let rows: T[] = [...config.data];
  let globalFilter = '';
  let dragState: KanbanDragState | null = null;

  const getRowId = (row: T, index: number): string => {
    if (config.getRowId) return config.getRowId(row, index);
    return String((row as { id?: unknown }).id ?? index);
  };

  // ---- row engine (adopted: @tanstack/table-core) ------------------------

  const tsState = {} as TsTableState;
  const tsColumns = config.columns.map(
    (col) =>
      ({
        id: col.id,
        header: col.header ?? col.id,
        ...(col.accessorKey !== undefined ? { accessorKey: col.accessorKey } : {}),
        ...(col.accessorFn !== undefined ? { accessorFn: col.accessorFn } : {}),
      }) as ColumnDef<T>,
  );

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
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  } as Parameters<typeof createTable<T>>[0]);

  Object.assign(tsState, table.initialState, {
    sorting: [] as TsTableState['sorting'],
    globalFilter: '',
  });

  const undoHistory = config.undoHistory ?? null;
  const subscribers = new Set<() => void>();
  const notify = () => subscribers.forEach((fn) => fn());

  // ---- column universe ---------------------------------------------------

  /**
   * The ordered distinct group values of a field over a row set, plus
   * configured extras (spec §4.1). Parameterized so `setGroupField` can
   * dry-run the guardrail.
   */
  function computeUniverse(fieldId: string, sourceRows: T[]): KanbanGroupValue[] {
    const field = fieldOf(fieldId);
    const values: KanbanGroupValue[] = [];
    const seen = new Set<string>();
    const push = (gv: KanbanGroupValue) => {
      const id = columnIdOf(gv);
      if (!seen.has(id)) {
        seen.add(id);
        values.push(gv);
      }
    };

    switch (field.affordance) {
      case 'select':
      case 'status':
        for (const opt of optionsOf(fieldId)) push({ kind: 'option', value: opt.value });
        break;
      case 'boolean':
        push({ kind: 'boolean', value: true });
        push({ kind: 'boolean', value: false });
        break;
      case 'date': {
        const found = new Map<string, Extract<KanbanGroupValue, { kind: 'date' }>>();
        for (const row of sourceRows) {
          for (const gv of groupValuesOf(row, field)) {
            if (gv.kind === 'date') found.set(columnIdOf(gv), gv);
          }
        }
        [...found.values()]
          .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0))
          .forEach(push);
        break;
      }
      case 'people':
      case 'relation':
        for (const t of field.relationTargets ?? []) push({ kind: 'relation', targetId: t.id });
        for (const row of sourceRows) {
          for (const gv of groupValuesOf(row, field)) push(gv);
        }
        break;
      case 'multi_select':
      case 'text':
      case 'number':
        for (const row of sourceRows) {
          for (const gv of groupValuesOf(row, field)) push(gv);
        }
        break;
    }

    if (!board.hideNoValueColumn) push(NONE);
    return values;
  }

  /** Column ids a row currently belongs to (multi_select can be several). */
  function membershipsOf(row: T): string[] {
    return [...new Set(groupValuesOf(row, fieldOf(board.groupFieldId)).map(columnIdOf))];
  }

  /**
   * The raw row value a group value writes to. `writeAccessorFn` inverts
   * a derived accessor (folded statuses → graph values); otherwise the
   * group value's own raw form.
   */
  function groupWriteValue(
    row: T,
    field: KanbanGroupField,
    gv: KanbanGroupValue,
  ): unknown {
    if (field.writeAccessorFn) return field.writeAccessorFn(row, gv);
    if (gv.kind === 'none') return null;
    if (gv.kind === 'option') return gv.value;
    if (gv.kind === 'boolean') return gv.value;
    if (gv.kind === 'relation') return gv.targetId;
    return gv.start;
  }

  function rankOf(row: T): number | null {
    if (!rankField) return null;
    const raw = (row as Record<string, unknown>)[rankField];
    if (raw == null || raw === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  function cardTitle(row: T): string {
    const first = config.columns[0];
    if (first) {
      const v = colValueOf(row, first.id);
      if (v != null && v !== '') return String(v);
    }
    return String((row as { id?: unknown }).id ?? 'card');
  }

  function cellsOf(row: T): Record<string, unknown> {
    return Object.fromEntries(config.columns.map((c) => [c.id, colValueOf(row, c.id)]));
  }

  // ---- derive ------------------------------------------------------------

  function visibleRows(): T[] {
    return table.getSortedRowModel().rows.map((r) => r.original);
  }

  function deriveState(): KanbanState {
    table.setOptions((prev) => ({ ...prev, data: rows }));
    table.setGlobalFilter(globalFilter);
    table.setSorting(
      board.cardSort ? [{ id: board.cardSort.id, desc: board.cardSort.desc }] : [],
    );
    const visRows = visibleRows();
    const idOf = new Map(rows.map((r, i) => [r as object, getRowId(r, i)] as const));
    const field = fieldOf(board.groupFieldId);

    const universe = computeUniverse(board.groupFieldId, visRows);

    // Bucket rows into columns (multi_select rows carry several memberships).
    const buckets = new Map<string, KanbanCardView[]>();
    for (const row of visRows) {
      const rid = String(idOf.get(row as object) ?? '');
      for (const cid of membershipsOf(row)) {
        const cards = buckets.get(cid) ?? [];
        cards.push({ id: rid, columnId: cid, cells: cellsOf(row), rank: rankOf(row) });
        buckets.set(cid, cards);
      }
    }

    // Within-column order: manual rank (when no cardSort), else data order.
    if (!board.cardSort && rankField) {
      for (const cards of buckets.values()) {
        cards.sort((a, b) => (a.rank ?? Number.POSITIVE_INFINITY) - (b.rank ?? Number.POSITIVE_INFINITY));
      }
    }

    const rawCols: KanbanColumnView[] = universe.map((gv) => {
      const id = columnIdOf(gv);
      const cards = buckets.get(id) ?? [];
      return {
        id,
        title: titleOf(gv, field),
        color: board.columnColors[id] ?? null,
        count: cards.length,
        collapsed: board.collapsedColumns.includes(id),
        hidden: board.hiddenColumns.includes(id),
        cards,
      };
    });

    let columns: KanbanColumnView[];
    if (board.sortColumnsBy === 'name') {
      columns = [...rawCols].sort((a, b) => a.title.localeCompare(b.title));
    } else if (board.sortColumnsBy === 'count') {
      columns = [...rawCols].sort((a, b) => b.count - a.count);
    } else {
      columns = [...rawCols].sort((a, b) => {
        const ia = board.columnOrder.indexOf(a.id);
        const ib = board.columnOrder.indexOf(b.id);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return 0;
      });
    }

    return {
      board: { ...board },
      boards: Object.fromEntries(
        Object.entries(boards).map(([id, b]) => [id, { ...b }]),
      ),
      columns,
      totalCards: visRows.length,
      groupFieldOptions: universe.map((gv) => ({
        value: columnIdOf(gv),
        label: titleOf(gv, field),
      })),
      globalFilter,
      groupableFields: config.groupFields.map((f) => ({
        id: f.id,
        label: f.label,
        affordance: f.affordance,
      })),
      dragState,
      canUndo: undoHistory?.state.canUndo ?? false,
      canRedo: undoHistory?.state.canRedo ?? false,
    };
  }

  let state = deriveState();

  function refresh(): void {
    state = deriveState();
    notify();
  }

  function indexOfRow(rowId: string): number {
    return rows.findIndex((row, i) => getRowId(row, i) === rowId);
  }

  /**
   * Write a raw group-field value (+ rank) to one row — undo's workhorse.
   * The field is captured at command creation: undo/redo must write the
   * field the move targeted, not the board's current group field (the view
   * may have been remapped since).
   */
  function writeRowValue(
    rowId: string,
    field: KanbanGroupField,
    raw: unknown,
    rank: number | null,
  ): void {
    const index = indexOfRow(rowId);
    if (index === -1) return;
    const row = rows[index]!;
    const key = field.accessorKey ?? field.id;
    let next = { ...row, [key]: raw } as T;
    if (rankField) {
      next = { ...(next as object), [rankField]: rank } as T;
    }
    rows = rows.map((r, i) => (i === index ? next : r));
    refresh();
  }

  /**
   * The raw row value a move to `toGv` would produce, plus whether it
   * differs from the current value. Multi_select removes the source
   * membership and appends the destination one.
   */
  function computeRaw(
    row: T,
    fromColumnId: string,
    toGv: KanbanGroupValue,
  ): { changed: boolean; raw: unknown } {
    const field = fieldOf(board.groupFieldId);
    if (field.affordance === 'multi_select') {
      const current = Array.isArray(fieldValue(row, field))
        ? (fieldValue(row, field) as unknown[])
        : [];
      const set = new Set(current.map(String));
      const fromGv = groupValueOfColumnId(fromColumnId);
      if (fromGv?.kind === 'option') set.delete(fromGv.value);
      if (toGv.kind === 'none') {
        // Drop just this membership; other memberships survive. The field
        // clears to null only when no memberships remain.
        const next = [...set];
        const changed =
          next.length !== current.length || next.some((v, i) => String(current[i]) !== v);
        return { changed, raw: next.length ? next : null };
      }
      if (toGv.kind === 'option') {
        set.add(toGv.value);
        const next = [...set];
        const changed =
          next.length !== current.length || next.some((v, i) => String(current[i]) !== v);
        return { changed, raw: next };
      }
      return { changed: false, raw: current };
    }
    const old = fieldValue(row, field);
    switch (toGv.kind) {
      case 'none':
        return { changed: old != null && old !== '', raw: groupWriteValue(row, field, toGv) };
      case 'option':
        return { changed: String(old ?? '') !== toGv.value, raw: groupWriteValue(row, field, toGv) };
      case 'boolean':
        return { changed: Boolean(old) !== toGv.value, raw: groupWriteValue(row, field, toGv) };
      case 'relation':
        return { changed: String(old ?? '') !== toGv.targetId, raw: groupWriteValue(row, field, toGv) };
      case 'date':
        return { changed: String(old ?? '') !== toGv.start, raw: groupWriteValue(row, field, toGv) };
    }
  }

  const actions: KanbanActions<T> = {
    // ---- board level ------------------------------------------------------

    setGroupField: (fieldId) => {
      if (fieldId === board.groupFieldId) return true;
      if (!config.groupFields.some((f) => f.id === fieldId)) return false;
      // Guardrail (§5.4): a universe larger than maxColumns refuses.
      const nextUniverse = computeUniverse(fieldId, visibleRows());
      if (nextUniverse.length > maxColumns) return false;
      const nextIds = new Set(nextUniverse.map(columnIdOf));
      board = {
        ...board,
        groupFieldId: fieldId,
        columnColors: Object.fromEntries(
          Object.entries(board.columnColors).filter(([id]) => nextIds.has(id)),
        ),
        columnOrder: board.columnOrder.filter((id) => nextIds.has(id)),
        hiddenColumns: board.hiddenColumns.filter((id) => nextIds.has(id)),
        collapsedColumns: board.collapsedColumns.filter((id) => nextIds.has(id)),
        cardSort:
          board.cardSort && nextIds.has(board.cardSort.id) ? board.cardSort : null,
      };
      refresh();
      return true;
    },

    createBoard: (descriptor) => {
      if (boards[descriptor.id]) return false;
      boards[descriptor.id] = { ...descriptor };
      refresh();
      return true;
    },

    duplicateBoard: (id) => {
      const source = boards[id];
      if (!source) return false;
      const copyId = `${id}-copy`;
      if (boards[copyId]) return false;
      boards[copyId] = { ...source, id: copyId };
      refresh();
      return copyId;
    },

    activateBoard: (id) => {
      const preset = boards[id];
      if (!preset) return false;
      board = { ...preset };
      refresh();
      return true;
    },

    renameBoard: (id, name) => {
      const preset = boards[id];
      if (!preset) return false;
      boards[id] = { ...preset, name };
      if (board.id === id) board = { ...board, name };
      refresh();
      return true;
    },

    deleteBoard: (id) => {
      if (id === board.id) return false;
      if (!boards[id]) return false;
      delete boards[id];
      refresh();
      return true;
    },

    saveBoard: () => {
      boards[board.id] = { ...board };
      refresh();
      return true;
    },

    // ---- column level (view state — never undo steps) ---------------------

    createColumn: ({ label, color, value }) => {
      const field = fieldOf(board.groupFieldId);
      const v = value ?? label;
      if (v === '') return false;
      if (!isOptionBacked(field) && field.affordance !== 'text' && field.affordance !== 'number') {
        return false;
      }
      const id = columnIdOf({ kind: 'option', value: v });
      if (state.columns.some((c) => c.id === id)) return false;
      if (isOptionBacked(field)) {
        optionsOf(field.id).push({ value: v, label: v === label ? undefined : label });
        config.onCreateOption?.(field.id, v, color);
      }
      if (color) board = { ...board, columnColors: { ...board.columnColors, [id]: color } };
      refresh();
      return id;
    },

    renameColumn: (columnId, label) => {
      const col = state.columns.find((c) => c.id === columnId);
      if (!col) return false;
      const gv = groupValueOfColumnId(columnId);
      if (!gv || gv.kind !== 'option') return false;
      const field = fieldOf(board.groupFieldId);
      if (!isOptionBacked(field)) return false;
      const from = gv.value;
      if (from === label) return true;
      const newId = columnIdOf({ kind: 'option', value: label });
      if (state.columns.some((c) => c.id === newId)) return false;
      const key = field.accessorKey ?? field.id;

      fieldOptions[field.id] = optionsOf(field.id).map((o) =>
        o.value === from ? { value: label, label: o.label === o.value ? undefined : o.label } : o,
      );
      if (field.affordance === 'multi_select') {
        rows = rows.map((r) => {
          const raw = fieldValue(r, field);
          if (!Array.isArray(raw)) return r;
          return {
            ...r,
            [key]: raw.map((x) => (String(x) === from ? label : x)),
          } as T;
        });
      } else {
        rows = rows.map((r) => {
          const raw = fieldValue(r, field);
          if (String(raw ?? '') !== from) return r;
          return { ...r, [key]: label } as T;
        });
      }

      const remap = (arr: string[]) => arr.map((id) => (id === columnId ? newId : id));
      const colors: Record<string, string> = {};
      for (const [id, c] of Object.entries(board.columnColors)) {
        colors[id === columnId ? newId : id] = c;
      }
      board = {
        ...board,
        columnColors: colors,
        columnOrder: remap(board.columnOrder),
        hiddenColumns: remap(board.hiddenColumns),
        collapsedColumns: remap(board.collapsedColumns),
      };
      config.onRenameOption?.(field.id, from, label);
      refresh();
      return true;
    },

    deleteColumn: (columnId, opts) => {
      const col = state.columns.find((c) => c.id === columnId);
      if (!col) return false;
      const gv = groupValueOfColumnId(columnId);
      if (!gv) return false;
      if (gv.kind === 'none') return false; // structural — hide via hideNoValueColumn
      const destId = opts?.moveCardsTo ?? 'none';
      const destGv = groupValueOfColumnId(destId);
      const field = fieldOf(board.groupFieldId);
      const key = field.accessorKey ?? field.id;

      const nextRows: T[] = [];
      for (const r of rows) {
        const memberships = membershipsOf(r);
        if (!memberships.includes(columnId)) {
          nextRows.push(r);
          continue;
        }
        if (field.affordance === 'multi_select') {
          // Membership removal is local-only in v0 (a group value cannot
          // express arrays, so there is no onCardMove shape for it).
          const arr = Array.isArray(fieldValue(r, field))
            ? [...(fieldValue(r, field) as unknown[])]
            : [];
          const next = arr.filter((x) => String(x) !== (gv.kind === 'option' ? gv.value : ''));
          nextRows.push({ ...r, [key]: next.length ? next : null } as T);
          continue;
        }
        if (destGv) {
          const cardId = getRowId(r, nextRows.length);
          const hookOk =
            config.onCardMove === undefined ||
            config.onCardMove(cardId, field.id, destGv) !== false;
          if (hookOk) {
            nextRows.push({ ...r, [key]: groupWriteValue(r, field, destGv) } as T);
            continue;
          }
        }
        // No valid destination (or a rejected move) → remove with the column.
        const cardId = getRowId(r, nextRows.length);
        if (config.onCardDelete && config.onCardDelete(cardId) === false) {
          nextRows.push(r);
          continue;
        }
      }

      rows = nextRows;
      if (isOptionBacked(field) && gv.kind === 'option') {
        fieldOptions[field.id] = optionsOf(field.id).filter((o) => o.value !== gv.value);
      }
      board = {
        ...board,
        columnOrder: board.columnOrder.filter((id) => id !== columnId),
        columnColors: Object.fromEntries(
          Object.entries(board.columnColors).filter(([id]) => id !== columnId),
        ),
        hiddenColumns: board.hiddenColumns.filter((id) => id !== columnId),
        collapsedColumns: board.collapsedColumns.filter((id) => id !== columnId),
      };
      refresh();
      return true;
    },

    moveColumn: (columnId, index) => {
      const current = state.columns.map((c) => c.id);
      if (!current.includes(columnId)) return false;
      const next = [...current];
      const from = next.indexOf(columnId);
      next.splice(from, 1);
      const clamped = Math.max(0, Math.min(index, next.length));
      next.splice(clamped, 0, columnId);
      if (next.join('\u0000') === current.join('\u0000')) return true;
      board = { ...board, columnOrder: next, sortColumnsBy: 'manual' };
      refresh();
      return true;
    },

    sortColumns: (mode) => {
      if (mode === board.sortColumnsBy) return;
      board = { ...board, sortColumnsBy: mode };
      refresh();
    },

    setColumnColor: (columnId, color) => {
      if (!state.columns.some((c) => c.id === columnId)) return false;
      if ((board.columnColors[columnId] ?? null) === color) return true;
      const columnColors = { ...board.columnColors };
      if (color === null) delete columnColors[columnId];
      else columnColors[columnId] = color;
      board = { ...board, columnColors };
      refresh();
      return true;
    },

    setColumnCollapsed: (columnId, collapsed) => {
      const col = state.columns.find((c) => c.id === columnId);
      if (!col) return false;
      if (col.collapsed === collapsed) return true;
      const collapsedColumns = board.collapsedColumns.filter((id) => id !== columnId);
      if (collapsed) collapsedColumns.push(columnId);
      board = { ...board, collapsedColumns };
      refresh();
      return true;
    },

    setColumnHidden: (columnId, hidden) => {
      const col = state.columns.find((c) => c.id === columnId);
      if (!col) return false;
      if (col.hidden === hidden) return true;
      const hiddenColumns = board.hiddenColumns.filter((id) => id !== columnId);
      if (hidden) hiddenColumns.push(columnId);
      board = { ...board, hiddenColumns };
      refresh();
      return true;
    },

    // ---- card level (data mutations — one undo step each) ----------------

    addCard: (columnId, draft) => {
      const col = state.columns.find((c) => c.id === columnId);
      if (!col) return false;
      const gv = groupValueOfColumnId(columnId);
      if (!gv) return false;
      if (config.onCardAdd && config.onCardAdd(draft, gv) === false) return false;
      const field = fieldOf(board.groupFieldId);
      const key = field.accessorKey ?? field.id;
      const raw = groupWriteValue(draft as T, field, gv);
      const row = { ...(draft as object), [key]: raw } as T;
      const id = getRowId(row, rows.length);
      rows = [...rows, row];
      refresh();
      if (undoHistory) {
        const command: Parameters<typeof undoHistory.actions.push>[0] = {
          label: `Add ${cardTitle(row)}`,
          execute: () => {
            if (indexOfRow(id) !== -1) return;
            rows = [...rows, row];
            refresh();
          },
          invert: () => ({
            label: `Remove ${cardTitle(row)}`,
            execute: () => {
              const i = indexOfRow(id);
              if (i === -1) return;
              rows = rows.filter((_, x) => x !== i);
              refresh();
            },
            invert: () => command,
          }),
        };
        undoHistory.actions.push(command);
      }
      return id;
    },

    moveCard: (cardId, fromColumnId, toColumnId, opts) => {
      const index = indexOfRow(cardId);
      if (index === -1) return false;
      const row = rows[index]!;
      if (!membershipsOf(row).includes(fromColumnId)) return false;
      const toGv = groupValueOfColumnId(toColumnId);
      if (!toGv) return false;
      if (toGv.kind !== 'none' && !state.columns.some((c) => c.id === toColumnId)) {
        return false;
      }
      // The none column is always a valid destination (hidden ≠ absent).

      const field = fieldOf(board.groupFieldId);
      const key = field.accessorKey ?? field.id;
      const { changed: valueChanged, raw: toRaw } = computeRaw(row, fromColumnId, toGv);
      // Undo restores the stored value at the write location — for derived
      // accessor fields this is the true graph value, not the folded key.
      const prevRaw = (row as Record<string, unknown>)[key];
      const prevRank = rankOf(row);
      const newRank = rankField && opts?.index !== undefined ? opts.index : prevRank;
      if (!valueChanged && newRank === prevRank) return true;
      if (valueChanged && config.onCardMove && config.onCardMove(cardId, field.id, toGv) === false) {
        return false;
      }
      writeRowValue(cardId, field, toRaw, newRank);
      if (undoHistory) {
        const command: Parameters<typeof undoHistory.actions.push>[0] = {
          label: `Move ${cardTitle(row)}`,
          execute: () => writeRowValue(cardId, field, toRaw, newRank),
          invert: () => ({
            label: 'Move back',
            execute: () => writeRowValue(cardId, field, prevRaw, prevRank),
            invert: () => command,
          }),
        };
        undoHistory.actions.push(command);
      }
      return true;
    },

    reorderCard: (cardId, columnId, index) => {
      if (!rankField) return false;
      const col = state.columns.find((c) => c.id === columnId);
      if (!col) return false;
      const rowIndex = indexOfRow(cardId);
      if (rowIndex === -1) return false;
      if (!membershipsOf(rows[rowIndex]!).includes(columnId)) return false;
      const order = col.cards.map((c) => c.id);
      const from = order.indexOf(cardId);
      if (from === -1) return false;
      const next = [...order];
      next.splice(from, 1);
      next.splice(Math.max(0, Math.min(index, next.length)), 0, cardId);
      const prevRanks = new Map(col.cards.map((c) => [c.id, c.rank]));
      if (next.join('\u0000') === order.join('\u0000')) return true;
      const applyRanks = (map: Map<string, number | null>) => {
        rows = rows.map((r, i) => {
          const rid = getRowId(r, i);
          const rank = map.get(rid);
          if (rank === undefined) return r;
          return { ...(r as object), [rankField!]: rank } as T;
        });
        refresh();
      };
      applyRanks(new Map(next.map((id, i) => [id, i] as const)));
      if (undoHistory) {
        const command: Parameters<typeof undoHistory.actions.push>[0] = {
          label: 'Reorder card',
          execute: () => applyRanks(new Map(next.map((id, i) => [id, i] as const))),
          invert: () => ({
            label: 'Reorder card',
            execute: () => applyRanks(prevRanks),
            invert: () => command,
          }),
        };
        undoHistory.actions.push(command);
      }
      return true;
    },

    removeCard: (cardId) => {
      const index = indexOfRow(cardId);
      if (index === -1) return false;
      const row = rows[index]!;
      if (config.onCardDelete && config.onCardDelete(cardId) === false) return false;
      rows = rows.filter((_, i) => i !== index);
      refresh();
      if (undoHistory) {
        const command: Parameters<typeof undoHistory.actions.push>[0] = {
          label: `Remove ${cardTitle(row)}`,
          execute: () => {
            const i = indexOfRow(cardId);
            if (i === -1) return;
            rows = rows.filter((_, x) => x !== i);
            refresh();
          },
          invert: () => ({
            label: `Add ${cardTitle(row)}`,
            execute: () => {
              if (indexOfRow(cardId) !== -1) return;
              rows = [...rows.slice(0, index), row, ...rows.slice(index)];
              refresh();
            },
            invert: () => command,
          }),
        };
        undoHistory.actions.push(command);
      }
      return true;
    },

    // ---- row level (delegated to the wrapped engine) ---------------------

    // Raw row-set surface (snapshot sync / import): no undo step, no
    // write hook — the row set is snapshot-owned. User edits go through
    // the card actions (addCard/moveCard/removeCard), which push undo.

    addRow: (row) => {
      const id = getRowId(row, rows.length);
      rows = [...rows, row];
      refresh();
      return id;
    },

    removeRow: (rowId) => {
      const index = indexOfRow(rowId);
      if (index === -1) return false;
      rows = rows.filter((_, i) => i !== index);
      refresh();
      return true;
    },

    updateRow: (rowId, patch) => {
      const index = indexOfRow(rowId);
      if (index === -1) return false;
      rows = rows.map((r, i) =>
        i === index ? ({ ...(r as object), ...patch } as T) : r,
      );
      refresh();
      return true;
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

    setCardSort: (spec) => {
      const prev = board.cardSort;
      const same =
        prev === null && spec === null
          ? true
          : prev !== null && spec !== null && prev.id === spec.id && prev.desc === spec.desc;
      if (same) return;
      board = { ...board, cardSort: spec ? { ...spec } : null };
      refresh();
    },

    // ---- adapter glue -----------------------------------------------------

    setDragState: (drag) => {
      if (JSON.stringify(drag) === JSON.stringify(dragState)) return;
      dragState = drag ? { ...drag } : null;
      refresh();
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

  if (undoHistory) {
    undoHistory.subscribe(() => {
      state = deriveState();
      notify();
    });
  }

  const core: UseKanbanReturn<T> = {
    get state(): KanbanState {
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
