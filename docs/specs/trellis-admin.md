# Spec: trellis admin — kernel AffordanceShell + TML (v1)

**Status:** Shipped on desk (v1 intent satisfied via child specs)  
**Date:** 2026-07-21  
**Amended:** 2026-07-24 — routing/index superseded by [`trellis-admin-shell.md`](./trellis-admin-shell.md); chrome by [`trellis-admin-chrome-polish.md`](./trellis-admin-chrome-polish.md); VCS IA by [`trellis-admin-vcs-layout-ide.md`](./trellis-admin-vcs-layout-ide.md); datatable by TRL-202/209. This doc remains **v1 kernel + TML intent** SSOT.  
**Design:** TRL-174 · `docs/artifacts/trellis-admin_design.md` + `trellis-admin_mockup.html`  
**Proposal:** TRL-173  
**Labels:** `spec`, `tml`, `admin`, `needs-e2e`

---

## 1. Intent

Ship **`trellis admin`** as the operator console that can **replace**
`trellis lane watch` at parity. Visual language follows the design mock
(AffordanceShell: rail · header · TML projection · op-log). Materialization is
**TML**; tokens from kernel **`runtime-theme.css` only**.

**v1 host (locked):** kernel-served HTML on the lanes dashboard server (same
process family as `lane watch`). fractal-playground AffordanceShell host is
**v1.1** (out of this wedge) — design target stays valid; do not block v1 on
Next/sidecar.

**Never** rename or collide with `trellis watch` (file watcher).

---

## 2. Architecture decisions

| Decision | Choice |
| -------- | ------ |
| Host v1 | Kernel `src/ui/admin.html` via `lanes-dashboard.ts` routes |
| Host v1.1 | fractal-playground Operate/VCS page + theme/SSE proxy (follow-up) |
| IA | One page; `?view=grid\|kanban\|table` (default **kanban**) |
| Theme | `<link href="/theme/runtime-theme.css">` — no forked `:root` |
| TML boards | `WebDriver` + snapshot-friendly binding (extend `tml-lanes` patterns) |
| Op-log | Full SSE op stream (`wantOps=true`); not `events=snapshot` |
| SSE | **Dual:** (A) TML live/snapshot for projections (B) full `/api/lanes/stream` for op-log + toasts + lock — same origin |
| Orphans | **Cut** (stub in `lanes.html`) |
| Kill `lane watch` | Only after parity checklist green; then alias `lane watch` → `admin` |

---

## 3. CLI

Add top-level command (not under `lane`):

```text
trellis admin [--port 3939] [--path .] [--no-open]
```

Behavior: start the same dashboard server family as `lane watch`, open
`http://localhost:<port>/admin` (not `/`).

**Deprecation (after parity only):**

- `trellis lane watch` prints dim note: prefer `trellis admin`; still works;
  opens `/admin` (or redirects `/` → `/admin`).
- Do **not** change `trellis watch` (file watcher).

---

## 4. Routes (`lanes-dashboard.ts`)

| Path | Behavior |
| ---- | -------- |
| `GET /` | Serves `admin.html` (per [`trellis-admin-shell.md`](./trellis-admin-shell.md)) |
| `GET /admin` | Redirect to `/` preserving query |
| `GET /lanes` | Legacy `lanes.html` |
| Existing | `/theme/runtime-theme.css`, `/tml-runtime.js`, `/api/lanes`, `/api/lanes/stream`, `/api/tml-mutations`, `/tml-lanes`, `/client` unchanged |

---

## 5. `admin.html` chrome (parity with design mock)

Static AffordanceShell-lite (no React required in v1):

- **Rail 56px:** VCS current; COL/CRN disabled peers (visual only)
- **Header 48px glass:** brand · live · repo · stats (active, total, **integration branch**, issues) · view toggle + search (**both height 34px**)
- **Content:** TML mount hosts for `grid` / `kanban` / `table`
- **Op-log 280px:** detail slot; rows `time · kind · detail · 8-char hash`
- **Lock banner:** live vs stale copy
- **Dialog:** issue/lane inspect + promote affordance
- **Narrow &lt;1100px:** op-log bottom drawer
- `data-trellis-band="L3"`; issue cards `data-trellis-shell="card"`

