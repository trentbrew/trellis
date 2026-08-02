/**
 * Kanban core tests (ADR 0034 wedge 13) — group-field universe, card
 * bucketing, board actions, undo composition, guardrails, adapters.
 * All deterministic, zero DOM, zero timers.
 */

import { describe, expect, it } from 'vitest';
import { createUndoHistoryCore } from '../../src/undo-history/core/index.js';
import { createKanbanCore } from '../../src/kanban/core/index.js';
import type {
  BoardDescriptor,
  KanbanConfig,
  KanbanGroupField,
  KanbanState,
  TableColumn,
} from '../../src/kanban/core/index.js';
import { createKanbanStore } from '../../src/kanban/svelte/index.js';
import { createVanillaKanban } from '../../src/kanban/vanilla/index.js';
import { useKanban } from '../../src/kanban/react/index.js';

interface Task {
  id: string;
  title: string;
  status: string | null;
  priority: 'low' | 'high' | null;
  owner: string | null;
  tags: string[] | null;
  due: string | null;
  blocked: boolean | null;
  boardRank?: number | null;
}

const seed: Task[] = [
  { id: 't1', title: 'Alpha', status: 'todo', priority: 'high', owner: 'trent', tags: ['core'], due: '2026-08-03', blocked: true },
  { id: 't2', title: 'Beta', status: 'done', priority: 'low', owner: 'ada', tags: ['ui'], due: '2026-08-15', blocked: false },
  { id: 't3', title: 'Gamma', status: 'todo', priority: 'low', owner: 'ada', tags: ['core', 'ui'], due: null, blocked: null },
  { id: 't4', title: 'Delta', status: null, priority: null, owner: null, tags: [], due: null, blocked: null },
];

const columns: TableColumn<Task>[] = [
  { id: 'title', accessorKey: 'title', header: 'Title' },
  { id: 'status', accessorKey: 'status', header: 'Status' },
  { id: 'priority', accessorKey: 'priority', header: 'Priority' },
];

const groupFields: KanbanGroupField[] = [
  {
    id: 'status',
    label: 'Status',
    affordance: 'status',
    accessorKey: 'status',
    options: [
      { value: 'todo', label: 'To Do' },
      { value: 'doing', label: 'In Progress' },
      { value: 'done', label: 'Done' },
    ],
  },
  {
    id: 'priority',
    label: 'Priority',
    affordance: 'select',
    accessorKey: 'priority',
    options: [{ value: 'low' }, { value: 'high' }],
  },
  {
    id: 'owner',
    label: 'Owner',
    affordance: 'relation',
    accessorKey: 'owner',
    relationTargets: [
      { id: 'trent', title: 'Trent' },
      { id: 'ada', title: 'Ada' },
    ],
  },
  { id: 'tags', label: 'Tags', affordance: 'multi_select', accessorKey: 'tags' },
  { id: 'due', label: 'Due', affordance: 'date', accessorKey: 'due' },
  { id: 'blocked', label: 'Blocked', affordance: 'boolean', accessorKey: 'blocked' },
];

const makeBoard = (
  config: Partial<Parameters<typeof createKanbanCore<Task>>[0]> = {},
) =>
  createKanbanCore<Task>({
    data: seed,
    columns,
    groupFields,
    groupFieldId: 'status',
    ...config,
  });

const col = (s: KanbanState, id: string) => s.columns.find((c) => c.id === id)!;
const cardIds = (s: KanbanState, columnId: string) =>
  col(s, columnId).cards.map((c) => c.id);

