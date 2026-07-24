# Spec: trellis admin — Operate inline cell edit

**Status:** Ready for impl  
**Date:** 2026-07-21  
**Proposal:** TRL-212  
**Design:** TRL-213 · [`docs/artifacts/trellis-admin-datatable-cell-edit_design.md`](../artifacts/trellis-admin-datatable-cell-edit_design.md) · [`trellis-admin-datatable-cell-edit_mockup.html`](../artifacts/trellis-admin-datatable-cell-edit_mockup.html)  
**Inherits density:** [`trellis-admin-datatable.md`](./trellis-admin-datatable.md) / TRL-203  
**Module host:** [`trellis-admin-datatable-extract.md`](./trellis-admin-datatable-extract.md) / `src/ui/admin-datatable.ts`  
**Preserves:** shell/toolbar/statusbar, TML tbody in HTML, e2e browse selectors, Seam C row→`#dlg`  
**Labels:** `spec`, `tml`, `admin`, `needs-e2e`

---

## 1. Intent

Activate Operate datatable **inline cell edit** for **branch** and **issue**
columns inside the extracted `admin-datatable` module. Zero density delta vs
TRL-203. Shell stays thin: listens for commit events and mutates lane meta via
the admin host (`lanes-dashboard`), not `server.ts`.

---

## 2. Architecture decisions

| Decision | Choice |
| -------- | ------ |
| Editable cols | **branch** + **issue** only (`data-editable="true"`); lane/agent/ops/files stay `false` |
| Edit host | Extend `admin-datatable.ts` / `.css` — DOM-only; no kernel imports |
| Chrome | `td.cell-editing` inset ring (`outline: 2px solid var(--accent); outline-offset: -2px`); `.cell-edit-input` fills cell |
| Error UI | `#cell-edit-error` under `.table-wrap`, `role="alert"`; wired via `aria-describedby` |
| Keyboard enter-edit | Row focused + **F2** or **e** → first editable cell (`branch`); no `#dlg` |
| Pointer | Editable click → edit (`stopPropagation`); RO / row chrome → Seam C `#dlg` |
| Mid-edit RO click | **Commit then** open `#dlg` |
| Sort while editing | **Commit then** sort |
| Search hide editing row | **Cancel** then apply `.hidden-by-search` |
| Live refresh | **Skip `refresh()`** while any `.cell-editing` exists |
| Issue validation | Empty → null / display `—`; non-empty `/^TRL-\d+$/i` |
| Empty branch | **Reject** — keep editing; message “Branch required” |
| Mutation fail | `#toast` + **restore** prior text + exit edit |
| Events | `trellis:cell-activate` on begin; `trellis:cell-commit` on successful local validate (before/alongside host mutate) |
| Mutation wire | Extend `POST /api/tml-mutations` with `action: "updateLaneMeta"` on `lanes-dashboard.ts` only |
| Density | Preserve 42/36, `#222` hover, 12px wrap, existing sort/empty/search contracts |

---

## 3. File touch map

| File | Change |
| ---- | ------ |
| `src/ui/admin-datatable.ts` | Begin/commit/cancel edit; F2/e; validation helpers; skip refresh while editing; commit-then-sort; cancel-then-search; dispatch cell events |
| `src/ui/admin-datatable.css` | `.cell-editing`, `.cell-edit-input`, `#cell-edit-error` |
| `src/ui/admin.html` | Flip branch/issue `data-editable="true"`; add `#cell-edit-error`; shell listen `trellis:cell-commit` → mutate; dlg id from `data-entity-id` |
| `src/ui/lanes-dashboard.ts` | `updateLaneMeta` action on `/api/tml-mutations` (load/patch/save lane meta) |
| `test/ui/admin-datatable.test.ts` | Validation + edit helper unit tests |
| `e2e/admin.spec.cjs` | New cell-edit cases; keep existing 24 green |
| `docs/specs/trellis-admin-datatable-cell-edit.md` | This file |

**Out of touch:** `server.ts`, React SpreadsheetTable, Filters/New-issue/Export, agent/lane/ops/files edit, double-click dlg affordance, `runtime-theme.css` palette (use existing `--accent` / local edit tokens in module CSS).

---

## 4. Public API extensions (normative)

Existing mount handle remains. Export pure helpers for tests:

```ts
export function isValidIssueId(raw: string): boolean;
// empty/whitespace → true (maps to null); else /^TRL-\d+$/i

export function normalizeIssueCommit(raw: string): string | null;
// empty → null; else trimmed canonical e.g. TRL-212

export function isValidBranchCommit(raw: string): boolean;
// non-empty after trim
```

Optional mount opt (recommended):

```ts
opts?: {
  onEmptyChange?: (state: TableEmptyState) => void;
  onCellCommit?: (detail: CellCommitDetail) => void | Promise<void>;
};

type CellCommitDetail = {
  entityId: string;
  col: 'branch' | 'issue';
  field: string; // data-field
  value: string | null;
};
```

