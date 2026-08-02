/**
 * Graph composer — the ADR 0034 payoff demo.
 *
 * A table-core grid bound to the semantic graph: every committed cell
 * edit is ONE EQL-S-grade op on the kernel's causal chain (canonically
 * hashed, hash-linked via previousHash, replayable from scratch).
 *
 * The right panel is the op-log delta: the live op stream with
 * semantic diffs, an op-level Undo (invert + re-apply), and time-travel
 * (rebuild the store at any op hash).
 *
 * Run: `pnpm demo:composer` — build then serve (the sql.js WASM backend
 * must be fetched over http, so file:// won't work here).
 */

import { TrellisKernel } from '../../dist/core/kernel/trellis-kernel.js';
import { SqlJsKernelBackend } from '../../dist/core/persist/sqljs-backend.js';
import type { KernelOp, KernelBackend } from '../../dist/core/index.js';
import { createTableCore } from '../../dist/table/index.js';
import { el, $ } from '../wedge-smoke/dom.js';
import { taskFields, columnsFromSchema, formFieldsFromSchema } from './schema.js';

/* ------------------------------------------------------------------ */
/* graph boot + seed                                                   */
/* ------------------------------------------------------------------ */

interface TaskRow {
  id: string;
  title: string;
  status: 'todo' | 'doing' | 'done';
  priority: number;
  owner: string;
}

const SEED: Omit<TaskRow, 'id'>[] = [
  { title: 'Ship the composer wedge', status: 'todo', priority: 1, owner: 'trent' },
  { title: 'Iroh sync flake on reconnect', status: 'doing', priority: 3, owner: 'trent' },
  { title: 'EQL-S window functions', status: 'todo', priority: 2, owner: 'ada' },
  { title: 'Palette into Studio', status: 'doing', priority: 1, owner: 'trent' },
  { title: 'Migrate studio to headless cores', status: 'todo', priority: 2, owner: 'ada' },
  { title: 'Op-log compaction policy', status: 'doing', priority: 3, owner: 'lin' },
  { title: 'Iroh doc key hygiene', status: 'todo', priority: 1, owner: 'lin' },
  { title: 'Raster.tv studio session', status: 'done', priority: 1, owner: 'trent' },
];

let kernel: TrellisKernel;
let backend: KernelBackend;

async function bootKernel(): Promise<void> {
  kernel?.close();
  backend = await SqlJsKernelBackend.create({ dbPath: ':memory:' });
  kernel = new TrellisKernel({
    backend,
    agentId: 'composer-demo',
    provenance: { actorType: 'machine', origin: 'composer-demo' },
  });
  kernel.boot();
}

async function seed(): Promise<void> {
  for (let i = 0; i < SEED.length; i++) {
    const t = SEED[i]!;
    const id = `task-${i + 1}`;
    await kernel.mutate('task.seed', {
      facts: [
        { e: id, a: 'type', v: 'Task' },
        { e: id, a: 'title', v: t.title },
        { e: id, a: 'status', v: t.status },
        { e: id, a: 'priority', v: t.priority },
        { e: id, a: 'owner', v: t.owner },
        { e: id, a: 'updatedAt', v: new Date().toISOString() },
      ],
      provenance: { actorType: 'machine', origin: 'composer-seed' },
    });
  }
}

