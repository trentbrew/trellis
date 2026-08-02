# Spec: TML v0.1 — Kanban test bed + v0 sync

**Status:** Ready for impl\
**Date:** 2026-07-16\
**Proposal:** TRL-147 · **Spec issue:** TRL-148\
**Amends:** [`tml-v0.md`](./tml-v0.md)\
**Test bed:** `src/ui/tml-lanes.html` on `/tml-lanes` (sterile; production `/`
untouched)

---

## 1. Intent

v0 proved four primitives (`query` / `live` / `op` / `ref`) on a **lane grid**.
v0.1 proves the same runtime on the **issue Kanban** that humans already use in
`lanes.html` — without inventing new visual language and without migrating
production.

Two deliverables:

1. **Spec sync** — make `tml-v0.md` match the landed runtime.
2. **Kanban in TML** — three columns, same status collapse as `ISSUE_COLUMNS`.

---

## 2. Spec sync (Phase A) — required edits to `tml-v0.md`

Executor updates `docs/specs/tml-v0.md` so it no longer contradicts the code:

| Stale claim in v0                                | Landed reality                                                                                    | Edit                                                                                                     |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Expressions: "no operators / no string literals" | `resolveExpr` allows `+` concat and quoted literals (`lane.opCount + ' / ' + lane.fileCount`)     | §3.2: allow `+` concatenation of paths and string literals only. Still no function calls, no arithmetic. |
| "No build step" / plain ES module                | `lanes-dashboard.ts` **esbuild-bundles** `/tml-runtime.js` so PeerDriver can import kernel pieces | §2 principle 4 + §6.1: "dev server bundles runtime via esbuild; no app framework."                       |
| Only `WebDriver`                                 | `PeerDriver` exists (EAV + real `QueryEngine`); WebDriver remains default on the test page        | New §4.3 documenting `PeerDriver`; §4.1 stays the default for `/tml-lanes`.                              |
| §8 "kanban … stay in lanes.html for v0"          | This wedge                                                                                        | Move Kanban to **in scope for v0.1**; keep table/stats/op-log out.                                       |
| Test path `test/tml-runtime.test.ts`             | `test/ui/tml-runtime.test.ts`                                                                     | Fix §9 + §7.                                                                                             |
| Status "Proposed (plan)"                         | Grid landed; Kanban is this wedge                                                                 | Status → **Accepted (v0 grid) / Active (v0.1 Kanban)**.                                                  |

Do **not** rewrite the attribute vocabulary. v0.1 adds no new `tml-*`
attributes.

---

## 3. Kanban contract (Phase B)

### 3.1 Column mapping (must match `lanes.html`)

```ts
const ISSUE_COLUMNS = [
  { key: "backlog", label: "Backlog", statuses: ["backlog", "queue"] },
  {
    key: "in_progress",
    label: "In Progress",
    statuses: ["in_progress", "paused"],
  },
  { key: "done", label: "Done", statuses: ["closed"] },
];
```

Unknown statuses fall into Backlog (same as `renderKanban`).

### 3.2 Markup shape

Stay on **`/tml-lanes`** (one sterile page). Replace or extend the lane grid so
the primary board is Kanban. Lane grid may remain below or be removed — prefer
**Kanban primary**, lane grid optional secondary; do not break `promote` if the
lane grid stays.

```html
<section id="board" class="kanban">
  <div class="kanban-col">
    <div class="kanban-col-head">
      <span class="col-title">Backlog</span>
    </div>
    <div
      class="kanban-col-body"
      tml-query="find ?e where type = 'Issue' and not (status = 'in_progress' or status = 'paused' or status = 'closed')"
      tml-each="issue of issues"
      tml-live
      tml-ref="col-backlog"
    >
      <article class="issue-card">
        <div class="issue-card-head">
          <span class="issue-id" tml-text="issue.id"></span>
          <span
            class="priority-badge"
            tml-text="issue.priority"
            tml-attr-class="issue.priority"
          ></span>
        </div>
        <div class="issue-title" tml-text="issue.title"></div>
        <div class="issue-meta" tml-if="issue.laneIds">
          <span class="lane-badge" tml-text="issue.laneIds"></span>
        </div>
      </article>
    </div>
  </div>
  <!-- In Progress: status = 'in_progress' or status = 'paused' -->
  <!-- Done: status = 'closed' -->
</section>
```

Steal Kanban CSS from `lanes.html` (`.kanban`, `.kanban-col`, `.priority-badge`,
etc.). Do not port search, op-log, stats, dialog, or view toggles.

### 3.3 Driver + data

- **Default driver:** `WebDriver` seeded from `GET /api/lanes` + SSE
  `events=snapshot` (same as today).
- Snapshot already exposes `issues[]` with `id`, `title`, `status`, `priority`,
  `laneIds` (`lanes-snapshot.ts`).
