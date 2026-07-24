# Spec: Unified theme contract — Phase B

**Status:** Ready for impl  
**Date:** 2026-07-21  
**Proposal:** TRL-159  
**Design:** TRL-160 —
[`unified-theme-contract-phase-b_design.md`](../artifacts/unified-theme-contract-phase-b_design.md) ·
[`unified-theme-contract-phase-b_mockup.html`](../artifacts/unified-theme-contract-phase-b_mockup.html)  
**Prior:** Phase A —
[`unified-theme-contract.md`](./unified-theme-contract.md) (shipped)

---

## 1. Intent

Phase A extracted `runtime-theme.css` for `lanes.html` / `tml-lanes.html` while
**preserving purple-runtime pixels**. Phase B:

1. **Migrates** `client.html` (System Visualizer via `trellis ui --legacy`) onto
   the shared contract.
2. **Aligns** contract values to Studio dark (intentional pixel shift on all
   three surfaces).
3. **Activates** inset substrate (`--surface-1/2/3`), glass, entity, and
   re-derived badge tokens.

Tone stays L3 operator chrome. **Fractal vantage remains Phase C (TRL-25).**
Inset ≠ fractal.

---

## 2. Deliverables

| Artifact | Path / note |
| -------- | ----------- |
| Theme CSS (Studio values + inset + glass + entity + badges) | `src/ui/theme/runtime-theme.css` |
| Shared resolver | Extract `resolveRuntimeThemeCss(rootPath)` for both servers (new module under `src/ui/theme/` or `src/ui/`) |
| Legacy UI theme route | `GET /theme/runtime-theme.css` in `src/ui/server.ts` |
| Lanes dashboard | Use shared resolver (replace local copy in `lanes-dashboard.ts`) |
| Migrated visualizer | `src/ui/client.html` |
| Font cleanup | Remove Google Fonts from `client.html` **and** `lanes.html` (system stacks in contract) |
| Unit tests | Extend `test/ui/runtime-theme.test.ts`; optional handler unit for legacy theme route |
| E2E | Keep `e2e/tml-lanes.spec.cjs` green after value shift |
| Docs | `BRAND.md` Phase B fonts/values note; pointer from Phase A spec |

---

## 3. `runtime-theme.css` contract (Phase B values)

### 3.1 Studio dark semantics (normative)

Replace Phase A purple-runtime hex with design YAML values:

| Token | Phase B value |
| ----- | ------------- |
| `--background-base` | `#101010` |
| `--background-weak` | `#1e1e1e` |
| `--surface-raised-base` | `#1c1c1c` |
| `--surface-inset-base` | `#161616` (**opaque**) |
| `--surface-inset-alpha` | `rgba(0, 0, 0, 0.5)` (new; **not** aliased to `--surface2`) |
| `--border-base` | `rgba(255, 255, 255, 0.195)` |
| `--border-strong` | `rgba(255, 255, 255, 0.266)` |
| `--text-strong` | `rgba(255, 255, 255, 0.936)` |
| `--text-base` | `rgba(255, 255, 255, 0.618)` |
| `--text-weak` | `rgba(255, 255, 255, 0.422)` |
| `--text-interactive-base` | `#9dbefe` |
| `--surface-brand-base` | `#fab283` |
| `--surface-success-strong` | `#12c905` |
| `--surface-warning-strong` | `#fcd53a` |
| `--surface-critical-strong` | `#fc533a` |
| `--surface-info-strong` | `#edb2f1` |

### 3.2 Inset ladder (activate; was comment-only in Phase A)

```css
--background: var(--background-base);
--card: var(--surface-raised-base);
--surface-1: color-mix(in oklch, var(--card) 25%, var(--background));
--surface-2: color-mix(in oklch, var(--card) 50%, var(--background));
--surface-3: var(--card);
```

**Legacy safety:** keep `--surface2: var(--surface-inset-base)` on opaque
`#161616`. Do **not** point `--surface2` at `--surface-inset-alpha`.

### 3.3 Glass

```css
--tml-glass-surface: rgba(22, 22, 22, 0.75);
--tml-glass-border: rgba(255, 255, 255, 0.04);
--glass: var(--tml-glass-surface);
--glass-border: var(--tml-glass-border);
```

### 3.4 Badges + accent glow (re-derive via color-mix)

