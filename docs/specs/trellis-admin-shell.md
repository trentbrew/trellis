# Spec: trellis admin shell — Operate sidebar + index /

**Status:** Ready for impl  
**Date:** 2026-07-21  
**Proposal:** TRL-189  
**Design:** TRL-190 · [`docs/artifacts/trellis-admin-shell_design.md`](../artifacts/trellis-admin-shell_design.md) · [`trellis-admin-shell_mockup.html`](../artifacts/trellis-admin-shell_mockup.html)  
**Amends:** [`trellis-admin.md`](./trellis-admin.md) (chrome + routes; projections unchanged)  
**Preserves:** [`trellis-admin-visual-parity.md`](./trellis-admin-visual-parity.md)  
**Labels:** `spec`, `tml`, `admin`, `needs-e2e`, `cohesion`

---

## 1. Intent

Replace the 56px icon **rail** with a **200px labeled Operate sidebar** and make
the admin console the kernel **index** (`GET /`). VCS remains the only live
surface; other `OPERATE_NAV` peers are visible stubs. Theme stays
`runtime-theme.css` SSOT. No datatable port, no React AppShell, no `DEMOS_NAV`,
no `lane watch` kill-gate.

---

## 2. Architecture decisions

| Decision | Choice |
| -------- | ------ |
| Sidebar | **200px** labeled `.sidebar` (not 56px `.rail`); zone label `Operate` |
| Nav contract | Mirror `fractal-playground/lib/shell/modes.ts` `OPERATE_NAV` **ids + order** |
| Live surface | **VCS only** — `data-nav-id="vcs"` + `aria-current="page"` |
| Stubs | Collections → API: `aria-disabled="true"` **without** native `disabled`; accessible name `{Label} (coming soon)`; click no-ops |
| Index route | **`GET /`** serves `admin.html` |
| `/admin` | **302** (or 301) redirect to `/` **preserving query string** (`?embed=1`, `?view=`) |
| Legacy lanes | **`GET /lanes`** (+ `/lanes.html`) continue to serve `lanes.html` |
| CLI | Kernel fallback URL opens **`/`** (not `/admin`); playground probe unchanged |
| Embed | `?embed=1` / `html.admin-embed` hides **`.sidebar`** (rename all `.rail` embed rules) |
| Theme | Only `/theme/runtime-theme.css`; sidebar fill `#0c0c0c` is local chrome CSS |
| Projections | **Do not change** visual-parity contracts (dialog, grid, kanban 300–340, table) |
| Icons | Inline SVG stroke (lucide silhouettes); **no** npm lucide |
| Out of scope | Datatable, collections materialization, DEMOS_NAV, kill-gate |

### OPERATE_NAV (normative order + `data-nav-id`)

1. `collections` — Collections — stub  
2. `storage` — Storage — stub  
3. `pages` — Pages — stub  
4. `history` — History — stub  
5. `cron` — Cron — stub  
6. `auth` — Auth — stub  
7. `apis` — API — stub (**id `apis`**, not `api`)  
8. `vcs` — VCS — **live**

---

## 3. File touch map

| File | Change |
| ---- | ------ |
| `src/ui/admin.html` | Replace `.rail` / `.rail-btn` with `.sidebar` + `.nav-item` (8 OPERATE_NAV rows); embed CSS; stub a11y; keep projection CSS |
| `src/ui/lanes-dashboard.ts` | `/` → `admin.html`; `/admin` → redirect `/` + query; `/lanes` → `lanes.html` |
| `src/cli/admin.ts` | Kernel URL → `http://127.0.0.1:<port>/` |
| `e2e/admin.spec.cjs` | Selectors `.sidebar` / `.nav-item`; assert OPERATE_NAV; `/` + `/admin` redirect; embed hides sidebar |
| `docs/specs/trellis-admin-shell.md` | This file |
| `docs/specs/trellis-admin.md` | Optional note: routes superseded by this amend (do not rewrite whole v1 spec) |

**Out of touch:** `runtime-theme.css` palette, fractal-playground AppShell (unless iframe URL still works via `/admin` redirect), TML projection markup beyond chrome, `lanes.html` internals.

---

## 4. Routes (`lanes-dashboard.ts`)

| Path | Behavior |
| ---- | -------- |
| `GET /` | Serve `admin.html` (200) |
| `GET /admin`, `/admin.html` | Redirect to `/` + original search (e.g. `/admin?embed=1` → `/?embed=1`) |
| `GET /lanes`, `/lanes.html` | Serve `lanes.html` (200) — legacy board |
| Existing | `/theme/runtime-theme.css`, `/tml-runtime.js`, `/api/lanes*`, `/tml-lanes`, `/client` unchanged |

