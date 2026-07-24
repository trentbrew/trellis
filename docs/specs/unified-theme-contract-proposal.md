# Proposal: Unified theme contract for runtime surfaces

**Status:** Proposal (TRL-156)\
**Date:** 2026-07-17\
**Issue:** TRL-156\
**Follow-on spec:** [`unified-theme-contract.md`](./unified-theme-contract.md)
(Phase A wedge)\
**Related:** ADR 0011, TRL-25 (fractal shell), TRL-38 (L3 operator inset),
`BRAND.md`, [`trellis-client`](../../../Packages/trellis-client)
`INSET_SURFACES.md`

---

## 1. Problem

Trellis UI theming is split across four disconnected layers:

| Layer                    | Where it lives                                             | What it governs                                                        | Gap                                                                |
| ------------------------ | ---------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Brand ontology**       | `src/plugins/brand/ontology.ts`                            | `BrandGuide` + `DesignToken` for json-render / AI catalog governance   | Not exported; not wired to any runtime surface                     |
| **Studio CSS**           | `turtlecode/ide/.../theme.css`                             | Semantic tokens (`--background-base`, `--text-weak`, …)                | Documented in `BRAND.md` as canonical; not consumed by kernel HTML |
| **Client product theme** | `trellis-client` `packages/trellis-theme` + `tailwind.css` | oklch primitives, presets, derived `--surface-*`, `applyThemeStyles()` | Shipped in product; not linked from `trellis-node`                 |
| **Kernel runtime HTML**  | `src/ui/lanes.html`, `tml-lanes.html`                      | Ad-hoc inline `:root` (purple accent, Inter/JetBrains)                 | Duplicated; diverges from Studio and client                        |

ADR 0011 defines **shell bands** (L1/L2/L3), **fractal vantage**, and **lane**
as orthogonal axes — but trellis-node has no shared chromatic substrate or token
apply path. `demo/realtime-app` has a partial port (`page-variants.ts`, stub
`band.ts`) without theme linkage.

**Result:** every new surface invents its own CSS dialect. TML sterile HTML
cannot inherit product theme work. TRL-25 cannot land shell slots on a stable
substrate.

---

## 2. What trellis-client teaches us

The product repo (`Packages/trellis-client`) has already solved the hardest
parts. Steal the **contracts**, not the Nuxt/Tailwind stack.

### 2.1 Substrate ≠ fractal (do not merge depth axes)

From `trellis-client/docs/architecture/INSET_SURFACES.md`:

| Axis                | Question                                 | Mechanism                                           | Status in client                                  |
| ------------------- | ---------------------------------------- | --------------------------------------------------- | ------------------------------------------------- |
| **Inset surfaces**  | Where am I in the container?             | `--surface-1/2/3` via `color-mix(card, background)` | **Shipped**                                       |
| **Fractal vantage** | How much of this projection is revealed? | continuous `--vantage`, dual-shell crossfade        | **North star** (not shipped as continuous system) |

**Rule:** sticky chrome and scroll surfaces use opaque `surface-*`. Do not fake
depth with `bg-card/50` + `backdrop-blur`. Fractal morph is TRL-25 — not a theme
workaround.

### 2.2 Framework-agnostic theme engine exists

`packages/trellis-theme` (today published as `@turtle.tech/trellis-theme` in
client — **rename target: `trellis/theme`** per npm namespace policy):

- `THEME_STYLE_KEYS` — closed set of CSS custom property names
- `ThemeStyleProps` / `ThemePreset` — typed light + dark token maps
- `applyThemeStyles()` / `applyActiveTheme()` — writes `--*` to
  `documentElement`, toggles `.dark`
- Default preset `graphite` byte-synced with `:root` CSS

Zero Vue dependency. Works on sterile HTML and TML surfaces.

### 2.3 Derived surfaces reduce preset surface area

```css
--surface-1: color-mix(in oklch, var(--card) 25%, var(--background));
--surface-2: color-mix(in oklch, var(--card) 50%, var(--background));
--surface-3: var(--card);
```

Presets only override `--card` and `--background`; depth steps recompute. No
per-preset surface tokens in graph.

### 2.4 Runtime binding is a preset pointer, not Theme entities

Client binds theme via `brandConfig.theme.presetId` on a per-app **settings
blob** — not a graph `Theme` type. Preset dictionaries live in code
(`theme-presets.ts`).