describe('kanban core — group-field universe', () => {
  it('status field: one column per option + none, option labels as titles', () => {
    const b = makeBoard();
    expect(b.state.columns.map((c) => c.id)).toEqual([
      'o:todo',
      'o:doing',
      'o:done',
      'none',
    ]);
    expect(b.state.columns.map((c) => c.title)).toEqual([
      'To Do',
      'In Progress',
      'Done',
      'No Status',
    ]);
    expect(b.state.columns.map((c) => c.count)).toEqual([2, 0, 1, 1]);
    expect(b.state.totalCards).toBe(4);
    expect(cardIds(b.state, 'o:todo')).toEqual(['t1', 't3']);
    expect(cardIds(b.state, 'o:done')).toEqual(['t2']);
    expect(cardIds(b.state, 'none')).toEqual(['t4']);
    expect(col(b.state, 'o:todo').cards[0]!.cells.title).toBe('Alpha');
    expect(col(b.state, 'o:todo').cards[0]!.rank).toBeNull();
  });

  it('boolean field: true / false columns + none', () => {
    const b = makeBoard({ groupFieldId: 'blocked' });
    expect(b.state.columns.map((c) => c.id)).toEqual(['b:true', 'b:false', 'none']);
    expect(b.state.columns.map((c) => c.title)).toEqual(['True', 'False', 'No Blocked']);
    expect(cardIds(b.state, 'b:true')).toEqual(['t1']);
    expect(cardIds(b.state, 'b:false')).toEqual(['t2']);
    expect(cardIds(b.state, 'none')).toEqual(['t3', 't4']);
  });

  it('date field buckets by day', () => {
    const b = makeBoard({ groupFieldId: 'due', board: { id: 'b', name: 'B', groupDateBy: 'day' } });
    expect(b.state.columns.map((c) => c.id)).toEqual([
      'd:day:2026-08-03',
      'd:day:2026-08-15',
      'none',
    ]);
    expect(b.state.columns.map((c) => c.title)).toEqual([
      '2026-08-03',
      '2026-08-15',
      'No Due',
    ]);
    expect(cardIds(b.state, 'd:day:2026-08-03')).toEqual(['t1']);
    expect(cardIds(b.state, 'd:day:2026-08-15')).toEqual(['t2']);
  });

  it('date field buckets by week and month (chronological order)', () => {
    const week = makeBoard({ groupFieldId: 'due', board: { id: 'b', name: 'B', groupDateBy: 'week' } });
    expect(week.state.columns.map((c) => c.id)).toEqual([
      'd:week:2026-08-03',
      'd:week:2026-08-10',
      'none',
    ]);
    expect(week.state.columns.map((c) => c.title)).toEqual([
      'Week of 2026-08-03',
      'Week of 2026-08-10',
      'No Due',
    ]);

    const month = makeBoard({ groupFieldId: 'due', board: { id: 'b', name: 'B', groupDateBy: 'month' } });
    expect(month.state.columns.map((c) => c.id)).toEqual([
      'd:month:2026-08-01',
      'none',
    ]);
    expect(cardIds(month.state, 'd:month:2026-08-01')).toEqual(['t1', 't2']);
  });

  it('multi_select field: one column per distinct option, rows multi-bucket', () => {
    const b = makeBoard({ groupFieldId: 'tags' });
    expect(b.state.columns.map((c) => c.id)).toEqual(['o:core', 'o:ui', 'none']);
    expect(cardIds(b.state, 'o:core')).toEqual(['t1', 't3']);
    expect(cardIds(b.state, 'o:ui')).toEqual(['t2', 't3']);
    expect(cardIds(b.state, 'none')).toEqual(['t4']);
    // totalCards counts rows once, not memberships
    expect(b.state.totalCards).toBe(4);
  });

  it('relation field: one column per target (config order), + none', () => {
    const b = makeBoard({ groupFieldId: 'owner' });
    expect(b.state.columns.map((c) => c.id)).toEqual(['r:trent', 'r:ada', 'none']);
    expect(b.state.columns.map((c) => c.title)).toEqual(['Trent', 'Ada', 'No Owner']);
    expect(cardIds(b.state, 'r:trent')).toEqual(['t1']);
    expect(cardIds(b.state, 'r:ada')).toEqual(['t2', 't3']);
    expect(cardIds(b.state, 'none')).toEqual(['t4']);
  });

  it('hideNoValueColumn drops the none column', () => {
    const b = makeBoard({ board: { id: 'b', name: 'B', hideNoValueColumn: true } });
    expect(b.state.columns.map((c) => c.id)).toEqual(['o:todo', 'o:doing', 'o:done']);
    expect(b.state.totalCards).toBe(4);
  });

  it('empty row set yields no columns (board-empty state)', () => {
    const withText: KanbanGroupField[] = [
      ...groupFields,
      { id: 'title', label: 'Title', affordance: 'text', accessorKey: 'title' },
    ];
    const b = makeBoard({
      data: [],
      groupFields: withText,
      groupFieldId: 'title',
      board: { id: 'b', name: 'B', hideNoValueColumn: true },
    });
    expect(b.state.columns).toEqual([]);
    expect(b.state.totalCards).toBe(0);
  });
});

