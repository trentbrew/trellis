# Spec: trellis admin — VCS layout IDE-aligned Work/Logs

**Status:** Ready for impl  
**Date:** 2026-07-21  
**Proposal:** TRL-225  
**Design:** TRL-226 · [`docs/artifacts/trellis-admin-vcs-layout-ide_design.md`](../artifacts/trellis-admin-vcs-layout-ide_design.md) · [`trellis-admin-vcs-layout-ide_mockup.html`](../artifacts/trellis-admin-vcs-layout-ide_mockup.html)  
**Amends:** [`trellis-admin-shell.md`](./trellis-admin-shell.md), [`trellis-admin-toolbar.md`](./trellis-admin-toolbar.md) (VCS IA + chrome placement)  
**Preserves:** OPERATE_NAV primary sidebar, visual-parity TML projections, header stats/crumbs, SSE op stream, embed primary-hide contract  
**Labels:** `spec`, `tml`, `admin`, `needs-e2e`, `cohesion`

---

## 1. Intent

Regroup kernel admin **VCS secondary navigation** to IDE **Work / Logs** zones,
move browse tools into a **per-view header** inside main (AffordanceShell
analogue), and make **Logs → Ops** the canonical ops timeline — retiring the
always-visible 280px op-log column in the default layout. Optional **Pin live
tail** reuses existing op-log inspector markup as a companion panel.

Static HTML/CSS/JS in `admin.html` only — no React port.

---

## 2. Architecture decisions

| Decision | Choice |
| -------- | ------ |
| Secondary IA | **WORK** (Board · Milestones · Workflows stub) + **LOGS** (Ops · Decisions stub · Branches stub) |
| Retired peers | Remove `data-secondary="issues"` and `data-secondary="lanes"` — both → **Board** |
| Secondary head | Remove `#secondary-head` “VCS” title; zone eyebrows **WORK** / **LOGS** only |
| Default route | **`work/board`** on first load |
| Route state | Query param **`?vcs=<zone>/<tab>`** (e.g. `?vcs=work/board`, `?vcs=logs/ops`); sync on nav + `history.replaceState` |
| localStorage | Key **`trellis-admin-vcs-route`** value `zone/tab`; migrate legacy `trellis-admin-secondary` (see §8) |
| Global toolbar | **Remove** standalone `.operate-toolbar` grid row; relocate controls to **`.view-header`** |
| Board tools | View picker + search + Filters stub + Export disabled + New issue disabled — **Work · Board only** |
| Logs tools | View title + meta + **Pin live tail** toggle only — no search row |
| Ops home | **`#ops-main`** timeline in main under Logs → Ops; reuse `.op` row markup from `#oplog .ops` |
| Default op-log | **`html.oplog-collapsed` by default** (no 4th column); `--oplog-w: 0px` in default shell grid |
| Pin inspector | Class **`html.inspector-pinned`** adds 4th column; reuse `#oplog` as **Live ops** inspector; title **“Live ops”** (not “Op log”) |
| Secondary toggle | **`#secondary-toggle`** moves from removed operate row → **`.view-header`** (all routes) |
| Secondary width | CSS default **`--secondary-w: 224px`**; resize 160–360px (unchanged keys) |
| Secondary collapse | Keep **`html.secondary-collapsed`** → 48px icon rail |
| Crumb | Keep `#crumb-route` text **`vcs`** (do not append work/logs segment this wedge) |
| Theme | `/theme/runtime-theme.css` only |
| Out of scope | Wire New issue; real Decisions/Branches/Workflows; URL router module extract; responsive polish |

---

## 3. File touch map

| File | Change |
| ---- | ------ |
| `src/ui/admin.html` | Secondary nav restructure; `.view-header` + panel bodies; ops main timeline; pin inspector grid; remove global `.operate-toolbar`; migrate `setSecondary` → `setVcsRoute`; localStorage migration |
| `e2e/admin.spec.cjs` | Replace flat secondary tests; assert Work/Logs zones; view-header toolbar visibility; Logs/Ops main; pin inspector; default no visible `#oplog` column |
| `docs/specs/trellis-admin-vcs-layout-ide.md` | This file |

**Out of touch:** `lanes-dashboard.ts` routes, `admin.ts` CLI, `runtime-theme.css` palette, TML projection internals (`tml-runtime.ts`), datatable module, sidebar OPERATE_NAV order.

---

## 4. Shell grid (normative)

### 4.1 Default (standalone, pin off, oplog collapsed)

```
grid-template-columns: var(--sidebar-w) var(--secondary-w) minmax(0, 1fr);
grid-template-rows: var(--chrome-h) minmax(0, 1fr);
```

