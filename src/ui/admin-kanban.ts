/**
 * Admin kanban — the operator console's issue board as a kanban-core
 * consumer (ADR 0034 wedge 13, spec §9).
 *
 * Replaces the static three-column TML view in `admin.html`:
 *
 *   - one board over the issue snapshot, grouped by status through a
 *     derived accessor that maps issue statuses onto the three canonical
 *     ISSUE_COLUMNS keys (backlog / in-progress / done) — the same
 *     visible columns as the static view, now dynamic;
 *   - moving a card writes the issue's status through
 *     `onCardMove` → `op('issueSetStatus', …)` — one EQL-S entity op
 *     (the graph write-surface pattern); the SSE snapshot flows back
 *     through `sync()` and diff-syncs the projection (`updateRow` /
 *     `addRow` / `removeRow` — snapshot sync is not an edit, so no undo
 *     steps and no write hooks);
 *   - the board descriptor (column order / colors / collapse / hide /
 *     sort) persists to localStorage via Save — app-layer persistence
 *     of a pure JSON view (spec §2);
 *   - undo stays in the transient layer (undo-history-core); durable
 *     reversal stays in the op-log (spec §6.2).
 *
 * The core logic (`columnKeyOf` / `statusOf` / `syncRows` /
 * `createAdminBoardCore`) is DOM-free and unit-tested; `mountAdminKanban`
 * is the thin vanilla renderer the page mounts.
 *
 * @module trellis/ui
 */

import { createUndoHistoryCore } from '../undo-history/core/index.js';
import { createKanbanCore } from '../kanban/core/index.js';
import type {
  BoardDescriptor,
  KanbanGroupField,
  TableColumn,
  UseKanbanReturn,
} from '../kanban/core/index.js';

/** The issue shape the lanes snapshot supplies (IssueRow subset). */
export interface AdminIssueRow {
  id: string;
  title?: string;
  status?: string;
  priority?: string;
  labels?: string[];
  createdAt?: string;
  laneIds?: string[];
}

/**
 * Map a snapshot issue status onto the three canonical column keys.
 * Everything that is not in-progress/paused/closed is backlog — the same
 * fold the static TML query expressed as a negated OR.
 */
export function columnKeyOf(status: unknown): string {
  if (status === 'in_progress' || status === 'paused') return 'in-progress';
  if (status === 'closed') return 'done';
  return 'backlog';
}

/** Inverse of `columnKeyOf` — the status value a move writes to the graph. */
export function statusOf(columnKey: string): string {
  if (columnKey === 'in-progress') return 'in_progress';
  if (columnKey === 'done') return 'closed';
  return 'backlog';
}

export const ADMIN_BOARD_ID = 'admin-issues';
export const BOARD_STORAGE_KEY = 'trellis-admin-kanban-board';

/** The saved view — the ISSUE_COLUMNS collapse as a pure JSON descriptor. */
export const ADMIN_BOARD_DEFAULTS: BoardDescriptor = {
  id: ADMIN_BOARD_ID,
  name: 'Issues',
  groupFieldId: 'status',
  columnOrder: ['o:backlog', 'o:in-progress', 'o:done'],
  columnColors: {},
  hiddenColumns: [],
  collapsedColumns: [],
  sortColumnsBy: 'manual',
  cardSort: null,
  hideNoValueColumn: true,
};

/** The group field: status, read through the ISSUE_COLUMNS accessor. */
export const ADMIN_GROUP_FIELDS: KanbanGroupField[] = [
  {
    id: 'status',
    label: 'Status',
    affordance: 'select',
    accessorFn: (row) => columnKeyOf((row as AdminIssueRow).status),
    // A move writes the graph status (inverse of the fold), not the
    // column key — dragging to "Done" writes status='closed'.
    writeAccessorFn: (_row, gv) =>
      gv.kind === 'option' ? statusOf(gv.value) : null,
    options: [
      { value: 'backlog', label: 'Backlog' },
      { value: 'in-progress', label: 'In Progress' },
      { value: 'done', label: 'Done' },
    ],
  },
];

/** Card-preview fields. */
export const ADMIN_COLUMNS: TableColumn<AdminIssueRow>[] = [
  { id: 'title', accessorKey: 'title', header: 'Title' },
  { id: 'priority', accessorKey: 'priority', header: 'Priority' },
  { id: 'laneIds', accessorKey: 'laneIds', header: 'Lanes' },
];

/** Storage surface — the browser's localStorage in the page, a Map in tests. */
export type BoardStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

function defaultStorage(): BoardStorage | null {
  try {
    const ls = globalThis.localStorage;
    if (ls && typeof ls.getItem === 'function') return ls;
  } catch {
    /* private mode etc. */
  }
  return null;
}