View persistence: `localStorage` key `trellis-admin-view`; URL `?view=` wins on
load.

Search: client-side filter across visible projection + op-log (lanes.html
parity). Clear control required.

---

## 6. TML projections

Reuse / extend patterns from `tml-lanes.html` + `tml-runtime.ts`:

| View | Content |
| ---- | ------- |
| `kanban` | Three columns (`ISSUE_COLUMNS` collapse); issue cards with id, title, status, priority (if present), lane badge or “no lane” |
| `grid` | Lane cards: id, agent, session, ops/files, branch, worktree, linked issue |
| `table` | Same lane fields as columns (session/worktree may densify; document if abbreviated) |

Mount via existing TML runtime bundle (`/tml-runtime.js`). Prefer snapshot SSE
for board thrash; op-log uses full ops stream separately.

Promote: `POST /api/tml-mutations` with existing `promote` action (or
`tml-op` if already supported on lane cards).

---

## 7. SSE / live UX

| Concern | Spec |
| ------- | ---- |
| Connect | Live label “live” + pulse (respect `prefers-reduced-motion`) |
| Disconnect | “reconnecting…”; dim dot |
| Reconnect | `since` / `Last-Event-ID` resume |
| Op event | Append op-log; toast; flash matching card (no animation if reduced-motion) |
| Lock | Poll or include in snapshot; banner live vs stale |

---

## 8. Parity checklist (kill gate)

Before soft-deprecating `lane watch`, all must work on `/admin`:

- [ ] Grid, Kanban, Table views + `?view=` + persist
- [ ] Search + clear
- [ ] Stats: active, total, integration, issues
- [ ] Lock banner (live + stale)
- [ ] Op-log live append (`time·kind·detail·hash`)
- [ ] Issue dialog (kanban) / lane detail (grid)
- [ ] Lane card fields (grid/table)
- [ ] Promote mutation
- [ ] SSE reconnect

Orphans: cut. Embed `?embed=1`: **v1.1**.

---

## 9. Tests

**Unit / static**

```text
pnpm check
```

**E2E** (new file; Playwright webServer = source CLI per harden):

```text
CI=1 pnpm test:e2e e2e/admin.spec.cjs
```

Minimum cases:

1. `goto('/admin')` — rail VCS, `#vantage` N/A, view toggle + search visible, kanban default
2. Switch Grid / Table — projection region changes; URL `?view=`
3. Theme link `/theme/runtime-theme.css` 200
4. Op-log region present
5. Regression: `e2e/tml-lanes.spec.cjs` + `e2e/client-vantage.spec.cjs` stay green

---

## 10. File touch map

| File | Action |
| ---- | ------ |
| `src/cli/index.ts` (or `admin.ts`) | **create** `trellis admin` command |
| `src/ui/admin.html` | **create** shell + TML mounts |
| `src/ui/lanes-dashboard.ts` | `GET /admin`; wire asset |
| `e2e/admin.spec.cjs` | **create** |
| `playwright.config.cjs` | keep tsx source CLI (already) |
| `src/ui/lanes.html` | no redesign; optional later redirect |
| fractal-playground | **out of v1** |

---

## 11. Out of scope

- fractal-playground Next host (v1.1)
- System Visualizer merge
- daisyUI component catalog
- Renaming `trellis watch`
- Dual-shell / TRL-25
- Removing `lane watch` before parity checklist

---

## Acceptance criteria

```text
test:pnpm check
test:test -f docs/specs/trellis-admin.md
test:grep -q trellis-admin_design.md docs/specs/trellis-admin.md
test:grep -q admin.html docs/specs/trellis-admin.md
test:grep -q tml-runtime docs/specs/trellis-admin.md
test:grep -q runtime-theme.css docs/specs/trellis-admin.md
test:grep -q AffordanceShell docs/specs/trellis-admin.md
test:grep -q trellis-admin-shell.md docs/specs/trellis-admin.md
```

**Impl verification (carry on impl issue):**

```text
test:pnpm check
test:CI=1 pnpm test:e2e e2e/admin.spec.cjs
test:CI=1 pnpm test:e2e e2e/tml-lanes.spec.cjs e2e/client-vantage.spec.cjs
```
