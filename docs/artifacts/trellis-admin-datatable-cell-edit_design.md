---
version: alpha
name: trellis admin — Operate inline cell edit
description: >-
  Design for TRL-212 — activate inline cell edit on Operate datatable for
  branch + issue columns. Extends admin-datatable module; zero density delta.
source:
  tool: greenfield
  mock: docs/artifacts/trellis-admin-datatable-cell-edit_mockup.html
  research: >-
    design-research TRL-212; trellis-admin-datatable_design.md;
    trellis-admin-datatable-extract_design.md; SpreadsheetTable.tsx sibling;
    admin-datatable.ts mount API
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
  edit-ring: "#9dbefe"
  edit-fill: "color-mix(in srgb, #9dbefe 8%, transparent)"
  error: "#f87171"
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
  cell-editing:
    outline: "2px solid {colors.edit-ring}"
    outlineOffset: "-2px"
    backgroundColor: "{colors.edit-fill}"
    height: "42px"
  cell-input:
    fontFamily: "{typography.mono.fontFamily}"
    fontSize: "12px"
    height: "100%"
    border: "none"
    background: "transparent"
---

# Design: trellis admin — Operate inline cell edit

**Status:** Design verified — ready for Architect  
**Parent:** TRL-212 · **Design issue:** TRL-213  
**Mock:** [trellis-admin-datatable-cell-edit_mockup.html](./trellis-admin-datatable-cell-edit_mockup.html)  
**Inherits density:** [trellis-admin-datatable_design.md](./trellis-admin-datatable_design.md) / TRL-203  
**Module host:** [trellis-admin-datatable-extract_design.md](./trellis-admin-datatable-extract_design.md) / `admin-datatable.ts`  
**Sibling canon:** fractal-playground `SpreadsheetTable` text edit

---

## Overview

Activate the edit-ready hooks reserved in TRL-206/207: **branch** and **issue**
cells become editable in Operate table view. Edit UX lives in the
`admin-datatable` module; shell keeps Seam C (row → `#dlg`). Density frozen at
42/36 — edit chrome is an **inset accent ring** inside the cell, not a new
surface.

Emotional tone: quiet spreadsheet precision — one cell at a time, no floating
editors, no cards.

## Colors

Inherit runtime-theme + table locals. Edit chrome uses `{colors.edit-ring}` /
`{colors.edit-fill}` only while `td.cell-editing`. Error flash `{colors.error}`
on invalid issue id. **Never** `--surface2` for row hover.

## Typography

Mono 12px for cell values and the edit `<input>` — match `.lanes-table td`.

## Layout

```
#view-table / .table-wrap
└── table.lanes-table
    ├── thead (sort — unchanged)
    └── tbody
        └── tr
            ├── td[data-col=lane]     RO — identity + spinner
            ├── td[data-col=agent]    RO — ownership
            ├── td[data-col=ops]      RO — derived
            ├── td[data-col=files]    RO — derived
            ├── td[data-col=branch]   EDITABLE — lane.targetBranch
            └── td[data-col=issue]    EDITABLE — lane.issueId (empty → —)
```

Shell / toolbar / sidebar / statusbar / embed: **untouched**.

## Elevation & Depth

Inset hierarchy only: `outline: 2px solid accent; outline-offset: -2px` on
`td.cell-editing` — same language as row `:focus-visible` and sort-btn focus.
No modal, no popover, no floating toolbar.

## Shapes

Cell stays rectangular; wrap radius remains 12px. Input fills the cell padding
box (`padding: 0 14px` inherited rhythm).

## Components

| Component | Anatomy | States | Maps to codebase |
| --------- | ------- | ------ | ---------------- |
| Editable cell | `td[data-editable=true]` | idle / hover / editing / error | flip attrs on branch + issue |
| Edit input | `<input class="cell-edit-input">` inside `td` | focused | `admin-datatable.ts` |
| Cell editing chrome | `td.cell-editing` | active | `admin-datatable.css` |
| Cell error | `#cell-edit-error` (`role="alert"`) | hidden / visible | sibling under `.table-wrap` or live region |
| Commit toast | shell `#toast` | success / reject | existing toast |
| Module API | extend mount handle | + optional `onCellCommit` | `admin-datatable.ts` |

### Editable vs read-only (normative v1)

| `data-col` | Editable | Why |
| ---------- | -------- | --- |
| lane | **no** | Primary id; spinner chrome; dlg id prefers `data-entity-id` |
| agent | **no** | Ownership / lane protocol — not casual metadata |
| ops | **no** | Derived op count |
| files | **no** | Derived file count |
| branch | **yes** | Stored `targetBranch` |
| issue | **yes** | Stored `issueId`; empty clears / shows `—` |

### Interaction matrix

