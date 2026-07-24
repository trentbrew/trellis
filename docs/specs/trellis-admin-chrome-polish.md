# Spec: trellis admin — chrome polish (post TRL-229)

**Status:** Ready for impl  
**Date:** 2026-07-21  
**Proposal:** TRL-233  
**Design:** TRL-236 · [`docs/artifacts/trellis-admin-chrome-polish_design.md`](../artifacts/trellis-admin-chrome-polish_design.md) · [`trellis-admin-chrome-polish_mockup.html`](../artifacts/trellis-admin-chrome-polish_mockup.html)  
**Amends:** [`trellis-admin-vcs-layout-ide.md`](./trellis-admin-vcs-layout-ide.md) (shell grid, secondary IA, breadcrumbs, view header)  
**Preserves:** TRL-229 route model (`?vcs=`, `trellis-admin-vcs-route`), pin inspector, ops SSE, header stats, embed primary-hide, TML projections  
**Labels:** `spec`, `tml`, `admin`, `needs-e2e`, `cohesion`

---

## 1. Intent

Founder UX polish on TRL-229 VCS layout: **stack collapsible WORK/LOGS zones** (no 50/50 split), **header band above secondary+main** (not beside secondary), **icon breadcrumbs with active tab segment**, **slim view header** (no duplicate route title), **full-width board search**, **oplog day groups in pinned inspector only**.

Static HTML/CSS/JS in `admin.html` only — no React port.

---

## 2. Architecture decisions

| Decision | Choice |
| -------- | ------ |
| Shell grid | **v2 two-row band:** `.header` row 1 cols 2–4; `.secondary` + `.main` + `#oplog` row 2 |
| Secondary zones | **`.secondary-zone`** sections with toggle + nav; intrinsic stack height (remove `flex: 1` equal split on `.secondary-nav`) |
| Zone collapse | Per-zone only; keys **`trellis-admin-zone-work-collapsed`**, **`trellis-admin-zone-logs-collapsed`** (`0`/`1`) |
| Global secondary collapse | **Remove** `#secondary-toggle` and **`html.secondary-collapsed`** rail mode (this wedge) |
| View title | **Remove** `#view-title` / `Work · …` updates from `setVcsRoute` — wayfinding via breadcrumbs |
| View meta | **Hidden** on `work/board`; contextual only on other routes (see §6.1) |
| Breadcrumbs | Fourth segment **`#crumb-tab`** with route icon; `aria-current="page"` on active tab |
| Crumb update | **`updateCrumbTab(zone, tab)`** called from `setVcsRoute` (replaces view title logic) |
| Board search | `#search-input` parent grows **`flex: 1`** in `#board-toolbar` |
| Oplog day groups | **Inspector only** (`#oplog .ops`); `#ops-main` stays flat |
| Day group JS | **`groupOpsByDay(rows)`** + regroup on pin open and on append (batch, not every SSE tick) |
| Theme | `/theme/runtime-theme.css` only |
| Out of scope | Day groups on `#ops-main`; restore `#secondary-toggle`; wire New issue |

---

## 3. File touch map

| File | Change |
| ---- | ------ |
| `src/ui/admin.html` | Grid v2 CSS; secondary-zone markup + collapse JS; crumb tab segment + icons; remove secondary-toggle; slim view-header; oplog day groups; `updateCrumbTab`; remove dead `.secondary-head` / secondary-collapsed CSS |
| `e2e/admin.spec.cjs` | Grid/header placement; zone collapse; crumb tab + icons; remove secondary-toggle tests; oplog day groups when pinned |
| `docs/specs/trellis-admin-chrome-polish.md` | This file |

**Out of touch:** `lanes-dashboard.ts`, `admin.ts`, `runtime-theme.css` palette, `tml-runtime.ts`, datatable module, sidebar OPERATE_NAV.

---

## 4. Shell grid (normative)

### 4.1 Default (standalone, pin off)

```css
grid-template-columns: var(--sidebar-w) var(--secondary-w) minmax(0, 1fr);
grid-template-rows: var(--chrome-h) minmax(0, 1fr);
```

| Region | Grid |
| ------ | ---- |
| `.sidebar` | col 1 · row 1 / -1 |
| `.header` | col 2 / -1 · row 1 |
| `.secondary` | col 2 · row 2 |
| `.main` | col 3 · row 2 |
| `#oplog` | not in layout (collapsed) |

**Forbidden:** `.header` on row 1 col 3 only (TRL-229 layout); `.secondary` row 1 / -1 spanning header height.

### 4.2 Pin live tail (`html.inspector-pinned`)

```css
grid-template-columns: var(--sidebar-w) var(--secondary-w) minmax(0, 1fr) var(--oplog-w);
```

| Region | Grid |
| ------ | ---- |
| `.header` | col 2 / -1 · row 1 (full band above content) |
| `.secondary` | col 2 · row 2 |
| `.main` | col 3 · row 2 |
| `#oplog.inspector` | col 4 · row 2 |

