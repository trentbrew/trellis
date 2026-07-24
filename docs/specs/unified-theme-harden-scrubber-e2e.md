# Spec: Harden unified theme — scrubber e2e + badge rgba

**Status:** Ready for impl  
**Date:** 2026-07-21  
**Proposal:** TRL-169  
**Parent chain:** TRL-167 (Phase C shipped)  
**No design gate** — test + helper harden only

---

## 1. Intent

Close two gaps left after Phase B/C review:

1. **Scrubber e2e** — client vantage detents (2 / 5 / 8) must be exercised in
   Playwright, not only unit/source review.
2. **Badge tint** — `client.html` appends `22` to CSS colors for drawer badges
   (`${ENTITY_COLORS[…]}22`). That breaks when `--entity-default` / text tokens
   resolve to `rgba(...)`.

Out of scope: fractal engine, dual-shell, new product surfaces, SvelteKit DX.

---

## 2. Deliverables

| Artifact | Path / note |
| -------- | ----------- |
| Color helper | `src/ui/theme/color-tint.ts` — `withAlpha(color, alpha01)` |
| Unit tests | `test/ui/color-tint.test.ts` (+ optional client grep for helper use) |
| `client.html` | Use withAlpha-equivalent for drawer type badges; stop raw `}22` append |
| Lanes route | `GET /client` in `lanes-dashboard.ts` serves `client.html` (e2e host) |
| E2E | `e2e/client-vantage.spec.cjs` — detent → `data-ui-vantage` + shell |
| Regression | Keep `e2e/tml-lanes.spec.cjs` green |

---

## 3. `withAlpha` contract

```ts
/** Return a CSS color with the given alpha in [0, 1]. Handles #rgb/#rrggbb and rgba()/rgb(). */
export function withAlpha(color: string, alpha01: number): string;
```

Normative cases (unit-test these):

| Input | alpha | Output shape |
| ----- | ----- | ------------ |
| `#edb2f1` | `0.13` | `rgba(237, 178, 241, 0.13)` (or equivalent) |
| `#00ceb9` | `0.13` | rgba form |
| `rgba(255, 255, 255, 0.618)` | `0.13` | `rgba(255, 255, 255, 0.13)` — **replace** alpha, do not concatenate |
| `rgb(1, 2, 3)` | `0.5` | `rgba(1, 2, 3, 0.5)` |
| empty / garbage | any | fallback transparent or input unchanged — pick one and test |

**client.html:** replace drawer badge style that uses `` `${color}22` `` with a
local `withAlpha(color, 0.13)` (or `Math.round(0x22/255)` ≈ 0.133) matching the
TS module algorithm. Comment: `// keep in sync with src/ui/theme/color-tint.ts`.

Do not require bundling the TS module into static HTML for this wedge.

---

## 4. Serve System Visualizer on lane watch (must)

`client.html` scrubber lives on the legacy UI server today; Playwright
`playwright.config.cjs` only boots **`trellis lane watch` on :3939**.

Extend `src/ui/lanes-dashboard.ts`:

```ts
if (path === '/client' || path === '/client.html') {
  // findUiAsset('client.html'); 200 text/html; 404 if missing
}
```

Theme route `/theme/runtime-theme.css` already exists. Graph API may 404 —
`client.html` boot already catches graph failure and still hides `#loading`;
vantage dock remains interactive. No need to stub `/api/graph` unless e2e
flakes (Executor may add empty JSON stub only if required).

---

## 5. E2E — `e2e/client-vantage.spec.cjs`

```text
PW_REUSE=1 pnpm test:e2e e2e/client-vantage.spec.cjs
```

Minimum cases:

1. `goto('/client')` — `#vantage-scrubber` visible; `#main` has
   `data-ui-vantage="8"`; `#ui-thing` has `data-trellis-shell="card"`.
2. Click **Node** detent → `#main[data-ui-vantage="2"]` and
   `#ui-thing[data-trellis-shell="node"]`.
3. Click **Row** → vantage `5`, shell `row`.
4. Click **Card** → vantage `8`, shell `card`.
5. **Should:** keyboard ←/→ from focused detent moves shell (roving tabindex).

Also run regression:

```text
PW_REUSE=1 pnpm test:e2e e2e/tml-lanes.spec.cjs
```

Or a single AC command that runs both files:

```text
PW_REUSE=1 pnpm test:e2e e2e/tml-lanes.spec.cjs e2e/client-vantage.spec.cjs
```

---

## 6. Tests (unit)

```text
pnpm exec vitest run test/ui/color-tint.test.ts test/ui/runtime-theme.test.ts
```

- `color-tint` cases above.
- Optional: `client.html` no longer contains the pattern `` }22` `` / `` }22; ``
  for entity badge backgrounds (grep assert in runtime-theme or color-tint
  suite).

---

## 7. Out of scope

- Dual-shell / full TRL-25 / `trellis/fractal` package extract
- Redesigning scrubber UX
- `lanes.html` vantage scrubber
- Forcing client.html to ESM-import `color-tint.ts`

---

## 8. File touch map

| File | Action |
| ---- | ------ |
| `src/ui/theme/color-tint.ts` | **create** |
| `test/ui/color-tint.test.ts` | **create** |
| `src/ui/client.html` | withAlpha for badges; sync comment |
| `src/ui/lanes-dashboard.ts` | `GET /client` |
| `e2e/client-vantage.spec.cjs` | **create** |
| `e2e/tml-lanes.spec.cjs` | keep green (no change required) |

---

## Acceptance criteria

```text
test:pnpm check
test:pnpm exec vitest run test/ui/color-tint.test.ts test/ui/runtime-theme.test.ts
test:PW_REUSE=1 pnpm test:e2e e2e/tml-lanes.spec.cjs e2e/client-vantage.spec.cjs
```

Behavioral:

- [ ] No `` `${color}22` `` (or equivalent hex-suffix) for entity drawer badges
- [ ] `/client` returns 200 HTML with vantage scrubber on lane watch
- [ ] Detent clicks update `data-ui-vantage` + `data-trellis-shell` as above