| Region | Grid |
| ------ | ---- |
| `.sidebar` | row 1 / -1 · col 1 |
| `.secondary` | row 1 / -1 · col 2 |
| `.header` | row 1 · col 3 / -1 (spans main + optional inspector) |
| `.main` | row 2 · col 3 |
| `#oplog` (inspector) | **not in layout** (`display: none` or `--oplog-w: 0`) |

### 4.2 Pin live tail (`html.inspector-pinned`)

```
grid-template-columns: var(--sidebar-w) var(--secondary-w) minmax(0, 1fr) var(--oplog-w);
```

| Region | Grid |
| ------ | ---- |
| `.header` | row 1 · col 3 (main column only — inspector head aligns to col 4) |
| `.main` | row 2 · col 3 |
| `#oplog.inspector` | row 1 / -1 · col 4; head title **Live ops** |

Default `--oplog-w: 280px` when pinned; retain resize handle + `trellis-admin-oplog-w`.

### 4.3 Embed (`html.admin-embed`)

Hide **primary** `.sidebar` only. Secondary + main + optional pin remain. No global operate row.

---

## 5. Markup contracts

### 5.1 Secondary sidebar

Remove `#secondary-head`. Two zone blocks:

```html
<aside class="secondary" id="secondary" data-route="vcs">
  <div class="secondary-zone-label" id="zone-work-label">Work</div>
  <nav class="secondary-nav" id="secondary-nav-work" aria-labelledby="zone-work-label">
    <button type="button" class="nav-item route-item" data-zone="work" data-tab="board"
      aria-current="page" …>Board</button>
    <button … data-zone="work" data-tab="milestones">Milestones</button>
    <button … data-zone="work" data-tab="workflows">Workflows</button>
  </nav>
  <div class="secondary-zone-label" id="zone-logs-label">Logs</div>
  <nav class="secondary-nav" id="secondary-nav-logs" aria-labelledby="zone-logs-label">
    <button … data-zone="logs" data-tab="ops">Ops<span class="ops-badge" hidden>…</span></button>
    <button … data-zone="logs" data-tab="decisions">Decisions</button>
    <button … data-zone="logs" data-tab="branches">Branches</button>
  </nav>
  <div class="resize-handle" data-resize="secondary" …></div>
</aside>
```

**Forbidden:** `data-secondary="issues"`, `data-secondary="lanes"`, flat `#secondary-nav` with four entity peers.

### 5.2 Main view shell

```html
<section class="main" id="main">
  <div class="view-header" role="region" aria-labelledby="view-title">
    <div class="view-header-start">
      <button type="button" id="secondary-toggle" …></button>
      <div class="view-title-block">
        <h2 class="view-title" id="view-title">Work · Board</h2>
        <div class="view-meta" id="view-meta" aria-live="polite">…</div>
      </div>
    </div>
    <div class="view-header-actions" id="board-toolbar" data-testid="board-toolbar">…</div>
    <div class="view-header-actions" id="logs-toolbar" hidden>
      <button type="button" id="pin-toggle" aria-pressed="false" aria-label="Pin live tail">…</button>
    </div>
  </div>
  <div class="view-body">
    <div class="view-panel" data-panel="work/board" data-active="true">…#tml-root…</div>
    <div class="view-panel" data-panel="work/milestones">…milestones…</div>
    <div class="view-panel" data-panel="work/workflows">…stub…</div>
    <div class="view-panel" data-panel="logs/ops"><div id="ops-main" class="ops-timeline">…</div></div>
    <div class="view-panel" data-panel="logs/decisions">…stub…</div>
    <div class="view-panel" data-panel="logs/branches">…stub…</div>
  </div>
</section>
```

Relocate **entire** former `.operate-toolbar` control set into `#board-toolbar` (preserve ids: `#search-input`, view radios, `#filters-btn`, etc.).

### 5.3 Op stream

- **Single SSE subscription** appends to **`#ops-main .ops`** when Logs → Ops or pin active.
- When pin open, **mirror** (or share same container ref) into `#oplog .ops`.
- **`#notify-btn`** may reopen pin when collapsed (preserve existing toast behavior).

### 5.4 Ops nav badge

Show `.ops-badge` on Logs → Ops button when stream connected **and** active route ≠ `logs/ops`.

---

## 6. JS contracts

### 6.1 `setVcsRoute(zone, tab, { pushUrl?: boolean })`

Replace `setSecondary(id)`.