describe('kanban core — setGroupField remaps the board', () => {
  it('recomputes the universe, re-buckets cards, preserves shared colors', () => {
    const b = makeBoard();
    b.actions.setColumnColor('o:todo', 'blue');
    b.actions.setColumnColor('none', 'red');
    b.actions.moveColumn('none', 0);
    expect(b.state.board.columnOrder[0]).toBe('none');

    expect(b.actions.setGroupField('priority')).toBe(true);
    expect(b.state.board.groupFieldId).toBe('priority');
    // manual order survivors lead; stale entries cleared
    expect(b.state.columns.map((c) => c.id)).toEqual(['none', 'o:low', 'o:high']);
    expect(cardIds(b.state, 'o:low')).toEqual(['t2', 't3']);
    expect(cardIds(b.state, 'o:high')).toEqual(['t1']);
    // color on o:todo dropped (not in the new universe); none survives
    expect(col(b.state, 'o:low').color).toBeNull();
    expect(col(b.state, 'none').color).toBe('red');
    expect(b.state.board.columnOrder).toEqual(['none']);

    // switching back: cards re-bucket to the status universe again
    expect(b.actions.setGroupField('status')).toBe(true);
    expect(b.state.columns.map((c) => c.id)).toEqual([
      'none',
      'o:todo',
      'o:doing',
      'o:done',
    ]);
    expect(cardIds(b.state, 'o:todo')).toEqual(['t1', 't3']);
    expect(col(b.state, 'o:todo').color).toBeNull();
    expect(col(b.state, 'none').color).toBe('red');
  });

  it('unknown fields are refused', () => {
    const b = makeBoard();
    expect(b.actions.setGroupField('nope')).toBe(false);
    expect(b.state.board.groupFieldId).toBe('status');
  });
});

describe('kanban core — moveCard writes the group field', () => {
  it('updates the row, fires onCardMove, and is one undo step', () => {
    const moves: Array<{ rowId: string; fieldId: string; value: unknown }> = [];
    const undo = createUndoHistoryCore();
    const b = makeBoard({
      undoHistory: undo,
      onCardMove: (rowId, fieldId, value) => {
        moves.push({ rowId, fieldId, value });
      },
    });
    expect(b.actions.moveCard('t3', 'o:todo', 'o:done')).toBe(true);
    expect(moves).toEqual([
      { rowId: 't3', fieldId: 'status', value: { kind: 'option', value: 'done' } },
    ]);
    expect(cardIds(b.state, 'o:done')).toEqual(['t2', 't3']);
    expect(cardIds(b.state, 'o:todo')).toEqual(['t1']);
    expect(b.state.canUndo).toBe(true);

    expect(b.actions.undo()).toBe(true);
    expect(cardIds(b.state, 'o:todo')).toEqual(['t1', 't3']);
    expect(cardIds(b.state, 'o:done')).toEqual(['t2']);
    expect(b.state.canRedo).toBe(true);
    expect(b.actions.redo()).toBe(true);
    expect(cardIds(b.state, 'o:done')).toEqual(['t2', 't3']);
    expect(moves).toHaveLength(1); // undo/redo stay in the transient layer
  });

  it('move to the none column clears the value (sets null)', () => {
    const undo = createUndoHistoryCore();
    const b = makeBoard({ undoHistory: undo });
    b.actions.moveCard('t3', 'o:todo', 'none');
    expect(cardIds(b.state, 'none')).toEqual(['t3', 't4']);
    expect(b.actions.undo()).toBe(true);
    expect(cardIds(b.state, 'o:todo')).toEqual(['t1', 't3']);
  });

  it('onCardMove can reject; rejected moves are unchanged and unlogged', () => {
    const undo = createUndoHistoryCore();
    const b = makeBoard({
      undoHistory: undo,
      onCardMove: () => false,
    });
    expect(b.actions.moveCard('t3', 'o:todo', 'o:done')).toBe(false);
    expect(cardIds(b.state, 'o:todo')).toEqual(['t1', 't3']);
    expect(b.state.canUndo).toBe(false);
  });

  it('no-ops on unknown rows/columns and same-column moves', () => {
    const b = makeBoard();
    const seen: number[] = [];
    const unsub = b.subscribe(() => seen.push(1));
    expect(b.actions.moveCard('nope', 'o:todo', 'o:done')).toBe(false);
    expect(b.actions.moveCard('t3', 'o:todo', 'o:todo')).toBe(true); // same value
    expect(b.actions.moveCard('t3', 'o:todo', 'bogus')).toBe(false);
    expect(seen).toEqual([]);
    unsub();
  });

  it('multi_select moveCard swaps memberships', () => {
    const undo = createUndoHistoryCore();
    const b = makeBoard({ groupFieldId: 'tags', undoHistory: undo });
    b.actions.moveCard('t3', 'o:ui', 'none');
    // t3 loses only the ui membership; core survives, none untouched
    expect(cardIds(b.state, 'o:ui')).toEqual(['t2']);
    expect(cardIds(b.state, 'o:core')).toEqual(['t1', 't3']);
    expect(cardIds(b.state, 'none')).toEqual(['t4']);
    b.actions.undo();
    expect(cardIds(b.state, 'o:ui')).toEqual(['t2', 't3']);
  });

  it('undo restores the field the move targeted, even after setGroupField', () => {
    const undo = createUndoHistoryCore();
    const b = makeBoard({ undoHistory: undo });
    b.actions.moveCard('t3', 'o:todo', 'o:done'); // status: todo → done
    b.actions.setGroupField('priority'); // view remaps to another field
    expect(b.actions.undo()).toBe(true);
    // t3's status is restored; its priority is untouched by the undo
    expect(cardIds(b.state, 'o:low')).toEqual(['t2', 't3']);
    expect(cardIds(b.state, 'o:high')).toEqual(['t1']);
    b.actions.setGroupField('status');
    expect(cardIds(b.state, 'o:todo')).toEqual(['t1', 't3']);
    expect(cardIds(b.state, 'o:done')).toEqual(['t2']);
  });

  it('moveCard with opts.index writes the rank in the same step', () => {
    const undo = createUndoHistoryCore();
    const b = makeBoard({ undoHistory: undo, rankField: 'boardRank' });
    expect(b.actions.moveCard('t1', 'o:todo', 'o:done', { index: 0 })).toBe(true);
    expect(col(b.state, 'o:done').cards[0]!.rank).toBe(0);
    expect(cardIds(b.state, 'o:done')).toEqual(['t1', 't2']);
    expect(b.actions.undo()).toBe(true);
    expect(cardIds(b.state, 'o:todo')).toEqual(['t1', 't3']);
    expect(col(b.state, 'o:todo').cards[0]!.rank).toBeNull();
  });
});

