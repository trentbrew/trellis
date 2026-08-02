/**
 * Admin kanban tests (ADR 0034 wedge 13, spec §9) — the operator
 * console's issue board as a kanban-core consumer: ISSUE_COLUMNS
 * mapping, snapshot diff-sync, board persistence, and the
 * move-card → one-op write hook. DOM-free.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  ADMIN_BOARD_DEFAULTS,
  BOARD_STORAGE_KEY,
  columnKeyOf,
  createAdminBoardCore,
  loadBoardDescriptor,
  saveBoardDescriptor,
  statusOf,
  syncRows,
  type AdminIssueRow,
  type BoardStorage,
} from '../../src/ui/admin-kanban.js';
import type { BoardDescriptor } from '../../src/kanban/core/index.js';

function memoryStorage(init: Record<string, string> = {}): BoardStorage {
  const map = new Map(Object.entries(init));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
  };
}

const issues = (): AdminIssueRow[] => [
  { id: 'TRL-1', title: 'Alpha', status: 'backlog', priority: 'high', labels: [], laneIds: [] },
  { id: 'TRL-2', title: 'Beta', status: 'in_progress', priority: 'low', labels: [], laneIds: ['lane-1'] },
  { id: 'TRL-3', title: 'Gamma', status: 'closed', priority: 'medium', labels: ['bug'], laneIds: [] },
  { id: 'TRL-4', title: 'Delta', status: 'queue', priority: 'low', labels: [], laneIds: [] },
];

const colIds = (core: ReturnType<typeof createAdminBoardCore>, key: string) =>
  core.state.columns.find((c) => c.id === key)?.cards.map((card) => card.id) ?? [];
const cardCount = (core: ReturnType<typeof createAdminBoardCore>, key: string) =>
  core.state.columns.find((c) => c.id === key)?.count ?? 0;

describe('columnKeyOf / statusOf — ISSUE_COLUMNS mapping', () => {
  it('folds statuses onto the three canonical keys', () => {
    expect(columnKeyOf('backlog')).toBe('backlog');
    expect(columnKeyOf('queue')).toBe('backlog');
    expect(columnKeyOf('in_progress')).toBe('in-progress');
    expect(columnKeyOf('paused')).toBe('in-progress');
    expect(columnKeyOf('closed')).toBe('done');
    expect(columnKeyOf(undefined)).toBe('backlog');
    expect(columnKeyOf('triaged')).toBe('backlog'); // unknown → backlog fold
  });

  it('statusOf is the inverse (writes graph values)', () => {
    expect(statusOf('backlog')).toBe('backlog');
    expect(statusOf('in-progress')).toBe('in_progress');
    expect(statusOf('done')).toBe('closed');
  });

  it('defaults carry the three ISSUE_COLUMNS columns, manual order', () => {
    expect(ADMIN_BOARD_DEFAULTS).toMatchObject({
      id: 'admin-issues',
      groupFieldId: 'status',
      columnOrder: ['o:backlog', 'o:in-progress', 'o:done'],
      sortColumnsBy: 'manual',
      hideNoValueColumn: true,
    });
  });
});

describe('board descriptor persistence', () => {
  it('loads defaults when nothing is stored', () => {
    const storage = memoryStorage();
    expect(loadBoardDescriptor(storage)).toEqual(ADMIN_BOARD_DEFAULTS);
  });

  it('round-trips through storage', () => {
    const storage = memoryStorage();
    const board: BoardDescriptor = {
      ...ADMIN_BOARD_DEFAULTS,
      columnColors: { 'o:backlog': 'blue' },
      hiddenColumns: ['o:done'],
    };
    saveBoardDescriptor(board, storage);
    expect(loadBoardDescriptor(storage)).toEqual(board);
    expect(storage.getItem(BOARD_STORAGE_KEY)).toContain('"o:backlog":"blue"');
  });

  it('ignores corrupt payloads and foreign keys', () => {
    const storage = memoryStorage({
      [BOARD_STORAGE_KEY]: JSON.stringify({
        id: 'evil',
        groupFieldId: 'owner',
        columnColors: { 'o:backlog': 'blue' },
        hacked: true,
      }),
    });
    const board = loadBoardDescriptor(storage);
    expect(board.id).toBe(ADMIN_BOARD_DEFAULTS.id);
    expect(board.groupFieldId).toBe('status');
    expect(board.columnColors).toEqual({ 'o:backlog': 'blue' });
    expect(board).not.toHaveProperty('hacked');

    const corrupt = memoryStorage({ [BOARD_STORAGE_KEY]: 'not json{' });
    expect(loadBoardDescriptor(corrupt)).toEqual(ADMIN_BOARD_DEFAULTS);
  });

  it('is a no-op without storage', () => {
    expect(loadBoardDescriptor(null)).toEqual(ADMIN_BOARD_DEFAULTS);
    expect(() => saveBoardDescriptor(ADMIN_BOARD_DEFAULTS, null)).not.toThrow();
  });
});

describe('createAdminBoardCore — projection + write hook', () => {
  it('groups issues into the three canonical columns via the accessor', () => {
    const ops: Array<{ action: string; args: Record<string, unknown> }> = [];
    const core = createAdminBoardCore({
      op: (action, args) => {
        ops.push({ action, args });
      },
    });
    syncRows(core, issues());
    expect(core.state.columns.map((c) => c.id)).toEqual([
      'o:backlog',
      'o:in-progress',
      'o:done',
    ]);
    expect(cardCount(core, 'o:backlog')).toBe(2); // TRL-1 backlog + TRL-4 queue
    expect(cardCount(core, 'o:in-progress')).toBe(1);
    expect(cardCount(core, 'o:done')).toBe(1);
    expect(colIds(core, 'o:backlog')).toEqual(['TRL-1', 'TRL-4']);
    expect(core.state.totalCards).toBe(4);
  });

  it('moveCard writes one issueSetStatus op with the mapped status', async () => {
    const ops: Array<{ action: string; args: Record<string, unknown> }> = [];
    const core = createAdminBoardCore({
      op: (action, args) => {
        ops.push({ action, args });
      },
    });
    syncRows(core, issues());
    expect(core.actions.moveCard('TRL-1', 'o:backlog', 'o:done')).toBe(true);
    expect(ops).toEqual([
      { action: 'issueSetStatus', args: { id: 'TRL-1', status: 'closed' } },
    ]);
    expect(cardCount(core, 'o:done')).toBe(2);

    core.actions.moveCard('TRL-4', 'o:backlog', 'o:in-progress');
    expect(ops[1]).toEqual({
      action: 'issueSetStatus',
      args: { id: 'TRL-4', status: 'in_progress' },
    });
  });

  it('moveCard is one undo step in the transient layer', () => {
    const core = createAdminBoardCore({ op: () => {} });
    syncRows(core, issues());
    core.actions.moveCard('TRL-1', 'o:backlog', 'o:done');
    expect(core.state.canUndo).toBe(true);
    expect(core.actions.undo()).toBe(true);
    expect(cardCount(core, 'o:backlog')).toBe(2);
    expect(cardCount(core, 'o:done')).toBe(1);
  });
});

describe('syncRows — snapshot diff-sync', () => {
  it('adds, updates, and removes rows; unchanged rows are no-ops', () => {
    const core = createAdminBoardCore({ op: () => {} });
    const lastSeen = new Map<string, string>();
    syncRows(core, issues(), lastSeen);
    const baseline = JSON.stringify(core.state.columns.map((c) => c.id));

    let renders = 0;
    const unsub = core.subscribe(() => renders++);

    // identical snapshot → nothing notifies
    syncRows(core, issues(), lastSeen);
    expect(renders).toBe(0);

    // status change → the card re-buckets
    syncRows(
      core,
      issues().map((i) => (i.id === 'TRL-1' ? { ...i, status: 'closed' } : i)),
      lastSeen,
    );
    expect(cardCount(core, 'o:done')).toBe(2);
    expect(cardCount(core, 'o:backlog')).toBe(1);

    // title change → patched in place
    syncRows(
      core,
      issues().map((i) => (i.id === 'TRL-2' ? { ...i, title: 'Beta 2' } : i)),
      lastSeen,
    );
    const card = core.state.columns
      .flatMap((c) => c.cards)
      .find((c) => c.id === 'TRL-2')!;
    expect(card.cells.title).toBe('Beta 2');

    // removed issue → row dropped
    syncRows(core, issues().filter((i) => i.id !== 'TRL-3'), lastSeen);
    expect(core.state.totalCards).toBe(3);
    expect(colIds(core, 'o:done')).toEqual([]);

    unsub();
    void baseline;
  });

  it('without lastSeen it still applies removals and additions', () => {
    const core = createAdminBoardCore({ op: () => {} });
    syncRows(core, issues());
    expect(core.state.totalCards).toBe(4);
    syncRows(core, issues().slice(0, 2));
    expect(core.state.totalCards).toBe(2);
    syncRows(core, [...issues().slice(0, 2), { id: 'TRL-9', title: 'New', status: 'backlog' }]);
    expect(core.state.totalCards).toBe(3);
    expect(core.actions.removeCard('TRL-9')).toBe(true);
  });

  it('snapshot sync is not an edit: no undo steps, no write hooks', () => {
    const ops: unknown[] = [];
    const core = createAdminBoardCore({
      op: (action, args) => {
        ops.push({ action, args });
      },
    });
    syncRows(core, issues());
    syncRows(
      core,
      issues().map((i) => (i.id === 'TRL-1' ? { ...i, status: 'done' } : i)),
    );
    expect(core.state.canUndo).toBe(false);
    expect(ops).toEqual([]);
  });

  it('ignores rows without an id', () => {
    const core = createAdminBoardCore({ op: () => {} });
    syncRows(core, [{ id: '', title: 'orphan' } as AdminIssueRow]);
    expect(core.state.totalCards).toBe(0);
  });
});