### 2.5 Page variants are layout chrome, not color

`Page.vue` `VARIANT_CONFIGS` (`canvas`, `browse`, `prose`, …) governs
header/tabs/padding — same family as explorer `page-variants.ts`. Orthogonal to
tokens and ADR bands.

### 2.6 Naming collisions to resolve in v0

| Term      | Client meaning                                      | trellis-node meaning today                                           |
| --------- | --------------------------------------------------- | -------------------------------------------------------------------- |
| `vantage` | Deck editor↔present crossfade (`data-deck-vantage`) | Fractal reveal depth **and** context-pack CLI (`boot\|edit\|review`) |
| `surface` | Chromatic inset ladder (`surface-1/2/3`)            | Ad-hoc `--surface` in `tml-lanes.html`                               |
| `brand`   | Live `useBrandConfig` (preset id)                   | `BrandGuide` plugin (AI catalogs)                                    |

**Recommend:** prefix disambiguation in new contracts — `data-trellis-band`,
`data-ui-vantage` (fractal), `data-deck-mode` (present/edit), `ax-vantage`
(context pack CLI).

---

## 3. Recommendation

### 3.1 Do not extend `DesignToken` for runtime theming in v0

Keep `src/plugins/brand/` scoped to **AI / json-render governance**
(`complianceMode`, voice rules, catalog enum constraints).

Runtime surfaces get:

1. **Closed CSS key set** (`THEME_STYLE_KEYS` or Studio semantic superset +
   alias map)
2. **Presets in code** (graphite default; workspace may store `presetId` string
   later)
3. **Derived `--surface-1/2/3`** on top of `--background` + `--card` (client
   pattern)

Introduce graph `Theme` / `SurfaceToken` entities only if a later wedge needs
operator-authored palettes with audit trail — not for Phase A.

### 3.2 Adopt a three-package mental model (names under `trellis/*`)

| Package                    | Role                                                | Source                                              |
| -------------------------- | --------------------------------------------------- | --------------------------------------------------- |
| `trellis/theme`            | resolve + apply presets to DOM (framework-agnostic) | Extract/rename from client `packages/trellis-theme` |
| `trellis-node` runtime CSS | static fallback + legacy aliases for sterile HTML   | `src/ui/theme/runtime-theme.css`                    |
| Studio `theme.css`         | long-term semantic canonical for Studio shell       | Convergence target Phase B+                         |

**Namespace:** use `trellis/theme`, not `@turtle.tech/*`. Client repo can alias
during migration.

### 3.3 Minimum contract surfaces (v0)

| Surface          | Contract element                                                                                              | Phase                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| **CSS vars**     | Primitives (`background`, `card`, `foreground`, …) + derived `surface-1/2/3` + legacy aliases for kernel HTML | A                                |
| **Band**         | `html[data-trellis-band="L1\|L2\|L3"]` — chrome depth gate per ADR 0011                                       | A (attribute only)               |
| **Inset**        | `bg-surface-*` / `var(--surface-*)` for structural chrome; no `card/50` hacks                                 | B (values align to client oklch) |
| **Vantage**      | `data-ui-vantage`, `--ui-vantage` scalar, shell slot hooks                                                    | C (TRL-25)                       |
| **TML**          | `<link href="/theme/runtime-theme.css">`; component tokens `--tml-*`; no inline `:root`                       | A                                |
| **Page variant** | `VARIANT_CONFIGS` table (layout chrome) — stays in framework shells, not theme pkg                            | out of scope                     |

### 3.4 Relationship to TRL-25 and TRL-38

- **TRL-25 (fractal shell contract):** owns
  `{ main, edit-chrome, operator-inset }` slots, vantage × band rules,
  `resolveShell()`. Theme contract **does not** implement fractal morph — only
  documents Phase C hook comments and reserves `data-ui-vantage` /
  `data-trellis-shell`.
- **TRL-38 (L3 operator inset):** consumes `data-trellis-band="L3"` +
  `surface-1` outer frame + Bits UI primitives. Theme contract supplies tokens;
  TRL-38 supplies component chrome.

Convergence rule (from client): vantage may modulate disclosure **on top of** a
fixed `surface-2` host — substrate and fractal stay separate ADRs.

### 3.5 Token dialect convergence (Studio vs client)

