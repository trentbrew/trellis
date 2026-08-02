/**
 * Gallery entry — kanban (dynamic board projection: group-field universe,
 * card bucketing, column ops, move-card writes, composed undo-history).
 */

import { createKanbanCore } from '../../kanban/index.js';
import { createUndoHistoryCore } from '../../undo-history/index.js';
import type { RegisteredComponent } from '../../inspector/index.js';
import { el } from '../dom.js';

interface Issue {
  id: string;
  title: string;
  status: 'todo' | 'doing' | 'done' | null;
  priority: 'low' | 'high' | null;
  owner: string | null;
  boardRank?: number | null;
}

const ISSUES: Issue[] = [
  { id: 't1', title: 'Ship the composer wedge', status: 'todo', priority: 'high', owner: 'trent' },
  { id: 't2', title: 'Iroh sync flake on reconnect', status: 'doing', priority: 'high', owner: 'trent' },
  { id: 't3', title: 'EQL-S window functions', status: 'todo', priority: 'low', owner: 'ada' },
  { id: 't4', title: 'ADR 0034 wedge smoke test', status: 'done', priority: 'high', owner: 'trent' },
  { id: 't5', title: 'Migrate studio to headless cores', status: 'todo', priority: 'high', owner: 'ada' },
  { id: 't6', title: 'Op-log compaction policy', status: 'doing', priority: 'low', owner: 'lin' },
  { id: 't7', title: 'Iroh doc key hygiene', status: 'todo', priority: 'low', owner: 'lin' },
  { id: 't8', title: 'Deno edge deployment doc', status: 'todo', priority: 'low', owner: null },
  { id: 't9', title: 'Semantic diff for table ops', status: 'done', priority: 'high', owner: 'trent' },
  { id: 't10', title: 'Whop checkout verification', status: 'doing', priority: 'high', owner: null },
];

type KanbanConfig = {
  undoHistory?: ReturnType<typeof createUndoHistoryCore>;
};

