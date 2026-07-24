# Spec: TML Phase 1 — admin-shell + driver-unified writes

**Status:** Ready for impl\
**Date:** 2026-07-21\
**Parent wedge:** TRL-249 (Phase 1) · **Epic:** TRL-247\
**Amends:** Phase 0 causal loop (TRL-248) — grid `tml-op` promote\
**Spec issue:** TRL-SPEC (created at handoff)

---

## 1. Intent

Phase 0 proved one write path: grid `tml-op="promote(lane.id)"` → `WebDriver.op`
→ `POST /api/tml-mutations`. Admin still has **two other raw `fetch` mutation
call sites** and **inline driver wiring** (~40 lines) in `admin.html`.

Phase 1 extracts a small **`admin-shell.ts`** module that owns:

1. **Connect / seed / mount** — single `WebDriver` lifecycle for TML projections
2. **Mutations** — all admin writes go through `shell.op(action, args)` (which
   delegates to `TmlDriver.op`)

No new TML attributes. No PeerDriver default (Phase 2). No visual changes.

---

## 2. Problem statement (current)

| Location | Mutation | Path today |
| -------- | -------- | ---------- |
| Grid `.lane-promote` | `promote` | `tml-op` → `WebDriver.op` ✓ |
| Detail dialog `#dlg-promote` | `promote` | raw `fetch('/api/tml-mutations')` ✗ |
| Datatable `onCellCommit` | `updateLaneMeta` | raw `fetch('/api/tml-mutations')` ✗ |

Driver bootstrap in `admin.html`:

```javascript
const driver = new WebDriver({ baseUrl: '' });
driver.seed = (snap) => { seedOrig(snap); applySnapshot(snap); };
driver.connect({ snapshotUrl, streamUrl }).then(() => mount(...));
```

**Out of scope for Phase 1:** merging `connectOps()` op-log SSE with TML stream
(still a second `EventSource` in `admin.html` for ops panel + `lastOpHash`).

---

## 3. Module contract — `src/ui/admin-shell.ts`

### 3.1 Public API

```typescript
import type { TmlDriver } from './tml-runtime.js';

export interface AdminShellOptions {
  /** DOM subtree root for `mount()` — typically `.main` */
  mountRoot: Element;
  /** Called on every snapshot seed (initial connect + SSE snapshot events) */
  onSnapshot?: (snap: unknown) => void;
  baseUrl?: string;
  snapshotUrl?: string; // default '/api/lanes'
  streamUrl?: string;   // default '/api/lanes/stream?events=snapshot'
}

export interface AdminShell {
  readonly driver: TmlDriver;
  /** Fetch snapshot, seed store, subscribe SSE snapshots, then mount TML */
  connect(): Promise<void>;
  /** POST /api/tml-mutations via driver */
  op(action: string, args: Record<string, unknown>): Promise<void>;
}

export function createAdminShell(opts: AdminShellOptions): AdminShell;
```

### 3.2 Behaviour

**`createAdminShell`**

- Instantiates `WebDriver` with `baseUrl` (default `''`).
- Wraps `driver.seed` so each seed calls `onSnapshot?.(snap)` after store update.
- Returns frozen-ish shell object; `driver` exposed for tests and future
  PeerDriver swap (Phase 2).

**`connect()`**

- Calls `driver.connect({ snapshotUrl, streamUrl })` (defaults above).
- Awaits `mount(opts.mountRoot, driver)` — same as today.
- Idempotent guard: second `connect()` is a no-op or throws; pick one and
  document in unit test (recommend: no-op resolve).

**`op(action, args)`**

- Delegates to `driver.op(action, args)`.
- On `!res.ok`, parse JSON `{ error?: string }` when present and throw
  `Error(message)` so datatable + dialog can toast human-readable errors (today
  datatable parses JSON manually).

### 3.3 Non-goals

- Do not move chrome helpers (`applySnapshot`, sidebar, op log) into shell.
- Do not change `/api/tml-mutations` server map (`promote`, `updateLaneMeta` only).
- Do not extract all of `admin.html` script — only driver lifecycle + op facade.

---

## 4. Integration changes

### 4.1 `admin.html`

Replace inline `WebDriver` + monkey-patched `seed` + `connect().then(mount)` with:

```javascript
import { createAdminShell } from '/admin-shell.js';

const shell = createAdminShell({
  mountRoot: document.querySelector('.main'),
  onSnapshot: applySnapshot,
});
await shell.connect();
// … adminTable.refresh(), applySearchFilter(), connectOps() unchanged …
```

**Mutations — retire raw fetch:**

| Call site | After |
| --------- | ----- |
| `#dlg-promote` click | `await shell.op('promote', { id: promoteLaneId })` |
| `onCellCommit` | `await shell.op('updateLaneMeta', args)` |

Keep toast UX; map thrown errors to toast text.

**Assert:** `rg "fetch\\('/api/tml-mutations" src/ui/admin.html` → **0 matches**.

### 4.2 `lanes-dashboard.ts`

Add route mirroring existing UI bundles:

```typescript
if (path === '/admin-shell.js') {
  return serveBundledJs('admin-shell.js', 'admin-shell.ts');
}
```

### 4.3 `ui-dev.ts`

Add `'admin-shell.ts'` to `UI_DEV_ENTRIES` so `--dev` watch rebuilds it.

---

## 5. Tests

### 5.1 Unit — `test/ui/admin-shell.test.ts` (new)

| Case | Assert |
| ---- | ------ |
| `createAdminShell` wraps seed | `onSnapshot` called when driver seeded |
| `op` delegates | mock `fetch` receives `{ action, args }` POST body |
| `op` error surface | server `{ error: '…' }` → thrown `Error` with message |
| `connect` mounts | `mount` invoked once with mountRoot + driver (mock mount export or spy pattern used elsewhere) |

Use vitest + fetch mock (same patterns as `test/ui/tml-runtime.test.ts`).

### 5.2 Regression e2e

Existing Phase 0 test must stay green:

- `e2e/admin.spec.cjs` — `tml-op: grid promote posts to /api/tml-mutations`

No new e2e required unless executor adds datatable mutation coverage (optional
stretch — not blocking).

---

## 6. File map

| File | Action |
| ---- | ------ |
| `src/ui/admin-shell.ts` | **Add** — shell factory |
| `test/ui/admin-shell.test.ts` | **Add** — unit tests |
| `src/ui/admin.html` | **Edit** — import shell; remove raw mutation fetch |
| `src/ui/lanes-dashboard.ts` | **Edit** — serve `/admin-shell.js` |
| `src/ui/ui-dev.ts` | **Edit** — dev watch entry |

---

## 7. Acceptance criteria

```text
test:pnpm check
test:pnpm exec vitest run test/ui/admin-shell.test.ts
test:pnpm exec vitest run test/ui/tml-runtime.test.ts
test:CI=1 pnpm exec playwright test e2e/admin.spec.cjs -g "tml-op"
```

Behavioral (verified by reviewer grep / spot-check):

- [ ] `src/ui/admin-shell.ts` exists and is served at `/admin-shell.js`
- [ ] `admin.html` has **zero** direct `fetch('/api/tml-mutations')` calls
- [ ] Dialog promote + datatable cell commit use `shell.op`
- [ ] `connect()` + `onSnapshot` preserve today’s chrome update behaviour

---

## 8. Roll-forward (Phase 2 hint)

`AdminShell.driver` typed as `TmlDriver` so Phase 2 can inject `PeerDriver` via
factory option without touching dialog/datatable call sites.
