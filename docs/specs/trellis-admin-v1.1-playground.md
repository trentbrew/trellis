# Spec: trellis admin v1.1 — fractal-playground AffordanceShell host

**Status:** Ready for impl  
**Date:** 2026-07-21  
**Design:** TRL-179 · `docs/artifacts/trellis-admin-v1.1-playground_design.md` + `trellis-admin-v1.1-playground_mockup.html`  
**Proposal:** TRL-178 · **Epic:** TRL-173 · **Depends:** TRL-175 PASS (kernel `/admin`)  
**Labels:** `spec`, `tml`, `admin`, `needs-e2e`, `cohesion`

---

## 1. Intent

Host **`trellis admin`** inside **fractal-playground** Operate chrome so VCS sits
as a peer to Collections / Cron / Auth. Kernel remains **TML + theme + SSE**
source and **CLI fallback**. Do not rebuild boards in React. Do not soft-deprecate
`lane watch` in this wedge.

**Thesis:** one playground Operate rail + one kernel island (`admin?embed=1`).

---

## 2. Architecture decisions (locked)

| Decision | Choice |
| -------- | ------ |
| Playground route | `/vcs` — add to `OPERATE_NAV` (not Demos `/issues`) |
| Mount | **iframe** → `{kernelBase}/admin?embed=1&view={view}` |
| Same-origin proxy | **Out of v1.1** — cross-origin iframe OK; SSE/mutations run **inside** iframe (kernel origin) |
| Kernel auto-start | **`trellis admin` always starts** lanes-dashboard (unchanged), **then** probes playground |
| CLI open order | `TRELLIS_ADMIN_URL` → probe playground `/vcs` → else kernel `/admin` |
| Theme | Island loads only kernel `runtime-theme.css`; no Phase B copy into playground `globals.css` |
| Double rail | Forbidden — kernel `.rail` hidden when `embed=1`; playground rail hidden only when playground `?embed=1` |
| React TML remount | **Forbidden** — no second kanban/grid implementation |
| Kill `lane watch` | **Out of scope** (parity harden follow-up) |
| `trellis watch` | Untouched (file watcher) |

### Open → closed (from design)

1. **Kernel auto-start:** Always start dashboard server in `trellis admin` (today’s behavior). Playground host assumes kernel reachable at configured base (default `http://127.0.0.1:<port>`).
2. **Proxy:** Deferred. Iframe `src` points at kernel origin directly.
3. **`admin.html` embed:** Minimal flag — `?embed=1` or `embed=true` adds class on `html` (e.g. `admin-embed`); CSS hides `.rail` and retargets `.shell` grid to 2 columns (main \| op-log). No separate HTML file.
4. **AppShell header:** On pathname `/vcs` (and `/vcs/*`): hide secondary sidebar, suppress default breadcrumb header, `fullBleedMain` / `p-0` main so iframe fills the column.
5. **Config:** Document `TRELLIS_ADMIN_URL`, `TRELLIS_PLAYGROUND_URL` (default `http://127.0.0.1:3000/vcs`), `--port` for kernel.
6. **E2E:** Kernel Playwright remains SSOT; add embed case to `e2e/admin.spec.cjs`. Playground smoke optional if harness exists — not blocking.
7. **Promote CORS:** N/A for iframe (form POST stays kernel-origin).

---

## 3. Kernel (`trellis-node`)

### 3.1 `admin.html` embed mode

| Requirement | Detail |
| ----------- | ------ |
| Detect | `URLSearchParams`: `embed=1` \| `embed=true` |
| Chrome | Hide `.rail`; `.shell` → `grid-template-columns: minmax(0,1fr) var(--oplog-w)` (narrow: existing op-log drawer rules) |
| Behavior | Header, views, search, TML, op-log, dialog, dual SSE **unchanged** |
| Guard | With embed + playground rail visible → single rail only (playground’s) |

### 3.2 CLI `trellis admin` open sequence

```text
1. startLanesDashboard({ port, … })           # always
2. if TRELLIS_ADMIN_URL → open it; return
3. playground = TRELLIS_PLAYGROUND_URL
     || http://127.0.0.1:3000/vcs
4. HEAD/GET playground with short timeout (~500ms)
5. if 2xx → open playground URL (preserve ?view= if we add later)
6. else → open http://127.0.0.1:<port>/admin
```

Log which target opened. `--no-open` still starts kernel server.

### 3.3 Kernel base for playground

Playground reads kernel base from (first match):

1. `NEXT_PUBLIC_TRELLIS_ADMIN_KERNEL_URL` (e.g. `http://127.0.0.1:3939`)
2. Default `http://127.0.0.1:3939`

Iframe `src` = `${kernelBase}/admin?embed=1` + optional `&view=` from playground searchParams.

---

## 4. Playground (`fractal-playground`)

### 4.1 Nav + types

| File | Change |
| ---- | ------ |
| `lib/shell/modes.ts` | Extend `ShellMode` with `'vcs'`; append Operate item `{ id: 'vcs', label: 'VCS', href: '/vcs', icon: GitBranchIcon, zone: 'operate' }`; `navItemIsActive` / `pageLabel` for `/vcs` |
| `lib/shell/embed.ts` | `isConsoleEmbedPath`: include `pathname.startsWith('/vcs')` |

