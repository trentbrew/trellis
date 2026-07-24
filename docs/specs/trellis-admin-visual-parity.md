# Spec: trellis admin — visual parity harden

**Status:** Ready for impl  
**Date:** 2026-07-21  
**Proposal:** TRL-183  
**Design:** TRL-184 · [`docs/artifacts/trellis-admin-visual-parity_design.md`](../artifacts/trellis-admin-visual-parity_design.md) · [`trellis-admin-visual-parity_mockup.html`](../artifacts/trellis-admin-visual-parity_mockup.html)  
**Amends:** [`trellis-admin.md`](./trellis-admin.md) (projection chrome only)  
**Labels:** `spec`, `tml`, `admin`, `harden`, `needs-e2e`

---

## 1. Intent

Bring kernel `/admin` projections to **layout parity** with `lanes.html` /
`tml-lanes.html` so Grid / Kanban / Table / Dialog use the main pane honestly
and dialogs sit viewport-centered.

This is a **CSS + light markup** wedge on `src/ui/admin.html`. No new TML
primitives, no SpreadsheetTable port, no `lane watch` kill-gate, no playground
chrome changes (unless embed regression).

---

## 2. Architecture decisions

| Decision | Choice |
| -------- | ------ |
| Touch surface | `src/ui/admin.html` primary; extend `e2e/admin.spec.cjs` |
| Theme | Keep `/theme/runtime-theme.css` SSOT — no new `:root` palette |
| Dialog | **Locked:** native `<dialog id="dlg">` + `margin: auto` + `::backdrop` |
| Dialog alternate | Rejected: migrate to lanes `.dialog-backdrop` flex div |
| Grid | CSS Grid `repeat(auto-fill, minmax(320px, 1fr))` (lanes `.grid`) |
| Kanban | `display: flex` row; cols `min-width: 300px; max-width: 340px` |
| Kanban inset | `--tml-kanban-body-inset` on `.kanban-col-body` **only** |
| Stage `.proj` | `padding: 16px`; background `--bg` / transparent — **not** kanban inset |
| Table | Wrap in `.table-wrap`; use `table.lanes-table` (or equivalent class with same rules); `width: 100%`; `table-layout: fixed` |
| TML hosts | Keep bindings on inner hosts (`.grid-host` / col-body / tbody); outer `#view-*` ids unique |
| SpreadsheetTable | **Forbidden** |
| Soft-deprecate `lane watch` | **Forbidden** this wedge |

---

## 3. File touch map

| File | Change |
| ---- | ------ |
| `src/ui/admin.html` | CSS/markup for dialog, `.proj`, grid, kanban, table; table row keyboard |
| `e2e/admin.spec.cjs` | Add visual-parity smoke cases (below) |
| `docs/specs/trellis-admin-visual-parity.md` | This file |

**Out of touch:** `lanes.html`, `tml-lanes.html`, `runtime-theme.css` (unless a
missing alias is required — prefer not), fractal-playground, CLI.

---

## 4. Layout contracts (normative)

### 4.1 Dialog center

```css
dialog {
  margin: auto; /* required — overrides * { margin: 0 } */
  max-width: 560px;
  width: calc(100% - 32px); /* or 90% as lanes */
  border-radius: 14px;
}
dialog::backdrop {
  background: rgba(0, 0, 0, 0.6);
}
```

Keep `showModal()` / `close()`. Backdrop click-to-dismiss may stay as today.
Focus restore to opener on close is required (design a11y).

### 4.2 Grid multi-column

Replace flex-wrap + fixed `280px` `.lane-card` width with:

```css
.grid-host /* or rename class to .grid — either OK if e2e updated */ {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
  width: 100%;
}
.lane-card {
  width: 100%; /* fill track — no fixed 280px */
}
```

At a viewport where the main pane is ≥ ~1100px wide with ≥2 lanes in the
snapshot, computed `grid-template-columns` must resolve to **≥ 2 tracks**.

### 4.3 Kanban flex

```css
.kanban {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 16px;
  min-height: 200px;
  width: 100%;
}
.kanban-col {
  min-width: 300px;
  max-width: 340px;
  flex: 1;
}
```

Column heads: prefer lanes `.col-title` (sans uppercase) + optional `.col-count`.
Do **not** set `.proj` background to `--tml-kanban-body-inset`.

### 4.4 Table full-bleed

```html
<section class="proj table-view" id="view-table">
  <div class="table-wrap">
    <table class="lanes-table">…</table>
  </div>
</section>
```

```css
.proj.table-view { padding: 16px; }
.table-wrap {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
}
table.lanes-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
}
```

Update JS selectors that currently target `.tbl` to `.lanes-table` (search
filter, row click).

### 4.5 Table keyboard

Rows that open the dialog must be keyboard-activatable:
`tabindex="0"` on `<tr>` (or button-in-cell) + Enter/Space → same handler as
click.

---

## 5. Empty states (minimal)

| Surface | Behavior |
| ------- | -------- |
| Kanban empty col | Keep / add empty hint tone (lanes `.kanban-empty`) if missing |
| Grid / table zero lanes | No phantom cards; empty host acceptable |
| Search / embed | **Inherited** — do not re-spec |

---

## 6. Motion / a11y

- Under `prefers-reduced-motion: reduce`: no transform and no opacity animation
  on dialog open.
- View toggles keep `aria-pressed`; dialog close keeps `aria-label="Close"`.

---

## 7. e2e (`e2e/admin.spec.cjs`)

Add cases (extend existing file; do not replace shell smoke):

1. **Dialog centered** — open a lane/issue dialog; assert dialog
   `getBoundingClientRect()` center is within ~15% of viewport center on both
   axes (or `margin` computed as `auto` and not pinned at `top:0; left:0`).
2. **Grid tracks** — `?view=grid` at viewport width ≥ 1280; if ≥2 `.lane-card`
   exist, assert `getComputedStyle(gridHost).gridTemplateColumns` splits into
   ≥2 non-empty tracks.
3. **Kanban flex** — `#view-kanban .kanban` (or the flex container) has
   `display: flex`.
4. **Table width** — `?view=table`; `.table-wrap` `clientWidth` ≥ 90% of
   `#view-table` content width.

Run: `CI=1 pnpm test:e2e e2e/admin.spec.cjs`

---

## 8. Out of scope

- SpreadsheetTable / React table board
- Soft-deprecating `lane watch`
- Playground AffordanceShell / `/vcs` chrome
- New TML attributes
- Theme token invent

---

## Acceptance criteria

```text
test:pnpm check
test:test -f docs/specs/trellis-admin-visual-parity.md
test:grep -q trellis-admin-visual-parity_design.md docs/specs/trellis-admin-visual-parity.md
test:grep -q 'margin: auto' docs/specs/trellis-admin-visual-parity.md
test:grep -q 'auto-fill' docs/specs/trellis-admin-visual-parity.md
test:grep -q 'display: flex' docs/specs/trellis-admin-visual-parity.md
test:grep -q 'table-wrap' docs/specs/trellis-admin-visual-parity.md
```

**Impl verification (carry on impl issue):**

```text
test:CI=1 pnpm test:e2e e2e/admin.spec.cjs
```

Behavioral (manual / e2e): dialog centered; grid ≥2 tracks when wide; kanban
flex; table wrap full-bleed; table rows keyboard-activatable.
