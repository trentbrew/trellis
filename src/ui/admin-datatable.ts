/**
 * Operate admin datatable — sort, empty, search, inline cell edit.
 * DOM-only; no kernel imports.
 * Specs: trellis-admin-datatable-extract.md, trellis-admin-datatable-cell-edit.md
 */

export type TableEmptyState = 'hidden' | 'no-lanes' | 'no-matches';

export type CellCommitDetail = {
  entityId: string;
  col: 'branch' | 'issue';
  field: string;
  value: string | null;
};

export type AdminDatatableHandle = {
  applySearchQuery(q: string): void;
  refresh(): void;
  destroy(): void;
};

const TABLE_SORT_KEY = 'trellis-admin-table-sort';
const TABLE_COL_KEYS = ['lane', 'agent', 'ops', 'files', 'branch', 'issue'] as const;
const ISSUE_ID_RE = /^TRL-\d+$/i;

/** Pure: compare two cell strings (numeric when both parse). */
export function compareCellValues(av: string, bv: string): number {
  const an = Number(av);
  const bn = Number(bv);
  if (av !== '' && bv !== '' && !Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
  return av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' });
}

/** Pure: empty veil state from row counts. */
export function resolveEmptyState(rowCount: number, visibleCount: number): TableEmptyState {
  if (rowCount === 0) return 'no-lanes';
  if (visibleCount === 0) return 'no-matches';
  return 'hidden';
}

/** Empty/whitespace OK (→ null); else must match TRL-N. */
export function isValidIssueId(raw: string): boolean {
  const t = raw.trim();
  if (!t) return true;
  return ISSUE_ID_RE.test(t);
}

/** Empty → null; else canonical TRL-N (uppercase prefix). */
export function normalizeIssueCommit(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const m = t.match(/^trl-(\d+)$/i);
  if (!m) return t;
  return `TRL-${m[1]}`;
}

export function isValidBranchCommit(raw: string): boolean {
  return raw.trim().length > 0;
}

/**
 * Resolve lane entity id for edit/commit.
 * Prefer data-entity-id; fall back to lane column text (TML may lag attrs).
 */
export function resolveLaneEntityId(tr: HTMLTableRowElement): string {
  const fromAttr = (
    tr.dataset.entityId ||
    tr.getAttribute('data-entity-id') ||
    ''
  ).trim();
  if (fromAttr) return fromAttr;
  const laneTd = tr.querySelector('td[data-col="lane"]');
  if (!laneTd) return '';
  const labeled =
    laneTd.querySelector('span:not(.progress-spin)') ||
    laneTd.querySelector('[tml-text]');
  const text = (labeled?.textContent ?? laneTd.textContent ?? '').trim();
  return text;
}

export type CellEditCol = 'branch' | 'issue';

/** Last painted branch/issue per lane — TML may lag textContent on first focus/F2. */
export type CellValueCache = Map<string, Partial<Record<CellEditCol, string>>>;

/** Pure: resolve edit baseline from live cell + optional cache (Escape restore target). */
export function resolveCellEditPrior(
  td: HTMLTableCellElement,
  tr: HTMLTableRowElement,
  col: CellEditCol,
  cache?: Readonly<CellValueCache>,
): { priorRaw: string; priorDisplay: string } {
  let display = (td.textContent || '').trim();
  if (!display && cache) {
    const entityId = resolveLaneEntityId(tr);
    const cached = entityId ? cache.get(entityId)?.[col] : undefined;
    if (cached != null) display = cached;
  }
  if (col === 'issue') {
    const priorRaw = display === '—' || display === '' ? '' : display;
    return { priorRaw, priorDisplay: displayIssue(priorRaw || null) };
  }
  return { priorRaw: display, priorDisplay: display };
}

function getTableBody(root: HTMLElement): HTMLElement | null {
  return (
    root.querySelector('tbody[tml-ref="table-lanes"]') ||
    root.querySelector('tbody')
  );
}

function displayIssue(value: string | null): string {
  return value == null || value === '' ? '—' : value;
}

export function mountAdminDatatable(
  root: HTMLElement,
  opts?: {
    onEmptyChange?: (state: TableEmptyState) => void;
    onCellCommit?: (detail: CellCommitDetail) => void | Promise<void>;
  },
): AdminDatatableHandle {
  const tableEmpty = root.querySelector('#table-empty') as HTMLElement | null;
  const tableEmptyTitle = tableEmpty?.querySelector('.table-empty-title') as HTMLElement | null;
  const tableEmptyDesc = tableEmpty?.querySelector('.table-empty-desc') as HTMLElement | null;
  const tableWrap = root.querySelector('.table-wrap') as HTMLElement | null;
  const cellError = root.querySelector('#cell-edit-error') as HTMLElement | null;

  let tableSortKey: string | null = null;
  let tableSortDir: 'asc' | 'desc' | null = null;
  let cachedQuery = '';
  let destroyed = false;
  let sorting = false;
  let sortRaf = 0;
  let observer: MutationObserver | null = null;
  let committing = false;
  let mountingEdit = false;
  const cellValueCache: CellValueCache = new Map();
  let beginEditRaf = 0;

  type EditSession = {
    td: HTMLTableCellElement;
    tr: HTMLTableRowElement;
    col: 'branch' | 'issue';
    field: string;
    entityId: string;
    priorRaw: string;
    priorDisplay: string;
    input: HTMLInputElement;
    /** Latest draft — survives transient DOM detach before remount. */
    draft: string;
  };
  let session: EditSession | null = null;

  try {
    const saved = JSON.parse(sessionStorage.getItem(TABLE_SORT_KEY) || 'null') as {
      key?: string;
      dir?: string;
    } | null;
    if (saved?.key && (saved.dir === 'asc' || saved.dir === 'desc')) {
      tableSortKey = saved.key;
      tableSortDir = saved.dir;
    }
  } catch {
    /* ignore */
  }

  function isEditing(): boolean {
    return Boolean(mountingEdit || session || root.querySelector('td.cell-editing'));
  }

  /** Drop detached edit sessions so sort/live wipe cannot permanently block beginEdit. */
  function clearZombieSession() {
    if (!session) {
      // Orphan chrome from a failed recover / mid-sort wipe
      root.querySelectorAll('td.cell-editing').forEach((td) => {
        if (td.querySelector('.cell-edit-input')) return;
        td.classList.remove('cell-editing');
        td.removeAttribute('aria-invalid');
      });
      return;
    }
    if (session.td.isConnected && session.input.isConnected && root.contains(session.td)) {
      return;
    }
    session = null;
    setCellError(null);
    root.querySelectorAll('td.cell-editing').forEach((td) => {
      td.classList.remove('cell-editing');
      td.removeAttribute('aria-invalid');
    });
  }

  function setEditHold(on: boolean) {
    const body = getTableBody(root);
    if (!body) return;
    if (on) body.setAttribute('data-edit-hold', '1');
    else body.removeAttribute('data-edit-hold');
  }

  function setCellError(msg: string | null) {
    if (!cellError) return;
    if (!msg) {
      cellError.hidden = true;
      cellError.textContent = '';
      return;
    }
    cellError.hidden = false;
    cellError.textContent = msg;
  }

  function persistTableSort() {
    try {
      if (tableSortKey && tableSortDir) {
        sessionStorage.setItem(
          TABLE_SORT_KEY,
          JSON.stringify({ key: tableSortKey, dir: tableSortDir }),
        );
      } else {
        sessionStorage.removeItem(TABLE_SORT_KEY);
      }
    } catch {
      /* ignore */
    }
  }

  function syncSortHeaders() {
    root.querySelectorAll('th[data-key]').forEach((th) => {
      const key = (th as HTMLElement).dataset.key;
      const ind = th.querySelector('.sort-ind');
      if (tableSortKey !== key || !tableSortDir) {
        th.setAttribute('aria-sort', 'none');
        if (ind) ind.textContent = '⇅';
      } else if (tableSortDir === 'asc') {
        th.setAttribute('aria-sort', 'ascending');
        if (ind) ind.textContent = '▲';
      } else {
        th.setAttribute('aria-sort', 'descending');
        if (ind) ind.textContent = '▼';
      }
    });
  }

  function cellSortValue(tr: Element, colIdx: number): string {
    const cell = tr.children[colIdx] as HTMLElement | undefined;
    if (!cell) return '';
    if (cell.classList.contains('cell-editing')) {
      const input = cell.querySelector('input.cell-edit-input') as HTMLInputElement | null;
      if (input) return input.value.trim();
    }
    return (cell.textContent || '').trim();
  }

  function applyTableSort() {
    const tableBody = getTableBody(root);
    if (!tableBody || !tableSortKey || !tableSortDir) return;
    // Flatten illegal nested <tbody> leftovers from older TML projections.
    tableBody.querySelectorAll(':scope > tbody').forEach((nested) => {
      while (nested.firstChild) tableBody.appendChild(nested.firstChild);
      nested.remove();
    });
    const colIdx = TABLE_COL_KEYS.indexOf(tableSortKey as (typeof TABLE_COL_KEYS)[number]);
    if (colIdx < 0) return;
    const rows = Array.from(tableBody.querySelectorAll(':scope > tr'));
    rows.sort((a, b) => {
      const cmp = compareCellValues(cellSortValue(a, colIdx), cellSortValue(b, colIdx));
      return tableSortDir === 'asc' ? cmp : -cmp;
    });
    rows.forEach((r) => tableBody.appendChild(r));
  }

  function setEmptyState(state: TableEmptyState) {
    if (!tableEmpty) return;
    if (state === 'hidden') {
      tableEmpty.hidden = true;
    } else if (state === 'no-lanes') {
      if (tableEmptyTitle) tableEmptyTitle.textContent = 'No lanes';
      if (tableEmptyDesc) {
        tableEmptyDesc.textContent = 'Create a lane or clear search to see rows.';
      }
      tableEmpty.hidden = false;
    } else {
      if (tableEmptyTitle) tableEmptyTitle.textContent = 'No matches';
      if (tableEmptyDesc) tableEmptyDesc.textContent = 'Try a different search query.';
      tableEmpty.hidden = false;
    }
    opts?.onEmptyChange?.(state);
  }

  function updateTableEmpty() {
    const tableBody = getTableBody(root);
    if (!tableBody) {
      setEmptyState('hidden');
      return;
    }
    const rows = Array.from(tableBody.querySelectorAll('tr'));
    const visible = rows.filter((r) => !r.classList.contains('hidden-by-search'));
    setEmptyState(resolveEmptyState(rows.length, visible.length));
  }

  function dispatchActivate(detail: { entityId: string; col: string; field: string }) {
    root.dispatchEvent(
      new CustomEvent('trellis:cell-activate', { bubbles: true, detail }),
    );
  }

  function dispatchCommit(detail: CellCommitDetail) {
    root.dispatchEvent(
      new CustomEvent('trellis:cell-commit', { bubbles: true, detail }),
    );
  }

  function restoreTd(td: HTMLTableCellElement, display: string) {
    td.classList.remove('cell-editing');
    td.removeAttribute('aria-invalid');
    td.textContent = display;
  }

  function cancelEdit() {
    if (!session) return;
    const { td, priorDisplay, tr, col } = session;
    session = null;
    setEditHold(false);
    setCellError(null);
    restoreTd(td, priorDisplay);
    const entityId = resolveLaneEntityId(tr);
    if (entityId) {
      const prev = cellValueCache.get(entityId) || {};
      cellValueCache.set(entityId, { ...prev, [col]: priorDisplay });
    }
    try {
      tr.focus();
    } catch {
      /* ignore */
    }
  }

  function paintCommitted(td: HTMLTableCellElement, col: 'branch' | 'issue', value: string | null) {
    restoreTd(td, col === 'issue' ? displayIssue(value) : String(value ?? ''));
  }

  async function commitEdit(optsMove?: {
    next?: 'row' | 'tab' | 'shift-tab' | 'none';
  }): Promise<boolean> {
    if (!session || committing) return false;
    const cur = session;
    const raw = cur.input.isConnected ? cur.input.value : cur.draft;
    const col = cur.col;

    if (col === 'branch') {
      if (!isValidBranchCommit(raw)) {
        if (!cur.input.isConnected) {
          clearZombieSession();
          return false;
        }
        cur.td.setAttribute('aria-invalid', 'true');
        cur.input.setAttribute('aria-invalid', 'true');
        cur.input.setAttribute('aria-describedby', 'cell-edit-error');
        setCellError('Branch required');
        cur.input.focus();
        return false;
      }
    } else {
      if (!isValidIssueId(raw)) {
        if (!cur.input.isConnected) {
          clearZombieSession();
          return false;
        }
        cur.td.setAttribute('aria-invalid', 'true');
        cur.input.setAttribute('aria-invalid', 'true');
        cur.input.setAttribute('aria-describedby', 'cell-edit-error');
        setCellError('Invalid issue id — use TRL-N');
        cur.input.focus();
        return false;
      }
    }

    const value =
      col === 'issue' ? normalizeIssueCommit(raw) : raw.trim();

    const entityId = (cur.entityId || resolveLaneEntityId(cur.tr)).trim();
    if (!entityId) {
      cur.td.setAttribute('aria-invalid', 'true');
      cur.input.setAttribute('aria-invalid', 'true');
      cur.input.setAttribute('aria-describedby', 'cell-edit-error');
      setCellError('Missing lane id');
      cur.input.focus();
      return false;
    }
    cur.entityId = entityId;

    const detail: CellCommitDetail = {
      entityId,
      col,
      field: cur.field,
      value,
    };

    committing = true;
    setCellError(null);
    try {
      dispatchCommit(detail);
      if (opts?.onCellCommit) {
        await opts.onCellCommit(detail);
      }
      session = null;
      setEditHold(false);
      paintCommitted(cur.td, col, value);
    } catch {
      session = null;
      setEditHold(false);
      restoreTd(cur.td, cur.priorDisplay);
      committing = false;
      return false;
    }
    committing = false;

    const move = optsMove?.next ?? 'none';
    if (move === 'row') {
      const rows = Array.from(getTableBody(root)?.querySelectorAll('tr') || []).filter(
        (r) => !r.classList.contains('hidden-by-search'),
      );
      const idx = rows.indexOf(cur.tr);
      const nextRow = rows[idx + 1] as HTMLTableRowElement | undefined;
      if (nextRow) {
        const nextTd = nextRow.querySelector(
          `td[data-col="${col}"][data-editable="true"]`,
        ) as HTMLTableCellElement | null;
        if (nextTd) beginEdit(nextTd);
        else nextRow.focus();
      } else {
        cur.tr.focus();
      }
    } else if (move === 'tab' || move === 'shift-tab') {
      const editables = Array.from(
        cur.tr.querySelectorAll('td[data-editable="true"]'),
      ) as HTMLTableCellElement[];
      const i = editables.indexOf(cur.td);
      const next =
        move === 'tab'
          ? editables[i + 1] ||
          (() => {
            const rows = Array.from(
              getTableBody(root)?.querySelectorAll('tr') || [],
            ).filter((r) => !r.classList.contains('hidden-by-search')) as HTMLTableRowElement[];
            const ri = rows.indexOf(cur.tr);
            return rows[ri + 1]?.querySelector(
              'td[data-editable="true"]',
            ) as HTMLTableCellElement | null;
          })()
          : editables[i - 1] ||
          (() => {
            const rows = Array.from(
              getTableBody(root)?.querySelectorAll('tr') || [],
            ).filter((r) => !r.classList.contains('hidden-by-search')) as HTMLTableRowElement[];
            const ri = rows.indexOf(cur.tr);
            const prev = rows[ri - 1];
            const cells = prev
              ? (Array.from(
                prev.querySelectorAll('td[data-editable="true"]'),
              ) as HTMLTableCellElement[])
              : [];
            return cells[cells.length - 1] || null;
          })();
      if (next) beginEdit(next);
      else cur.tr.focus();
    } else {
      cur.tr.focus();
    }
    return true;
  }

  function scrubOrphanEditChrome() {
    root.querySelectorAll('td.cell-editing').forEach((td) => {
      td.classList.remove('cell-editing');
      td.removeAttribute('aria-invalid');
    });
    root.querySelectorAll('.cell-edit-input').forEach((el) => el.remove());
    setEditHold(false);
    setCellError(null);
  }

  function resetEditState() {
    cancelPendingBeginEdit();
    session = null;
    committing = false;
    mountingEdit = false;
    scrubOrphanEditChrome();
  }

  function syncCellValueCache() {
    const body = getTableBody(root);
    if (!body) return;
    for (const row of body.querySelectorAll('tr[data-kind="lane"]')) {
      const tr = row as HTMLTableRowElement;
      const entityId = resolveLaneEntityId(tr);
      if (!entityId) continue;
      const branchTd = tr.querySelector('td[data-col="branch"]') as HTMLTableCellElement | null;
      const issueTd = tr.querySelector('td[data-col="issue"]') as HTMLTableCellElement | null;
      const entry: Partial<Record<CellEditCol, string>> = {};
      if (branchTd && !branchTd.classList.contains('cell-editing')) {
        const t = (branchTd.textContent || '').trim();
        if (t) entry.branch = t;
      }
      if (issueTd && !issueTd.classList.contains('cell-editing')) {
        const t = (issueTd.textContent || '').trim();
        if (t) entry.issue = t;
      }
      if (Object.keys(entry).length === 0) continue;
      const prev = cellValueCache.get(entityId) || {};
      cellValueCache.set(entityId, { ...prev, ...entry });
    }
  }

  function cancelPendingBeginEdit() {
    if (beginEditRaf) {
      cancelAnimationFrame(beginEditRaf);
      beginEditRaf = 0;
    }
  }

  /** F2/e may fire before tml-text binds branch — wait briefly, then beginEdit. */
  function scheduleBeginEditForRow(tr: HTMLTableRowElement, attempt = 0) {
    if (destroyed) return;
    cancelPendingBeginEdit();
    const row =
      (tr.isConnected ? tr : null) ||
      (root.querySelector('tr[data-kind="lane"]:focus') as HTMLTableRowElement | null) ||
      (document.activeElement?.closest?.('tr[data-kind="lane"]') as HTMLTableRowElement | null);
    if (!row || !root.contains(row)) return;

    const td = row.querySelector(
      'td[data-editable="true"]',
    ) as HTMLTableCellElement | null;
    if (!td) return;
    const col = td.dataset.col;
    if (col !== 'branch' && col !== 'issue') return;

    syncCellValueCache();
    const { priorRaw } = resolveCellEditPrior(td, row, col, cellValueCache);
    const live = (td.textContent || '').trim();
    if (col === 'branch' && !live && !priorRaw && attempt < 8) {
      beginEditRaf = requestAnimationFrame(() => {
        beginEditRaf = 0;
        scheduleBeginEditForRow(row, attempt + 1);
      });
      return;
    }
    beginEdit(td);
  }

  function beginEdit(td: HTMLTableCellElement) {
    if (destroyed) return;
    clearZombieSession();
    const col = td.dataset.col;
    if (col !== 'branch' && col !== 'issue') return;
    if (td.dataset.editable !== 'true') return;
    const tr = td.closest('tr') as HTMLTableRowElement | null;
    if (!tr) return;
    // Do not gate edit UX on entityId — TML may lag data-entity-id; resolve at commit.
    const entityId = resolveLaneEntityId(tr);

    if (session) {
      if (session.td === td) return;
      void commitEdit({ next: 'none' }).then((ok) => {
        if (ok) beginEdit(td);
        else if (!session) beginEdit(td); // zombie cleared mid-flight
      });
      return;
    }

    const { priorRaw, priorDisplay } = resolveCellEditPrior(td, tr, col, cellValueCache);

    mountingEdit = true;
    setEditHold(true);
    // Mark editing before DOM clear so MutationObserver refresh cannot race.
    td.classList.add('cell-editing');
    td.textContent = '';
    const input = document.createElement('input');
    input.className = 'cell-edit-input';
    input.type = 'text';
    input.value = priorRaw;
    input.setAttribute('aria-label', col === 'branch' ? 'Edit branch' : 'Edit issue');
    td.appendChild(input);
    session = {
      td,
      tr,
      col,
      field: td.dataset.field || (col === 'branch' ? 'lane.targetBranch' : 'lane.issueId'),
      entityId,
      priorRaw,
      priorDisplay,
      input,
      draft: priorRaw,
    };
    mountingEdit = false;
    dispatchActivate({ entityId, col, field: session.field });
    wireEditInput(input);
    input.focus();
    input.select();
  }

  function wireEditInput(input: HTMLInputElement) {
    input.addEventListener('input', () => {
      if (session && session.input === input) session.draft = input.value;
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        cancelEdit();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        void commitEdit({ next: 'row' });
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        void commitEdit({ next: e.shiftKey ? 'shift-tab' : 'tab' });
      }
    });
    input.addEventListener('blur', () => {
      if (!session || session.input !== input) return;
      if (!input.isConnected) return; // live wipe — recoverEditIfDetached remounts
      // Defer so click handlers can cancel/switch first
      setTimeout(() => {
        if (session && session.input === input && !committing && input.isConnected) {
          void commitEdit({ next: 'none' });
        }
      }, 0);
    });
  }

  /** If TML (or sort) replaced the row, remount the same edit into the new cell. */
  function recoverEditIfDetached(): void {
    if (!session || destroyed || mountingEdit) return;
    if (session.td.isConnected && session.input.isConnected && root.contains(session.td)) {
      return;
    }
    const cur = session;
    const draft = cur.draft;
    const entityId = cur.entityId;
    const col = cur.col;
    const field = cur.field;
    const priorRaw = cur.priorRaw;
    const priorDisplay = cur.priorDisplay;
    const hadError = Boolean(cellError && !cellError.hidden && cellError.textContent);
    const errMsg = hadError ? cellError!.textContent : null;
    session = null;

    const tr = entityId
      ? (root.querySelector(
        `tr[data-kind="lane"][data-entity-id="${CSS.escape(entityId)}"]`,
      ) as HTMLTableRowElement | null)
      : null;
    const td = tr?.querySelector(
      `td[data-col="${col}"][data-editable="true"]`,
    ) as HTMLTableCellElement | null;
    if (!tr || !td) {
      setEditHold(false);
      setCellError(null);
      return;
    }

    mountingEdit = true;
    td.classList.add('cell-editing');
    if (hadError) td.setAttribute('aria-invalid', 'true');
    td.textContent = '';
    const input = document.createElement('input');
    input.className = 'cell-edit-input';
    input.type = 'text';
    input.value = draft;
    input.setAttribute('aria-label', col === 'branch' ? 'Edit branch' : 'Edit issue');
    if (hadError) {
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', 'cell-edit-error');
    }
    td.appendChild(input);
    session = {
      td,
      tr,
      col,
      field,
      entityId,
      priorRaw,
      priorDisplay,
      input,
      draft,
    };
    mountingEdit = false;
    setEditHold(true);
    wireEditInput(input);
    if (errMsg) setCellError(errMsg);
    try {
      input.focus();
    } catch {
      /* ignore */
    }
  }

  function applySearchQuery(qRaw: string) {
    if (destroyed) return;
    cachedQuery = qRaw;
    const q = qRaw.trim().toLowerCase();
    const tableBody = getTableBody(root);

    if (session && q.length > 0) {
      const text = (session.tr.textContent || '').toLowerCase();
      if (!text.includes(q)) {
        cancelEdit();
      }
    }

    tableBody?.querySelectorAll('tr').forEach((el) => {
      const text = (el.textContent || '').toLowerCase();
      el.classList.toggle('hidden-by-search', q.length > 0 && !text.includes(q));
    });
    updateTableEmpty();
  }

  function cycleTableSort(key: string) {
    const run = () => {
      if (tableSortKey !== key) {
        tableSortKey = key;
        tableSortDir = 'asc';
      } else if (tableSortDir === 'asc') {
        tableSortDir = 'desc';
      } else {
        tableSortKey = null;
        tableSortDir = null;
      }
      persistTableSort();
      syncSortHeaders();
      if (sortRaf) {
        cancelAnimationFrame(sortRaf);
        sortRaf = 0;
      }
      sorting = true;
      try {
        applyTableSort();
        updateTableEmpty();
      } finally {
        sorting = false;
      }
    };
    clearZombieSession();
    if (session) {
      void commitEdit({ next: 'none' }).then((ok) => {
        if (ok || !session) run();
      });
      return;
    }
    run();
  }

  const onSortClick = (e: Event) => {
    e.stopPropagation();
    e.preventDefault();
    const btn = e.currentTarget as HTMLElement;
    const th = btn.closest('th[data-key]') as HTMLElement | null;
    if (th?.dataset.key) cycleTableSort(th.dataset.key);
  };

  const sortButtons = Array.from(root.querySelectorAll('th[data-key] .sort-btn'));
  sortButtons.forEach((btn) => btn.addEventListener('click', onSortClick));

  const onRootClickCapture = (e: Event) => {
    const t = e.target as HTMLElement | null;
    if (!t || !root.contains(t)) return;
    if (t.closest('th, .sort-btn, #cell-edit-error, .table-empty')) return;

    const tr = t.closest('tr[data-kind="lane"]') as HTMLTableRowElement | null;
    if (!tr || !root.contains(tr)) return;

    clearZombieSession();

    // Playground pattern: row/cell click → inline edit (not #dlg).
    e.stopPropagation();
    e.preventDefault();

    const editableTd = t.closest('td[data-editable="true"]') as HTMLTableCellElement | null;
    if (editableTd && root.contains(editableTd)) {
      if (session?.td === editableTd) return;
      beginEdit(editableTd);
      return;
    }

    const first = tr.querySelector(
      'td[data-editable="true"]',
    ) as HTMLTableCellElement | null;
    if (!first) return;
    if (session?.td === first) return;
    beginEdit(first);
  };

  const onRootKeydown = (e: KeyboardEvent) => {
    if (e.key === 'F2' || e.key === 'e' || e.key === 'E') {
      if (e.key !== 'F2' && (e.target as HTMLElement)?.closest?.('input, textarea, [contenteditable]')) {
        return;
      }
      const tr = (e.target as HTMLElement)?.closest?.('tr[data-kind="lane"]') as
        | HTMLTableRowElement
        | null;
      const row =
        tr ||
        (root.querySelector('tr[data-kind="lane"]:focus') as HTMLTableRowElement | null) ||
        (document.activeElement?.closest?.('tr[data-kind="lane"]') as HTMLTableRowElement | null) ||
        (root.querySelector(
          'tbody tr[data-kind="lane"]:not(.hidden-by-search)',
        ) as HTMLTableRowElement | null);
      if (!row || !root.contains(row)) return;
      e.preventDefault();
      e.stopPropagation();
      if (session) cancelEdit();
      scheduleBeginEditForRow(row);
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && session) {
      if ((e.target as HTMLElement)?.closest?.('.cell-edit-input')) return;
      e.preventDefault();
      e.stopPropagation();
    }
  };

  root.addEventListener('click', onRootClickCapture, true);
  root.addEventListener('keydown', onRootKeydown, true);

  const onPageShow = (_e: PageTransitionEvent) => {
    resetEditState();
    syncCellValueCache();
  };
  window.addEventListener('pageshow', onPageShow);

  resetEditState();
  syncCellValueCache();

  function refresh() {
    if (destroyed || isEditing()) return;
    syncCellValueCache();
    applyTableSort();
    applySearchQuery(cachedQuery);
  }

  if (tableWrap && typeof MutationObserver !== 'undefined') {
    observer = new MutationObserver(() => {
      if (destroyed || committing) return;
      if (session) {
        recoverEditIfDetached();
        return;
      }
      if (sorting || isEditing()) return;
      if (sortRaf) cancelAnimationFrame(sortRaf);
      sortRaf = requestAnimationFrame(() => {
        sortRaf = 0;
        if (isEditing()) return;
        sorting = true;
        try {
          refresh();
        } finally {
          sorting = false;
        }
      });
    });
    observer.observe(tableWrap, { childList: true, subtree: true });
  }

  syncSortHeaders();
  applyTableSort();
  updateTableEmpty();

  return {
    applySearchQuery,
    refresh,
    destroy() {
      destroyed = true;
      window.removeEventListener('pageshow', onPageShow);
      cancelPendingBeginEdit();
      cancelEdit();
      if (sortRaf) cancelAnimationFrame(sortRaf);
      observer?.disconnect();
      observer = null;
      sortButtons.forEach((btn) => btn.removeEventListener('click', onSortClick));
      root.removeEventListener('click', onRootClickCapture, true);
      root.removeEventListener('keydown', onRootKeydown, true);
    },
  };
}