Two live dialects exist:

| Dialect                 | Example keys                                               | Home                               |
| ----------------------- | ---------------------------------------------------------- | ---------------------------------- |
| **Studio semantic**     | `--background-base`, `--text-weak`, `--surface-brand-base` | `BRAND.md`, turtlecode `theme.css` |
| **Client shadcn/oklch** | `--background`, `--muted-foreground`, `--card`             | trellis-client `tailwind.css`      |

**Phase A:** kernel runtime uses Studio semantic names + **legacy aliases**
(`--bg`, `--accent`, …) with **current TML pixels** (purple accent) — dedupe
only, no visual redesign.

**Phase B:** publish alias map (`--background-base` ↔ `--background`) and align
values toward one preset (`graphite` or Studio dark). Pick one write path for
new tokens.

**Do not** block Phase A on dialect merge.

---

## 4. Phased plan

### Phase A — Shared runtime CSS (smallest wedge)

**Goal:** one CSS file, both kernel HTML pages, zero pixel change on
`/tml-lanes`.

- Create `src/ui/theme/runtime-theme.css` (semantic + legacy + `--tml-*`
  component tokens)
- Serve `GET /theme/runtime-theme.css` from lanes dashboard
- Migrate `lanes.html` + `tml-lanes.html`: link stylesheet, remove inline
  `:root`, set `data-trellis-band="L3"`
- Tests: `test/ui/runtime-theme.test.ts`, extend `e2e/tml-lanes.spec.cjs`

Spec: [`unified-theme-contract.md`](./unified-theme-contract.md)

### Phase B — `trellis/theme` package + oklch convergence

- Extract `packages/trellis-theme` from trellis-client → publish as
  `trellis/theme` from desk
- Wire sterile HTML to `applyThemeStyles()` for runtime preset override
  (optional dark toggle)
- Add derived `--surface-1/2/3` to `runtime-theme.css`
- Alias map between Studio semantic and client keys; update `BRAND.md`
  convergence table

### Phase C — Fractal + band runtime (TRL-25)

- Implement `data-ui-vantage`, shell slots, vantage × band gating
- Hook comments in CSS only until TRL-25 lands behavior
- Discrete deck present/edit crossfade stays `data-deck-mode` — not `vantage`

### Phase D — Operator inset (TRL-38)

- L3 chrome on `surface-1` frame; Bits UI + shared tokens

---

## 5. Smallest proving wedge

**Phase A on `/tml-lanes`:**

1. Extract inline `:root` → `runtime-theme.css`
2. `<link rel="stylesheet" href="/theme/runtime-theme.css">`
3. E2E: CSS route 200, link present, kanban parity (column min-width 300px,
   `.issue-card` visible)

No new graph entities. No accent color change. No `trellis/theme` package move
yet.

---

## 6. Non-goals (proposal)

- Visual redesign or Studio blue accent on kernel HTML (Phase B decision)
- Berkley Mono bundling in sterile surfaces
- Graph-native `Theme` / `SurfaceToken` entities in v0
- Projecting `DesignToken` entities → CSS at runtime
- Radix / Vanilla UI / third primitive stack in theme contract
- Merging inset surfaces with fractal vantage in one token ladder
- `client.html` migration (Phase B)
- Full TRL-25 / TRL-38 implementation

---

## 7. Acceptance mapping (TRL-156)

| Criterion                     | Section                                                    |
| ----------------------------- | ---------------------------------------------------------- |
| Names current seams           | §1                                                         |
| DesignToken vs Theme entities | §3.1 (keep BrandGuide AI-only; preset pointer for runtime) |
| Minimum contract surfaces     | §3.3                                                       |
| TRL-25 / TRL-38 relationship  | §3.4                                                       |
| Smallest wedge + non-goals    | §5, §6                                                     |

---

## 8. References

- `BRAND.md` — Studio canonical tokens (semantic dialect)
- `docs/adr/0011-app-shell-three-bands.md` — L1/L2/L3 bands
- `Packages/trellis-client/docs/architecture/INSET_SURFACES.md` — substrate vs
  fractal
- `Packages/trellis-client/packages/trellis-theme/` — apply engine (rename →
  `trellis/theme`)
- `src/plugins/brand/ontology.ts` — AI catalog tokens (orthogonal)
- `src/ui/tml-lanes.html` — current divergence example
