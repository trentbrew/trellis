# Spec: TML Phase 2 — PeerDriver opt-in on admin

**Status:** Ready for impl\
**Date:** 2026-07-21\
**Parent wedge:** TRL-250 (Phase 2) · **Epic:** TRL-247\
**Builds on:** Phase 1 `admin-shell.ts` (TRL-253) · Phase 0 causal loop (TRL-248)

---

## 1. Intent

Phase 1 unified writes and connect behind `createAdminShell`. The driver is still
**always `WebDriver`** — snapshot renderer with regex TQL over `Lane` / `Issue`.

Phase 2 adds **opt-in `PeerDriver`** on admin: materialize the op stream locally,
query via real `QueryEngine`. Prove one question the thin client cannot answer.

**Default unchanged:** no `?driver=peer` → WebDriver (production path).

---

## 2. Problem

| Mode | Query engine | Limitation |
| ---- | ------------ | ---------- |
| `WebDriver` | `evaluateQuery` over snapshot arrays | Unknown types → `[]` |
| `PeerDriver` | `QueryEngine` over `EAVStore` | Needs op materialization |

`PeerDriver` exists (`tml-runtime.ts`) with unit tests; admin never selects it.
Admin chrome (`applySnapshot`) still needs server snapshot for stats/lock/port —
hybrid bootstrap is acceptable for Phase 2.

---

## 3. Contract changes

### 3.1 `AdminShellOptions` (extend)

```typescript
export type AdminDriverMode = 'web' | 'peer';

export interface AdminShellOptions {
  mountRoot: Element;
  onSnapshot?: (snap: unknown) => void;
  baseUrl?: string;
  /** Default `'web'`. Read from `?driver=peer` when omitted. */
  driver?: AdminDriverMode;
  snapshotUrl?: string;   // default '/api/lanes' — chrome bootstrap
  streamUrl?: string;     // web default: '?events=snapshot'; peer: full op stream
}
```

### 3.2 Driver selection

```typescript
function resolveDriverMode(opts: AdminShellOptions): AdminDriverMode {
  if (opts.driver) return opts.driver;
  const p = new URLSearchParams(location.search).get('driver');
  return p === 'peer' ? 'peer' : 'web';
}
```

- **`web`:** current Phase 1 behavior (unchanged defaults).
- **`peer`:** instantiate `PeerDriver`; connect to **`/api/lanes/stream`**
  (ops + snapshot events). Apply incoming `op` frames via `applyOps`.

### 3.3 Hybrid chrome bootstrap (peer mode)

Peer mode **still fetches** `GET /api/lanes` once on connect and calls
`onSnapshot(snap)` so status bar / lock / op-count chrome keeps working. TML
projections read from `PeerDriver.query`, not snapshot arrays.

Sequence:

1. `fetch(snapshotUrl)` → `onSnapshot(snap)` (chrome only)
2. `PeerDriver.connect({ streamUrl: '/api/lanes/stream' })` — materialize ops
3. `mount(mountRoot, peerDriver)`

Do **not** merge `connectOps()` op-log pipe (still separate in `admin.html`).

### 3.4 Proof query (peer-only)

Add a **diagnostic host** in admin (hidden, `hidden` attribute or visually
inert) used only by tests:

```html
<div id="tml-peer-probe" hidden
  tml-query='find ?e where type = "Milestone"'
  tml-each="m of milestones">
  <span class="peer-probe-count" tml-text="m.id"></span>
</div>
```

- `WebDriver` + snapshot with milestones: `evaluateQuery` **can** return
  milestones today — use **`Gizmo`** proof instead to match unit-test precedent:

```html
<div id="tml-peer-probe" hidden aria-hidden="true"
  tml-query='find ?e where type = "Gizmo"'
  tml-each="g of gizmos">
  <span class="peer-probe-row" tml-text="g.id"></span>
</div>
```

Server never projects `Gizmo` in snapshot. Unit test seeds peer with a Gizmo op;
WebDriver mode probe renders **0** rows; peer mode renders **≥1** after op
replay.

**Phase 2 does not** require server to emit Gizmo ops — proof is **unit + optional
e2e with injected fixture** (see §5).

### 3.5 `admin.html`

No driver wiring inline — pass through shell only:

```javascript
const shell = createAdminShell({
  mountRoot: document.querySelector('.main'),
  onSnapshot: applySnapshot,
  // driver resolved from ?driver=peer automatically
});
```

---

## 4. Server / bundle

| File | Action |
| ---- | ------ |
| `src/ui/admin-shell.ts` | Driver factory (`web` \| `peer`), hybrid connect |
| `src/ui/admin.html` | Hidden `#tml-peer-probe`; no other driver logic |
| `test/ui/admin-shell.test.ts` | Peer mode connect + probe row count |
| `e2e/admin.spec.cjs` | Optional: `?driver=peer` smoke (page loads, grid visible) |

No change to `/api/tml-mutations` map in Phase 2 (seed mentioned expand — **defer**
to Phase 2b / separate issue unless trivial).

---

## 5. Tests

### 5.1 Unit — extend `test/ui/admin-shell.test.ts`

| Case | Assert |
| ---- | ------ |
| `resolveDriverMode` | `?driver=peer` → peer; default → web |
| peer `connect()` | fetches snapshot once; opens op stream; mounts with `PeerDriver` |
| peer proof probe | after applying Gizmo op, hidden probe host projects 1 row |
| web regression | existing Phase 1 tests unchanged |

### 5.2 Regression

```text
test:pnpm check
test:pnpm exec vitest run test/ui/admin-shell.test.ts
test:pnpm exec vitest run test/ui/tml-runtime.test.ts
test:CI=1 pnpm exec playwright test e2e/admin.spec.cjs -g "tml-op"
```

### 5.3 E2e stretch (non-blocking)

```text
test:CI=1 pnpm exec playwright test e2e/admin.spec.cjs -g "driver=peer"
```

Smoke: `/?view=grid&driver=peer` loads, `#view-grid .lane-id` visible. Skip if
flaky on cold op replay — unit proof is the AC gate.

---

## 6. Acceptance criteria

Behavioral:

- [ ] `?driver=peer` selects PeerDriver; default remains WebDriver
- [ ] Chrome bootstrap still updates status bar via snapshot fetch
- [ ] Hidden Gizmo probe: 0 rows web, ≥1 rows peer (unit)

Machine:

```text
test:pnpm check
test:pnpm exec vitest run test/ui/admin-shell.test.ts
test:pnpm exec vitest run test/ui/tml-runtime.test.ts
test:CI=1 pnpm exec playwright test e2e/admin.spec.cjs -g "tml-op"
```

---

## 7. Non-goals

- PeerDriver as default
- Removing WebDriver / snapshot path
- Merging op-log SSE (`connectOps`)
- Full admin e2e on peer mode (stretch only)
- SPEC-v1.1 peer materialization policy (document as follow-up)

---

## 8. Roll-forward (Phase 3 hint)

Shell registry shares lane/issue templates; peer mode validates that projections
can run on materialized graph without server-curated snapshot shapes.
