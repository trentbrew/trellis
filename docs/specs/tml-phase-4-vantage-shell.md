# Spec: TML Phase 4 — vantage shell resolution

**Status:** Ready for impl  
**Date:** 2026-07-24  
**Epic:** TRL-269 · **Proposal:** TRL-270 · **Design:** TRL-277  
**Builds on:** [tml-phase-3-shell-registry.md](./tml-phase-3-shell-registry.md) §8  
**Design artifacts:** `docs/artifacts/tml-phase-4-vantage-shell_design.md`, `_mockup.html`

---

## 1. Intent

Phase 3 deduplicated kanban issue card bindings via `tml-shell-registry`. Phase 4
completes the roll-forward: **view mode selects projection host**, `shellForVantage`
resolves `ShellId`, and lane grid/table inline markup moves into registered shells.

**Epic AC amendment (TRL-269):** “one binding site” means **per entity kind**, not
one global `issue.title` grep across all views. Kanban → issues; grid/table → lanes.

---

## 2. Problem

| Location today | Issue |
| -------------- | ----- |
| `#view-kanban` | Phase 3 slots — ✓ single `#shell-issue-card` |
| `#view-grid` | Inline `article.lane-card` — duplicate lane bindings |
| `#view-table` | Inline `<tr>` — duplicate lane bindings |
| `shellForVantage()` | Stub returns `null` |
| Lane queries | Separate `tml-ref` on grid vs table |

View toggle switches CSS `.proj.active` but does not participate in shell resolution.

---

## 3. Contract

### 3.1 Module — extend `src/ui/tml-shell-registry.ts`

```typescript
export type EntityKind = 'issue' | 'lane';
export type ProjectionHost = 'kanban' | 'grid' | 'table';

/** Resolve shell id from entity kind + vantage + optional host disambiguation. */
export function shellForVantage(
  kind: EntityKind,
  vantage: number,
  host?: ProjectionHost,
): ShellId | null;

/** Read --ui-vantage from root (default 8). */
export function readUiVantage(root: Element): number;

/** Map active admin view to projection host. */
export function hostFromView(view: 'kanban' | 'grid' | 'table'): ProjectionHost;
```

**Normative resolution map (MVP, `--ui-vantage: 8`):**

| Host | Kind | `ShellId` | `data-trellis-shell` |
| ---- | ---- | --------- | -------------------- |
| kanban | issue | `issue.card` | `card` |
| grid | lane | `lane.card` | `card` |
| table | lane | `lane.row` | `row` |

At vantage detents 2/5/8, disclosure within shell follows Phase C CSS on
`data-trellis-shell="node|row|card"`. **MVP ships fixed vantage 8**; scrubber is stretch.

**Non-goals:** `issue.row` (Phase 4b), vantage scrubber UI, `<trellis-thing>` CE,
PeerDriver-only paths, user renderer packs.

### 3.2 Markup — `admin.html`

**New templates** (extract from inline grid/table):

```html
<template id="shell-lane-card" data-trellis-shell="lane.card">
  <article class="lane-card" data-kind="lane" …>
    <!-- existing lane-card bindings — single source -->
  </article>
</template>

<template id="shell-lane-row" data-trellis-shell="lane.row">
  <tr data-kind="lane" …>
    <!-- existing tr bindings — single source -->
  </tr>
</template>
```

**Projection slots:**

```html
<!-- grid -->
<div class="grid-host" tml-query="…" tml-each="lane of lanes" tml-live tml-ref="lanes-board">
  <div data-shell-slot="lane.card"></div>
</div>

<!-- table -->
<tbody tml-query="…" tml-each="lane of lanes" tml-live tml-ref="lanes-board">
  <div data-shell-slot="lane.row"></div>
</tbody>
```

> **Note:** TML row template wraps slot inside `tml-each`; slot receives cloned shell
> per row. Preserve existing `setupContainer` row behaviour.

**Unified query:** grid and table share **`tml-ref="lanes-board"`** (same query string).

**Inactive hosts:** add `hidden` + `inert` when not `.active` (a11y — design TRL-277).

**Resolver strip (optional):** `#shell-resolver` hidden by default; show when
`?debug=shell` or `localStorage.trellis-debug-shell=1`.

### 3.3 Connect hook — `admin-shell.ts`

Before `mount()` (unchanged order):

1. `readUiVantage(mountRoot)` → set `data-ui-vantage` on `#tml-root`
2. Resolve slot ids from active view + `shellForVantage`
3. `hydrateShellSlots(mountRoot)` — must re-run when view changes

