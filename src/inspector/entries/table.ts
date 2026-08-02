/**
 * Gallery entry — table (headless data grid: sort, filter, paging,
 * selection, inline edit, composed undo-history).
 */

import { createTableCore } from '../../table/index.js';
import { createUndoHistoryCore } from '../../undo-history/index.js';
import type { RegisteredComponent } from '../../inspector/index.js';
import { el } from '../dom.js';

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'doing' | 'done';
  priority: number;
  owner: string;
}

const TASKS: Task[] = [
  { id: 't1', title: 'Ship the composer wedge', status: 'todo', priority: 1, owner: 'trent' },
  { id: 't2', title: 'Iroh sync flake on reconnect', status: 'doing', priority: 3, owner: 'trent' },
  { id: 't3', title: 'EQL-S window functions', status: 'todo', priority: 2, owner: 'ada' },
  { id: 't4', title: 'ADR 0034 wedge smoke test', status: 'done', priority: 1, owner: 'trent' },
  { id: 't5', title: 'Migrate studio to headless cores', status: 'todo', priority: 2, owner: 'ada' },
  { id: 't6', title: 'Op-log compaction policy', status: 'doing', priority: 3, owner: 'lin' },
  { id: 't7', title: 'Iroh doc key hygiene', status: 'todo', priority: 1, owner: 'lin' },
  { id: 't8', title: 'Deno edge deployment doc', status: 'todo', priority: 2, owner: 'ada' },
  { id: 't9', title: 'Semantic diff for table ops', status: 'todo', priority: 1, owner: 'trent' },
  { id: 't10', title: 'Raster.tv studio session', status: 'done', priority: 1, owner: 'trent' },
  { id: 't11', title: 'Whop checkout verification', status: 'todo', priority: 2, owner: 'ada' },
];

type TableConfig = {
  undoHistory?: ReturnType<typeof createUndoHistoryCore>;
};

