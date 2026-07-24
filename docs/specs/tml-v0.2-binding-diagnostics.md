# Spec: TML v0.2 — binding diagnostics

**Status:** Proposed\
**Date:** 2026-07-17\
**Proposal:** TRL-TBD · **Amends:** [`tml-v0.md`](./tml-v0.md),
[`tml-v0.1-harden.md`](./tml-v0.1-harden.md)\
**Informed by:** `docs/planning/trellis-ui-dsl.md` §11.1 (reject the string form)\
**Test bed:** `src/ui/tml-lanes.html` on `/tml-lanes` (sterile; production `/`
untouched)

---

## 1. Intent

§11.1 rejected the string form with a decisive argument: _"an agent that writes
`don = false` gets a blank div and no diagnostic."_ That reasoning is correct and
this spec does not revisit it. It closes the gap it leaves open.

**Typed field paths do not produce diagnostics on their own.** The v0 runtime has
at least four seams where a malformed or misspelled binding degrades to an empty
render with no error, no warning, and no test failure. `pnpm check` cannot see
them, because the bindings live in `.html` and the runtime resolves them at
render time against data whose shape it never asserts.

The failure mode §11.1 named is therefore already present — it simply arrives
through the registry contract rather than through an expression string.

**In scope**

1. Distinguish _unresolvable_ from _absent/falsy_ at path resolution.
2. Emit diagnostics for the four known silent seams, at `mount()`.
3. `tml-if` renders identically for both cases but reports only the first.

**Out of scope**

- New `tml-*` attributes.
- Any change to `evaluateQuery` clause vocabulary (no `IN` / nested `not`).
- Production `src/ui/lanes.html` / `/` migration.
- PeerDriver default switch.
- Playwright / e2e (per v0.1-harden §4; keep manual smoke).
- The two forward items in §7 — flagged, not decided here.

---

## 2. The four silent seams (grounded in `src/ui/tml-runtime.ts`)

| # | Seam | Current behavior | Symptom |
| - | ---- | ---------------- | ------- |
| 1 | `getPath` (L60) | `.reduce((o, k) => o == null ? undefined : o[k])` — a missing key and a present-but-`undefined` key both yield `undefined` | `tml-text="lane.od"` renders `''` |
| 2 | `parseEach` (L123) | Returns `null` on malformed input; `setupContainer` (L527) falls back to `eachVar = 'item'` | `tml-each="lane in lanes"` (`in` not `of`) → scope is `{item: row}` → **every** binding on the card resolves to `undefined` → whole card blank |
| 3 | `parseOp` (L129) | Returns `null` on malformed input → `binding.op` undefined → no listener attached | `tml-op="promote lane.id"` → button renders, click does nothing |
| 4 | `setupContainer` (L523) | `if (!binding.query) return;` | `tml-each` without `tml-query` → subtree never projects, silently |

Seam 2 is the sharpest: a one-character error (`of` → `in`) blanks an entire
card and the runtime reports nothing. This is exactly the "blank div, no
diagnostic" outcome, reached without a single TQL string.

**Prior art.** tldraw builds its analogous registry (`_shapeUtilsByAssetType`)
**eagerly**, by walking every registered util at store construction — then still
calls `shapeUtil.createShapeForAsset?.(asset, point) ?? null` and silently
creates zero shapes when the contract is partial. It built the right place to
check and did not check there. TML's `mount()` (L549) is that place.

---

## 3. Contract

### 3.1 Resolution outcome

Add a resolution result that separates "path does not exist in this scope" from
"path exists and holds a falsy/empty value":

```ts
export interface PathResult {
  ok: boolean;      // false = a key along the path was absent from its container
  value: unknown;   // unchanged from getPath()
}

export function resolvePath(obj: unknown, path: string): PathResult;
```

