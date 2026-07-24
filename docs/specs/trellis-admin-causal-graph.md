# Spec: trellis admin — causal history graph (Logs · Branches)

**Status:** Ready for impl  
**Date:** 2026-07-21  
**Proposal:** TRL-261  
**Design:** TRL-262 · [`docs/artifacts/trellis-admin-causal-graph_design.md`](../artifacts/trellis-admin-causal-graph_design.md) · [`trellis-admin-causal-graph_mockup.html`](../artifacts/trellis-admin-causal-graph_mockup.html)  
**Amends:** [`trellis-admin-vcs-layout-ide.md`](./trellis-admin-vcs-layout-ide.md) — replaces `logs/branches` stub  
**Preserves:** Logs/Ops SSE linear stream, Work/Milestones cards, `runtime-theme.css` SSOT, embed mode  
**Labels:** `spec`, `tml`, `admin`, `needs-e2e`

---

## 1. Intent

Replace the **Logs → Branches** stub in admin with a **Causal History Graph** — vertical
git-client topology of integration milestones, agent lane forks, and promote merges.
Complements (does not replace) the Logs/Ops linear op tail.

**Out of scope v1:** per-op nodes, git branch manager CRUD, zoom/pan canvas, `#dlg` on
row select, React/shadcn island.

---

## 2. Architecture decisions

| Decision | Choice |
| -------- | ------ |
| IA route | `logs/branches` only — not Work/Milestones |
| Snapshot builder | **Dedicated** `buildCausalGraphSnapshot()` in `src/ui/causal-graph-snapshot.ts` — do not overload `buildLanesSnapshot()` |
| HTTP | `GET /api/causal-graph` on admin server (`lanes-dashboard.ts`) |
| UI primitive | `mountAdminCausalGraph()` in `src/ui/admin-causal-graph.ts` — DOM/SVG only, no kernel imports |
| Bundle | Serve as `/admin-causal-graph.js` via existing esbuild path (mirror `admin-datatable.ts`) |
| Mount target | `#causal-graph-host` inside `[data-panel="logs/branches"]` |
| Route lifecycle | Mount + initial fetch on `setVcsRoute('logs','branches')`; `destroy()` when leaving route |
| Refresh | `handle.refresh()` on admin snapshot SSE (`onSnapshot`) when graph mounted |
| Data scope | Milestones + lane fork/head/promote events — **not** full op journal |
| Promote nodes | Emit when `LaneMeta.status === 'promoted'`; `hash` from `headOpHash` or latest `vcs:lanePromoteComplete` on integration journal |
| Lane columns | `lane: 0` = integration trunk; side lanes from fork tree (`parentLaneId`, `forkKind`) — stable sort by `createdAt` then `id` |
| Merge shape | Multi-parent promote → hollow ring on trunk (`parents.length > 1`) |
| Selection | Inline meta `{hash · agentId · date}` — no `#dlg` v1 |
| Theme | Read lane colors from CSS vars (`--text-weak`, `--accent` / design tokens via `runtime-theme.css`) — no hardcoded hex in TS |
| View meta | `#view-meta` on `logs/branches`: `{N events · M active forks · integration: {branch}}` — replace "Coming soon" |
| Loading / empty | Skeleton (3 rows) until first fetch; empty copy per design when `commits.length === 0` |
| a11y | SVG `aria-hidden`; row `<button aria-selected>` + `aria-label`; `:focus-visible` ring; `@media (prefers-reduced-motion: reduce)` disables transitions |

### Graph geometry (normative)

| Constant | Value |
| -------- | ----- |
| `ROW_HEIGHT` | 72 |
| `LANE_GAP` | 48 |
| `LEFT_PAD` | 28 |
| `DOT_R` | 10 (+2 when selected) |
| `LINE_W` | 5 |

Edges: vertical line same lane; cubic S-curve when lanes differ; stroke color = outermost
non-trunk lane on edge.

---

## 3. Types & API

### 3.1 `CausalGraphSnapshot`

```ts
export type CausalNodeKind = 'milestone' | 'fork' | 'promote' | 'head';

export interface CausalNode {
  id: string;
  hash: string;
  message: string;
  lane: number;
  parents: string[];
  branches?: string[];
  tags?: string[];
  author?: string;
  date?: string;
  kind?: CausalNodeKind;
}

export interface CausalGraphSnapshot {
  at: string;
  integrationBranch: string;
  commits: CausalNode[]; // newest first (index 0 = top)
  stats: {
    eventCount: number;
    activeForkCount: number;
  };
}
```

### 3.2 `GET /api/causal-graph`

- **200** `CausalGraphSnapshot` JSON
- Engine must be `open()` before build (same as `/api/lanes`)
- No query params v1

### 3.3 `mountAdminCausalGraph`

```ts
export type AdminCausalGraphHandle = {
  refresh(data?: CausalGraphSnapshot): void;
  destroy(): void;
};

export function mountAdminCausalGraph(
  root: HTMLElement,
  opts?: {
    fetchUrl?: string; // default `/api/causal-graph`
    onSelect?: (node: CausalNode | null) => void;
    onStats?: (stats: CausalGraphSnapshot['stats'], integrationBranch: string) => void;
  },
): AdminCausalGraphHandle;
```

Pure layout helpers (`laneColor`, `buildEdges`, `formatViewMeta`) exported for unit tests.

---

## 4. Projection rules (`buildCausalGraphSnapshot`)