function isKnownBoardKey(k: string): boolean {
  return (
    k === 'id' ||
    k === 'name' ||
    k === 'groupFieldId' ||
    k === 'columnOrder' ||
    k === 'columnColors' ||
    k === 'hiddenColumns' ||
    k === 'collapsedColumns' ||
    k === 'sortColumnsBy' ||
    k === 'cardSort' ||
    k === 'groupDateBy' ||
    k === 'hideNoValueColumn'
  );
}

/** Load the persisted view, merged over the ISSUE_COLUMNS defaults. */
export function loadBoardDescriptor(
  storage: BoardStorage | null,
  defaults: BoardDescriptor = ADMIN_BOARD_DEFAULTS,
): BoardDescriptor {
  if (!storage) return { ...defaults };
  try {
    const raw = storage.getItem(BOARD_STORAGE_KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw) as Partial<BoardDescriptor>;
    const merged: BoardDescriptor = {
      ...defaults,
      ...Object.fromEntries(
        Object.entries(parsed).filter(([k]) => isKnownBoardKey(k)),
      ),
      id: defaults.id,
      groupFieldId: defaults.groupFieldId,
      columnOrder: Array.isArray(parsed.columnOrder) ? parsed.columnOrder : defaults.columnOrder,
      columnColors:
        parsed.columnColors && typeof parsed.columnColors === 'object'
          ? { ...parsed.columnColors }
          : defaults.columnColors,
      hiddenColumns: Array.isArray(parsed.hiddenColumns) ? parsed.hiddenColumns : [],
      collapsedColumns: Array.isArray(parsed.collapsedColumns) ? parsed.collapsedColumns : [],
      sortColumnsBy: parsed.sortColumnsBy ?? defaults.sortColumnsBy,
      cardSort: parsed.cardSort ?? null,
    };
    return merged;
  } catch {
    return { ...defaults };
  }
}

export function saveBoardDescriptor(
  board: BoardDescriptor,
  storage: BoardStorage | null,
): void {
  if (!storage) return;
  try {
    storage.setItem(BOARD_STORAGE_KEY, JSON.stringify(board));
  } catch {
    /* quota etc. */
  }
}

/** Stable signature of the projected fields — skip unchanged rows on sync. */
function rowSignature(issue: AdminIssueRow): string {
  return JSON.stringify([
    issue.title ?? null,
    issue.status ?? null,
    issue.priority ?? null,
    issue.labels ?? null,
    issue.laneIds ?? null,
    issue.createdAt ?? null,
  ]);
}

/**
 * Diff-sync the board's row set from a fresh snapshot. New rows are
 * added, removed rows dropped, changed rows patched (`updateRow` — no
 * undo step, no write hook: snapshot sync is not an edit). A
 * `lastSeen` map (rowId → signature) suppresses no-op updates.
 */
export function syncRows(
  core: UseKanbanReturn<AdminIssueRow>,
  issues: AdminIssueRow[],
  lastSeen: Map<string, string> | null = null,
): void {
  const known = new Set(lastSeen?.keys() ?? []);
  const seen = new Set<string>();

  for (const issue of issues) {
    if (issue.id == null || issue.id === '') continue;
    seen.add(issue.id);
    const sig = rowSignature(issue);
    if (lastSeen) {
      if (lastSeen.get(issue.id) === sig) continue;
      lastSeen.set(issue.id, sig);
    }
    if (!core.actions.updateRow(issue.id, issue)) {
      core.actions.addRow(issue as AdminIssueRow);
    }
  }

  const stale = lastSeen
    ? [...known].filter((id) => !seen.has(id))
    : [
        ...new Set(
          core.state.columns.flatMap((c) => c.cards.map((card) => card.id)),
        ),
      ].filter((id) => !seen.has(id));
  for (const id of stale) {
    lastSeen?.delete(id);
    core.actions.removeRow(id);
  }
}

export interface AdminKanbanHooks {
  /** POST a graph mutation (e.g. issueSetStatus) — the durable write. */
  op(action: string, args: Record<string, unknown>): Promise<unknown> | unknown;
  board?: BoardDescriptor;
  storage?: BoardStorage | null;
}

export interface AdminKanbanMount {
  readonly core: UseKanbanReturn<AdminIssueRow>;
  /** Apply a lanes snapshot to the board (initial seed + every SSE frame). */
  sync(snapshot: unknown): void;
  /** Commit the current view state into storage. */
  saveBoard(): void;
  /** Unsubscribe listeners and detach the renderer. */
  destroy(): void;
}