Semantics: walking `a.b.c`, `ok` is `false` if any segment names a key **absent
from** its container object (`!(k in container)`), or if a non-terminal segment
is `null`/`undefined`/non-object. A key present with value `undefined` is
`ok: true`.

**Key presence, not value definedness — this is load-bearing.** `IssueRow`
(`src/ui/lanes-snapshot.ts` L28) declares `title?`, `status?`, and `priority?`
optional, but the builder (L119) always *assigns* them, so an issue with no
priority yields `{ priority: undefined }` — key present. An `ok` test written as
`value !== undefined` would fire `unresolved-path` on every such issue and make
the real dashboard unusable. `in` is what keeps §6 AC 12 true in production and
not merely against the test fixture.

`getPath` **keeps its current signature and behavior** (`resolvePath(...).value`)
so `resolveExpr` / `applyBindings` return values are unchanged. This spec adds a
reporting channel; it does not change what renders.

### 3.2 Diagnostics

```ts
export interface TmlDiagnostic {
  code:
    | 'unresolved-path'      // seam 1
    | 'malformed-each'       // seam 2
    | 'malformed-op'         // seam 3
    | 'each-without-query';  // seam 4
  attr: string;              // e.g. 'tml-text'
  expr: string;              // the offending expression, verbatim
  detail?: string;           // e.g. available keys in scope
}

export interface MountOptions {
  onDiagnostic?: (d: TmlDiagnostic) => void; // default: console.warn('[tml]', ...)
  strict?: boolean;                          // default false; true = throw on first
}

export function mount(root: any, driver: TmlDriver, opts?: MountOptions): void;
```

`mount(root, driver)` stays source-compatible — `opts` is optional and the
default reporter is a `console.warn`, so no existing call site changes.

### 3.3 Two check tiers

**Static** (no data required; one walk of the whole `root` tree at `mount()`,
before any container is set up — `setupContainer` only ever sees `[tml-query]`
elements, so a stray `tml-each` outside every container would otherwise be
unreachable):

- `tml-each` present and `parseEach` returns `null` → `malformed-each`.
- `tml-op` present and `parseOp` returns `null` → `malformed-op`.
- `tml-each` present without `tml-query` on the same element →
  `each-without-query`.

**Shape** (requires one result row; runs **once**, on the first successful
`driver.query()` in `setupContainer.render`):

- For each binding on the template (`tml-text`, `tml-attr-*`, `tml-if`, and each
  `tml-op` arg), resolve every non-literal path in the expression against the
  first row's scope. `ok === false` → `unresolved-path`, with `detail` listing
  the scope's top-level keys.

The shape tier runs on the **first** render only, not on every `tml-live`
re-render. A binding that is well-formed against row 0 is well-formed against
row N; per-row reporting would be noise on every SSE frame.

Empty result set → shape tier is skipped (no row to check against). This is a
deliberate hole: it is better than inventing a schema the driver never provided.

### 3.4 `tml-if` — identical render, different diagnostic

The v0.1-harden `isTmlTruthy` table is **unchanged**. This spec only adds
reporting:

| Expression | `resolvePath.ok` | Renders | Diagnostic |
| ---------- | ---------------- | ------- | ---------- |
| `issue.laneIds` where `laneIds === []` | `true` | removed | none |
| `issue.laneIds` where `laneIds === ['a']` | `true` | kept | none |
| `issue.lanIds` (typo; key absent) | `false` | removed | `unresolved-path` |

An empty array and a typo currently produce identical DOM **and** identical
silence. After this wedge they produce identical DOM and distinguishable
diagnostics — which is the correct split, because the render behavior is right
and only the reporting was missing.

---

## 4. Why `mount()` and not `pnpm check`

The promote gate type-checks `src/**/*.ts`. TML bindings are attribute strings in
`src/ui/tml-lanes.html`, resolved at runtime against driver-supplied rows. No
TypeScript pass can see them, and a template-literal or JSX form that *could* be
checked is precisely the "no app framework" constraint v0 §2.4 rejects.