describe('kanban core — column ops (view state)', () => {
  it('createColumn adds an option column and calls onCreateOption', () => {
    const created: Array<{ fieldId: string; value: string; color?: string }> = [];
    const b = makeBoard({
      onCreateOption: (fieldId, value, color) => created.push({ fieldId, value, color }),
    });
    expect(b.actions.createColumn({ label: 'Shipped', color: 'green' })).toBe('o:Shipped');
    expect(created).toEqual([{ fieldId: 'status', value: 'Shipped', color: 'green' }]);
    const c = col(b.state, 'o:Shipped');
    expect(c.title).toBe('Shipped');
    expect(c.color).toBe('green');
    expect(c.count).toBe(0);
    // duplicates are refused
    expect(b.actions.createColumn({ label: 'Shipped' })).toBe(false);
    // boolean fields cannot take new columns
    const bool = makeBoard({ groupFieldId: 'blocked' });
    expect(bool.actions.createColumn({ label: 'Maybe' })).toBe(false);
  });

  it('renameColumn renames the value: rows re-bucket, colors travel', () => {
    const renames: Array<{ fieldId: string; from: string; to: string }> = [];
    const b = makeBoard({
      onRenameOption: (fieldId, from, to) => renames.push({ fieldId, from, to }),
    });
    b.actions.setColumnColor('o:done', 'purple');
    expect(b.actions.renameColumn('o:done', 'Completed')).toBe(true);
    expect(renames).toEqual([{ fieldId: 'status', from: 'done', to: 'Completed' }]);
    expect(col(b.state, 'o:Completed').color).toBe('purple');
    expect(col(b.state, 'o:Completed').cards.map((c) => c.id)).toEqual(['t2']);
    expect(b.state.columns.map((c) => c.id)).toEqual([
      'o:todo',
      'o:doing',
      'o:Completed',
      'none',
    ]);
    // non-option columns cannot be renamed
    expect(b.actions.renameColumn('none', 'Nothing')).toBe(false);
    expect(b.actions.renameColumn('o:done', 'doing')).toBe(false); // value collision
  });

  it('deleteColumn moves cards to the destination by default (none)', () => {
    const b = makeBoard();
    expect(b.actions.deleteColumn('o:done')).toBe(true);
    expect(b.state.columns.map((c) => c.id)).toEqual(['o:todo', 'o:doing', 'none']);
    expect(cardIds(b.state, 'none')).toEqual(['t2', 't4']);
  });

  it('deleteColumn with moveCardsTo relocates cards there', () => {
    const b = makeBoard();
    b.actions.moveCard('t1', 'o:todo', 'o:doing');
    expect(b.actions.deleteColumn('o:doing', { moveCardsTo: 'o:done' })).toBe(true);
    expect(cardIds(b.state, 'o:done')).toEqual(['t1', 't2']);
    expect(b.state.columns.map((c) => c.id)).toEqual(['o:todo', 'o:done', 'none']);
  });

  it('deleteColumn on a hidden destination still succeeds (hidden ≠ absent)', () => {
    const b = makeBoard();
    b.actions.setColumnHidden('o:doing', true);
    b.actions.moveCard('t1', 'o:todo', 'o:doing');
    expect(b.actions.deleteColumn('o:doing', { moveCardsTo: 'o:done' })).toBe(true);
    expect(cardIds(b.state, 'o:done')).toEqual(['t1', 't2']);
  });

  it('deleteColumn removes the option from the universe; none is structural', () => {
    const b = makeBoard();
    expect(b.actions.deleteColumn('none')).toBe(false);
    expect(b.actions.deleteColumn('o:doing')).toBe(true);
    expect(b.state.columns.map((c) => c.id)).toEqual(['o:todo', 'o:done', 'none']);
    expect(b.actions.createColumn({ label: 'doing' })).toBe('o:doing');
  });

  it('moveColumn reorders and flips to manual', () => {
    const b = makeBoard();
    expect(b.actions.moveColumn('o:done', 0)).toBe(true);
    expect(b.state.columns.map((c) => c.id)).toEqual(['o:done', 'o:todo', 'o:doing', 'none']);
    expect(b.state.board.sortColumnsBy).toBe('manual');
    expect(b.state.board.columnOrder[0]).toBe('o:done');
  });

  it('sortColumns orders by name and count', () => {
    const b = makeBoard();
    b.actions.sortColumns('name');
    expect(b.state.columns.map((c) => c.id)).toEqual([
      'o:done',
      'o:doing',
      'none',
      'o:todo',
    ]);
    b.actions.sortColumns('count');
    expect(b.state.columns.map((c) => c.id)).toEqual([
      'o:todo',
      'o:done',
      'none',
      'o:doing',
    ]);
    b.actions.sortColumns('manual');
    expect(b.state.board.sortColumnsBy).toBe('manual');
  });

  it('setColumnColor / collapse / hide are view state', () => {
    const b = makeBoard();
    expect(b.actions.setColumnColor('o:todo', 'blue')).toBe(true);
    expect(col(b.state, 'o:todo').color).toBe('blue');
    expect(b.actions.setColumnColor('o:todo', null)).toBe(true);
    expect(col(b.state, 'o:todo').color).toBeNull();
    expect(b.actions.setColumnCollapsed('o:todo', true)).toBe(true);
    expect(col(b.state, 'o:todo').collapsed).toBe(true);
    expect(b.actions.setColumnHidden('o:todo', true)).toBe(true);
    expect(col(b.state, 'o:todo').hidden).toBe(true);
    expect(b.actions.setColumnHidden('o:todo', false)).toBe(true);
    expect(col(b.state, 'o:todo').hidden).toBe(false);
    expect(b.actions.setColumnColor('nope', 'blue')).toBe(false);
  });
});