export const kanbanEntry: RegisteredComponent<KanbanConfig, ReturnType<typeof createKanbanCore>> = {
  type: 'kanban',
  name: 'Kanban',
  description:
    'Dynamic board projection — group by status/priority/owner, switch the group field live, create/rename/color/hide columns, move cards (one group-field write each), all undoable.',
  defaultConfig: {},
  create: (config) =>
    createKanbanCore<Issue>({
      data: ISSUES,
      columns: [
        { id: 'title', accessorKey: 'title', header: 'Title' },
        { id: 'priority', accessorKey: 'priority', header: 'Priority' },
        { id: 'owner', accessorKey: 'owner', header: 'Owner' },
      ],
      groupFields: [
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
          options: [{ value: 'low', label: 'Low' }, { value: 'high', label: 'High' }],
        },
        {
          id: 'owner',
          label: 'Owner',
          affordance: 'relation',
          accessorKey: 'owner',
          relationTargets: [
            { id: 'trent', title: 'Trent' },
            { id: 'ada', title: 'Ada' },
            { id: 'lin', title: 'Lin' },
          ],
        },
      ],
      groupFieldId: 'status',
      rankField: 'boardRank',
      undoHistory: config.undoHistory ?? createUndoHistoryCore(),
    }),
  actions: [
    {
      label: 'Group by priority',
      enabled: (c) => (c.state as { board: { groupFieldId: string } }).board.groupFieldId !== 'priority',
      run: (c) => c.actions.setGroupField('priority' as never),
    },
    {
      label: 'Group by owner',
      enabled: (c) => (c.state as { board: { groupFieldId: string } }).board.groupFieldId !== 'owner',
      run: (c) => c.actions.setGroupField('owner' as never),
    },
    {
      label: 'Group by status',
      enabled: (c) => (c.state as { board: { groupFieldId: string } }).board.groupFieldId !== 'status',
      run: (c) => c.actions.setGroupField('status' as never),
    },
    {
      label: 'Sort columns (cycle)',
      run: (c) => {
        const mode = (c.state as { board: { sortColumnsBy: string } }).board.sortColumnsBy;
        c.actions.sortColumns((mode === 'manual' ? 'name' : mode === 'name' ? 'count' : 'manual') as never);
      },
    },
    {
      label: 'Add column “Shipped”',
      run: (c) => c.actions.createColumn({ label: 'Shipped', color: 'green' } as never),
    },
    {
      label: 'Move first card → next column',
      enabled: (c) => {
        const s = c.state as { columns: { id: string; cards: unknown[] }[] };
        return s.columns.length >= 2 && s.columns[0]!.cards.length > 0;
      },
      run: (c) => {
        const s = c.state as { columns: { id: string; cards: { id: string }[] }[] };
        const from = s.columns[0]!;
        c.actions.moveCard(from.cards[0]!.id, from.id, s.columns[1]!.id as never);
      },
    },
    {
      label: 'Collapse first column',
      run: (c) => {
        const s = c.state as { columns: { id: string; collapsed: boolean }[] };
        const col = s.columns[0];
        if (col) c.actions.setColumnCollapsed(col.id as never, !col.collapsed);
      },
    },
    { label: 'Undo', enabled: (c) => c.state.canUndo, run: (c) => c.actions.undo() },
    { label: 'Redo', enabled: (c) => c.state.canRedo, run: (c) => c.actions.redo() },
  ],
  renderers: [
    {
      framework: 'vanilla',
      render: (core, host) => {
        type S = {
          board: {
            name: string;
            groupFieldId: string;
            sortColumnsBy: string;
          };
          columns: {
            id: string;
            title: string;
            count: number;
            color: string | null;
            collapsed: boolean;
            hidden: boolean;
            cards: { id: string; cells: Record<string, string | number | null>; rank: number | null }[];
          }[];
          totalCards: number;
          groupableFields: { id: string; label: string }[];
          globalFilter: string;
          canUndo: boolean;
          canRedo: boolean;
        };

        const root = el('div', { class: 'kanban-demo' });
        const status = el('div', { class: 'status-line' });
        const undoLabel = el('span', { class: 'chip' });

        const boardEl = el('div', { class: 'kb-board' });

        const groupSelect = el('select', {}, ...[] as Node[]);
        const sortSelect = el('select', {});
        const filterInput = el('input', { type: 'text', placeholder: 'filter cards…', class: 'mini-input' });

        const render = () => {
          const s = core.state as S;
          groupSelect.replaceChildren(
            ...s.groupableFields.map((f) =>
              el('option', { value: f.id, selected: f.id === s.board.groupFieldId }, f.label),
            ),
          );
          sortSelect.replaceChildren(
            ...(['manual', 'name', 'count'] as const).map((m) =>
              el('option', { value: m, selected: m === s.board.sortColumnsBy }, `sort: ${m}`),
            ),
          );

          const visible = s.columns.filter((c) => !c.hidden);
          const scroll = el('div', { class: 'kb-scroll' });

          if (visible.length === 0) {
            scroll.append(
              el('div', { class: 'kb-empty' }, 'board is empty — add a column'),
              el(
                'button',
                { class: 'mini', onclick: () => core.actions.createColumn({ label: 'First' } as never) },
                'Create column',
              ),
            );
          }

          for (const col of visible) {
            const head = el('div', { class: 'kb-col-head' }, ...[
              el(
                'span',
                { class: 'kb-col-title', style: col.color ? `border-left:3px solid var(--${col.color})` : '' },
                col.title,
                el('span', { class: 'kb-count' }, String(col.count)),
              ),
              el(
                'button',
                { class: 'mini', title: 'move left', onclick: () => {
                    const i = visible.indexOf(col);
                    if (i > 0) core.actions.moveColumn(col.id as never, i - 1);
                  } },
                '‹',
              ),
              el(
                'button',
                { class: 'mini', title: 'move right', onclick: () => {
                    const i = visible.indexOf(col);
                    if (i < visible.length - 1) core.actions.moveColumn(col.id as never, i + 1);
                  } },
                '›',
              ),
              el(
                'button',
                { class: 'mini', title: col.collapsed ? 'expand' : 'collapse', onclick: () => core.actions.setColumnCollapsed(col.id as never, !col.collapsed) },
                col.collapsed ? '▸' : '▾',
              ),
              el(
                'button',
                { class: 'mini', title: 'hide', onclick: () => core.actions.setColumnHidden(col.id as never, true) },
                '✕',
              ),
            ]);

            const body = el('div', { class: 'kb-col-body' });
            if (!col.collapsed) {
              for (const card of col.cards) {
                const moveNext = visible[visible.indexOf(col) + 1];
                body.append(
                  el(
                    'div',
                    { class: 'kb-card', draggable: 'true',
                      ondragstart: () => core.actions.setDragState({ cardId: card.id, columnId: col.id, sourceColumnId: col.id } as never),
                      ondragend: () => core.actions.setDragState(null as never),
                      ondragover: (e: Event) => e.preventDefault(),
                      ondrop: () => {
                        const d = (core.state as { dragState: { cardId?: string; sourceColumnId?: string } | null }).dragState;
                        if (d?.cardId && d.cardId !== card.id) {
                          core.actions.moveCard(d.cardId as never, (d.sourceColumnId ?? col.id) as never, col.id as never);
                          core.actions.setDragState(null as never);
                        }
                      } },
                    el('div', { class: 'kb-card-title' }, String(card.cells.title ?? card.id)),
                    el(
                      'div',
                      { class: 'kb-card-meta' },
                      el('span', { class: 'chip' }, String(card.cells.priority ?? '—')),
                      el('span', { class: 'chip' }, String(card.cells.owner ?? '—')),
                    ),
                    moveNext
                      ? el(
                          'button',
                          { class: 'mini', title: `move to ${moveNext.title}`, onclick: () => core.actions.moveCard(card.id as never, col.id as never, moveNext.id as never) },
                          '→',
                        )
                      : null,
                  ),
                );
              }
              if (col.cards.length === 0) {
                body.append(el('div', { class: 'kb-card-empty' }, 'no cards'));
              }
            }

            const footer = el(
              'div',
              { class: 'kb-col-footer' },
              el(
                'button',
                { class: 'mini', onclick: () => core.actions.addCard(col.id as never, { title: `New ${col.title}` }) },
                '+ card',
              ),
              el(
                'button',
                { class: 'mini', title: 'rename', onclick: () => {
                    const name = window.prompt('Rename column', col.title);
                    if (name) core.actions.renameColumn(col.id as never, name);
                  } },
                '✎',
              ),
              el(
                'button',
                { class: 'mini', title: 'delete (cards → no value)', onclick: () => core.actions.deleteColumn(col.id as never) },
                '⌫',
              ),
            );

            scroll.append(el('div', { class: 'kb-col' }, head, body, footer));
          }

          boardEl.replaceChildren(scroll);
          undoLabel.textContent = s.canUndo ? 'undo: ⌘Z' : s.canRedo ? 'redo: ⌘⇧Z' : 'history: clean';
          status.textContent =
            `${s.totalCards} cards · ${s.columns.filter((c) => !c.hidden).length} columns · ` +
            `grouped by ${s.board.groupFieldId} · filter ${s.globalFilter ? `“${s.globalFilter}”` : '—'}`;
        };

        const toolbar = el(
          'div',
          { class: 'toolbar' },
          groupSelect,
          sortSelect,
          filterInput,
          el('button', { class: 'mini', onclick: () => core.actions.saveBoard() }, 'save board'),
          el('button', { class: 'mini', onclick: () => core.actions.undo() }, 'undo'),
          el('button', { class: 'mini', onclick: () => core.actions.redo() }, 'redo'),
          undoLabel,
        );

        groupSelect.addEventListener('change', () => {
          core.actions.setGroupField(groupSelect.value as never);
        });
        sortSelect.addEventListener('change', () => {
          core.actions.sortColumns(sortSelect.value as never);
        });
        filterInput.addEventListener('input', () => {
          core.actions.setGlobalFilter(filterInput.value);
        });

        const unsub = core.subscribe(render);
        render();
        host.append(toolbar, root, status);
        root.append(boardEl);
        return unsub;
      },
    },
  ],
};