**View change (`setView` in admin.html):** after toggling `.proj.active`:

1. Update `hidden`/`inert` on hosts
2. Clear `data-shell-hydrated` on slots whose resolved id changed
3. Call exported `rehydrateShellsForView(root, view)` from registry module
4. Do **not** full page reload

### 3.4 Datatable regressions (preserved)

Shell swap must not break `mountAdminDatatable` behaviours documented in
`trellis-admin-datatable_design.md`: sort headers, cell edit on branch/issue cols,
zero lanes, search empty state. No changes to datatable primitive API unless slot
structure requires hook adjustment.

---

## 4. Files

| File | Action |
| ---- | ------ |
| `src/ui/tml-shell-registry.ts` | Implement `shellForVantage`, `readUiVantage`, `hostFromView`, `rehydrateShellsForView` |
| `src/ui/admin-shell.ts` | Call rehydrate on connect; export hook for view change |
| `src/ui/admin.html` | Lane shell templates; slots; unified `tml-ref`; hidden/inert |
| `test/ui/tml-shell-registry.test.ts` | shellForVantage map, lane shell hydrate, grep helpers |
| `test/ui/admin-shell.test.ts` | connect + hydrate regression |
| `e2e/admin.spec.cjs` | Existing datatable + view-toggle tests must pass |

---

## 5. Tests

### 5.1 Unit — `test/ui/tml-shell-registry.test.ts`

| Case | Assert |
| ---- | ------ |
| `shellForVantage('issue', 8, 'kanban')` | `'issue.card'` |
| `shellForVantage('lane', 8, 'grid')` | `'lane.card'` |
| `shellForVantage('lane', 8, 'table')` | `'lane.row'` |
| lane.card hydrate | slot receives cloned `article.lane-card` |
| lane.row hydrate | slot receives cloned `tr` |
| admin.html grep | exactly **1** `tml-text="issue.title"` |
| admin.html grep | exactly **1** `tml-ref="lanes-board"` on lane queries |

### 5.2 Regression

```text
test:pnpm check
test:pnpm exec vitest run test/ui/tml-shell-registry.test.ts
test:pnpm exec vitest run test/ui/admin-shell.test.ts
test:pnpm exec vitest run test/ui/tml-runtime.test.ts
test:CI=1 pnpm exec playwright test e2e/admin.spec.cjs -g "datatable|view-toggle|shell:"
```

---

## 6. Acceptance criteria

### Static (spec issue — run at architect handoff)

- `pnpm check` passes
- Spec file exists at `docs/specs/tml-phase-4-vantage-shell.md`
- Design artifacts exist (`docs/artifacts/tml-phase-4-vantage-shell_*`)
- Spec documents `shellForVantage` resolution map

### Behavioral (impl issue — automated)

| # | Criterion | Test command |
| - | --------- | ------------ |
| 1 | `shellForVantage` returns correct ShellId per host/kind | `pnpm exec vitest run test/ui/tml-shell-registry.test.ts -t shellForVantage` |
| 2 | Lane card + row shells hydrate from templates | `pnpm exec vitest run test/ui/tml-shell-registry.test.ts -t "lane shell"` |
| 3 | Single `issue.title` + unified `lanes-board` ref in admin.html | `pnpm exec vitest run test/ui/tml-shell-registry.test.ts -t "admin.html grep"` |
| 4 | admin-shell connect regression | `pnpm exec vitest run test/ui/admin-shell.test.ts` |
| 5 | tml-runtime regression | `pnpm exec vitest run test/ui/tml-runtime.test.ts` |
| 6 | E2e datatable + view + shell regressions | `CI=1 pnpm exec playwright test e2e/admin.spec.cjs -g "datatable|view-toggle|shell:"` |

---

## 7. Open questions (defer — design resolved)

| Question | Resolution |
| -------- | ---------- |
| Table at high vantage uses kanban card? | **No** — `lane.row` always |
| Vantage propagation without reload? | `readUiVantage` + rehydrate on view change; scrubber stretch |
| Resolver strip in prod? | Hidden default; `?debug=shell` |

---

## 8. Dependencies

- Phase 3 closed (TRL-251/258/259/260)
- Remote VCS gate closed (TRL-222) — impl lane unblocked
- `mountAdminDatatable` unchanged contract
- Renderer pack distribution ([tml-renderer-pack-registry-proposal.md](./tml-renderer-pack-registry-proposal.md)) — **Phase 6+**; Phase 4 templates should extract cleanly to `@trellis/*` shell packs later