If `onCellCommit` throws / returns rejected promise: restore + toast path (shell may also listen to the CustomEvent).

### Events (bubbling on `root` / `.table-wrap`)

| Event | When | `detail` |
| ----- | ---- | -------- |
| `trellis:cell-activate` | Edit begins | `{ entityId, col, field }` |
| `trellis:cell-commit` | Local validation passed | `CellCommitDetail` |

---

## 5. Mutation API (`lanes-dashboard.ts`)

Extend existing `POST /api/tml-mutations`:

```json
{ "action": "updateLaneMeta", "args": { "id": "lane-…", "targetBranch": "…", "issueId": "TRL-212" | null } }
```

- Patch only provided keys among `targetBranch` | `issueId`
- Persist via `loadLaneMeta` + `saveLaneMeta` (or engine wrapper if already exposed)
- Normalize `issueId`: store `issue:TRL-N` or plain id consistently with snapshot (`lanes-snapshot` already strips `issue:` for display — match existing meta convention)
- 400 on unknown lane / invalid body
- Do **not** add this to `server.ts`

Shell wiring after mount:

```js
viewTable.addEventListener('trellis:cell-commit', async (e) => {
  const d = e.detail;
  const body = { action: 'updateLaneMeta', args: { id: d.entityId } };
  if (d.col === 'branch') body.args.targetBranch = d.value;
  if (d.col === 'issue') body.args.issueId = d.value;
  const res = await fetch('/api/tml-mutations', { method: 'POST', … });
  if (!res.ok) { /* toast + module restore via reject path */ }
});
```

(Exact restore API: module owns restore on failed `onCellCommit`, or shell dispatches a cancel — prefer `onCellCommit` promise rejection.)

---

## 6. Shell / markup (`admin.html`)

1. Branch + issue `td`: `data-editable="true"` (others remain `false`).
2. Inside `.table-wrap`, after table:

```html
<div id="cell-edit-error" role="alert" hidden></div>
```

3. Row → `#dlg`: resolve lane id from `tr[data-entity-id]` (not first `td` text).
4. While `.cell-editing` / `.cell-edit-input` active: row Enter must not open dlg (module suppresses; shell may also guard).

---

## 7. Interaction locks (Executor must match design matrix)

| Input | Behavior |
| ----- | -------- |
| Click editable | Begin edit |
| F2 / e on focused row | Begin edit on branch |
| Enter (editing) | Commit → next row same col |
| Tab / Shift+Tab | Commit → next/prev editable |
| Escape | Cancel |
| Blur | Commit |
| Sort while editing | Commit then sort |
| Observer while editing | Skip refresh |
| Search hide row | Cancel then filter |
| Invalid issue | Keep editing + `#cell-edit-error` |
| Empty branch | Keep editing + “Branch required” |
| Empty issue | Commit null → `—` |
| Mutation fail | Toast + restore + exit edit |

---

## 8. e2e / unit

**Unit** (`test/ui/admin-datatable.test.ts`): `isValidIssueId`, `normalizeIssueCommit`, `isValidBranchCommit` (+ any pure commit-prep helpers).

**e2e** (`e2e/admin.spec.cjs`) — add cases; keep existing suite green:

- Click branch cell → `.cell-editing` / input visible
- F2 on focused row → edit branch
- Escape cancels (value restored)
- Invalid issue stays editing; `#cell-edit-error` visible
- Existing sort / 42px / `#table-empty` / search cases unchanged

Selectors preserved: `#view-table`, `.table-wrap`, `.sort-btn`, `#table-empty`, `.lanes-table`, `#search-input`, `#search-clear`.

---

## 9. Out of scope

- Agent / lane id / ops / files edit  
- Double-click → dlg  
- Filters / New-issue / Export  
- React SpreadsheetTable / AppShell  
- Multi-cell paste / column resize  
- Wiring admin host on `server.ts`

---

## Acceptance criteria

```text
test:pnpm check
test:test -f docs/specs/trellis-admin-datatable-cell-edit.md
test:grep -q trellis-admin-datatable-cell-edit_design.md docs/specs/trellis-admin-datatable-cell-edit.md
test:grep -q admin-datatable.ts docs/specs/trellis-admin-datatable-cell-edit.md
test:grep -q updateLaneMeta docs/specs/trellis-admin-datatable-cell-edit.md
test:grep -q trellis:cell-commit docs/specs/trellis-admin-datatable-cell-edit.md
test:grep -q cell-edit-error docs/specs/trellis-admin-datatable-cell-edit.md
test:grep -q "data-editable" docs/specs/trellis-admin-datatable-cell-edit.md
```

**Impl verification (carry on impl issue):**

```text
test:pnpm check
test:CI=1 pnpm test:e2e e2e/admin.spec.cjs
```