/** DOM-free board core: column mapping, write hook, undo composition. */
export function createAdminBoardCore(opts: AdminKanbanHooks): UseKanbanReturn<AdminIssueRow> {
  return createKanbanCore<AdminIssueRow>({
    data: [],
    columns: ADMIN_COLUMNS,
    groupFields: ADMIN_GROUP_FIELDS,
    groupFieldId: 'status',
    board: opts.board ?? ADMIN_BOARD_DEFAULTS,
    undoHistory: createUndoHistoryCore(),
    onCardMove: (rowId, _fieldId, value) => {
      if (value.kind !== 'option') return;
      opts.op('issueSetStatus', { id: rowId, status: statusOf(value.value) });
    },
  });
}

/** Color token → theme variable for the admin palette. */
const COLOR_TOKENS: Record<string, string> = {
  blue: 'var(--accent)',
  green: 'var(--green)',
  amber: 'var(--amber)',
  red: 'var(--red)',
  purple: '#a78bfa',
  gray: 'var(--text3)',
};

const COLOR_CYCLE = Object.keys(COLOR_TOKENS);

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, unknown> = {},
  ...children: (Node | string | null | undefined)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') node.className = String(v);
    else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2), v as EventListener);
    } else if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, String(v));
  }
  for (const c of children) {
    if (c === null || c === undefined) continue;
    node.append(c instanceof Node ? c : document.createTextNode(c));
  }
  return node;
}

/**
 * Mount the board renderer into `host`. The renderer is adapter-tier DOM
 * glue over core state: DnD input writes `dragState`, every other
 * behavior is a core action.
 */
