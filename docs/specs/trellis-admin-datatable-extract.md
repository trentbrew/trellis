# Spec: trellis admin — extract Operate datatable module

**Status:** Ready for impl  
**Date:** 2026-07-21  
**Proposal:** TRL-206  
**Design:** TRL-207 · [`docs/artifacts/trellis-admin-datatable-extract_design.md`](../artifacts/trellis-admin-datatable-extract_design.md) · [`trellis-admin-datatable-extract_mockup.html`](../artifacts/trellis-admin-datatable-extract_mockup.html)  
**Inherits density:** [`trellis-admin-datatable.md`](./trellis-admin-datatable.md) / TRL-203 (zero visual delta)  
**Preserves:** shell/view-header (`#board-toolbar` search), statusbar, TML tbody in HTML, e2e selectors, multi-view search  
**Labels:** `spec`, `tml`, `admin`, `needs-e2e`, `cohesion`, `harden`

---

## 1. Intent

Extract Operate `#view-table` **behavior + CSS** from `admin.html` into a typed
module before inline cell edit. Harden packaging only — **no** new chrome, **no**
cell editors this wedge.

---

## 2. Architecture decisions

| Decision | Choice |
| -------- | ------ |
| Boundary | **Option B** — `src/ui/admin-datatable.ts` → `GET /admin-datatable.js` (esbuild, mirror `/tml-runtime.js`) |
| CSS | `src/ui/admin-datatable.css` → `GET /admin-datatable.css` via `findUiAsset` static read |
| Bundle | DOM-only ESM; **no** imports from `../core/**` / VCS / kernel |
| Markup | `#view-table` thead + TML tbody **stay in** `admin.html` |
| Search | Shell keeps multi-view `applySearchFilter` (cards/ops); module `applySearchQuery(q)` owns **table rows + empty only** |
| Utility CSS | `.hidden-by-search` stays in **shell** `admin.html` |
| Empty channel | Prefer `onEmptyChange` callback **or** `trellis:table-empty` — pick **one** normative (recommend callback for shell; optional event OK if unused) |
| Edit attrs | Add `data-col`, `data-editable="false"`, `data-field` on each `td` in **TML template** |
| Cell edit | **Out of scope** — no `contenteditable`, no `trellis:cell-*`, no edit CSS |
| Host | Routes only on `lanes-dashboard.ts` (admin host); do not half-wire `server.ts` |
| Density | Preserve TRL-203 locks (42/36, sort, empty, `--surface-hover`) |

---

## 3. File touch map

| File | Change |
| ---- | ------ |
| `src/ui/admin-datatable.ts` | **New** — `mountAdminDatatable`, sort/empty/observer, `applySearchQuery` / `refresh` / `destroy` |
| `src/ui/admin-datatable.css` | **New** — table well/sort/empty styles + local `--table-*` vars moved from `admin.html` |
| `src/ui/lanes-dashboard.ts` | `GET /admin-datatable.js` (esbuild), `GET /admin-datatable.css` (static) |
| `src/ui/admin.html` | Remove moved CSS/JS; link CSS; import+mount module after TML; search seam; edit-ready `td` attrs |
| `test/ui/admin-datatable.test.ts` | **New** — pure sort/empty helper unit tests |
| `e2e/admin.spec.cjs` | Existing datatable cases must stay green (no selector renames) |
| `docs/specs/trellis-admin-datatable-extract.md` | This file |
| `package.json` build | Ensure `admin-datatable.css` copied to `dist/ui/` if build copies other UI static assets |

**Out of touch:** `runtime-theme.css` palette, OPERATE_NAV, view-header markup contracts, `server.ts` (unless already serving admin — it does not today).

---

## 4. Public API (normative)

```ts
export type TableEmptyState = 'hidden' | 'no-lanes' | 'no-matches';

export function mountAdminDatatable(
  root: HTMLElement,
  opts?: { onEmptyChange?: (state: TableEmptyState) => void },
): {
  applySearchQuery(q: string): void;
  refresh(): void;
  destroy(): void;
};
```

| Method | Behavior |
| ------ | -------- |
| `applySearchQuery(q)` | Toggle `.hidden-by-search` on `#view-table tbody tr` only; update `#table-empty`; cache `q` for `refresh` |
| `refresh()` | Re-apply active sort + cached query (after TML mutation) |
| `destroy()` | Disconnect MutationObserver; remove sort listeners |

Mount binds `.sort-btn` inside `root`, observes `.table-wrap` (or tbody replace), syncs empty on init.

---

## 5. Serve routes (`lanes-dashboard.ts`)

### `GET /admin-datatable.js`

Clone `/tml-runtime.js` esbuild options: `bundle: true`, `format: 'esm'`,
`target: 'es2020'`, `platform: 'browser'`, `minify: false`,
`Content-Type: text/javascript`, `Cache-Control: no-cache`. Entry:
`findUiAsset('admin-datatable.ts')`.

### `GET /admin-datatable.css`

`findUiAsset('admin-datatable.css')` → `readFileSync` → `text/css`,
`Cache-Control: no-cache`. 404 if missing.

---

## 6. Shell wiring (`admin.html`)

1. `<link rel="stylesheet" href="/admin-datatable.css" />` (in addition to
   runtime-theme).
2. After TML `mount(...)`, module script:

```js
import { mountAdminDatatable } from '/admin-datatable.js';
const adminTable = mountAdminDatatable(document.getElementById('view-table'));
```

3. Search input/clear: keep filtering `.issue-card, .lane-card, .op`; for table
   call `adminTable.applySearchQuery(searchInput.value)` (do **not** duplicate
   table-row filter in shell).
4. Row → `#dlg` remains `#tml-root` delegate (Seam C).
5. On each `td` in TML template (static attrs):

```html
<td data-col="lane" data-editable="false" data-field="lane.id" …>
```

(same for agent / ops / files / branch / issue).

---

## 7. e2e / unit

- **Unit:** `test/ui/admin-datatable.test.ts` — exportable pure helpers for sort
  comparator and empty-state resolution (or test via small DOM harness). Include
  in default `pnpm test` / vitest discovery.
- **e2e:** `CI=1 pnpm test:e2e e2e/admin.spec.cjs` — all existing cases green,
  especially datatable sort / 42px / table-empty. Selectors unchanged:
  `#view-table`, `.table-wrap`, `.sort-btn`, `#table-empty`, `.lanes-table`.

---

## 8. Out of scope

- Inline cell edit / Tab cell nav / mutation POST  
- Filters model / New-issue wire / Export  
- React SpreadsheetTable / AppShell  
- HTML partial includes for thead/tbody  
- Moving admin host to `server.ts`

---

## Acceptance criteria

```text
test:pnpm check
test:test -f docs/specs/trellis-admin-datatable-extract.md
test:grep -q trellis-admin-datatable-extract_design.md docs/specs/trellis-admin-datatable-extract.md
test:grep -q admin-datatable.ts docs/specs/trellis-admin-datatable-extract.md
test:grep -q mountAdminDatatable docs/specs/trellis-admin-datatable-extract.md
test:grep -q applySearchQuery docs/specs/trellis-admin-datatable-extract.md
test:grep -q "data-editable" docs/specs/trellis-admin-datatable-extract.md
test:grep -q findUiAsset docs/specs/trellis-admin-datatable-extract.md
```

**Impl verification (carry on impl issue):**

```text
test:pnpm check
test:CI=1 pnpm test:e2e e2e/admin.spec.cjs
```
