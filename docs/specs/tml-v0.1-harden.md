# Spec: TML v0.1 harden — edge cases

**Status:** Ready for impl\
**Date:** 2026-07-16\
**Proposal:** TRL-151 · **Amends:** [`tml-v0.md`](./tml-v0.md),
[`tml-v0.1-kanban.md`](./tml-v0.1-kanban.md)\
**Test bed:** `src/ui/tml-lanes.html` on `/tml-lanes` (sterile; production `/`
untouched)

---

## 1. Intent

TRL-149 shipped Kanban on `/tml-lanes` with REVIEW PASS. Two non-blocking
notes + an optional e2e ask were deferred. This wedge closes the runtime gaps so
the sterile board matches `lanes.html` `renderKanban` edge semantics.

**In scope**

1. Unknown / unrecognized issue statuses collapse to **Backlog**.
2. `tml-if` treats empty arrays (and empty strings) as **falsy**.

**Out of scope**

- Production `src/ui/lanes.html` / `/` migration.
- New `tml-*` attributes.
- PeerDriver default switch.
- Playwright / e2e harness (repo has none for this surface; keep manual smoke).

---

## 2. Unknown status → Backlog

### 2.1 Problem

v0.1 §3.1 already required: _“Unknown statuses fall into Backlog (same as
`renderKanban`).”_ The shipped markup used positive OR groups only:

```text
(status = 'backlog' or status = 'queue')
```

Issues with any other unrecognized status appear in **no** column.

`renderKanban` does:

```ts
const col = ISSUE_COLUMNS.find((c) => c.statuses.includes(issue.status));
if (col) grouped[col.key].push(issue);
else grouped.backlog.push(issue);
```

### 2.2 Contract

Extend `evaluateQuery` so a clause may be a **negated OR group**:

```text
not (status = 'in_progress' or status = 'paused' or status = 'closed')
```

Semantics: row matches iff **none** of the inner equalities match.

Update Backlog `tml-query` on `/tml-lanes` to:

```html
tml-query="find ?e where type = 'Issue' and not (status = 'in_progress' or
status = 'paused' or status = 'closed')"
```

This places `backlog`, `queue`, and any unknown status in Backlog — identical
bucket rule to `renderKanban`. In Progress / Done queries stay unchanged.

### 2.3 Parsing notes (for Executor)

- `not (…)` is a new clause kind alongside `simple` and `or`.
- Inner body reuses the existing OR-group parser (same-field equalities).
- Do **not** invent `IN` / `NOT IN` vocabulary in this wedge.
- Document the form in `tml-v0.md` (query fragment section) and amend
  `tml-v0.1-kanban.md` §3.2 Backlog markup example.

---

## 3. `tml-if` empty-array truthiness

### 3.1 Problem

`applyBindings` uses JS truthiness via `if (!resolveExpr(...))`. Empty arrays
are truthy in JS, so `tml-if="issue.laneIds"` still renders the lane badge row
when `laneIds === []`.

### 3.2 Contract

Introduce a small helper (name free; e.g. `isTmlTruthy`) used **only** for
`tml-if` evaluation:

| Value                                       | `tml-if` result |
| ------------------------------------------- | --------------- |
| `null` / `undefined` / `false`              | falsy           |
| `''` (empty string)                         | falsy           |
| `[]` (empty array)                          | falsy           |
| `[…]` (non-empty array)                     | truthy          |
| `0` / `NaN`                                 | falsy (JS)      |
| non-empty string / object / non-zero number | truthy          |

Do **not** change `resolveExpr` return values for `tml-text` / `tml-attr-*`
(empty array may still stringify); only the `tml-if` gate uses this table.

Document under `tml-v0.md` attribute table / expression notes for `tml-if`.

Markup on `tml-lanes.html` may keep `tml-if="issue.laneIds"` — behavior change
is in the runtime.

---

## 4. Playwright (explicit defer)

No Playwright / `test:e2e` harness exists in this package for `/tml-lanes`. Do
**not** add `needs-e2e` or invent a one-off browser runner in this wedge.

**Manual smoke** (Reviewer / QA):

```bash
trellis lane watch --port 3939
open http://localhost:3939/tml-lanes
```

Optional future proposal: first Playwright AC for sterile TML routes.

---

## 5. Files

| Path                            | Change                                                          |
| ------------------------------- | --------------------------------------------------------------- |
| `src/ui/tml-runtime.ts`         | `not (…)` clause in `evaluateQuery`; `tml-if` truthiness helper |
| `src/ui/tml-lanes.html`         | Backlog `tml-query` → `not (in_progress\|paused\|closed)`       |
| `test/ui/tml-runtime.test.ts`   | Unknown-status → backlog; empty-array `tml-if` removes node     |
| `docs/specs/tml-v0.md`          | Document `not` groups + `tml-if` truth table                    |
| `docs/specs/tml-v0.1-kanban.md` | Amend Backlog markup example to match                           |
| `src/ui/lanes.html`             | **Untouched**                                                   |

---

## 6. Acceptance criteria

### Machine

1. `pnpm check`
2. `node node_modules/vitest/vitest.mjs run test/ui/tml-runtime.test.ts`

### Behavioral (covered by unit tests; Reviewer may smoke)

3. Issue with status outside `{backlog,queue,in_progress,paused,closed}` appears
   only in Backlog via `evaluateQuery` + Backlog query string above
4. `tml-if` on an empty array removes the element; non-empty array keeps it
5. Production `/` and `lanes.html` unchanged

---

## 7. Deps / risks

- Use `./bin/trellis.mjs` (3.4.0+) for graph commands.
- Nested `not` / boolean algebra beyond one negated OR group is **out of
  scope**.
- PeerDriver path is unaffected (real TQL); this harden targets WebDriver
  `evaluateQuery` + shared `applyBindings`.