export const tableEntry: RegisteredComponent<TableConfig, ReturnType<typeof createTableCore>> = {
  type: 'table',
  name: 'Table',
  description:
    'Headless data grid — sorting, global filter, paging, row selection, inline edit (dbl-click a cell), row add/remove, all undoable.',
  defaultConfig: {},
  create: (config) =>
    createTableCore<Task>({
      data: TASKS,
      columns: [
        { id: 'title', accessorKey: 'title', header: 'Title', width: '60%' },
        { id: 'status', accessorKey: 'status', header: 'Status', width: 96 },
        { id: 'priority', accessorKey: 'priority', header: 'Pri', type: 'number', width: 56, align: 'center' },
        { id: 'owner', accessorKey: 'owner', header: 'Owner', width: 84 },
      ],
      initialState: { pageSize: 10, sorting: [{ id: 'priority', desc: false }] },
      undoHistory: config.undoHistory ?? createUndoHistoryCore(),
    }),
  actions: [
    { label: 'Sort (toggle)', run: (c) => { const s = c.state; c.actions.sort(s.sorting[0]?.id ?? 'title'); } },
    { label: 'Clear sort', enabled: (c) => c.state.sorting.length > 0, run: (c) => c.actions.clearSorting() },
    { label: 'Filter “sync”', run: (c) => c.actions.setGlobalFilter('sync') },
    { label: 'Clear filter', enabled: (c) => c.state.globalFilter !== '', run: (c) => c.actions.setGlobalFilter('') },
    {
      label: 'Add row',
      run: (c) =>
        c.actions.addRow({
          id: `new-${Date.now()}`,
          title: 'Untitled task',
          status: 'todo',
          priority: 2,
          owner: 'you',
        } as Task),
    },
    {
      label: 'Remove selected',
      enabled: (c) => c.state.selectedRows.length > 0,
      run: (c) => {
        for (const r of c.state.selectedRows) c.actions.removeRow(r);
      },
    },
    { label: 'Select all', run: (c) => c.actions.toggleAllSelected(true) },
    { label: 'Select none', enabled: (c) => c.state.selectedRows.length > 0, run: (c) => c.actions.toggleAllSelected(false) },
    { label: 'Next page', enabled: (c) => c.state.pageIndex < c.state.pageCount - 1, run: (c) => c.actions.nextPage() },
    { label: 'Prev page', enabled: (c) => c.state.pageIndex > 0, run: (c) => c.actions.previousPage() },
    { label: 'Undo', enabled: (c) => c.state.canUndo, run: (c) => c.actions.undo() },
    { label: 'Redo', enabled: (c) => c.state.canRedo, run: (c) => c.actions.redo() },
  ],
  renderers: [
    {
      framework: 'vanilla',
      render: (core, host) => {
        type S = {
          rows: { id: string; selected: boolean; cells: Record<string, string | number | null> }[];
          columns: { id: string; header: string; editable?: boolean; align?: string; type?: string }[];
          editing: { rowId: string; columnId: string } | null;
          editDraft: string;
          sorting: { id: string; desc: boolean }[];
          allSelected: boolean;
          someSelected: boolean;
          selectedRows: string[];
          canUndo: boolean;
          canRedo: boolean;
          pageIndex: number;
          pageCount: number;
          totalRows: number;
          globalFilter: string;
        };
        const root = el('div', { class: 'table-wrap' });
        const status = el('div', { class: 'status-line' });
        const pageInfo = el('span', { class: 'chip' });
        const undoLabel = el('span', { class: 'chip' });

        // Transplanted edit input — survives re-renders so typing never blurs.
        let editInput: HTMLInputElement | null = null;
        let editKey = '';
        // Chrome fires blur on the focused input when its subtree is removed
        // (root.replaceChildren in render) — only that render can cause it.
        let suppressNextBlur = false;

        const render = () => {
          const s = core.state as S;
          let pendingFocus: HTMLInputElement | null = null;
          let freshEditor = false;
          if (s.editing) {
            suppressNextBlur = true;
            window.setTimeout(() => {
              suppressNextBlur = false;
            }, 0);
          }
          const grid = el('table', { class: 'grid' });
          const thead = el('thead');
          const headRow = el('tr');
          headRow.append(
            el(
              'th',
              {},
              el('input', {
                type: 'checkbox',
                checked: s.allSelected,
                indeterminate: s.someSelected && !s.allSelected,
                onchange: (e: Event) =>
                  core.actions.toggleAllSelected((e.target as HTMLInputElement).checked),
              }),
            ),
          );
          for (const col of s.columns) {
            const sort = s.sorting.find((x) => x.id === col.id);
            const marker = sort ? (sort.desc ? ' ↓' : ' ↑') : '';
            headRow.append(
              el(
                'th',
                { onclick: () => core.actions.sort(col.id), title: col.header },
                col.header,
                el('span', { class: 'marker' }, marker),
              ),
            );
          }
          thead.append(headRow);
          grid.append(thead);

          const tbody = el('tbody');
          for (const row of s.rows) {
            const tr = el('tr');
            tr.append(
              el(
                'td',
                {},
                el('input', {
                  type: 'checkbox',
                  checked: row.selected,
                  onchange: (e: Event) =>
                    core.actions.toggleRowSelected(row.id, (e.target as HTMLInputElement).checked),
                }),
              ),
            );
            for (const col of s.columns) {
              const editing = s.editing && s.editing.rowId === row.id && s.editing.columnId === col.id;
              if (editing) {
                const key = `${row.id}:${col.id}`;
                let input: HTMLInputElement;
                if (key === editKey && editInput) {
                  // Transplant the live editor — removing it fires blur and
                  // commits mid-keystroke.
                  input = editInput;
                  if (input.value !== s.editDraft) input.value = s.editDraft ?? '';
                } else {
                  input = el('input', {
                    type: 'text',
                    class: 'cell-input',
                    value: s.editDraft ?? '',
                    oninput: (e: Event) =>
                      core.actions.setEditDraft((e.target as HTMLInputElement).value),
                    onkeydown: (e: KeyboardEvent) => {
                      if (e.key === 'Enter') core.actions.commitEdit();
                      if (e.key === 'Escape') core.actions.cancelEdit();
                    },
                    // Deferred: committing inside blur removes this input mid-event.
                    onblur: () => {
                      if (suppressNextBlur) {
                        suppressNextBlur = false;
                        return;
                      }
                      window.setTimeout(() => core.actions.commitEdit(), 0);
                    },
                  });
                  editInput = input;
                  editKey = key;
                  freshEditor = true;
                }
                tr.append(el('td', {}, input));
                pendingFocus = input;
              } else {
                const value = row.cells[col.id];
                tr.append(
                  el(
                    'td',
                    {
                      class: col.editable ? 'editable' : '',
                      ondblclick: () => col.editable && core.actions.startEdit(row.id, col.id),
                      style: `text-align:${col.align ?? 'left'}`,
                    },
                    value === null ? '' : String(value),
                  ),
                );
              }
            }
            tbody.append(tr);
          }
          grid.append(tbody);
          root.replaceChildren(grid);

          // Focus after the input is attached — focusing a detached node
          // does not stick across replaceChildren. Only select on first
          // open: re-selecting after every keystroke would make the next
          // keystroke replace the selection.
          if (pendingFocus) {
            pendingFocus.focus();
            if (freshEditor) pendingFocus.select();
          }

          if (!s.editing) {
            editInput = null;
            editKey = '';
          }

          undoLabel.textContent = s.canUndo ? 'undo: ⌘Z' : s.canRedo ? 'redo: ⌘⇧Z' : 'history: clean';
          pageInfo.textContent = `${s.pageIndex + 1} / ${Math.max(s.pageCount, 1)}`;
          status.textContent =
            `${s.totalRows} rows · ${s.selectedRows.length} selected · ` +
            `filter ${s.globalFilter ? `“${s.globalFilter}”` : '—'} · ` +
            (s.sorting.length ? `sorted by ${s.sorting[0]!.id} ${s.sorting[0]!.desc ? '↓' : '↑'}` : 'no sort');
        };

        const toolbar = el(
          'div',
          { class: 'toolbar' },
          el('input', {
            type: 'text',
            placeholder: 'filter…',
            class: 'mini-input',
            value: (core.state as S).globalFilter,
            oninput: (e: Event) => core.actions.setGlobalFilter((e.target as HTMLInputElement).value),
          }),
          el('button', { class: 'mini', onclick: () => core.actions.previousPage() }, '‹'),
          pageInfo,
          el('button', { class: 'mini', onclick: () => core.actions.nextPage() }, '›'),
          undoLabel,
          el('span', { class: 'dim', style: 'font-size:11px' }, 'dbl-click cell to edit'),
        );

        const unsub = core.subscribe(render);
        render();
        host.append(toolbar, root, status);
        return unsub;
      },
    },
  ],
};
