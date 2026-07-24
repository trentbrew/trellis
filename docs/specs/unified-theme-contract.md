# Spec: Unified theme contract — runtime surfaces (Phase A)

**Status:** Ready for impl\
**Date:** 2026-07-17\
**Proposal:** TRL-156 —
[`unified-theme-contract-proposal.md`](./unified-theme-contract-proposal.md)\
**Informed by:** `BRAND.md`, ADR 0011, `tml-v0.1-kanban.md`, trellis-client
`INSET_SURFACES.md`\
**Package path (Phase B):** `trellis/theme` (extract from client
`packages/trellis-theme`; not `@turtle.tech/*`)

---

## 1. Intent

Kernel runtime HTML surfaces (`lanes.html`, `tml-lanes.html`) each ship
duplicate inline `:root` token blocks. This wedge extracts a **shared theme
contract** so both pages consume one CSS file with Studio-aligned semantic names
and legacy aliases. **Phase A changes source and names only, not pixels** (TML
v0.1 Kanban parity).

Per TRL-156 proposal: **inset surfaces** (`--surface-1/2/3` derived from
card+background) and **`trellis/theme` apply** land in **Phase B**; **fractal
`data-ui-vantage`** lands in **Phase C** (TRL-25). Phase A documents hook
comments only.

`client.html` and oklch value convergence are **Phase B**. Do not conflate inset
substrate with fractal vantage.

---

## 2. Deliverables (Phase A)

| Artifact           | Path                                                      |
| ------------------ | --------------------------------------------------------- |
| Theme contract CSS | `src/ui/theme/runtime-theme.css`                          |
| Static route       | `GET /theme/runtime-theme.css` via `lanes-dashboard.ts`   |
| Migrated pages     | `src/ui/lanes.html`, `src/ui/tml-lanes.html`              |
| Unit tests         | `test/ui/runtime-theme.test.ts`                           |
| E2E extension      | `e2e/tml-lanes.spec.cjs` (theme link + CSS route)         |
| Docs               | `BRAND.md` surface row; `tml-v0.1-kanban.md` selector fix |

---

## 3. `runtime-theme.css` contract

Single file under `src/ui/theme/runtime-theme.css`. Structure:

1. **Semantic tokens** — Studio-aligned names (`--background-base`,
   `--surface-raised-base`, `--text-interactive-base`, status colors, radii,
   spacing, font families). Phase A values match current `tml-lanes.html` inline
   `:root` (purple accent `#6d5bfa`).
2. **Legacy aliases** — backward-compat shorthands used by existing page CSS:

```css
--bg: var(--background-base);
--surface: var(--surface-raised-base);
--surface2: var(--surface-inset-base);
--border: var(--border-base);
--text: var(--text-strong);
--text2: var(--text-base);
--text3: var(--text-weak);
--accent: var(--text-interactive-base);
--green: var(--surface-success-strong);
--yellow: var(--surface-warning-strong);
--red: var(--surface-critical-strong);
--blue: var(--surface-info-strong);
--font: var(--font-family-sans);
--mono: var(--font-family-mono);
```

3. **Component tokens** — `--tml-badge-*`, `--tml-accent-glow`,
   `--tml-kanban-body-inset` (extract from current `tml-lanes.html` badge
   `rgba()` tints).

**Phase A values** preserve current runtime pixels (purple accent `#6d5bfa`, not
Studio blue).

**Fonts:** Phase A retains Inter + JetBrains Mono values in `--font-family-sans`
/ `--font-family-mono`. Do **not** remove Google Fonts `<link>` tags from HTML
in this wedge.

---

## 4. Server route

Extend `fetchHandler` in `src/ui/lanes-dashboard.ts`:

```ts
if (path === "/theme/runtime-theme.css") {
  const cssPath = findUiAsset(join("theme", "runtime-theme.css"));
  // 404 if missing; Content-Type: text/css; Cache-Control: no-cache
}
```

`findUiAsset` must resolve `src/ui/theme/runtime-theme.css` (add
`join(moduleDir, 'theme', name)` candidate if needed, or pass full relative
path).

---

## 5. HTML migration

### 5.1 Both `lanes.html` and `tml-lanes.html`

1. Add `<link rel="stylesheet" href="/theme/runtime-theme.css">` in `<head>`
   (before page-specific `<style>`).
2. Remove the inline `:root { … }` block entirely.
3. Set `<html lang="en" data-trellis-band="L3">`.
4. Keep page-specific layout/component rules in `<style>` but replace hardcoded
   badge `rgba()` tints with `--tml-badge-*` tokens where those rules exist in
   both files.
5. **Do not** change class names, dimensions, or font `<link>` tags.

### 5.2 Selector contract

| Selector      | Surface        | Notes                                 |
| ------------- | -------------- | ------------------------------------- |
| `.issue-card` | Kanban         | Canonical; 10px radius, 14px padding  |
| `.card`       | Lane grid only | 12px radius, 16px padding; not Kanban |
| `.kanban-col` | Kanban columns | min-width 300px, max-width 340px      |

