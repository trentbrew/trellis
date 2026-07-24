---
version: alpha
name: trellis admin — causal history graph (Logs · Branches)
description: >-
  Design for TRL-262 — Git-graph-style causal topology for integration branch:
  milestones on trunk, agent lane forks as side lanes, promote as merge nodes.
  Replaces logs/branches stub; complements logs/ops linear stream.
source:
  tool: greenfield
  mock: docs/artifacts/trellis-admin-causal-graph_mockup.html
  research: >-
    design-research TRL-262; user GitGraph reference; trellis-admin-vcs-layout-ide_design.md;
    trellis-admin-chrome-polish_design.md; client.html D3 timeline; admin-datatable mount pattern
colors:
  background-base: "#101010"
  background-weak: "#1e1e1e"
  surface-raised-base: "#1c1c1c"
  surface-inset-base: "#161616"
  border-base: "rgba(255, 255, 255, 0.195)"
  text-strong: "rgba(255, 255, 255, 0.936)"
  text-base: "rgba(255, 255, 255, 0.618)"
  text-weak: "rgba(255, 255, 255, 0.422)"
  text-interactive-base: "#9dbefe"
  lane-trunk: "rgba(255, 255, 255, 0.422)"
  lane-fork: "#9dbefe"
  lane-fork-2: "#34d399"
  lane-fork-3: "#f59e0b"
  tag-flag-bg: "rgba(255, 255, 255, 0.422)"
  zone-logs: "#f59e0b"
  live-dot: "#12c905"
typography:
  body:
    fontFamily: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.45
  graph-title:
    fontFamily: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif
    fontSize: 15px
    fontWeight: 600
  graph-subtitle:
    fontFamily: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif
    fontSize: 13px
    fontWeight: 400
  row-message:
    fontFamily: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif
    fontSize: 15px
  row-meta:
    fontFamily: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace
    fontSize: 11px
    fontWeight: 500
  legend:
    fontFamily: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif
    fontSize: 12px
rounded:
  sm: 6px
  md: 8px
  lg: 10px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
components:
  causal-graph:
    height: 72
    size: 48
    padding: 16px
  branch-pill:
    typography: branch-pill
    padding: 4px 10px
  tag-flag:
    typography: tag-flag
    padding: 4px 10px
---

# Design: trellis admin — causal history graph

**Status:** Design verified — ready for Architect  
**Parent:** TRL-261 · **Design issue:** TRL-262  
**Mock:** [trellis-admin-causal-graph_mockup.html](./trellis-admin-causal-graph_mockup.html)  
**Amends:** [trellis-admin-vcs-layout-ide_design.md](./trellis-admin-vcs-layout-ide_design.md) (replaces `logs/branches` stub)  
**Preserves:** runtime-theme.css SSOT, logs/ops linear SSE stream, Work/Milestones card list

---

## Overview

Replace the **Logs → Branches** stub with a **Causal History Graph** — vertical git-client topology showing how agent lane forks diverge from integration and merge back on promote. Milestones appear as tag flags on trunk nodes; active lane heads show branch pills.

**Not** a replacement for Logs → Ops (linear live tail). **Not** the home for Work → Milestones (narrative cards stay; graph links to them).

Copy uses **fork** in user-facing text where possible; reserve **lane** for `lane-uuid` in metadata rows.

Emotional tone: same dense L3 operator shell — dark inset card, mono selection metadata, honest empty state when no fork history exists.

## IA placement (decision)

| Route | Verdict |
| ----- | ------- |
| **Logs → Branches** | **Ship here** — matches TRL-225/226 stub slot and IDE Logs mental model |
| Work → Milestones | Reject as graph host — keep cards; optional “View in graph” link later |
| Logs → Ops sub-panel | Reject — conflates linear tail with topology |

**View header:** breadcrumb ends `{repo} / operate / vcs / branches` (icon crumbs per TRL-236); `#view-meta` in `.view-header-start` shows `{N events · M active forks · integration: main}`. Global `.header-stats` stays board-global — graph counts do not duplicate there.

## Colors

Inherit `runtime-theme.css`. Map graph lanes to tokens:

| Lane index | Token | Use |
| ---------- | ----- | --- |
| 0 (trunk) | `--text-weak` / `{colors.lane-trunk}` | Integration branch, promoted merges |
| 1 | `--text-interactive-base` / `{colors.lane-fork}` | Primary agent fork |
| 2+ | `{colors.lane-fork-2}`, `{colors.lane-fork-3}` | Child/sibling forks (mod palette) |

- Merge node: hollow circle, stroke = lane color, fill = `{colors.surface-raised-base}`
- Selected row: `{colors.surface-inset-base}` at ~72% mix on `{colors.background-base}`
- Graph card: `{colors.surface-raised-base}` border `{colors.border-base}`, radius `{rounded.lg}`

## Typography

- Panel title **Causal history** + subtitle (one line, `{colors.text-base}`): explains click-to-expand hash.
- Row message: `{typography.row-message}` — trunk rows `{colors.text-base}`; fork rows `{colors.lane-fork}` medium weight.
- Selection meta: `{typography.row-meta}` — `{hash} · {agentId} · {relative date}`.
- Legend below card: `{typography.legend}` with 12px dots.

## Layout

### Shell context

Graph lives in `#panel-branches` main `view-body` — full width, scrollable vertically. Optional oplog inspector (280px) remains independent; graph does not require pin open.

```
[ view header: crumbs + meta ]
[ graph card — flex row: SVG | commit list ]
[ legend row ]
[ empty state when commits.length === 0 ]
```

### Graph geometry (normative)

Match user reference constants (scaled −15% for Operate density):

| Constant | Value | Notes |
| -------- | ----- | ----- |
| `ROW_HEIGHT` | 72px | Sync SVG row center ↔ list row height |
| `LANE_GAP` | 48px | Horizontal column spacing |
| `LEFT_PAD` | 28px | SVG left inset |
| `DOT_R` | 10px | +2px when selected |
| `LINE_W` | 5px | Round caps |

Edges: straight vertical when same lane; cubic S-curve when lanes differ (control points at mid-Y). Edge color = outermost non-trunk lane involved.

### Row anatomy (right column)

Each row is a full-width button:

```
[ branch pill? ] [ tag flag? ] [ message (+ meta if selected) ]
```

- **Branch pill:** rounded-full, 2px border = lane color, `{colors.surface-raised-base}` fill.
- **Tag flag:** pentagon notch left (`clip-path: polygon(0% 50%, 22% 0%, 100% 0%, 100% 100%, 22% 100%)`), `{colors.tag-flag-bg}` fill, dark text.
- Truncate message with ellipsis; selected row expands meta below.

### Node kinds (v1 projection)

| Event | Node shape | Lane | Label source |
| ----- | ---------- | ---- | -------------- |
| Milestone on integration | Solid trunk dot + tag | 0 | `milestone.message` |
| Lane fork (issue start / split) | Solid fork dot | 1+ | issue title or lane name |
| Promote (merge) | Hollow ring on trunk | 0 | `Promote {laneId}` |
| Active lane head (unpromoted) | Solid fork dot + pill | fork lane | `targetBranch` or lane id |

**Out of scope v1:** individual ops as nodes, git multi-branch manager UI, zoom/pan canvas.

## Interaction matrix

| Input | States | Output |
| ----- | ------ | ------ |
| Navigate to `logs/branches` | route inactive → active | `#panel-branches` visible; `mountAdminCausalGraph(#causal-graph-host)`; fetch `/api/causal-graph` |
| Leave `logs/branches` | route active → inactive | `destroy()` on primitive; selection cleared |
| Snapshot SSE | connected / disconnected | `refresh()` graph data; `#view-meta` counts update |
| Click row button | unselected / selected | Toggle selection; SVG dot +2px r; row `aria-selected`; meta row visible |
| Click SVG dot | unselected / selected | Same as row (decorative mirror — keyboard path is row only) |
| Enter / Space on row | focused | Toggle selection |
| Arrow Up/Down on row | focus on row | Move focus prev/next row; selection unchanged unless Enter |
| Pin live tail (`#pin-toggle`) | collapsed / open | Oplog inspector opens (280px); graph main column shrinks — graph scrolls independently |
| Secondary LOGS zone collapse | expanded / collapsed | Route tabs hidden; graph panel unchanged when route already active |
| Loading | no data yet | Skeleton card (3 pulse rows) in `#causal-graph-host` |
| Empty graph | `commits.length === 0` | Empty copy + hint “Start an issue to fork a lane” |
| Sparse trunk-only | milestones, no forks | Trunk timeline still renders; legend unchanged |
| Reduced motion | `prefers-reduced-motion: reduce` | No SSE pulse animation; selection bg instant (no transition) |