| Route | `#tml-root` | `#board-toolbar` | `#logs-toolbar` | `#view-title` / `#view-meta` |
| ----- | ----------- | ---------------- | ----------------- | ---------------------------- |
| `work/board` | visible | visible | hidden | `Work · Board` + issue/lane counts |
| `work/milestones` | hidden | hidden | hidden | `Work · Milestones` + count |
| `work/workflows` | hidden | hidden | hidden | `Work · Workflows` + coming soon |
| `logs/ops` | hidden | hidden | visible | `Logs · Ops` + op count / live |
| `logs/decisions` | hidden | hidden | visible | `Logs · Decisions` + coming soon |
| `logs/branches` | hidden | hidden | visible | `Logs · Branches` + coming soon |

- Persist `trellis-admin-vcs-route` = `` `${zone}/${tab}` ``.
- Update `aria-current="page"` on matching route button.
- Toggle `.view-panel[data-active]` on `data-panel`.
- Update URL query `vcs=` when `pushUrl` true.

### 6.2 Pin inspector

```js
function setInspectorPinned(pinned) {
  document.documentElement.classList.toggle('inspector-pinned', pinned);
  document.documentElement.classList.toggle('oplog-collapsed', !pinned);
  localStorage.setItem('trellis-admin-inspector-pinned', pinned ? '1' : '0');
  // #pin-toggle aria-pressed
}
```

Default **unpinned** on fresh load.

### 6.3 Init order

1. Migrate legacy localStorage (§8)  
2. Parse `?vcs=` or stored route → `setVcsRoute`  
3. Apply sidebar/secondary collapse from existing keys  
4. Apply pin state  
5. `bindResizeHandles()`  
6. Start SSE → ops containers  

---

## 7. e2e (`e2e/admin.spec.cjs`)

Add / migrate:

1. **Default shell:** no visible `#oplog` column (`#oplog` hidden or width 0); `.view-header` visible; **no** `.operate-toolbar` at document level
2. **Work zone:** `#secondary-nav-work` has Board/Milestones/Workflows; default `work/board` active; `#board-toolbar` visible with `#search-input` + view radiogroup
3. **Logs zone:** click Ops → `#logs-toolbar` visible; `#ops-main` visible; `#board-toolbar` hidden; `#tml-root` hidden
4. **Milestones:** Board toolbar hidden; milestones panel active
5. **Secondary collapse:** `#secondary-toggle` in `.view-header` (not operate row); collapse persists
6. **Pin live tail:** toggle → `#oplog` visible with heading /Live ops/i; toggle off → hidden
7. **Ops badge:** on `work/board`, Ops nav badge visible when stream live (or mock ops count > 0); hidden on `logs/ops`
8. **Legacy migration:** seed `localStorage trellis-admin-secondary=lanes` → reload → Board active
9. **Embed:** primary sidebar hidden; `.view-header` + secondary remain
10. Existing shell/visual-parity cases updated for new selectors — remain green

Run (impl / reviewer): `CI=1 pnpm test:e2e e2e/admin.spec.cjs`

---

## 8. localStorage migration

On boot, if `trellis-admin-vcs-route` absent:

| Legacy `trellis-admin-secondary` | New route |
| -------------------------------- | --------- |
| `lanes`, `issues` | `work/board` |
| `milestones` | `work/milestones` |
| `workflows` | `work/workflows` |
| (missing / unknown) | `work/board` |

Write new key; do not delete legacy key until route set succeeds (optional cleanup).

---

## 9. Out of scope

- Decisions / Branches / Workflows functional panels  
- Crumb segment `work`/`logs`  
- Extract admin shell to modules (TRL-209 territory)  
- Playground React AffordanceShell port  
- Always-on op-log column restoration  

---

## Acceptance criteria

```text
test:pnpm check
test:test -f docs/specs/trellis-admin-vcs-layout-ide.md
test:grep -q trellis-admin-vcs-layout-ide_design.md docs/specs/trellis-admin-vcs-layout-ide.md
test:grep -q 'work/board' docs/specs/trellis-admin-vcs-layout-ide.md
test:grep -q view-header docs/specs/trellis-admin-vcs-layout-ide.md
test:grep -q inspector-pinned docs/specs/trellis-admin-vcs-layout-ide.md
test:grep -q 'Live ops' docs/specs/trellis-admin-vcs-layout-ide.md
test:grep -q trellis-admin-vcs-route docs/specs/trellis-admin-vcs-layout-ide.md
test:grep -q 'Forbidden:' docs/specs/trellis-admin-vcs-layout-ide.md
test:grep -q 'Remove `data-secondary="issues"`' docs/specs/trellis-admin-vcs-layout-ide.md
```

Note: last line verifies spec **forbids** legacy `issues` peer (grep doc section 5.1 Forbidden).

**Impl verification (carry on impl issue):**

```text
test:CI=1 pnpm test:e2e e2e/admin.spec.cjs
```