All `--tml-badge-*` and `--tml-accent-glow` must use `color-mix` from Phase B
status / interactive tokens (no leftover Tailwind purple/green rgba literals).
Match design § Badge tokens (success/warning/critical/info/neutral mixes +
accent glow at 12%).

### 3.5 Entity tokens

| Token | Value |
| ----- | ----- |
| `--entity-file` | `#00ceb9` |
| `--entity-milestone` | `#2090f5` |
| `--entity-issue` | `#edb2f1` |
| `--entity-branch` | `#fcd53a` |
| `--entity-default` | `var(--text-base)` |

Do not overload `--surface-info-strong` for both issues and milestones.

### 3.6 Fonts (system stacks — locked)

```css
--font-family-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
--font-family-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
--font-family-header: var(--font-family-sans);
```

Remove all `fonts.googleapis.com` / `fonts.gstatic.com` `<link>` / preconnect
from `client.html` and `lanes.html`.

### 3.7 Legacy + client aliases

Keep Phase A legacy aliases (`--bg`, `--surface`, `--surface2`, `--accent`,
`--font`, `--mono`, status shortcuts, etc.).

Add client-facing aliases in the contract (or page CSS that only references
contract vars):

```css
--bg2: var(--background-weak);
--border2: var(--border-strong);
--accent2: color-mix(in oklch, var(--text-interactive-base) 85%, white);
--accent-glow: var(--tml-accent-glow);
```

Page-local only (stay in `client.html` `<style>`): `--nav-w`, `--top-h`.

### 3.8 Radius

Client page aliases `--radius` / `--radius-lg` → contract `--radius-md` (8px) /
`--radius-lg` (10px). Full BRAND 6/8 remap out of scope.

### 3.9 Fractal comments

Keep Phase C hook comments (`--ui-vantage`, dual-shell). Do **not** implement
fractal behavior. Update Phase B comment block so inset tokens are live
declarations, not “future only.”

---

## 4. Shared theme resolver + servers

### 4.1 Shared helper (must)

Extract today’s `resolveRuntimeThemeCss(rootPath)` from `lanes-dashboard.ts`
into a shared module (e.g. `src/ui/theme/resolve-runtime-theme-css.ts`) that:

1. Prefers `{rootPath}/src/ui/theme/runtime-theme.css`
2. Then `{rootPath}/dist/ui/theme/runtime-theme.css`
3. Then existing `findUiAsset`-style candidates relative to module / cwd

Both `lanes-dashboard.ts` and `server.ts` **must** import this helper (no
divergent path logic).

### 4.2 `server.ts` route (must)

In `startUIServer` `fetchHandler`, before the 404:

```ts
if (path === '/theme/runtime-theme.css') {
  // resolve via shared helper; 200 text/css; Cache-Control: no-cache
  // 404 body if missing
}
```

`client.html` is served only by this server — without this route the visualizer
migration is dead on arrival.

### 4.3 Build copy

Ensure `package.json` build already copies `runtime-theme.css` into `dist/ui/`
(Phase A). No new package extract (`trellis/theme` npm) in this wedge.

---

## 5. `client.html` migration

1. Add `<link rel="stylesheet" href="/theme/runtime-theme.css">` before page
   `<style>`.
2. Remove inline `:root { … }` token block entirely.
3. Set `<html … data-trellis-band="L3">`.
4. Strip Google Fonts links/preconnect.
5. Map chrome to tokens: `#topbar` / `#drawer` → glass; tabs active →
   interactive + `--tml-accent-glow`; cmd box → `--surface-3`; borders/text via
   legacy or semantic aliases.
6. **Zero purple islands:** no remaining `#6d5bfa`, `#8b7cf6`, or
   `rgba(109,91,250,…)` (or equivalent) in `client.html`.
7. **Entity colors:** replace hardcoded `ENTITY_COLORS` hex map with values read
   from `getComputedStyle(document.documentElement)` for `--entity-*`. Helper
   may cache once after theme load.
8. Timeline `KIND_COLORS` (and similar): entity-typed entries must use
   `--entity-*`; non-entity kind tints may use status tokens
   (`--surface-info-strong`, etc.) or page-local non-purple constants — document
   in a one-line comment if page-local.
9. Prefer CSS `var(--font)` / `var(--mono)` over hardcoded `'Inter'` in D3 text
   attrs where cheap.

### Behavioral UX (encode even if mock is static)