Input: `TrellisVcsEngine` — `listMilestones()`, `listLanes()`, integration branch name
from config / snapshot.

**Emit nodes (newest first after sort):**

| Kind | When | Lane | `parents` | `branches` / `tags` |
| ---- | ---- | ---- | --------- | --------------------- |
| `promote` | `lane.status === 'promoted'` | 0 | trunk anchor + lane head | `branches: [integrationBranch]` |
| `head` | `lane.status === 'active'` | fork lane | prior node on lane or fork base | `targetBranch` or short lane id |
| `milestone` | each milestone | 0 | previous trunk node | `tags: [milestone.id]` |
| `fork` | lane create / split (non-promoted, non-active-only) | fork lane | trunk at `baseOpHash` | optional issue title |

**Do not** emit one node per integration op.

**Lane index assignment:** BFS/DFS from trunk: trunk = 0; each new fork root gets next
integer; child lane (`forkKind === 'child'`) → `parentLane + 1` (mod palette via `% 4`
excluding trunk).

**Sort:** primary `createdAt` / milestone `toOpHash` position descending; tie-break `id`.

---

## 5. File touch map

| File | Change |
| ---- | ------ |
| `src/ui/causal-graph-snapshot.ts` | **New** — types + `buildCausalGraphSnapshot` + pure helpers |
| `src/ui/admin-causal-graph.ts` | **New** — primitive mount/render/selection |
| `src/ui/lanes-dashboard.ts` | `GET /api/causal-graph`; bundle `/admin-causal-graph.js` |
| `src/ui/admin.html` | Replace stub panel; graph CSS; import mount; route lifecycle; `updateViewMeta` for branches |
| `test/ui/causal-graph-snapshot.test.ts` | **New** — projection + lane assignment |
| `test/ui/admin-causal-graph.test.ts` | **New** — edge path + selection helpers |
| `e2e/admin.spec.cjs` | Branches route: host visible, row select meta, view-meta counts |
| `docs/specs/trellis-admin-causal-graph.md` | This file |

**Out of touch:** `buildTimeline()` in `server.ts` (legacy visualizer), TML runtime,
PeerDriver (unless snapshot reuse is free).

---

## 6. Markup contracts (`admin.html`)

Replace `[data-panel="logs/branches"]` stub:

```html
<div class="view-panel" data-panel="logs/branches">
  <div class="causal-graph-panel" id="panel-branches">
    <div class="graph-intro">
      <h2>Causal history</h2>
      <p>…</p>
    </div>
    <div class="graph-card">
      <div id="causal-graph-host"></div>
    </div>
    <div class="graph-legend" aria-label="Graph legend">…</div>
  </div>
</div>
```

Script block (after `createAdminShell`):

- `let causalGraph = null`
- On route `logs/branches`: lazy `mountAdminCausalGraph(#causal-graph-host, { onStats })` + fetch
- On leave: `causalGraph?.destroy(); causalGraph = null`
- In `applySnapshot` / SSE handler: if mounted, `fetch('/api/causal-graph')` → `refresh`
- `updateViewMeta`: when `logs/branches`, set text from last graph stats (not "Coming soon")

---

## 7. e2e (`e2e/admin.spec.cjs`)

Add:

1. `/?vcs=logs/branches` — `#causal-graph-host` visible; `.route-panel-stub` count 0 on branches panel
2. With seeded repo data (or demo snapshot): first `.graph-list button` click → row has `aria-selected="true"` and meta matching `/[a-f0-9]{6,}/i`
3. `#view-meta` text matches `/events · .*integration:/i` (not `/coming soon/i`)
4. Existing admin cases remain green

Run: `CI=1 pnpm test:e2e e2e/admin.spec.cjs`

---

## 8. Unit tests

### `test/ui/causal-graph-snapshot.test.ts`

- Fixture lanes + milestones → expected node kinds and `lane` indices
- Promoted lane → merge node with `parents.length >= 2`
- Child fork → lane index > parent fork lane
- Empty repo → `commits: []`, `stats.eventCount === 0`

### `test/ui/admin-causal-graph.test.ts`

- `buildEdges` / `laneX` / `rowY` pure helpers (or exported from snapshot module)
- `formatViewMeta({ eventCount: 7, activeForkCount: 1 }, 'main')` → design string shape

Run: `pnpm exec vitest run test/ui/causal-graph-snapshot.test.ts test/ui/admin-causal-graph.test.ts`

---

## 9. Out of scope

- Work/Milestones graph embed link  
- Logs/Ops graph click-through  
- Light-theme-specific mock (runtime-theme handles via CSS vars)  
- `buildLanesSnapshot` fork field export (graph API is separate)  
- Git branch delete/rename UI  

---

## Acceptance criteria

```text
test:pnpm check
test:test -f docs/specs/trellis-admin-causal-graph.md
test:grep -q buildCausalGraphSnapshot docs/specs/trellis-admin-causal-graph.md
test:grep -q /api/causal-graph docs/specs/trellis-admin-causal-graph.md
test:grep -q mountAdminCausalGraph docs/specs/trellis-admin-causal-graph.md
test:grep -q causal-graph-host docs/specs/trellis-admin-causal-graph.md
test:grep -q ROW_HEIGHT docs/specs/trellis-admin-causal-graph.md
test:pnpm exec vitest run test/ui/causal-graph-snapshot.test.ts test/ui/admin-causal-graph.test.ts
```

**Impl verification (carry on impl issue):**

```text
test:CI=1 pnpm test:e2e e2e/admin.spec.cjs
```
