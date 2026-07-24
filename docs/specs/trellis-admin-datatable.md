# Spec: trellis admin — Operate datatable (SpreadsheetTable TML)

**Status:** Ready for impl  
**Date:** 2026-07-21  
**Proposal:** TRL-200  
**Design:** TRL-201 · [`docs/artifacts/trellis-admin-datatable_design.md`](../artifacts/trellis-admin-datatable_design.md) · [`trellis-admin-datatable_mockup.html`](../artifacts/trellis-admin-datatable_mockup.html)  
**Amends:** visual-parity / toolbar table projection density only  
**Preserves:** OPERATE_NAV, operate-toolbar (search ownership), statusbar, embed, TML live tbody, row→`#dlg` + `lastFocus`  
**Labels:** `spec`, `tml`, `admin`, `needs-e2e`, `cohesion`

---

## 1. Intent

Raise `#view-table` / `.lanes-table` to **SpreadsheetTable browse density** in
static TML (`admin.html` HTML/CSS/JS only). Match playground rhythm (42px rows,
36px sticky sort headers, column hairlines, empty/no-match) without importing
React/shadcn.

---

## 2. Architecture decisions

| Decision | Choice |
| -------- | ------ |
| DOM | Keep semantic `<table class="lanes-table">` (not div-grid SpreadsheetTable) |
| Density | `--table-row-h: 42px`; `--table-header-h: 36px` |
| Wrap radius | **12px** (`border-radius: 12px` / visual-parity `rounded.xl`) — do **not** set theme `--radius-lg` to 12px |
| Column dividers | `border-right: 1px solid` quiet `--border-column` (`rgba(255,255,255,0.06)` or local var) |
| Row hover | `#222` / `--surface-hover` — **never** `--surface2`; **never** accent wash |
| Sort UI | `<th scope="col"><button type="button" class="sort-btn">` + glyph; `aria-sort` **only on `th`** |
| Sort cycle | none → asc → desc → none (single key) |
| Sort vs TML | **Re-apply** comparator after `tml-live` tbody updates (MutationObserver on `#table-lanes` / tbody, or hook after TML render) |
| Sort persistence | Prefer `sessionStorage` key/dir for table view (optional; default OK if session-only in memory) |
| Search | Toolbar `#search-input` only — no in-table search (`showToolbar={false}`) |
| Empty | Sibling `.table-empty` inside `.table-wrap`; `role="status"`; veil `pointer-events: none` so headers stay interactive |
| Empty copy | Zero rows: title “No lanes”; all `.hidden-by-search`: “No matches” |
| Columns | Keep six: Lane · Agent · Ops · Files · Branch · Issue |
| Row activate | Preserve click / Enter / Space → `#dlg`; close restores `lastFocus` |
| Theme | `/theme/runtime-theme.css` + admin locals only |
| Out of scope | Cell edit; column resize; checkbox/selection rails; Filters model; New-issue wire; export; React SpreadsheetTable; sticky ID/`#` rails |

---

## 3. File touch map

| File | Change |
| ---- | ------ |
| `src/ui/admin.html` | Table CSS density; sortable headers; `.table-empty`; sort JS + re-apply after live; empty toggle wired to search + tbody |
| `e2e/admin.spec.cjs` | Sort `aria-sort`; ~42px row height; empty / no-match; keep shell/toolbar/parity green |
| `docs/specs/trellis-admin-datatable.md` | This file |

**Out of touch:** `lanes-dashboard.ts`, `admin.ts`, `runtime-theme.css` palette tokens (unless documenting a local CSS var only in `admin.html`), shell/sidebar/toolbar markup contracts.

---

## 4. Markup contracts

### 4.1 Table well