describe('kanban core — board presets and saveBoard', () => {
  it('column ops are not undo steps', () => {
    const undo = createUndoHistoryCore();
    const b = makeBoard({ undoHistory: undo });
    b.actions.setColumnColor('o:todo', 'blue');
    b.actions.sortColumns('name');
    b.actions.moveColumn('o:done', 0);
    b.actions.setColumnHidden('o:doing', true);
    expect(b.state.canUndo).toBe(false);
  });

  it('saveBoard commits the active descriptor; activateBoard restores it', () => {
    const b = makeBoard();
    b.actions.setColumnColor('o:todo', 'blue');
    expect(b.state.boards['board-1']!.columnColors).toEqual({});
    expect(b.actions.saveBoard()).toBe(true);
    expect(b.state.boards['board-1']!.columnColors).toEqual({ 'o:todo': 'blue' });

    const other: BoardDescriptor = {
      id: 'other',
      name: 'Priority board',
      groupFieldId: 'priority',
      columnOrder: [],
      columnColors: {},
      hiddenColumns: [],
      collapsedColumns: [],
      sortColumnsBy: 'manual',
      cardSort: null,
    };
    expect(b.actions.createBoard(other)).toBe(true);
    expect(b.actions.createBoard(other)).toBe(false); // id taken
    expect(b.actions.activateBoard('other')).toBe(true);
    expect(b.state.board.groupFieldId).toBe('priority');
    expect(b.state.columns.map((c) => c.id)).toEqual(['o:low', 'o:high', 'none']);

    // unsaved edits to the previous board are discarded by the switch
    expect(b.actions.activateBoard('board-1')).toBe(true);
    expect(col(b.state, 'o:todo').color).toBe('blue'); // saved state
  });

  it('duplicateBoard / renameBoard / deleteBoard manage presets', () => {
    const b = makeBoard();
    b.actions.createBoard({
      id: 'b2',
      name: 'B2',
      groupFieldId: 'status',
      columnOrder: [],
      columnColors: {},
      hiddenColumns: [],
      collapsedColumns: [],
      sortColumnsBy: 'manual',
      cardSort: null,
    });
    expect(b.actions.duplicateBoard('b2')).toBe('b2-copy');
    expect(b.actions.duplicateBoard('b2')).toBe(false); // id taken
    expect(b.actions.duplicateBoard('nope')).toBe(false);

    expect(b.actions.renameBoard('b2', 'B2 renamed')).toBe(true);
    expect(b.state.boards['b2']!.name).toBe('B2 renamed');
    b.actions.activateBoard('b2');
    expect(b.actions.renameBoard('b2', 'Active renamed')).toBe(true);
    expect(b.state.board.name).toBe('Active renamed');

    expect(b.actions.deleteBoard('b2-copy')).toBe(true);
    expect(b.actions.deleteBoard('nope')).toBe(false);
    expect(b.actions.deleteBoard('b2')).toBe(false); // active
  });
});

