# Spec: Unified theme contract — Phase C

**Status:** Ready for impl  
**Date:** 2026-07-21  
**Proposal:** TRL-164  
**Design:** TRL-165 —
[`unified-theme-contract-phase-c_design.md`](../artifacts/unified-theme-contract-phase-c_design.md) ·
[`unified-theme-contract-phase-c_mockup.html`](../artifacts/unified-theme-contract-phase-c_mockup.html)  
**Prior:** Phase B —
[`unified-theme-contract-phase-b.md`](./unified-theme-contract-phase-b.md) (shipped)

---

## 1. Intent

Phase B shipped Studio dark values, inset substrate, and glass on L3 runtime
surfaces while leaving fractal hooks **comment-only**. Phase C **activates**
those hooks on L3 operator chrome only:

1. Live **`--ui-vantage`** (default **8** / card detent).
2. Focal **`data-ui-vantage="{n}"`**.
3. **One** morphing widget with **`data-trellis-shell="node|row|card"`** that
   **snaps** at detents **2 / 5 / 8**.
4. Dual-shell crossfade remains **prep / out of scope** (TRL-25).

Inset (`--surface-1/2/3`) stays containment depth — **not** shell names.
Deck present/edit stays `data-deck-mode`. Context-pack CLI vantage
(`boot|edit|review`) is orthogonal.

---

## 2. Deliverables

| Artifact | Path / note |
| -------- | ----------- |
| Theme CSS | Live `--ui-vantage: 8` in `src/ui/theme/runtime-theme.css`; demo alias comment |
| Shell CSS | Attr selectors for `[data-trellis-shell="node|row|card"]` (disclosure rules) |
| Visualizer | `src/ui/client.html` — scrubber + one morph host |
| Kanban specimen | `src/ui/tml-lanes.html` — static `.issue-card` with `data-trellis-shell="card"` |
| Unit tests | Flip Phase C test; add live `--ui-vantage` + shell selector assertions |
| E2E | Extend `e2e/tml-lanes.spec.cjs` and/or add client vantage smoke |
| Docs | Pointer from Phase B spec; optional BRAND note |

---

## 3. Naming (locked)

| Role | Canonical | Non-canonical (demo) |
| ---- | --------- | -------------------- |
| Scalar | `--ui-vantage` | `--vantage` |
| Focal attr | `data-ui-vantage` | `data-trellis-vantage` |
| Shell attr | `data-trellis-shell` | same |

Add a one-line comment in CSS mapping demo `--vantage` → `--ui-vantage`.
Mock-only helpers (`data-v`, `data-shell` on scrubber buttons) are **not**
contract tokens.

---

## 4. `runtime-theme.css`

### 4.1 Live scalar (must)

Inside `:root` (not comment-only):

```css
--ui-vantage: 8; /* default card detent; range 0–21; L3 UI uses 2|5|8 */
```

Replace / shrink the old “Phase C hooks — not consumed” comment block. Keep a
short note that dual-shell crossfade and full 21-level territories are TRL-25.

### 4.2 Shell disclosure (must)

Provide CSS that styles morphing widgets by shell attr. Normative appearance
(from design):

| Shell | Layout |
| ----- | ------ |
| `node` | ~28–36px disc/chip; pip only; hide title/body/badge |
| `row` | bar; title + one-line meta; hide body/badge |
| `card` | raised panel `--radius-lg` / ~14px pad; title + badge + meta + body |

Prefer attr selectors on a shared class (e.g. `.ui-thing[data-trellis-shell="…"]`)
defined in page CSS **or** minimal shared rules in the theme file if reused by
client + tml-lanes. Glass chrome rules must **not** depend on `--ui-vantage`.

Optional: `clamp()` / opacity on meta cribbed from
`demo/realtime-app/.../Thing.svelte` — **no** dual-shell layers.

### 4.3 Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  /* morph host: transition: none — instant shell snap */
}
```

---

## 5. `client.html` (primary)

1. Focal container (e.g. `#main` or a stage wrapper): `data-ui-vantage="8"`;
   sync `document.documentElement.style.setProperty('--ui-vantage', …)` (or
   rely on `:root` default + update both on change).
2. **One** morphing entity with `data-trellis-shell` that snaps — not three
   concurrent shells.