```html
<section class="proj table-view" id="view-table" data-view="table">
  <div class="table-wrap">
    <table class="lanes-table" aria-label="Lanes">
      <caption class="sr-only">Lane inventory — sortable columns</caption>
      <thead>
        <tr>
          <th scope="col" aria-sort="none" data-key="lane">
            <button type="button" class="sort-btn">Lane <span class="sort-ind" aria-hidden="true">⇅</span></button>
          </th>
          <!-- agent | ops | files | branch | issue — same pattern; data-key matches cell order -->
        </tr>
      </thead>
      <tbody tml-query="…" tml-each="…" tml-live tml-ref="table-lanes">
        <tr data-kind="lane" tabindex="0">…</tr>
      </tbody>
    </table>
    <div class="table-empty" id="table-empty" role="status" hidden>
      <strong class="table-empty-title">No lanes</strong>
      <span class="table-empty-desc">…</span>
    </div>
  </div>
</section>
```

Use `hidden` attribute and/or `data-visible` — e2e may assert visibility; prefer
toggling `hidden` for simplicity.

### 4.2 CSS locks

```css
:root {
  --table-row-h: 42px;
  --table-header-h: 36px;
  --border-column: rgba(255, 255, 255, 0.06);
  --surface-hover: #222222; /* table row hover only */
}
.table-wrap { border-radius: 12px; /* rounded.xl */ }
table.lanes-table th { height: var(--table-header-h); position: sticky; top: 0; }
table.lanes-table td { height: var(--table-row-h); border-right: 1px solid var(--border-column); }
table.lanes-table tbody tr:hover td { background: var(--surface-hover); }
```

Sort button: full-width in `th`; inset `focus-visible` ring using interactive /
accent token (match mock). Active sort glyph: `--text-interactive-base` /
`--accent` family.

### 4.3 JS

- `cycleSort(key)` updates `sortKey` / `sortDir`, `th[aria-sort]`, glyph ▲/▼/⇅.
- `applyTableSort()` sorts **visible** tbody rows by column index (numeric for
  Ops/Files when parseable).
- After TML mutates tbody: call `applyTableSort()` if sort active; then
  `updateTableEmpty()`.
- `updateTableEmpty()`:
  - no `tr` in tbody → show “No lanes”
  - all `tr` have `.hidden-by-search` → “No matches”
  - else hide empty
- Search handler (existing): after toggling `.hidden-by-search`, call
  `updateTableEmpty()`.

---

## 5. e2e (`e2e/admin.spec.cjs`)

Add / extend:

1. `/?view=table` — `.table-wrap` visible; headers have `.sort-btn`
2. Click a sort button → corresponding `th[aria-sort="ascending"]` (then
   descending on second click)
3. First data row `td` computed height ≈ `42px` (allow ±1px) **or**
   `getComputedStyle(tr).height` / cell height locked to `--table-row-h`
4. With search that matches nothing → `#table-empty` visible / text matches
   `/no matches/i`
5. Existing shell, toolbar, embed, visual-parity cases remain green

Run (impl / reviewer): `CI=1 pnpm test:e2e e2e/admin.spec.cjs`

---

## 6. Out of scope

- Wire `+ New issue` → graph create  
- Real Filters / column filter menus / export  
- Inline cell edit, resize, selection rails, sticky ID column  
- React `SpreadsheetTable` import / AppShell  
- Changing OPERATE_NAV or operate-toolbar contracts  

---

## Acceptance criteria

```text
test:pnpm check
test:test -f docs/specs/trellis-admin-datatable.md
test:grep -q trellis-admin-datatable_design.md docs/specs/trellis-admin-datatable.md
test:grep -q table-row-h docs/specs/trellis-admin-datatable.md
test:grep -q aria-sort docs/specs/trellis-admin-datatable.md
test:grep -q table-empty docs/specs/trellis-admin-datatable.md
test:grep -q surface-hover docs/specs/trellis-admin-datatable.md
test:grep -q SpreadsheetTable docs/specs/trellis-admin-datatable.md
```

**Impl verification (carry on impl issue):**

```text
test:CI=1 pnpm test:e2e e2e/admin.spec.cjs
```
