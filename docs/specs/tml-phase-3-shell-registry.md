# Spec: TML Phase 3 — shell registry (one template, multiple views)

**Status:** Ready for impl\
**Date:** 2026-07-21\
**Parent wedge:** TRL-251 (Phase 3) · **Epic:** TRL-247\
**Builds on:** Phase 2 PeerDriver opt-in (TRL-256) · Phase 1 admin-shell (TRL-253)

---

## 1. Intent

Admin kanban projects the same **Issue card** shell three times (backlog /
in-progress / done). Each column duplicates ~25 lines of identical TML bindings
(`issue.id`, `issue.title`, `issue.priority`, …). Editing one binding requires
editing three — drift risk and violates the Thing/Shell model in
`docs/planning/tml-thing-shell-primitive.md`.

Phase 3 introduces a **shell registry**: named HTML templates cloned into
projection hosts before `mount()`. One edit to the issue card shell reflects in
every kanban column that references it.

**Non-goal this phase:** full vantage → shell resolution from `--vantage` CSS
(stub only). Lane grid vs table row unification is stretch — issue card is the AC
gate.

---

## 2. Problem

| Location | Duplication |
| -------- | ----------- |
| `#view-kanban` col backlog | full `button.issue-card` + bindings |
| `#view-kanban` col in-progress | identical markup |
| `#view-kanban` col done | identical markup |

Count today: **3×** `tml-text="issue.title"` in `admin.html`.

Grid/table lane shells differ structurally (`article.lane-card` vs `tr`) — defer
to Phase 3b; registry API must allow multiple shell ids.

---

## 3. Contract

### 3.1 Module — `src/ui/tml-shell-registry.ts`

```typescript
export type ShellId = 'issue.card' | 'lane.card' | 'lane.row'; // lane.* registered, not required AC

/** Register a <template> or element as the canonical shell body. */
export function registerShell(id: ShellId, source: HTMLTemplateElement | Element): void;

/** Clone registered shell into every [data-shell-slot="<id>"] under root. Idempotent. */
export function hydrateShellSlots(root: Element): void;

/** Test helper — clear registry between tests. */
export function clearShellRegistry(): void;
```

- Registry is in-memory `Map<ShellId, Element>`.
- `hydrateShellSlots` replaces each slot's **innerHTML** with `template.content.cloneNode(true)` (or clone of registered element).
- Unknown shell id → `console.error` + skip slot (do not throw — mount should degrade).

### 3.2 Markup — `admin.html`

**Canonical template** (single source):

```html
<template id="shell-issue-card" data-trellis-shell="issue.card">
  <button type="button" class="issue-card" data-trellis-shell="card" data-kind="issue"
    tml-attr-data-entity-id="issue.id" tml-attr-data-status="issue.status">
    <!-- existing issue-card inner structure unchanged -->
    <div class="issue-title" tml-text="issue.title"></div>
    …
  </button>
</template>
```

**Kanban column host** (each column identical):

```html
<div class="kanban-col-body" tml-query="find ?e where type = 'Issue' and …"
  tml-each="issue of issues" tml-live tml-ref="col-backlog">
  <div data-shell-slot="issue.card"></div>
</div>
```

After `hydrateShellSlots`, each column's slot contains the cloned `button.issue-card`
— `setupContainer` row template behaviour unchanged.

Optional (non-blocking): register `#shell-lane-card` for grid; table row stays
inline this phase.

### 3.3 Connect hook — `admin-shell.ts`

Call `hydrateShellSlots(opts.mountRoot)` **immediately before** `mount()` in both
web and peer `connect()` paths. Shell templates live inside `mountRoot` subtree
(or document — registry reads `#shell-issue-card` at connect time).

```typescript
import { hydrateShellSlots } from './tml-shell-registry.js';

// inside connect(), before mount():
hydrateShellSlots(opts.mountRoot);
mount(opts.mountRoot, driver);
```

### 3.4 Vantage stub (document only)

Add HTML comment + empty resolver stub:

```typescript
/** Phase 4: map --vantage / data-vantage → ShellId */
export function shellForVantage(_kind: string, _vantage: number): ShellId | null {
  return null;
}
```

No runtime vantage selection in Phase 3.

---

## 4. Files

| File | Action |
| ---- | ------ |
| `src/ui/tml-shell-registry.ts` | **new** — register + hydrate |
| `src/ui/admin-shell.ts` | call `hydrateShellSlots` before `mount` |
| `src/ui/admin.html` | `<template id="shell-issue-card">`; kanban slots |
| `src/ui/lanes-dashboard.ts` | serve registry module if bundled separately |
| `src/ui/ui-dev.ts` | add registry to dev entries if needed |
| `test/ui/tml-shell-registry.test.ts` | **new** — register, hydrate, clone count |

---

## 5. Tests

### 5.1 Unit — `test/ui/tml-shell-registry.test.ts`

| Case | Assert |
| ---- | ------ |
| register + hydrate | slot receives cloned button.issue-card |
| three slots | three hosts hydrated from one template |
| idempotent hydrate | second call does not duplicate nodes |
| admin.html grep | exactly **1** `tml-text="issue.title"` in source |

Use `FakeEl` pattern from `admin-shell.test.ts` / `tml-runtime.test.ts`.

### 5.2 Regression

```text
test:pnpm check
test:pnpm exec vitest run test/ui/tml-shell-registry.test.ts
test:pnpm exec vitest run test/ui/admin-shell.test.ts
test:pnpm exec vitest run test/ui/tml-runtime.test.ts
test:CI=1 pnpm exec playwright test e2e/admin.spec.cjs -g tml-op
```

### 5.3 E2e stretch (non-blocking)

Kanban card click → detail dialog still opens (existing click handler on
`.issue-card`).

---

## 6. Acceptance criteria

Behavioral:

- [ ] Issue `issue.title` TML binding defined once in shell template
- [ ] All three kanban columns render issue cards after connect (visual / e2e stretch)

Machine:

```text
test:pnpm check
test:pnpm exec vitest run test/ui/tml-shell-registry.test.ts
test:pnpm exec vitest run test/ui/admin-shell.test.ts
test:pnpm exec vitest run test/ui/tml-runtime.test.ts
test:CI=1 pnpm exec playwright test e2e/admin.spec.cjs -g tml-op
test:pnpm exec vitest run test/ui/tml-shell-registry.test.ts -t "issue.title"
```

---

## 7. Non-goals

- Vantage-driven shell selection (stub only)
- Lane grid + table row unification (lane.row / lane.card registry entries OK, not AC)
- `<trellis-thing>` custom element
- PeerDriver-specific shell paths
- Extracting CSS / design tokens

---

## 8. Roll-forward

Phase 4: wire `shellForVantage(kind, --vantage)`; collapse grid/kanban/table toggles
into shell resolution. Peer mode benefits when lane/issue entity shapes come from
materialized graph, not snapshot arrays.
