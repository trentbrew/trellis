---
version: alpha
name: trellis admin — extract Operate datatable module
description: >-
  Design for TRL-206 — extract #view-table behavior/CSS into a typed module
  before inline cell edit. Zero visual delta vs TRL-203 density.
source:
  tool: greenfield
  mock: docs/artifacts/trellis-admin-datatable-extract_mockup.html
  research: >-
    design-research TRL-206; trellis-admin-datatable_design.md; tml-runtime.ts
    serve pattern; admin.html table CSS/JS; lanes-dashboard.ts
colors:
  background-base: "#101010"
  surface-raised-base: "#1c1c1c"
  surface-hover: "#222222"
  border-base: "rgba(255, 255, 255, 0.195)"
  border-column: "rgba(255, 255, 255, 0.06)"
  text-strong: "rgba(255, 255, 255, 0.936)"
  text-base: "rgba(255, 255, 255, 0.618)"
  text-weak: "rgba(255, 255, 255, 0.422)"
  text-interactive-base: "#9dbefe"
  seam-accent: "#9dbefe"
  module-bg: "#161616"
typography:
  body:
    fontFamily: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif
    fontSize: 13px
    fontWeight: 400
  mono:
    fontFamily: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace
    fontSize: 12px
    fontWeight: 400
  label:
    fontFamily: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace
    fontSize: 10px
    fontWeight: 600
    letterSpacing: 0.04em
    textTransform: uppercase
rounded:
  sm: 6px
  md: 8px
  lg: 10px
  xl: 12px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
components:
  module-box:
    backgroundColor: "{colors.module-bg}"
    border: "{colors.border-base}"
    borderRadius: "{rounded.md}"
  seam-callout:
    color: "{colors.seam-accent}"
---

# Design: trellis admin — extract Operate datatable module

**Status:** Design verified — ready for Architect  
**Parent:** TRL-206 · **Design issue:** TRL-207  
**Mock:** [trellis-admin-datatable-extract_mockup.html](./trellis-admin-datatable-extract_mockup.html)  
**Amends:** packaging only — inherits [trellis-admin-datatable_design.md](./trellis-admin-datatable_design.md) density  
**Preserves:** TRL-203 browse behavior, e2e selectors, shell/toolbar/statusbar, TML tbody in HTML  
**Follow-up (not this wedge):** Operate datatable inline cell edit

---

## Overview

Harden `admin.html` by extracting Operate table **behavior + CSS** into a
typed module (`admin-datatable.ts` → `/admin-datatable.js` + static CSS),
mirroring the `tml-runtime.js` serve pattern. Visual chrome stays frozen —
this is a **module-map / seam** design, not new UI.

Emotional tone: calm architecture diagram — callouts on seams, not decoration.

## Colors

Inherit runtime-theme + TRL-201 table locals (`--table-row-h`, `--surface-hover`).
Mock uses `{colors.seam-accent}` only for seam labels. Production: **zero**
palette change.

## Typography

Body for prose; mono for file paths / API names in mock legend.

## Layout

```
admin.html (shell)
├── operate-toolbar  ──Seam A──►  table.applySearchQuery(q)
├── #view-table
│   ├── markup: thead + TML tbody (stays in HTML)
│   ├── /admin-datatable.css  (table well, sort, empty)
│   └── mountAdminDatatable(#view-table)  ← /admin-datatable.js
│         ├── sort / empty / MutationObserver
│         └── events: trellis:table-sort | trellis:table-empty
└── #tml-root row activate ──Seam C──► #dlg (unchanged)
```

Shell grid / sidebar / toolbar / embed: **untouched**.

## Elevation & Depth

No new surfaces. Module files are organizational, not visual layers.

## Shapes

Wrap radius remains `{rounded.xl}` (12px) per TRL-201 — in extracted CSS.

## Components

| Component | Anatomy | States | Maps to codebase |
| --------- | ------- | ------ | ---------------- |
| Datatable module | `mountAdminDatatable(root)` | mounted / destroyed | new `src/ui/admin-datatable.ts` |
| Table CSS | `.table-wrap`, `.lanes-table`, `.table-empty` | same as TRL-203 | new `src/ui/admin-datatable.css` |
| Search seam | `applySearchQuery(q)` | empty / filtered | replace inline `applySearchFilter` table branch |
| Sort headers | existing `.sort-btn` | none/asc/desc | module owns handlers |
| Empty veil | `#table-empty` | no-lanes / no-matches / hidden | module owns `updateTableEmpty` |
| Edit hooks | `data-col`, `data-editable`, `data-field` | reserved false | markup attrs only |

### Recommended boundary (normative)

**Option B — TS module served by UI server** (like `tml-runtime.ts`):

