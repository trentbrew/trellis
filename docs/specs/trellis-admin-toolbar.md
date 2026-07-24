# Spec: trellis admin — Operate header/toolbar parity

**Status:** Ready for impl  
**Date:** 2026-07-21  
**Proposal:** TRL-194  
**Design:** TRL-195 · [`docs/artifacts/trellis-admin-toolbar_design.md`](../artifacts/trellis-admin-toolbar_design.md) · [`trellis-admin-toolbar_mockup.html`](../artifacts/trellis-admin-toolbar_mockup.html)  
**Amends:** [`trellis-admin-shell.md`](./trellis-admin-shell.md) (chrome header/toolbar only)  
**Preserves:** OPERATE_NAV sidebar, visual-parity projections, statusbar telemetry, routes/`embed`  
**Labels:** `spec`, `tml`, `admin`, `needs-e2e`, `cohesion`

---

## 1. Intent

Raise kernel VCS chrome to **CollectionBrowseToolbar** density: slim brand
header + **full-bleed Operate toolbar** (view picker → search → Filters stub →
Export disabled → New issue disabled). Static HTML/CSS in `admin.html` only —
no React AppShell / shadcn.

---

## 2. Architecture decisions

| Decision | Choice |
| -------- | ------ |
| Chrome stack | Brand header **40px** + full-bleed `.operate-toolbar` (~48px min, `padding: 8px 16px`, `gap: 4px`) |
| Control height | **34px** (`--toolbar-control-h`) — keep e2e lock |
| View a11y | **`role="radiogroup"`** + `role="radio"` + `aria-checked` (not `aria-pressed`) |
| View class | Keep `.view-toggle` class name for continuity; restyle to muted track / raised active |
| Active segment | Track `#1e1e1e` / `--background-weak`; active `#1c1c1c` / `--surface` — **not** accent fill |
| Label-on-active | Icon always; text label **only** when `aria-checked="true"` |
| Search | Composite flex-1; keep `#search` / `#search-input` / clear; existing client filter |
| Filters | Stub note “Filters coming soon.” · `role="status"` · Escape/outside/reclick dismiss |
| Export | Disabled icon; `aria-label="Export"` |
| New issue | Disabled primary; `aria-label="New issue (coming soon)"` |
| Statusbar | Telemetry SSOT — live/repo/stats stay in `.statusbar`; **not** in brand header |
| Theme | `/theme/runtime-theme.css` only |
| Out of scope | Wire New/create; real filters; export; datatable; AppShell; responsive polish |

---

## 3. File touch map

| File | Change |
| ---- | ------ |
| `src/ui/admin.html` | Slim `.header`; extract `.operate-toolbar`; restyle view/search; Filters/Export/New; shell grid rows + embed |
| `e2e/admin.spec.cjs` | Assert `.operate-toolbar`; `aria-checked` on view radios; stubs; embed keeps toolbar; 34px; no live/stats in `.header` |
| `docs/specs/trellis-admin-toolbar.md` | This file |

**Out of touch:** `lanes-dashboard.ts` routes, `admin.ts` CLI, `runtime-theme.css` palette, projection CSS, sidebar OPERATE_NAV markup (except grid row count).

---

## 4. Shell grid (normative)

Standalone:

```
grid-template-rows: 40px auto minmax(0, 1fr) var(--statusbar-h);
grid-template-columns: var(--sidebar-w) minmax(0, 1fr) var(--oplog-w);
```

| Region | Grid |
| ------ | ---- |
| `.sidebar` | row 1 / -1 · col 1 |
| `.header` | row 1 · col 2 |
| `.operate-toolbar` | row 2 · col 2 |
| `.main` | row 3 · col 2 |
| `.oplog` | rows 1–3 · col 3 |
| `.statusbar` | row 4 · col 2 (or `1 / -1` if already full-bleed — **preserve existing span**) |

**Embed (`html.admin-embed`):** hide `.sidebar`; brand + toolbar + main + oplog +
statusbar remain visible. Update any rules that still assume a single 48px header
row containing the toolbar.

Narrow (`max-width: 1099px`): include toolbar row in the row template; do not
drop toolbar.

---

## 5. Markup contracts

### 5.1 Brand header

```html
<header class="header">
  <div class="brand">Trellis <span>admin</span></div>
  <!-- optional crumb -->
  <div class="crumb">Operate / VCS</div>
</header>
```

**Forbidden in `.header`:** view toggle, search, live, stats.

### 5.2 Operate toolbar (L→R)

```html
<div class="operate-toolbar" data-testid="operate-toolbar">
  <div class="view-toggle" role="radiogroup" aria-label="Projection">…</div>
  <div class="search" id="search">…#search-input…</div>
  <button type="button" id="filters-btn" aria-label="Filters" aria-expanded="false" aria-controls="filters-menu">…</button>
  <div id="filters-menu" role="status" hidden>Filters coming soon.</div>
  <button type="button" disabled aria-label="Export">…</button>
  <button type="button" disabled aria-label="New issue (coming soon)">+ New issue</button>
</div>
```

View buttons: `role="radio"`, `data-view="grid|kanban|table"`, `aria-checked`,
inline SVG icons, `.lbl` span hidden unless checked.

### 5.3 JS

- `setView` / URL / localStorage: update `aria-checked` (replace `aria-pressed`).
- Optional: Left/Right within radiogroup (nice-to-have).
- Filters: toggle `#filters-menu`; Escape / outside / reclick close; focus return to `#filters-btn`.
- Search clear: existing behavior.

---

## 6. e2e (`e2e/admin.spec.cjs`)

Migrate / extend:

1. `.operate-toolbar` visible on `/`
2. `.view-toggle[role="radiogroup"]`; kanban `aria-checked="true"`; click grid → checked
3. `#search-input` + 34px heights on `.view-toggle` and `#search-input`
4. Filters button opens status text matching /coming soon/i; Escape closes
5. Export + New issue `disabled`
6. `.header .live, .header .stats` count 0; `.statusbar` still shows live/repo/stats
7. Embed: `.operate-toolbar` visible; `.sidebar` hidden
8. Existing visual-parity + shell cases remain green

Run (impl / reviewer): `CI=1 pnpm test:e2e e2e/admin.spec.cjs`

---

## 7. Out of scope

- Wire `+ New issue` → graph create  
- Real filter model / datatable  
- Export implementation  
- Upload / Physics / Hash-Query search modes  
- Playground React port  
- Responsive wrap polish  

---

## Acceptance criteria

```text
test:pnpm check
test:test -f docs/specs/trellis-admin-toolbar.md
test:grep -q trellis-admin-toolbar_design.md docs/specs/trellis-admin-toolbar.md
test:grep -q operate-toolbar docs/specs/trellis-admin-toolbar.md
test:grep -q 'aria-checked' docs/specs/trellis-admin-toolbar.md
test:grep -q 'Filters coming soon' docs/specs/trellis-admin-toolbar.md
test:grep -q '34px' docs/specs/trellis-admin-toolbar.md
test:grep -q CollectionBrowseToolbar docs/specs/trellis-admin-toolbar.md
```

**Impl verification (carry on impl issue):**

```text
test:CI=1 pnpm test:e2e e2e/admin.spec.cjs
```