describe('kanban core — reorderCard and ranks', () => {
  it('requires a configured rankField', () => {
    const b = makeBoard();
    expect(b.actions.reorderCard('t1', 'o:todo', 1)).toBe(false);
  });

  it('renumbers the column and is undoable', () => {
    const undo = createUndoHistoryCore();
    const b = makeBoard({ undoHistory: undo, rankField: 'boardRank' });
    expect(b.actions.reorderCard('t1', 'o:todo', 1)).toBe(true);
    expect(cardIds(b.state, 'o:todo')).toEqual(['t3', 't1']);
    expect(col(b.state, 'o:todo').cards.map((c) => c.rank)).toEqual([0, 1]);
    expect(b.actions.undo()).toBe(true);
    expect(cardIds(b.state, 'o:todo')).toEqual(['t1', 't3']);
    expect(col(b.state, 'o:todo').cards.map((c) => c.rank)).toEqual([null, null]);
    expect(b.actions.redo()).toBe(true);
    expect(cardIds(b.state, 'o:todo')).toEqual(['t3', 't1']);
  });

  it('returns false for unknown rows or non-member columns', () => {
    const b = makeBoard({ rankField: 'boardRank' });
    expect(b.actions.reorderCard('nope', 'o:todo', 0)).toBe(false);
    expect(b.actions.reorderCard('t2', 'o:todo', 0)).toBe(false); // t2 is done
  });
});

describe('kanban core — addCard / removeCard', () => {
  it('addCard creates a row with the column value and is undoable', () => {
    const added: Array<{ draft: Partial<Task>; value: unknown }> = [];
    const undo = createUndoHistoryCore();
    const b = makeBoard({
      undoHistory: undo,
      onCardAdd: (draft, value) => { added.push({ draft, value }); },
    });
    expect(b.actions.addCard('o:todo', { title: 'New task' })).toBe('4');
    expect(added).toEqual([
      { draft: { title: 'New task' }, value: { kind: 'option', value: 'todo' } },
    ]);
    expect(cardIds(b.state, 'o:todo')).toEqual(['t1', 't3', '4']);
    expect(b.actions.undo()).toBe(true);
    expect(cardIds(b.state, 'o:todo')).toEqual(['t1', 't3']);
    expect(b.actions.redo()).toBe(true);
    expect(cardIds(b.state, 'o:todo')).toEqual(['t1', 't3', '4']);
  });

  it('addCard to the none column clears the group value', () => {
    const b = makeBoard();
    b.actions.addCard('none', { title: 'Unslotted' });
    expect(cardIds(b.state, 'none')).toEqual(['t4', '4']);
  });

  it('removeCard deletes the row, guards via onCardDelete, and is undoable', () => {
    const deleted: string[] = [];
    const undo = createUndoHistoryCore();
    const b = makeBoard({
      undoHistory: undo,
      onCardDelete: (rowId) => {
        deleted.push(rowId);
      },
    });
    expect(b.actions.removeCard('t1')).toBe(true);
    expect(deleted).toEqual(['t1']);
    expect(b.state.totalCards).toBe(3);
    expect(b.actions.undo()).toBe(true);
    expect(b.state.totalCards).toBe(4);
    expect(cardIds(b.state, 'o:todo')).toEqual(['t1', 't3']);
  });

  it('onCardDelete can reject', () => {
    const b = makeBoard({ onCardDelete: () => false });
    expect(b.actions.removeCard('t1')).toBe(false);
    expect(b.state.totalCards).toBe(4);
  });
});