Selection does **not** open `#dlg` in v1 — inline meta sufficient. Architect may wire `onSelect → shell detail` as follow-up.

### Branch pill rules

| Row kind | `branches[]` shown |
| -------- | ------------------- |
| Active lane head (unpromoted) | `targetBranch` or short lane id |
| Promote merge on trunk | `integrationBranch` (e.g. `main`) |
| Milestone / mid-fork commits | omit unless branch pointer moved |

## Primitive contract (for Architect)

```ts
mountAdminCausalGraph(root: HTMLElement, opts?: {
  snapshotUrl?: string;  // default GET /api/causal-graph
  onSelect?: (node: CausalNode | null) => void;
}): { refresh(): void; destroy(): void }
```

Mount target: `#causal-graph-host` inside `[data-panel="logs/branches"]` (replaces `.route-panel-stub`). Module: `src/ui/admin-causal-graph.ts`. Call `refresh()` on admin snapshot SSE; `destroy()` on route leave.

## Data projection (Architect owns schema)

`CausalGraphSnapshot`:

```ts
type CausalNode = {
  id: string;
  hash: string;
  message: string;
  lane: number;
  parents: string[];
  branches?: string[];
  tags?: string[];
  author?: string;
  date?: string;
  kind?: 'milestone' | 'fork' | 'promote' | 'head';
}
```

Build from: `listMilestones()`, `listLanes()` (+ `parentLaneId`, `forkKind`), promote ops — **not** raw full op journal.

## Accessibility

- SVG decorative (`aria-hidden="true"`); semantic list carries structure.
- Each row: `<button type="button">` with `aria-selected="true|false"` and `aria-label="{message}, {kind}, lane {n}"`.
- `:focus-visible` ring: `2px solid color-mix(in srgb, var(--accent) 55%, transparent)` (matches admin datatable).
- Legend: text labels beside swatches (not color-only).
- Contrast: fork accent `#9dbefe` on `#1c1c1c` passes for 15px medium text.

**Focus order (Logs · Branches active):** LOGS zone toggle → Ops / Decisions / Branches tabs → `#pin-toggle` → graph row buttons (top→bottom) → legend (static text).

**Reduced motion:** disable SSE pulse and row bg transitions when `prefers-reduced-motion: reduce`.

## Empty & loading

- Loading: skeleton card (3 gray rows) until first snapshot.
- Empty: centered message + link hint “Board → Promote when done”.
- Sparse (trunk only, no forks): show milestones on trunk — still valuable.

## Design research

See design-research subagent TRL-262: confirms Logs/Branches slot, `buildTimeline` + `lanes-snapshot` gaps (`parentLaneId` not exported), `client.html` marker colors as secondary ref, `mountAdminDatatable` as mount pattern.

## Design verification

- refs: trellis-admin-vcs-layout-ide_design.md, trellis-admin-chrome-polish_design.md, trellis-admin-chrome-polish_mockup.html, trellis-admin-causal-graph_mockup.html (read)
- interaction matrix: 13 rows, 0 empty cells
- a11y: focus order + prefers-reduced-motion documented
- token parity: YAML ↔ mock :root verified
- design.md lint: exit 0, 0 errors
- design critique: 1 round, 0 blockers remaining

## Open questions for Architect

1. Extend `buildLanesSnapshot` vs new `buildCausalGraphSnapshot` — prefer dedicated builder.
2. Whether promote replay creates explicit graph node from op kind or inferred from lane status `promoted`.
3. Light theme: use same token mapping via `runtime-theme.css` (mock is dark-only; light variant follows `--color-primary` pattern from user reference screenshots).