**CLI:** `trellis admin` kernel fallback opens `/`. Playground `TRELLIS_PLAYGROUND_URL` / probe path unchanged.

**Playground embed:** may keep `…/admin?embed=1`; redirect must preserve `embed` + `view`.

---

## 5. Chrome contracts (`admin.html`)

### 5.1 Shell grid

```
[ sidebar 200 ] [ header …………………………………… ]
[              ] [ main ………………… | op-log 280 ]
```

- Sidebar: `--sidebar-w: 200px` (or equivalent); background `#0c0c0c`
- Header: brand · live · repo · stats · **view toggle · search** (34px controls)
- Op-log: 280px unchanged
- Embed: hide sidebar; header/main/oplog span full width (update grid rules that currently target `.rail`)

### 5.2 Markup / a11y

```html
<aside class="sidebar">
  <!-- brand optional -->
  <div class="zone">Operate</div>
  <nav aria-label="Operate">
    <button type="button" class="nav-item" data-nav-id="collections"
      aria-disabled="true" aria-label="Collections (coming soon)" title="Collections (coming soon)">…</button>
    <!-- … storage, pages, history, cron, auth, apis … -->
    <button type="button" class="nav-item" data-nav-id="vcs"
      aria-current="page" title="VCS">… VCS</button>
  </nav>
</aside>
```

- Stubs: **no** `disabled` attribute; preventDefault / no navigation on activate
- Live: `aria-current="page"` on VCS
- `:focus-visible` outline on `.nav-item` (incl. stubs)
- `prefers-reduced-motion`: color-only hover (no transform nav motion)

### 5.3 Projections

**Forbidden to regress** visual-parity: dialog `margin: auto`, grid auto-fill,
kanban col **300–340**, col-body inset + scroll, `.table-wrap`. Shell width
change only.

---

## 6. e2e (`e2e/admin.spec.cjs`)

Migrate existing cases from `.rail` / `.rail-btn` → `.sidebar` / `.nav-item`.
Prefer `page.goto('/')` for shell smoke; keep at least one case that hits
`/admin?…` and asserts final URL is `/?…` (redirect).

**Required cases (extend file):**

1. **Operate nav** — on `/`: `nav[aria-label="Operate"]` has 8 `.nav-item`;
   `[data-nav-id="vcs"][aria-current="page"]`; stubs have `aria-disabled="true"`
   and no `disabled` attribute; first stub accessible name matches /coming soon/i
2. **Index** — `GET /` shows sidebar + `#view-kanban` (or active view) + `#oplog`
3. **Alias redirect** — `goto('/admin?view=grid')` → URL matches `/?view=grid`
   (or equivalent path `/` with search)
4. **Embed** — `/?embed=1`: `html.admin-embed`; `.sidebar` hidden; toolbar +
   `#oplog` visible
5. **Regression** — existing visual-parity cases still pass (dialog / grid /
   kanban / table / scroll)

Run (impl / reviewer): `CI=1 pnpm test:e2e e2e/admin.spec.cjs`

---

## 7. Out of scope

- Rich datatable / SpreadsheetTable TML port  
- Materializing Collections / Storage / … surfaces  
- `DEMOS_NAV`  
- Soft-deprecate / kill `lane watch`  
- Playground React sidebar port  
- Theme token invent / mock `:root` fork  

---

## Acceptance criteria

```text
test:pnpm check
test:test -f docs/specs/trellis-admin-shell.md
test:grep -q trellis-admin-shell_design.md docs/specs/trellis-admin-shell.md
test:grep -q OPERATE_NAV docs/specs/trellis-admin-shell.md
test:grep -q 'GET /' docs/specs/trellis-admin-shell.md
test:grep -q '/lanes' docs/specs/trellis-admin-shell.md
test:grep -q 'aria-disabled' docs/specs/trellis-admin-shell.md
test:grep -q 'data-nav-id="apis"' docs/specs/trellis-admin-shell.md
```

**Impl verification (carry on impl issue):**

```text
test:CI=1 pnpm test:e2e e2e/admin.spec.cjs
```

Behavioral: `/` = admin shell; `/admin` redirects; `/lanes` = legacy;
sidebar 200px OPERATE_NAV; embed hides sidebar; visual-parity intact.