describe('kanban core — row mutation', () => {
  it('writeAccessorFn inverts a derived accessor: moves write graph values', () => {
    // Two statuses fold into one column; the board must write the graph
    // status, not the column key, and undo must restore the true stored
    // value (queue, not the folded backlog).
    const folded: KanbanGroupField[] = [
      {
        id: 'status',
        label: 'Status',
        affordance: 'select',
        accessorKey: 'status',
        accessorFn: (r) =>
          (r as Task).status === 'closed' ? 'done' : (r as Task).status === 'queue' ? 'backlog' : 'backlog',
        writeAccessorFn: (_r, gv) =>
          gv.kind === 'option'
            ? gv.value === 'done'
              ? 'closed'
              : 'backlog'
            : null,
        options: [{ value: 'backlog' }, { value: 'done' }],
      },
    ];
    const seed: Task[] = [
      { id: 'q1', title: 'Queued', status: 'queue', priority: 'low', owner: null, tags: [], due: null, blocked: null },
    ];
    const undo = createUndoHistoryCore();
    const b = createKanbanCore<Task>({
      data: seed,
      columns,
      groupFields: folded,
      groupFieldId: 'status',
      undoHistory: undo,
      board: { id: 'b', name: 'B', hideNoValueColumn: true },
    });
    expect(cardIds(b.state, 'o:backlog')).toEqual(['q1']); // queue folds in
    b.actions.moveCard('q1', 'o:backlog', 'o:done');
    expect(cardIds(b.state, 'o:done')).toEqual(['q1']); // re-bucketed
    expect(cardIds(b.state, 'o:backlog')).toEqual([]);
    expect(b.actions.undo()).toBe(true);
    expect(cardIds(b.state, 'o:backlog')).toEqual(['q1']);
  });

  it('updateRow patches one row and returns false for unknown ids', () => {
    const b = makeBoard();
    expect(b.actions.updateRow('t1', { title: 'Alpha 2' })).toBe(true);
    expect(col(b.state, 'o:todo').cards[0]!.cells.title).toBe('Alpha 2');
    expect(cardIds(b.state, 'o:todo')).toEqual(['t1', 't3']);
    expect(b.actions.updateRow('nope', { title: 'x' })).toBe(false);
  });

  it('updateRow re-buckets when the group field value changes', () => {
    const b = makeBoard();
    b.actions.updateRow('t1', { status: 'done' });
    expect(cardIds(b.state, 'o:todo')).toEqual(['t3']);
    expect(cardIds(b.state, 'o:done')).toEqual(['t1', 't2']);
  });

  it('updateRow is not an undo step and fires no write hooks', () => {
    const undo = createUndoHistoryCore();
    const moves: string[] = [];
    const b = makeBoard({
      undoHistory: undo,
      onCardMove: () => {
        moves.push('move');
      },
    });
    b.actions.updateRow('t1', { title: 'Alpha 2' });
    expect(b.state.canUndo).toBe(false);
    expect(moves).toEqual([]);
  });

  it('addRow/removeRow are snapshot-sync surfaces: no undo, no hooks', () => {
    const undo = createUndoHistoryCore();
    const dels: string[] = [];
    const b = makeBoard({
      undoHistory: undo,
      onCardDelete: (rowId) => {
        dels.push(rowId);
      },
    });
    expect(b.actions.addRow({ id: 't9', title: 'Zeta', status: 'todo', priority: null, owner: null, tags: [], due: null, blocked: null })).toBe('t9');
    expect(cardIds(b.state, 'o:todo')).toEqual(['t1', 't3', 't9']);
    expect(b.actions.removeRow('t9')).toBe(true);
    expect(b.state.totalCards).toBe(4);
    expect(b.actions.removeRow('t9')).toBe(false);
    expect(b.state.canUndo).toBe(false);
    expect(dels).toEqual([]);
  });
});

describe('kanban core — row-level filter and sort', () => {
  it('setGlobalFilter delegates to the wrapped row engine', () => {
    const b = makeBoard();
    b.actions.setGlobalFilter('alpha');
    expect(b.state.totalCards).toBe(1);
    expect(cardIds(b.state, 'o:todo')).toEqual(['t1']);
    expect(b.state.columns.map((c) => c.count)).toEqual([1, 0, 0, 0]);
    b.actions.clearGlobalFilter();
    expect(b.state.totalCards).toBe(4);
  });

  it('setCardSort orders within columns and falls back to data order', () => {
    const b = makeBoard();
    b.actions.setCardSort({ id: 'title', desc: false });
    expect(cardIds(b.state, 'o:todo')).toEqual(['t1', 't3']); // Alpha < Gamma
    b.actions.setCardSort({ id: 'title', desc: true });
    expect(cardIds(b.state, 'o:todo')).toEqual(['t3', 't1']);
    b.actions.setCardSort(null);
    expect(cardIds(b.state, 'o:todo')).toEqual(['t1', 't3']);
    expect(b.state.board.cardSort).toBeNull();
  });

  it('setGlobalFilter and setCardSort are not undo steps', () => {
    const undo = createUndoHistoryCore();
    const b = makeBoard({ undoHistory: undo });
    b.actions.setGlobalFilter('x');
    b.actions.setCardSort({ id: 'title', desc: true });
    expect(b.state.canUndo).toBe(false);
  });
});