3. **Vantage scrubber** (drawer or stage chrome):
   - `role="radiogroup"` `aria-label="UI vantage"`
   - three radios: Node(2) / Row(5) / Card(8)
   - **Roving tabindex:** only checked has `tabindex="0"`, others `-1`
   - ←/→ (and ↑/↓) move check **and** focus
   - Territory label with `aria-live="polite"`
4. Glass `#topbar` / `#drawer` remain outside morph host (invariant).
5. Do **not** implement interactive dual-shell prep panel.

Detent map:

| Detent | `--ui-vantage` | Shell | Label |
| ------ | -------------- | ----- | ----- |
| Node | 2 | `node` | Labeled node |
| Row | 5 | `row` | Row |
| Card | 8 | `card` | Kanban card (default) |

---

## 6. `tml-lanes.html` (secondary)

Add `data-trellis-shell="card"` to `.issue-card` elements (static anatomy
reference). **Not** scrubber-driven. Keep existing kanban layout/parity.

`lanes.html` full-page vantage is **out of scope** unless a one-line attr is
trivial; do not build a second scrubber there.

---

## 7. Tests

### 7.1 Unit — `test/ui/runtime-theme.test.ts`

**Flip** the Phase B test that asserts `--ui-vantage` is comment-only:

- After strip of `/* */` comments, **require** live `--ui-vantage:` (value `8`
  preferred).
- Assert CSS contains `[data-trellis-shell=` or documented shell class rules
  (if shell CSS lives in theme file); if shell CSS is page-local only, assert
  in a client/tml HTML unit read instead.

Add Phase C describe block:

- `client.html` contains `data-ui-vantage`, scrubber radiogroup / detent controls,
  and a single morph host pattern (`data-trellis-shell`).
- `tml-lanes.html` `.issue-card` includes `data-trellis-shell="card"`.

Run: `pnpm exec vitest run test/ui/runtime-theme.test.ts`

### 7.2 E2E

Keep `e2e/tml-lanes.spec.cjs` green (theme route + kanban parity).

Add assertions (same file or small sibling):

- `/tml-lanes` issue cards expose `data-trellis-shell="card"`, **or**
- If client e2e is cheap via legacy UI: scrubber changes `data-ui-vantage` /
  shell attr.

Minimum for `needs-e2e`: theme contract still loads + at least one Phase C DOM
attr assertion on `/tml-lanes`.

Run: `PW_REUSE=1 pnpm test:e2e e2e/tml-lanes.spec.cjs`

### 7.3 Typecheck

Run: `pnpm check`

### 7.4 Behavioral (review)

- [ ] Default `--ui-vantage` is `8`; detents set 2/5/8 + matching shell
- [ ] One live shell only; radiogroup roving tabindex works
- [ ] `prefers-reduced-motion`: no morph transition
- [ ] No dual-shell crossfade; no context-pack / deck-mode coupling
- [ ] Inset ladder unchanged and not aliased to shell names

---

## 8. Out of scope

- Dual-shell crossfade / opacity handoff layers
- Full 0–21 territory table + Studio fractal engine
- Band ACL (L1/L2 hide chrome)
- Porting `demo/realtime-app` fractal Svelte wedge into kernel UI
- `lanes.html` full vantage scrubber
- Context-pack `boot|edit|review` changes

---

## 9. File touch map

| File | Action |
| ---- | ------ |
| `src/ui/theme/runtime-theme.css` | Live `--ui-vantage: 8`; alias comment; optional shell rules |
| `src/ui/client.html` | Focal attr, scrubber, one morph host, JS detent map |
| `src/ui/tml-lanes.html` | `data-trellis-shell="card"` on `.issue-card` |
| `test/ui/runtime-theme.test.ts` | Flip Phase C comment-only test; add Phase C asserts |
| `e2e/tml-lanes.spec.cjs` | Phase C attr / parity extension |
| `docs/specs/unified-theme-contract-phase-b.md` | Pointer to Phase C (optional) |

---

## Acceptance criteria

```text
test:pnpm check
test:pnpm exec vitest run test/ui/runtime-theme.test.ts
test:PW_REUSE=1 pnpm test:e2e e2e/tml-lanes.spec.cjs
```

Behavioral criteria in §7.4 must be verifiable in PR review within ~60s each.