export function mountAdminKanban(
  host: HTMLElement,
  opts: AdminKanbanHooks,
): AdminKanbanMount {
  const storage = opts.storage !== undefined ? opts.storage : defaultStorage();
  const boardDesc = loadBoardDescriptor(storage, opts.board);
  const core = createAdminBoardCore({ op: opts.op, board: boardDesc });
  const lastSeen = new Map<string, string>();

  const root = el('div', { class: 'kanban-host' });
  const toolbar = el('div', { class: 'kanban-toolbar' });
  const boardEl = el('div', { class: 'kanban', 'aria-label': 'Issue board' });
  const statusLine = el('span', { class: 'kanban-status' });
  const undoLabel = el('span', { class: 'kanban-undo-label' });

  const filterInput = el('input', {
    type: 'text',
    placeholder: 'filter cards…',
    class: 'kanban-filter',
    oninput: (e: Event) =>
      core.actions.setGlobalFilter((e.target as HTMLInputElement).value),
  });
  const sortSelect = el('select', {
    class: 'kanban-sort',
    onchange: () => core.actions.sortColumns(sortSelect.value as 'manual' | 'name' | 'count'),
  });
  const saveBtn = el('button', { class: 'kanban-btn', onclick: () => saveBoard() }, 'save');
  const undoBtn = el('button', { class: 'kanban-btn', onclick: () => core.actions.undo() }, 'undo');
  const redoBtn = el('button', { class: 'kanban-btn', onclick: () => core.actions.redo() }, 'redo');

  toolbar.append(
    el('span', { class: 'kanban-title' }, 'Board'),
    filterInput,
    sortSelect,
    saveBtn,
    undoBtn,
    redoBtn,
    undoLabel,
    statusLine,
  );
  root.append(toolbar, boardEl);
  host.replaceChildren(root);

  function saveBoard(): void {
    saveBoardDescriptor(core.state.board, storage);
    undoLabel.textContent = 'saved';
    window.setTimeout(() => render(), 900);
  }

  function columnTitleColor(col: { color: string | null }): string | null {
    return col.color && COLOR_TOKENS[col.color] ? COLOR_TOKENS[col.color]! : null;
  }

  function render(): void {
    const s = core.state;
    filterInput.value = s.globalFilter;
    sortSelect.replaceChildren(
      ...(['manual', 'name', 'count'] as const).map((m) =>
        el('option', { value: m, selected: m === s.board.sortColumnsBy }, `sort: ${m}`),
      ),
    );
    undoBtn.disabled = !s.canUndo;
    redoBtn.disabled = !s.canRedo;
    undoLabel.textContent = s.canUndo
      ? 'undo: ⌘Z'
      : s.canRedo
        ? 'redo: ⌘⇧Z'
        : 'history: clean';
    statusLine.textContent =
      `${s.totalCards} cards · ${s.columns.filter((c) => !c.hidden).length} columns` +
      (s.globalFilter ? ` · filter “${s.globalFilter}”` : '');

    const board = el('div', { class: 'kanban' });
    const visible = s.columns.filter((c) => !c.hidden);
    if (visible.length === 0) {
      board.append(el('div', { class: 'kanban-empty' }, 'board is empty'));
    }
    for (const col of visible) {
      const accent = columnTitleColor(col);
      const head = el(
        'div',
        { class: 'kanban-col-head' },
        el(
          'span',
          { class: 'col-title', style: accent ? `border-left:3px solid ${accent};padding-left:6px` : '' },
          col.title,
          el('span', { class: 'kanban-col-count' }, String(col.count)),
        ),
        el('button', {
          class: 'kanban-btn mini',
          title: 'move left',
          onclick: () => {
            const i = visible.indexOf(col);
            if (i > 0) core.actions.moveColumn(col.id, i - 1);
          },
        }, '‹'),
        el('button', {
          class: 'kanban-btn mini',
          title: 'move right',
          onclick: () => {
            const i = visible.indexOf(col);
            if (i < visible.length - 1) core.actions.moveColumn(col.id, i + 1);
          },
        }, '›'),
        el('button', {
          class: 'kanban-btn mini',
          title: col.collapsed ? 'expand' : 'collapse',
          onclick: () => core.actions.setColumnCollapsed(col.id, !col.collapsed),
        }, col.collapsed ? '▸' : '▾'),
        el('button', {
          class: 'kanban-btn mini',
          title: 'hide column',
          onclick: () => core.actions.setColumnHidden(col.id, true),
        }, '✕'),
        el('button', {
          class: 'kanban-btn mini',
          title: 'color',
          onclick: () => {
            const next = COLOR_CYCLE[(COLOR_CYCLE.indexOf(col.color ?? '') + 1) % COLOR_CYCLE.length]!;
            core.actions.setColumnColor(col.id, next === 'gray' ? null : next);
          },
        }, '●'),
      );

      const body = el('div', {
        class: 'kanban-col-body',
        ondragover: (e: Event) => {
          e.preventDefault();
          body.classList.add('drag-over');
        },
        ondragleave: () => body.classList.remove('drag-over'),
        ondrop: (e: Event) => {
          e.preventDefault();
          body.classList.remove('drag-over');
          const d = core.state.dragState;
          if (d?.cardId && d.cardId !== '') {
            core.actions.moveCard(d.cardId, d.sourceColumnId ?? d.columnId ?? '', col.id);
          }
          core.actions.setDragState(null);
        },
      });

      if (!col.collapsed) {
        const moveNext = visible[visible.indexOf(col) + 1];
        for (const card of col.cards) {
          const cardEl = el(
            'div',
            {
              class: 'issue-card',
              tabindex: '0',
              role: 'button',
              draggable: 'true',
              'data-entity-id': card.id,
              'data-status': card.cells.status ?? '',
              ondragstart: () =>
                core.actions.setDragState({
                  cardId: card.id,
                  columnId: col.id,
                  sourceColumnId: col.id,
                }),
              ondragend: () => core.actions.setDragState(null),
            },
            el(
              'div',
              { class: 'issue-card-head' },
              el('div', { class: 'issue-id' }, card.id),
              el(
                'span',
                {
                  class: `priority-badge ${String(card.cells.priority ?? 'low')}`,
                },
                String(card.cells.priority ?? 'low'),
              ),
            ),
            el(
              'div',
              { class: 'issue-title' },
              String(card.cells.title ?? card.id),
            ),
            el(
              'div',
              { class: 'issue-meta' },
              el('span', { class: 'lane-badge' }, statusLabel(card.cells.laneIds)),
              moveNext
                ? el('button', {
                    class: 'kanban-btn mini',
                    title: `move to ${moveNext.title}`,
                    onclick: (e: Event) => {
                      e.stopPropagation();
                      core.actions.moveCard(card.id, col.id, moveNext.id);
                    },
                  }, '→')
                : null,
            ),
          );
          body.append(cardEl);
        }
        if (col.cards.length === 0) {
          body.append(el('div', { class: 'kanban-empty' }, 'no issues'));
        }
      }
      board.append(el('div', { class: 'kanban-col' }, head, body));
    }
    boardEl.replaceChildren(board);
  }

  function statusLabel(laneIds: unknown): string {
    if (laneIds == null) return '';
    const ids = Array.isArray(laneIds) ? laneIds : [laneIds];
    return ids.filter(Boolean).join(' · ');
  }

  const unsub = core.subscribe(render);
  render();

  return {
    core,
    sync: (snapshot) => {
      const issues = (snapshot as { issues?: AdminIssueRow[] } | null)?.issues ?? [];
      syncRows(core, issues, lastSeen);
    },
    saveBoard,
    destroy: () => {
      unsub();
      host.replaceChildren();
    },
  };
}