Remove TRL-229 rule `html.inspector-pinned .header { grid-column: 3; }`.

### 4.3 Embed (`html.admin-embed`)

Hide primary `.sidebar`. Header spans cols 1 / -1 row 1; secondary + main (+ optional pin) row 2.

---

## 5. Markup contracts

### 5.1 Secondary — stacked collapsible zones

Replace flat zone labels + equal-height navs:

```html
<aside class="secondary" id="secondary" data-route="vcs">
  <section class="secondary-zone" data-zone="work">
    <button type="button" class="secondary-zone-toggle" id="zone-work-toggle"
      aria-expanded="true" aria-controls="secondary-nav-work"
      aria-label="Toggle Work section">… WORK …</button>
    <nav class="secondary-nav" id="secondary-nav-work" aria-labelledby="zone-work-toggle">…</nav>
  </section>
  <section class="secondary-zone" data-zone="logs">
    <button type="button" class="secondary-zone-toggle" id="zone-logs-toggle"
      aria-expanded="true" aria-controls="secondary-nav-logs"
      aria-label="Toggle Logs section">… LOGS …</button>
    <nav class="secondary-nav" id="secondary-nav-logs" aria-labelledby="zone-logs-toggle">…</nav>
  </section>
  <div class="resize-handle" data-resize="secondary" …></div>
</aside>
```

- `.secondary-zone.collapsed .secondary-nav { display: none; }`
- Chevron rotates on toggle; persist per-zone keys (§2)
- **Remove** `#zone-work-label` / `#zone-logs-label` div eyebrows (toggle label replaces)
- **Forbidden:** `flex: 1` on `.secondary-nav` for equal split; `#secondary-toggle`

### 5.2 Breadcrumbs — icon segments + active tab

Wrap crumb in `nav[aria-label="Location"]`:

```html
<nav class="crumb" aria-label="Location">
  <span class="crumb-segment" id="crumb-repo">…icon… trellis-node</span>
  <span class="crumb-sep" aria-hidden="true">/</span>
  <span class="crumb-segment" id="crumb-zone">… operate</span>
  <span class="crumb-sep" aria-hidden="true">/</span>
  <span class="crumb-segment" id="crumb-route">… vcs</span>
  <span class="crumb-sep" aria-hidden="true">/</span>
  <span class="crumb-segment crumb-tab" id="crumb-tab" aria-current="page">… board</span>
</nav>
```

**Crumb icon map (normative labels + inline SVG 14px stroke):**

| Route | `#crumb-tab` label | Icon |
| ----- | ------------------ | ---- |
| `work/board` | board | 2×2 grid |
| `work/milestones` | milestones | flag |
| `work/workflows` | workflows | flow boxes |
| `logs/ops` | ops | doc lines |
| `logs/decisions` | decisions | check circle |
| `logs/branches` | branches | git branch |

Repo / operate / vcs segments keep existing icons (folder, grid, branch graph).

### 5.3 View header (slim)

```html
<div class="view-header" role="region" aria-label="View tools">
  <div class="view-header-start">
    <div class="view-meta" id="view-meta" hidden aria-live="polite">…</div>
  </div>
  <div class="view-header-actions" id="board-toolbar" …>
    <!-- view picker; #search-input in flex:1 wrapper; actions -->
  </div>
  <div class="view-header-actions" id="logs-toolbar" hidden>… pin …</div>
</div>
```

- **Remove** `#view-title`, `#view-title-block`, `#secondary-toggle` from `.view-header`
- `#board-toolbar .search-wrap` (or `#search-input` parent): **`flex: 1; min-width: 0`**

### 5.4 Oplog day groups (inspector)

When pinned, structure `#oplog .ops`:

```html
<section class="oplog-day" data-day="2026-07-21">
  <button type="button" class="oplog-day-toggle" aria-expanded="true"
    aria-controls="oplog-day-2026-07-21" id="oplog-day-h-2026-07-21">Today</button>
  <div class="oplog-day-list" id="oplog-day-2026-07-21" role="group"
    aria-labelledby="oplog-day-h-2026-07-21">… .op rows …</div>
</section>
```

| Bucket | Label |
| ------ | ----- |
| today | Today |
| yesterday | Yesterday |
| older ≤7d | `Mon Jul 14` (locale short) |
| older >7d | Earlier |

Default: Today + Yesterday expanded; older collapsed.

**Forbidden:** day-group markup under `#ops-main-list`.

---

## 6. JS contracts

### 6.1 `updateCrumbTab(zone, tab)`

```js
function updateCrumbTab(zone, tab) {
  const route = `${zone}/${tab}`;
  const tabEl = document.getElementById('crumb-tab');
  // set text + swap inline SVG from CRUMB_TAB_ICONS[route]
  tabEl?.setAttribute('aria-current', 'page');
}
```