| State / input | Output |
| ------------- | ------ |
| Single-click `td[data-editable=true]` | Begin edit: `stopPropagation`; add `cell-editing`; mount `<input>`; select value; dispatch `trellis:cell-activate` |
| Single-click non-editable cell / row chrome (not editing) | Seam C: open `#dlg` |
| Editing + click non-editable cell / row chrome | **Commit** current cell first; then open `#dlg` for that row (blur/commit completes before activate) |
| Double-click any row | **Out of v1** — do not add; single-click Seam C + F2/edit click suffice |
| Row focused + **F2** (or **e**) | Begin edit on **first editable** cell in that row (`branch`); do **not** open `#dlg` |
| Enter (while editing) | Commit → `trellis:cell-commit` → same col, next visible row (stay if last) |
| Tab / Shift+Tab (editing) | Commit → next / prev **editable** cell in row, then wrap to next/prev row’s editable |
| Escape (editing) | Cancel; restore prior text; hide `#cell-edit-error`; focus hosting `tr` |
| Blur (editing) | Commit (SpreadsheetTable parity) |
| Sort click while editing | **Commit first**, then run sort |
| TML MutationObserver mid-edit | **Skip `refresh()`** while any `.cell-editing` exists |
| Search would hide editing row | **Cancel** edit (restore), then apply `.hidden-by-search` |
| Invalid issue id on commit | Keep editing; `aria-invalid` on input + `td`; show `#cell-edit-error`; **no** `trellis:cell-commit` |
| Empty issue on commit | Store null; display `—` |
| Empty branch on commit | **Reject** — keep editing; `aria-invalid` + error “Branch required” |
| Mutation host rejects commit | Toast error via `#toast`; **restore** prior cell text; exit edit (do not leave dirty UI) |
| Row Enter/Space (not editing) | Open `#dlg` (existing) |

### Keyboard & pointer split (critical)

```
editable cell click     → edit (stopPropagation)
F2 / e on focused row   → edit first editable (branch)
non-editable / tr click → activateCard → #dlg  (if not editing)
editing + RO click      → commit, then #dlg
editing + Enter         → commit cell (suppress row dlg)
not editing + Enter     → #dlg
```

### Issue id validation (normative)

- Empty / whitespace → null, display `—` (valid commit)
- Non-empty must match `/^TRL-\d+$/i` (e.g. `TRL-212`)
- Anything else → invalid, keep editing

## Accessibility

- Focus order (extended): toolbar → sort headers → rows → **edit input when active** → op-log → statusbar → dialog  
- Edit input: `aria-label` = `Edit branch` | `Edit issue`  
- Invalid: `aria-invalid="true"` on input; `aria-describedby="cell-edit-error"`; `#cell-edit-error` is `role="alert"` text under `.table-wrap` (hidden when valid)  
- **F2** / **e** is the keyboard enter-edit path (rows stay `tabindex="0"`; cells not separately tabbable in v1)  
- Escape always exits edit without save  
- `prefers-reduced-motion`: no pulse on edit chrome; instant ring  
- Do not steal focus from `#dlg` when dialog open  
- Preserve e2e selectors: `#view-table`, `.table-wrap`, `.sort-btn`, `#table-empty`, `.lanes-table`

## Mutation seam (Open for Architect — behavior lock)

Design locks **UX**; Architect picks wire:

1. Module dispatches `trellis:cell-commit` with `{ entityId, field, value, col }`  
2. Shell or host listens → mutate lane meta via existing admin/TML path  
3. On success: update cell text (or let TML refresh after pause ends)  
4. On failure: re-enter edit or toast error  

Do **not** half-wire `server.ts`. Prefer extending `lanes-dashboard` / existing mutation POST if one exists; otherwise document new `POST` only if required for lane meta.

## Do's and Don'ts

**Do**

- Keep edit inside 42px row height  
- Flip only branch + issue `data-editable="true"` in TML template  
- `stopPropagation` on editable cell activate  
- Pause live `refresh()` while editing  

**Don't**

- Edit lane id / agent / derived counts in v1  
- Open `#dlg` when clicking an editable cell  
- Add React SpreadsheetTable or floating popover editors  
- Change sort / empty / search selector contracts  

## Open for Architect

1. Extend `admin-datatable.ts`: begin/commit/cancel; F2/e on focused row; `trellis:cell-activate` / `trellis:cell-commit`; **skip `refresh()`** while `.cell-editing`; sort → commit-then-sort; search hide → cancel-then-filter.  
2. Extend `admin-datatable.css`: `.cell-editing`, `.cell-edit-input`; `#cell-edit-error` styles.  
3. Flip `data-editable="true"` on branch + issue `td` in `admin.html` TML template; add `#cell-edit-error` node in `.table-wrap`.  
4. Shell: row activate after commit when RO clicked mid-edit; use `data-entity-id` for dlg id.  
5. Wire commit → lane meta mutation (`targetBranch` / `issueId`); issue regex `/^TRL-\d+$/i`; empty branch reject; mutation fail → toast + restore.  
6. Unit tests for validation + edit helpers; e2e: click/F2 enter edit, commit branch, Escape cancel, invalid issue stays editing, existing 24 tests green.  
7. Out of scope: agent edit, double-click dlg, Filters, New-issue, Export, column resize, multi-cell paste.