`mount()` is where the runtime first has both halves — the parsed bindings and,
one tick later, the result shape. It is the only place the contract is knowable.

This does not make TML type-checked. It makes TML **loud**, which is the property
§11.1 actually wanted from type-checking.

---

## 5. Files

| Path | Change |
| ---- | ------ |
| `src/ui/tml-runtime.ts` | `resolvePath` + `PathResult`; `TmlDiagnostic` / `MountOptions`; static tier in `setupContainer`; shape tier on first render; `mount` opts param |
| `test/ui/tml-runtime.test.ts` | Cases per §6 |
| `docs/specs/tml-v0.md` | Link this spec from §3.2 (expressions) and §9 (verification) |
| `src/ui/tml-lanes.html` | **Untouched** — must emit zero diagnostics as-is |
| `src/ui/lanes.html` | **Untouched** |

---

## 6. Acceptance criteria

### Machine

1. `pnpm check`
2. `node node_modules/vitest/vitest.mjs run test/ui/tml-runtime.test.ts`

### Behavioral

3. `resolvePath({a:{b:1}}, 'a.b')` → `{ok:true, value:1}`;
   `resolvePath({a:{b:1}}, 'a.c')` → `{ok:false}`;
   `resolvePath({a:{b:undefined}}, 'a.b')` → `{ok:true, value:undefined}`
4. `getPath` return values unchanged for all existing tests
5. `tml-each="lane in lanes"` emits `malformed-each`; card still renders blank
   (no behavior change), diagnostic identifies the attr
6. `tml-op="promote lane.id"` emits `malformed-op`
7. `tml-each` without `tml-query` emits `each-without-query`
8. `tml-text="lane.od"` against a row lacking `od` emits `unresolved-path` with
   scope keys in `detail`
9. `tml-if` on `[]` → node removed, **zero** diagnostics; `tml-if` on an absent
   key → node removed, **one** `unresolved-path`
10. Shape tier fires once across N `tml-live` re-renders, not N times
11. `strict: true` throws on first diagnostic; default reports and continues
12. Mounting the current `tml-lanes.html` against the WebDriver emits zero
    diagnostics

---

## 7. What this does not decide

Two items surfaced alongside this work. Both are larger than a runtime wedge and
neither is resolved here.

- **Schema/behavior lifecycle split.** tldraw hard-splits `config.js` (pre-mount;
  registers types; saving rebuilds the store and resets undo history) from
  `main.js` (runtime; hot-applies, never remounts). The split is forced: changing
  registered types changes what records the store can hold. TML has no such split
  because its vocabulary is fixed — it inherits one the moment custom element
  types land, and "schema/version migrations" is already an open kernel item.
  tldraw's answer is that `static props` and `static migrations` hang off the same
  type tag, so a record and its migration path are never separated. **Wants an ADR
  before custom element types, not after.**
- **Capability as a pipeline gate** (§11.1 flag (a), `tx-agent`). tldraw gates
  with `editor.canCreateShapes(partials)` **inside** `store.atomic()`, before any
  record exists — the grant is not in the declaration, it is in the pipeline the
  declaration flows through. That shape is compatible with "markup declares
  intent, pipeline enforces" and with §5 read-authorization. **Belongs in the §5
  ADR**, not in TML syntax.

---

## 8. Deps / risks

- No new dependencies. Pure logic in `tml-runtime.ts`; unit-testable under node
  (only `mount` / `applyBindings` touch the DOM — v0 module docstring L8).
- **PeerDriver**: the shape tier is driver-agnostic (it checks rows, whatever
  produced them), so real-TQL rows are checked identically. No PeerDriver change.
- **Risk — empty result sets skip the shape tier.** A board whose every column is
  empty reports nothing. Accepted: the alternative is asserting a schema the
  driver never supplied.
- **Risk — `detail` leaking row contents into console.** Report **keys only**,
  never values.