/** Mirror the graph into table-row shape (skips kernel bookkeeping facts). */
function rowsFromGraph(): TaskRow[] {
  return kernel
    .listEntities('Task')
    .map((e) => {
      const cell = (a: string): string | number | null =>
        e.facts.find((f) => f.a === a)?.v ?? null;
      return {
        id: e.id,
        title: String(cell('title') ?? ''),
        status: (cell('status') ?? 'todo') as TaskRow['status'],
        priority: Number(cell('priority') ?? 0),
        owner: String(cell('owner') ?? ''),
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

function currentOps(): KernelOp[] {
  return backend.readAll();
}

/* ------------------------------------------------------------------ */
/* table-core bound to the graph via onCellEdit                        */
/* ------------------------------------------------------------------ */

let table: ReturnType<typeof createTableCore<TaskRow>>;

function createTable(): void {
  table = createTableCore<TaskRow>({
    data: rowsFromGraph(),
    columns: columnsFromSchema<TaskRow>(taskFields),
    initialState: { pageSize: 10, sorting: [{ id: 'priority', desc: false }] },
    onCellEdit: (rowId, columnId, value) => {
      // THE PAYOFF: one cell edit = one EQL-S op on the causal chain.
      void kernel
        .updateEntity(rowId, { [columnId]: value as never })
        .then((r) => {
          ops = currentOps();
          renderOps();
          renderDelta(r.op);
        })
        .catch((err) => {
          console.error('op write failed', err);
        });
      return true; // apply locally — the op panel owns the graph truth
    },
  });
}

/** Rebuild the table's data from the graph (preserves sort/filter/page). */
function resyncTable(): void {
  const fresh = rowsFromGraph();
  for (const row of fresh) {
    table.actions.updateRow(row.id, row as TaskRow);
  }
}

/* ------------------------------------------------------------------ */
/* op-log delta panel                                                  */
/* ------------------------------------------------------------------ */

let ops: KernelOp[] = [];
let traveling: { opHash: string; index: number } | null = null;

function renderOps(): void {
  const list = $('op-list');
  list.replaceChildren();
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]!;
    const added = op.facts?.length ?? 0;
    const removed = op.deleteFacts?.length ?? 0;
    const entry = el(
      'div',
      {
        class: 'op' + (traveling?.opHash === op.hash ? ' travel' : ''),
        onclick: () => travelTo(i),
      },
      el(
        'div',
        { class: 'op-head' },
        el('span', { class: 'chip' }, op.kind),
        el('span', { class: 'op-hash', title: op.hash }, op.hash.replace('trellis:op:', '').slice(0, 10)),
      ),
      el(
        'div',
        { class: 'op-meta' },
        `${new Date(op.timestamp).toLocaleTimeString()} · ` +
          `${added ? `+${added}` : ''}${removed ? ` −${removed}` : ''} facts`,
      ),
    );
    list.append(entry);
  }
  $('op-count').textContent = String(ops.length);
  $('op-head-hash').textContent = ops.length ? ops[ops.length - 1]!.hash.slice(-8) : '—';
}

/** Semantic diff of one op: the human line ("task-3.status: todo → done"). */
function renderDelta(op: KernelOp): void {
  const lines: string[] = [];
  const removed = new Map((op.deleteFacts ?? []).map((f) => [`${f.e}:${f.a}`, f.v]));
  for (const f of op.facts ?? []) {
    const old = removed.get(`${f.e}:${f.a}`);
    lines.push(
      old !== undefined
        ? `${f.e}.${f.a}: ${JSON.stringify(old)} → ${JSON.stringify(f.v)}`
        : `${f.e}.${f.a} = ${JSON.stringify(f.v)}`,
    );
  }
  const box = $('delta');
  box.replaceChildren(
    el('span', { class: 'status-line', style: 'margin:0' }, `last op ${op.hash.slice(-8)}:`),
    ...(lines.length ? lines.map((l) => el('div', { class: 'delta-line' }, l)) : [el('div', { class: 'dim' }, 'no facts')]),
  );
}

/** Invert the last op and re-apply — the graph-level undo. */
async function undoLastOp(): Promise<void> {
  const op = ops[ops.length - 1];
  if (!op) return;
  const inverse = await kernel.mutate(
    `${op.kind}.undo`,
    {
      facts: op.deleteFacts ?? [],
      deleteFacts: op.facts ?? [],
      links: op.deleteLinks ?? [],
      deleteLinks: op.links ?? [],
      provenance: { actorType: 'machine', origin: 'composer-undo' },
    },
  );
  ops = currentOps();
  renderOps();
  renderDelta(inverse.op);
  resyncTable();
  clearTravel();
}

/* ------------------------------------------------------------------ */
/* time travel                                                         */
/* ------------------------------------------------------------------ */

function travelTo(index: number): void {
  const op = ops[index]!;
  const store = kernel.timeTravel(op.hash);
  const typeFacts = store.getFactsByValue('type', 'Task');
  const ids = new Set(typeFacts.map((f) => f.e));
  const rows: TaskRow[] = [];
  for (const id of ids) {
    const facts = store.getFactsByEntity(id);
    const cell = (a: string): string | number | null =>
      facts.find((f) => f.a === a)?.v ?? null;
    rows.push({
      id,
      title: String(cell('title') ?? ''),
      status: (cell('status') ?? 'todo') as TaskRow['status'],
      priority: Number(cell('priority') ?? 0),
      owner: String(cell('owner') ?? ''),
    });
  }
  traveling = { opHash: op.hash, index };
  renderTravel(rows.sort((a, b) => a.id.localeCompare(b.id)));
  renderOps();
}

function renderTravel(rows: TaskRow[]): void {
  const overlay = $('travel-overlay');
  overlay.style.display = 'block';
  const grid = el('table', { class: 'grid' });
  const thead = el('thead');
  const headRow = el('tr');
  for (const c of columnsFromSchema<TaskRow>(taskFields)) {
    headRow.append(el('th', {}, c.header));
  }
  thead.append(headRow);
  grid.append(thead);
  const tbody = el('tbody');
  for (const row of rows) {
    const tr = el('tr');
    tr.append(
      el('td', {}, row.title),
      el('td', {}, row.status),
      el('td', {}, String(row.priority)),
      el('td', {}, row.owner),
    );
    tbody.append(tr);
  }
  grid.append(tbody);
  overlay.querySelector('#travel-rows')!.replaceChildren(grid);
  const idx = traveling!.index;
  $('travel-label').textContent =
    `state at op ${idx + 1}/${ops.length} (${ops[idx]!.hash.slice(-8)}) — entities replayed from the op chain`;
}

function clearTravel(): void {
  traveling = null;
  $('travel-overlay').style.display = 'none';
  $('travel-rows').replaceChildren();
}

/* ------------------------------------------------------------------ */
/* table view                                                          */
/* ------------------------------------------------------------------ */

/* Transplanted edit input — survives re-renders so typing never blurs. */
let editInput: HTMLInputElement | null = null;
let editKey = '';
/* Chrome fires blur on the focused input when its subtree is removed
   (root.replaceChildren in renderTable) — only that render can cause it. */
let suppressNextBlur = false;

function renderTable(): void {
  const s = table.state;
  const root = $('table-root');
  let pendingFocus: HTMLInputElement | null = null;
  let freshEditor = false;
  if (s.editing) {
    suppressNextBlur = true;
    window.setTimeout(() => {
      suppressNextBlur = false;
    }, 0);
  }
  root.replaceChildren();
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
          table.actions.toggleAllSelected((e.target as HTMLInputElement).checked),
      }),
    ),
  );
  for (const col of s.columns) {
    const sort = s.sorting.find((x) => x.id === col.id);
    const marker = sort ? (sort.desc ? ' ↓' : ' ↑') : '';
    headRow.append(
      el(
        'th',
        { onclick: () => table.actions.sort(col.id), title: col.header },
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
            table.actions.toggleRowSelected(row.id, (e.target as HTMLInputElement).checked),
        }),
      ),
    );
    for (const col of s.columns) {
      const editing = s.editing && s.editing.rowId === row.id && s.editing.columnId === col.id;
      if (editing) {
        const key = `${row.id}:${col.id}`;
        let input: HTMLInputElement;
        if (key === editKey && editInput) {
          // Transplant the live editor — removing it would fire blur and
          // commit mid-keystroke.
          input = editInput;
          if (input.value !== s.editDraft) input.value = s.editDraft ?? '';
        } else {
          input = el('input', {
            type: 'text',
            class: 'cell-input',
            value: s.editDraft ?? '',
            oninput: (e: Event) => table.actions.setEditDraft((e.target as HTMLInputElement).value),
            onkeydown: (e: KeyboardEvent) => {
              if (e.key === 'Enter') table.actions.commitEdit();
              if (e.key === 'Escape') table.actions.cancelEdit();
            },
            // Deferred: committing inside the blur event re-renders the
            // table and removes this input mid-event (DOMException).
            onblur: () => {
              if (suppressNextBlur) {
                suppressNextBlur = false;
                return;
              }
              window.setTimeout(() => table.actions.commitEdit(), 0);
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
              ondblclick: () => col.editable && table.actions.startEdit(row.id, col.id),
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
  root.append(grid);

  // Focus after the input is attached — focusing a detached node does not
  // stick across append. Only select on first open: re-selecting after every
  // keystroke would make the next keystroke replace the selection.
  if (pendingFocus) {
    pendingFocus.focus();
    if (freshEditor) pendingFocus.select();
  }

  if (!s.editing) {
    editInput = null;
    editKey = '';
  }

  $('table-status').textContent =
    `${s.totalRows} tasks · page ${s.pageIndex + 1}/${Math.max(s.pageCount, 1)}` +
    ` · sorted by ${s.sorting.length ? s.sorting[0]!.id + (s.sorting[0]!.desc ? ' ↓' : ' ↑') : '—'}`;
}

/* ------------------------------------------------------------------ */
/* boot                                                                */
/* ------------------------------------------------------------------ */

async function resetAll(): Promise<void> {
  clearTravel();
  await bootKernel();
  await seed();
  ops = currentOps();
  createTable();
  table.subscribe(renderTable);
  renderOps();
  renderTable();
  $('delta').replaceChildren(el('span', { class: 'dim' }, 'no edits yet — dbl-click a cell'));
}

async function main(): Promise<void> {
  $('reset').addEventListener('click', () => void resetAll());
  $('undo-op').addEventListener('click', () => void undoLastOp());
  $('back-to-current').addEventListener('click', clearTravel);
  await resetAll();
  $<HTMLInputElement>('filter').addEventListener('input', (e) =>
    table.actions.setGlobalFilter((e.target as HTMLInputElement).value),
  );
  const formFields = formFieldsFromSchema(taskFields);
  $('schema-line').textContent =
    `schema → ${taskFields.length} columns · ${formFields.length} form fields · ` +
    `same descriptor drives both (${taskFields.map((f) => f.name).join(', ')})`;
}

void main();