- `evaluateQuery` `collectionFor('Issue')` already returns `snapshot.issues`.
- **No new mutations required** for this wedge. `promote` may remain on a lane
  section if kept; issue start/close via `tml-op` is out of scope.

### 3.4 Runtime change — OR groups + `not` groups

Today `evaluateQuery` only parsed `and`-chained comparisons after `type = 'X'`.
Column collapse needs **OR of same-field equalities**, and Backlog needs a
**negated OR group** so unknown statuses fall there (harden TRL-153).

**Required grammar (WebDriver evaluator only):**

```
find ?e where type = 'Issue' and (status = 'backlog' or status = 'queue')
find ?e where type = 'Issue' and not (status = 'in_progress' or status = 'paused' or status = 'closed')
find ?e where type = 'Issue' and status = 'closed'
```

Rules:

- Parentheses wrap a disjunction of `field = value` terms.
- `not (…)` negates that disjunction (row matches iff none of the terms match).
- All OR terms in a group must share the same field (v0.1).
- AND still chains outside the group.
- `IN (...)` sugar is optional sugar for the same semantics; OR groups are
  enough.

Add unit tests in `test/ui/tml-runtime.test.ts` for:

1. OR group returns union of matching statuses.
2. Single-status column still works.
3. Type filter still required / empty on unknown type.
4. `not` group places unknown statuses in Backlog only.

`PeerDriver` already speaks real TQL — no change required for PeerDriver in this
wedge. Do not switch the test page default to PeerDriver.

### 3.5 Live updates

Each column body has `tml-live`. On SSE `snapshot`, `WebDriver.store.seed`
notifies subscribers → each column re-queries and re-projects. No hand-written
`renderKanban`.

Empty columns: either leave the body empty or show a static
`<div class="kanban-empty">No issues</div>` sibling that is not part of the
`tml-query` template. Prefer empty body (simpler); empty-state copy is
nice-to-have.

### 3.6 Column counts

`lanes.html` shows a count in the column head. v0.1: **static label is enough**;
live counts are optional. If implemented, must not reintroduce hand-written
issue loops outside TML (e.g. a tiny `tml-text` binding against a precomputed
ref is fine; a JS `renderKanban` is not).

---

## 4. Files

| File                            | Action                                         |
| ------------------------------- | ---------------------------------------------- |
| `docs/specs/tml-v0.md`          | Sync per §2                                    |
| `docs/specs/tml-v0.1-kanban.md` | This contract (authoritative for TRL-148)      |
| `src/ui/tml-runtime.ts`         | Extend `evaluateQuery` for OR groups           |
| `src/ui/tml-lanes.html`         | Kanban markup + CSS; keep WebDriver mount      |
| `test/ui/tml-runtime.test.ts`   | OR-group + Issue column queries                |
| `src/ui/lanes-dashboard.ts`     | No route change required unless assets missing |
| `src/ui/lanes.html`             | **Do not modify**                              |

---

## 5. Out of scope

- Production Kanban migration / replacing `renderKanban` in `lanes.html`
- `?driver=peer` toggle (follow-up)
- Search, op-log, stats, issue dialog, view toggles
- Issue mutations (`start` / `close`) via `tml-op`
- New `tml-*` attributes (`tml-projection`, `tml-swap`, etc.)
- Cycles / milestones sidebar
- Novel `.tml` grammar / LSP
- Updating `trellis-ui-dsl.md` §11.1 (optional polish; not AC)

---

## 6. Acceptance criteria (mirror TRL-148)

1. `test:bun test test/ui/tml-runtime.test.ts`
2. `docs/specs/tml-v0.md` documents PeerDriver, concat exprs, esbuild, Kanban
   in-scope
3. `src/ui/tml-lanes.html` renders three Kanban columns matching `ISSUE_COLUMNS`
   status collapse
4. `evaluateQuery` supports status OR (or IN) so multi-status columns work
5. SSE snapshot push updates columns without hand-written `renderKanban`
6. Production `/` and `lanes.html` unchanged

### Manual smoke (not machine AC)

```
trellis lane watch --port 3939
open http://localhost:3939/tml-lanes
```

Columns populate from live snapshot; create/triage an issue elsewhere → column
membership updates on next SSE snapshot.

---

## 7. Deps / risks

- **Global CLI 3.2.6** cannot parse JSONL `ops.json`; use `./bin/trellis.mjs`
  (3.4.0) for verification.
- Concurrent `lane watch` can clobber issue ops (known ADR 0026 finding) — not
  this wedge's fix.
- `tml-if="issue.laneIds"` uses `isTmlTruthy` — empty arrays are falsy (see
  `tml-v0.md` §3.2 / harden TRL-153).
- Mount semantics: the element with `tml-query` is the list container; its child
  tree is the per-row template. Put `tml-query` on `.kanban-col-body`, not on
  `.kanban-col`.