describe('kanban core — guardrails and drag state', () => {
  it('setGroupField refuses universes larger than maxColumns', () => {
    const b = makeBoard({ maxColumns: 2 });
    // owner universe: trent + ada + none = 3
    expect(b.actions.setGroupField('owner')).toBe(false);
    expect(b.state.board.groupFieldId).toBe('status');
    const roomy = makeBoard({ maxColumns: 5 });
    expect(roomy.actions.setGroupField('owner')).toBe(true);
  });

  it('text/number stretch grouping is allowed within maxColumns', () => {
    const withText: KanbanGroupField[] = [
      ...groupFields,
      { id: 'title', label: 'Title', affordance: 'text', accessorKey: 'title' },
    ];
    const b = makeBoard({ groupFields: withText, maxColumns: 2 });
    expect(b.actions.setGroupField('title')).toBe(false); // 4 distinct titles
    const roomy = makeBoard({ groupFields: withText, maxColumns: 10 });
    expect(roomy.actions.setGroupField('title')).toBe(true);
    expect(roomy.state.columns.map((c) => c.id)).toEqual([
      'o:Alpha',
      'o:Beta',
      'o:Gamma',
      'o:Delta',
      'none',
    ]);
  });

  it('dragState rides core state without undo steps', () => {
    const undo = createUndoHistoryCore();
    const b = makeBoard({ undoHistory: undo });
    b.actions.setDragState({ cardId: 't1', columnId: 'o:todo', overColumnId: 'o:done' });
    expect(b.state.dragState).toEqual({
      cardId: 't1',
      columnId: 'o:todo',
      overColumnId: 'o:done',
    });
    b.actions.setDragState(null);
    expect(b.state.dragState).toBeNull();
    expect(b.state.canUndo).toBe(false);
  });
});

describe('kanban core — notify discipline', () => {
  it('no-op actions do not notify', () => {
    const b = makeBoard();
    const seen: number[] = [];
    const unsub = b.subscribe(() => seen.push(1));
    b.actions.setGlobalFilter('');
    b.actions.clearGlobalFilter();
    b.actions.setCardSort(null);
    b.actions.setDragState(null);
    b.actions.setColumnColor('o:todo', null); // already default
    b.actions.setColumnCollapsed('o:todo', false);
    b.actions.setColumnHidden('o:todo', false);
    b.actions.moveColumn('o:todo', 0); // already first
    b.actions.setGroupField('status'); // already active
    b.actions.removeCard('nope');
    expect(seen).toEqual([]);
    unsub();
  });
});

// Bridge contract (dual-adapter test — svelte + vanilla on one core)
describe('kanban adapters', () => {
  it('react useKanban is a function', () => {
    expect(typeof useKanban).toBe('function');
  });

  it('svelte + vanilla mounted on one shared core agree', () => {
    const core = makeBoard();
    const store = createKanbanStore(core);
    const vanilla = createVanillaKanban(core);
    expect(vanilla).toBe(core);

    let storeState: KanbanState | null = null;
    const unsubStore = store.state.subscribe((s) => {
      storeState = s;
    });
    expect(storeState).not.toBeNull();
    expect(storeState!.columns).toHaveLength(4);

    store.actions.moveCard('t3', 'o:todo', 'o:done');
    expect(cardIds(vanilla.state, 'o:done')).toEqual(['t2', 't3']);
    expect(storeState!.columns[2]!.cards.map((c) => c.id)).toEqual(['t2', 't3']);
    expect(store.canUndo.subscribe).toBeDefined();
    unsubStore();
  });

  it('svelte createKanbanStore returns the documented surface', () => {
    const store = createKanbanStore({
      data: seed,
      columns,
      groupFields,
      groupFieldId: 'status',
    });
    expect(typeof store.state.subscribe).toBe('function');
    expect(typeof store.canUndo.subscribe).toBe('function');
    expect(typeof store.canRedo.subscribe).toBe('function');
    expect(typeof store.actions.moveCard).toBe('function');
    expect(store.core).toBeDefined();
    let captured: KanbanState | null = null;
    const unsub = store.state.subscribe((s) => {
      captured = s;
    });
    expect(captured!.columns).toHaveLength(4);
    unsub();
  });

  it('vanilla returns the core itself for shared mounts', () => {
    const core = makeBoard();
    expect(createVanillaKanban(core)).toBe(core);
    const fresh = createVanillaKanban({
      data: seed,
      columns,
      groupFields,
      groupFieldId: 'status',
    });
    expect(fresh).not.toBe(core);
    expect(fresh.state.columns).toHaveLength(4);
  });
});