- **Cmd palette:** focus moves to input on open; restore focus on close; Escape
  closes. Prefer a lightweight focus trap while open (tab cycles within
  `#cmd-box` / overlay).
- **Drawer / live-dot:** under `prefers-reduced-motion: reduce`, disable live-dot
  pulse and use instant (or near-instant) drawer / cmd transitions.

---

## 6. Lanes / TML surfaces

- Consume Studio value shift via shared CSS (no separate purple fork).
- Remove Google Fonts from `lanes.html`.
- Keep class names / layout dimensions; expect accent/status color change.
- E2E theme link + CSS route assertions remain required.

---

## 7. Tests

### 7.1 Unit — extend `test/ui/runtime-theme.test.ts`

Assert presence of:

- Phase B values: `--text-interactive-base: #9dbefe` (or contains `#9dbefe`)
- `--surface-inset-base` / `#161616`
- `--surface-inset-alpha`
- `--surface-1:` / `--surface-2:` / `--surface-3:`
- `--tml-glass-surface`
- `--entity-file` (and preferably other `--entity-*`)
- Badge / glow use `color-mix` (at least `--tml-badge-success-bg` and
  `--tml-accent-glow` contain `color-mix`)
- System font stacks (no `Inter` / `JetBrains` as primary family names in
  `--font-family-sans` / `--font-family-mono`)

Optional: unit test that exercises shared resolver + a minimal Response for the
legacy `/theme/runtime-theme.css` path (or static grep that `server.ts` handles
the path). Prefer a real handler/resolver test if cheap.

Run: `pnpm test test/ui/runtime-theme.test.ts`

### 7.2 E2E — `e2e/tml-lanes.spec.cjs`

Keep green after Studio value shift:

- `GET /theme/runtime-theme.css` → 200 `text/css`
- page links `/theme/runtime-theme.css`
- existing kanban parity guards (column min-width, `.issue-card` visibility)

Run: `PW_REUSE=1 pnpm test:e2e e2e/tml-lanes.spec.cjs`

### 7.3 Typecheck

Run: `pnpm check`

### 7.4 Behavioral (review / PR)

- [ ] `client.html` has no `:root` token block; links theme; `data-trellis-band="L3"`
- [ ] `rg '#6d5bfa|109,\s*91,\s*250' src/ui/client.html` empty
- [ ] No `fonts.googleapis.com` in `client.html` / `lanes.html`
- [ ] `ENTITY_COLORS` (or successor) reads CSS vars — no hardcoded entity hex map
- [ ] `server.ts` serves theme CSS; `trellis ui --legacy` loads without missing stylesheet
- [ ] Cmd focus + reduced-motion drawer/live-dot per §5
- [ ] No fractal / `--ui-vantage` runtime wiring

---

## 8. Out of scope

- `trellis/theme` npm package extract
- Berkley Mono bundling
- Fractal / TRL-25 / dual-shell / `--ui-vantage` consumption
- Full BRAND radius remap (6/8)
- Redesign of graph layout / D3 physics beyond color + font token wiring
- Changing `client.html` out of legacy UI path

---

## 9. File touch map

| File | Action |
| ---- | ------ |
| `src/ui/theme/runtime-theme.css` | Studio values; inset; glass; entity; re-derived badges; system fonts |
| `src/ui/theme/resolve-runtime-theme-css.ts` (or equiv.) | **create** shared resolver |
| `src/ui/lanes-dashboard.ts` | import shared resolver |
| `src/ui/server.ts` | serve `GET /theme/runtime-theme.css` via shared resolver |
| `src/ui/client.html` | migrate to contract; entity JS; fonts; purple purge |
| `src/ui/lanes.html` | remove Google Fonts |
| `src/ui/tml-lanes.html` | verify link only (already on contract) |
| `test/ui/runtime-theme.test.ts` | Phase B assertions (+ optional resolver/server) |
| `e2e/tml-lanes.spec.cjs` | keep green |
| `BRAND.md` | Phase B fonts/values note |
| `docs/specs/unified-theme-contract.md` | short “Phase B shipped in …” pointer (optional) |

---

## Acceptance criteria

```text
test:pnpm check
test:pnpm test test/ui/runtime-theme.test.ts
test:PW_REUSE=1 pnpm test:e2e e2e/tml-lanes.spec.cjs
```

Behavioral criteria are listed in §7.4 and must be verifiable in PR review
within ~60s each (rg / view-source / one legacy UI load).