**Do not** enable or repurpose Demos `issues` as the admin host.

### 4.2 AppShell

When `pathname === '/vcs' \|\| pathname.startsWith('/vcs/')`:

- `hideSecondarySidebar` (or equivalent) = true  
- Suppress default header (RoomSelector / breadcrumb row)  
- Main: full-bleed, no padding — child owns layout  

Reuse existing console-embed branch for playground `?embed=1` (hide primary rail + ConsoleEmbedBar).

### 4.3 Page `app/vcs/page.tsx` (or `app/(operate)/vcs/page.tsx`)

Client page responsibilities:

| State | UI |
| ----- | -- |
| Loading | Skeleton/pulse in main (rail remains) |
| Live | `<iframe title="Trellis admin" src={…} className="h-full w-full border-0" />` |
| Degraded | Heading + copy + link to `${kernelBase}/admin` (and mention CLI fallback) |

Transitions: `onLoad` → live; `onError` or timeout (~8–10s without load) → degraded.

Pass `view` query through to iframe when present.

**Forbidden:** importing turtlecode `AffordanceShell`; reimplementing kanban/grid in React; linking playground OKLCH into iframe document.

---

## 5. Cohesion invariants (must AC)

1. Never render kernel rail and playground rail together.  
2. VCS is Operate peer at `/vcs` only.  
3. Island document theme = kernel CSS only.  
4. One behavioral admin: `src/ui/admin.html` (embed or full).  
5. Kernel `GET /admin` without embed remains full AffordanceShell-lite (TRL-175).

---

## 6. Tests

**Static (trellis-node worktree / desk):**

```text
pnpm check
```

**Static greps (paths relative to trellis-node):**

```text
test -f docs/specs/trellis-admin-v1.1-playground.md
grep -q "embed=1" src/ui/admin.html
grep -q "TRELLIS_PLAYGROUND_URL\\|TRELLIS_ADMIN_URL" src/cli/admin.ts
test -f ../fractal-playground/app/vcs/page.tsx || test -f ../fractal-playground/app/\(operate\)/vcs/page.tsx
grep -q "id: 'vcs'" ../fractal-playground/lib/shell/modes.ts
grep -q "/vcs" ../fractal-playground/lib/shell/embed.ts
```

**E2E (kernel SSOT):**

```text
CI=1 pnpm test:e2e e2e/admin.spec.cjs
```

Minimum **new** case:

1. `goto('/admin?embed=1')` — **no** visible `.rail` (count 0 or not visible); view toggle + `#oplog` still present; kanban default (or persisted).

Existing admin cases remain green. Regression suite optional same as TRL-175
(`tml-lanes` + `client-vantage`) if time — not required for this AC list if
admin.spec stays green.

**Playground:** `pnpm check` in fractal-playground when TS touched; e2e smoke
deferred unless an existing Playwright project can hit `/vcs` cheaply.

---

## 7. File touch map

| Repo | File | Action |
| ---- | ---- | ------ |
| trellis-node | `src/ui/admin.html` | embed mode CSS/JS |
| trellis-node | `src/cli/admin.ts` | probe playground + env overrides |
| trellis-node | `e2e/admin.spec.cjs` | embed case |
| trellis-node | `docs/specs/trellis-admin-v1.1-playground.md` | this spec |
| fractal-playground | `lib/shell/modes.ts` | VCS Operate nav |
| fractal-playground | `lib/shell/embed.ts` | console embed path |
| fractal-playground | `components/shell/AppShell.tsx` | `/vcs` chrome suppress |
| fractal-playground | `app/vcs/page.tsx` | iframe island + loading/degraded |

---

## 8. Out of scope

- Soft-deprecating / aliasing `lane watch`  
- Next rewrite proxy `/kernel-admin`  
- `postMessage` view sync to parent URL  
- fractal-playground dual-shell / TRL-25  
- System Visualizer merge  
- daisyUI catalog  
- Importing turtlecode Solid AffordanceShell  

---

## 9. Acceptance criteria

```text
test:pnpm check
test:test -f docs/specs/trellis-admin-v1.1-playground.md
test:grep -q 'admin-embed\|embed=1' src/ui/admin.html
test:grep -q 'TRELLIS_PLAYGROUND_URL\|TRELLIS_ADMIN_URL' src/cli/admin.ts
test:grep -q "id: 'vcs'" ../fractal-playground/lib/shell/modes.ts
test:grep -q '/vcs' ../fractal-playground/lib/shell/embed.ts
test:(test -f ../fractal-playground/app/vcs/page.tsx || test -f '../fractal-playground/app/(operate)/vcs/page.tsx')
test:CI=1 pnpm test:e2e e2e/admin.spec.cjs
```

Behavioral:

- [ ] Playground `/vcs` shows Operate rail + kernel island (`embed=1`); no double rail  
- [ ] `trellis admin` prefers playground when reachable; else kernel `/admin`  
- [ ] Degraded panel when island cannot load  
- [ ] Theme seam: no playground OKLCH inside island; no React TML remount  
- [ ] Demos `/issues` unchanged; `trellis watch` untouched  