| Asset | Path | Serve |
| ----- | ---- | ----- |
| Behavior | `src/ui/admin-datatable.ts` | `GET /admin-datatable.js` (esbuild on the fly) |
| Styles | `src/ui/admin-datatable.css` | `GET /admin-datatable.css` (static copy in build) |
| Markup | stays in `admin.html` `#view-table` | TML must compile static tbody |

**Public API (sketch for Architect):**

```ts
mountAdminDatatable(root: HTMLElement, opts?: {
  onEmptyChange?: (state: 'hidden' | 'no-lanes' | 'no-matches') => void;
}): {
  applySearchQuery(q: string): void;
  refresh(): void;
  destroy(): void;
};
```

### Interaction matrix (parity — no new flows)

Full browse matrix SSOT: [trellis-admin-datatable_design.md](./trellis-admin-datatable_design.md)
§ Interaction matrix. This table = **extract seams only**.

| State / input | Output |
| ------------- | ------ |
| Mount on `#view-table` | Bind sort buttons; observe `.table-wrap`; initial empty sync |
| `#search-input` input | Shell filters non-table surfaces; calls `table.applySearchQuery(q)` for **table rows + empty only** |
| `#search-clear` | Same path with `q=""` |
| Sort button click | Cycle none→asc→desc; reorder live tbody; `aria-sort` on `th`; optional `trellis:table-sort` |
| TML mutates tbody | Observer → `refresh()` (re-sort + re-apply **cached** query) |
| Zero / all-hidden rows | `#table-empty` visible; prefer **one** empty channel (`trellis:table-empty` **or** `onEmptyChange`, not both required) |
| Row click / Enter / Space | **Shell** `#tml-root` → `#dlg` (Seam C — not module) |
| Module destroy | Disconnect observer; remove listeners |

### Edit-ready hooks (reserve only)

| Hook | Where | This wedge |
| ---- | ----- | ---------- |
| `data-col` | each `td` in **TML template** | **Add** attrs matching `data-key` columns |
| `data-editable="false"` | each `td` | **Add** default |
| `data-field` | each `td` | **Add** field path string (e.g. `lane.id`) |
| `trellis:cell-activate` / `commit` | events | **Do not** dispatch |
| `td.cell-editing` styles | CSS | **Do not** ship edit chrome |
| Row activate vs cell edit | future | Document: edit mode must `stopPropagation` on editable `td` |

### Accessibility

Unchanged from TRL-201/203:

- Focus order: toolbar → sort headers → rows → op-log → statusbar → dialog  
- `aria-sort` **only on `th`**; button inside  
- `#table-empty` `role="status"`  
- `prefers-reduced-motion`: no new motion  
- e2e selectors stable: `#view-table`, `.table-wrap`, `.sort-btn`, `#table-empty`, `.lanes-table`

## Open for Architect

1. Add `GET /admin-datatable.js` esbuild route in `lanes-dashboard.ts` (mirror `/tml-runtime.js`; DOM-only — no `../core/**` imports).
2. Add `GET /admin-datatable.css` via `findUiAsset` static (same resolve pattern as other UI assets; build-copy if dist needs it). Prefer this over inventing a third CSS namespace unless shared helper lands.
3. Move table well/sort/empty CSS out of `admin.html`; keep `.hidden-by-search` **in shell** CSS (shared utility).
4. Wire `admin.html`: link CSS; `import { mountAdminDatatable } from '/admin-datatable.js'` after TML mount; shell search keeps multi-view filter + calls `table.applySearchQuery` for table branch only.
5. Add `data-col` / `data-editable` / `data-field` on `td` **in TML template markup** (no edit UI).
6. Unit test pure sort/empty helpers (`test/ui/admin-datatable.test.ts`).
7. e2e: existing datatable cases must stay green (zero visual delta).
8. Out of scope: cell edit, Filters, New-issue wire, React SpreadsheetTable; do not half-wire `server.ts` unless admin host moves.

### Cohesion (synthesist pre-architect)

- Search ownership stays on toolbar/shell — do **not** move full `applySearchFilter` into the module.
- `.hidden-by-search` stays shell CSS.
- Serve pattern mirrors `tml-runtime`; thin DOM bundle; TML tbody stays in HTML.

## Do's and Don'ts

**Do**

- Extract behavior + CSS; leave TML markup in HTML  
- Preserve TRL-203 density and e2e selectors  
- Leave edit-ready data attrs for the follow-up wedge  

**Don't**

- Implement inline editors / `contenteditable` / mutation POST  
- Change shell grid, toolbar contracts, or theme palette  
- Generate tbody rows from JS (breaks TML)  
- Grow `admin.html` with more table logic  

---

## Design research (summary)

Recommend **(B) TS module** over plain JS inject or HTML partial. Anchors:
`admin.html` table CSS/JS; `tml-runtime.ts` + `lanes-dashboard.ts` esbuild
route; density SSOT in `trellis-admin-datatable_design.md`.