Called at end of `setVcsRoute`. **Remove** `viewTitle.textContent = titles[route]` block.

### 6.2 `setVcsRoute` — view meta matrix

| Route | `#view-meta` | Content |
| ----- | ------------ | ------- |
| `work/board` | **hidden** | — (counts in header stats only) |
| `work/milestones` | visible | milestone count |
| `work/workflows` | visible | Coming soon |
| `logs/ops` | visible | op count + live state |
| `logs/decisions` | visible | Coming soon |
| `logs/branches` | visible | Coming soon |

### 6.3 Zone collapse

```js
const ZONE_COLLAPSE_KEYS = {
  work: 'trellis-admin-zone-work-collapsed',
  logs: 'trellis-admin-zone-logs-collapsed',
};

function setZoneCollapsed(zone, collapsed) {
  const section = document.querySelector(`.secondary-zone[data-zone="${zone}"]`);
  const toggle = section?.querySelector('.secondary-zone-toggle');
  section?.classList.toggle('collapsed', collapsed);
  toggle?.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  localStorage.setItem(ZONE_COLLAPSE_KEYS[zone], collapsed ? '1' : '0');
}
```

Init from localStorage on boot. **Delete** `setSecondaryCollapsed`, `SECONDARY_COLLAPSED_KEY`, `secondary-toggle` listeners.

### 6.4 `groupOpsByDay(rows)` + inspector regroup

```js
function dayKey(isoOrMs) { /* local calendar YYYY-MM-DD */ }
function dayLabel(key) { /* Today | Yesterday | formatted | Earlier */ }

function regroupInspectorOps() {
  if (!document.documentElement.classList.contains('inspector-pinned')) return;
  // read .op rows from #ops-main-list or shared source; group; rebuild #oplog .ops
}
```

- Call `regroupInspectorOps()` on pin open and after `appendOp` when inspector pinned
- `#ops-main-list` append path unchanged (flat)

### 6.5 Accessibility

- Zone toggles: `aria-expanded`, `aria-controls`, visible WORK/LOGS label
- Oplog day toggles: same pattern
- `@media (prefers-reduced-motion: reduce)`: no chevron/disclosure transition; instant show/hide
- Focus order per design §Accessibility (sidebar → notify → zone toggles → route items → toolbar → main → oplog)

---

## 7. e2e (`e2e/admin.spec.cjs`)

Add / migrate:

1. **Header grid:** `.header` bounding box top aligns with secondary top minus chrome row (header above secondary, not beside)
2. **No secondary toggle:** `#secondary-toggle` count === 0
3. **Zone collapse:** click `#zone-work-toggle` → `#secondary-nav-work` hidden; `aria-expanded="false"`; reload persists
4. **Crumb tab:** on milestones route `#crumb-tab` contains /milestones/i and visible SVG icon
5. **Board meta hidden:** on `work/board`, `#view-meta` hidden; header `#stat-issues` visible
6. **Search flex:** `#search-input` wrapper width > view-picker width on board (smoke layout)
7. **Oplog day groups:** pin inspector → `.oplog-day` visible with /Today/i header; click collapses section
8. **Embed:** header spans full width above secondary (primary hidden)
9. Update existing crumb test: trail includes **four** segments ending in tab name
10. Remove / replace secondary-collapse tests that target `#secondary-toggle`

Run: `CI=1 pnpm test:e2e e2e/admin.spec.cjs`

---

## 8. Out of scope

- Functional Decisions / Branches / Workflows panels  
- Day grouping on `#ops-main`  
- Global secondary rail collapse restoration  
- Crumb segments for `work`/`logs` zone (tab segment only)  
- Module extract / React port  

---

## Acceptance criteria

```text
test:pnpm check
test:test -f docs/specs/trellis-admin-chrome-polish.md
test:grep -q trellis-admin-chrome-polish_design.md docs/specs/trellis-admin-chrome-polish.md
test:grep -q secondary-zone docs/specs/trellis-admin-chrome-polish.md
test:grep -q crumb-tab docs/specs/trellis-admin-chrome-polish.md
test:grep -q updateCrumbTab docs/specs/trellis-admin-chrome-polish.md
test:grep -q groupOpsByDay docs/specs/trellis-admin-chrome-polish.md
test:grep -q 'Forbidden:' docs/specs/trellis-admin-chrome-polish.md
test:grep -q '#secondary-toggle' docs/specs/trellis-admin-chrome-polish.md
test:grep -q inspector-pinned docs/specs/trellis-admin-chrome-polish.md
test:grep -q prefers-reduced-motion docs/specs/trellis-admin-chrome-polish.md
```

Note: grep for `#secondary-toggle` verifies spec **documents removal** (Forbidden / Remove sections).

**Impl verification (carry on impl issue):**

```text
test:CI=1 pnpm test:e2e e2e/admin.spec.cjs
```