### 5.3 `tml-v0.1-kanban.md` sync

Update §3.2 markup example: replace `<article class="card">` / `.card-head` /
`.card-foot` with `.issue-card` / `.issue-card-head` / `.issue-meta` to match
landed `tml-lanes.html` and e2e selectors.

### 5.4 `BRAND.md`

Add row under **Surfaces today**:

| **Kernel runtime** (`trellis-node/src/ui/`) | `src/ui/theme/runtime-theme.css`
(semantic + legacy aliases) | Inter + JetBrains (Phase A) | **Converging** —
Phase B aligns values to Studio |

Link to this spec in **References**.

---

## 6. Fractal extension points (Phase C — document only)

Add comment block at bottom of `runtime-theme.css`:

```css
/* Phase B (inset substrate — trellis-client pattern):
   --surface-1: color-mix(in oklch, var(--card) 25%, var(--background));
   --surface-2: color-mix(in oklch, var(--card) 50%, var(--background));
   --surface-3: var(--card);

   Phase C hooks (fractal — TRL-25, not consumed in Phase A):
   --ui-vantage: 0;                  // 0–21 scalar; NOT deck present/edit mode
   html[data-trellis-band="L1|L2|L3"]
   [data-ui-vantage] [data-trellis-shell="node|row|card"]
*/
```

No runtime behavior change in Phase A.

---

## 7. Tests

### 7.1 Unit — `test/ui/runtime-theme.test.ts`

- File exists at `src/ui/theme/runtime-theme.css`.
- Contains all legacy alias declarations (`--bg`, `--font`, `--mono`, etc.).
- Contains semantic tokens `--background-base`, `--text-interactive-base`.
- Contains component tokens `--tml-badge-success-bg`, `--tml-kanban-body-inset`.

Run: `pnpm test test/ui/runtime-theme.test.ts`

### 7.2 E2E — extend `e2e/tml-lanes.spec.cjs`

Add test:

- `GET /theme/runtime-theme.css` returns 200 with `text/css`.
- `/tml-lanes` page has `<link href="/theme/runtime-theme.css">`.
- `.kanban-col` computed `min-width` is `300px` (parity guard).
- `.issue-card` visible after load (existing test covers visibility; keep
  green).

Run: `PW_REUSE=1 pnpm test:e2e e2e/tml-lanes.spec.cjs`

### 7.3 Regression guard

Before migration, capture baseline computed styles for `.issue-card`,
`.lane-badge`, `.priority-badge.high` on `/tml-lanes` (optional snapshot in unit
test via jsdom, or document manual check). After migration, values must match
within rounding tolerance. Executor may use a lightweight Playwright `evaluate`
in e2e comparing `getComputedStyle` for `border-radius`, `padding`,
`font-family` on `.issue-card`.

---

## 8. Out of scope (this wedge)

- `client.html` migration (Phase B)
- Removing Google Fonts / Studio blue accent (Phase B)
- Berkley Mono bundling
- `src/plugins/brand/` graph token sync
- `--vantage` / dual-shell implementation (Phase C)
- Visual redesign or accent color change

---

## 9. File touch map

| File                             | Action                                          |
| -------------------------------- | ----------------------------------------------- |
| `src/ui/theme/runtime-theme.css` | **create**                                      |
| `src/ui/lanes-dashboard.ts`      | serve `/theme/runtime-theme.css`                |
| `src/ui/lanes.html`              | link theme; remove `:root`; `data-trellis-band` |
| `src/ui/tml-lanes.html`          | same                                            |
| `test/ui/runtime-theme.test.ts`  | **create**                                      |
| `e2e/tml-lanes.spec.cjs`         | theme route + link AC                           |
| `docs/specs/tml-v0.1-kanban.md`  | selector sync                                   |
| `BRAND.md`                       | surface row + reference                         |

---

## Acceptance criteria

```text
test:pnpm check
test:pnpm test test/ui/runtime-theme.test.ts
test:PW_REUSE=1 pnpm test:e2e e2e/tml-lanes.spec.cjs
```

Behavioral (verify in PR / review):

- [ ] `src/ui/theme/runtime-theme.css` exists with semantic + legacy + component
      tokens per §3
- [ ] `lanes.html` and `tml-lanes.html` have no inline `:root` block
- [ ] Both pages `<link>` `/theme/runtime-theme.css` and set
      `data-trellis-band="L3"`
- [ ] `/theme/runtime-theme.css` served with `text/css` from lanes dashboard
- [ ] Kanban visual parity preserved (`.issue-card` radius 10px, column
      min-width 300px)
- [ ] Google Fonts links unchanged in Phase A
- [ ] `BRAND.md` and `tml-v0.1-kanban.md` updated per §5.3–5.4
- [ ] Phase C hook comment present in CSS; no fractal runtime behavior added

---

**Phase B:** See [`unified-theme-contract-phase-b.md`](./unified-theme-contract-phase-b.md)
(`client.html` migration, Studio dark values, inset/glass/entity).
