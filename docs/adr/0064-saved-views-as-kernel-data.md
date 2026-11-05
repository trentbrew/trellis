# ADR 0064: Saved views as kernel data; self-describing `View`, agent-runnable

**Status:** Proposed
**Date:** 2026-11-04
**Issues:** KRN-515, KRN-516 (attribute catalog via client; scalar proof)
**Depends on:** [0045](./0045-user-defined-collections.md) (collections; answers part of open question 3, amends §3.7)
**Related:** [0048](./0048-types-relations-objects.md), [0062](./0062-authoring-clients-and-projections.md); turtlenote ADRs [0005](../../../../lab/apps/note/turtlenote/docs/adr/0005-universal-entity-dialog.md), [0007](../../../../lab/apps/note/turtlenote/docs/adr/0007-agent-access-via-room-mcp.md), [0008](../../../../lab/apps/note/turtlenote/docs/adr/0008-browse-query-pushdown.md) (browse pushdown: EQL narrows, the evaluator decides)
**Supersedes:** nothing
**Superseded by:** : 

## Context

Agents reach a Trellis graph through the room MCP that `trellis db serve` mounts at `/mcp`
(turtlenote ADR 0007). The kernel tools (`query_graph`, `get_node`, …) work, but they speak raw
types and EQL-S. What a person means by "my uncategorized transactions this month" already
exists as a **saved view**, and agents can't run one.

Saved views are graph entities today, but app-owned. turtlenote defines `View`
(`app-svelte/src/browse/app/view-entity.ts`):

| Attribute | Meaning |
| --- | --- |
| `name`, `projection`, `order`, `isDefault`, `template` | presentation |
| `scope` | `<workspace>/<app>/<database>`; a client nav path |
| `config` | `ViewConfig` JSON: `filter` (nested AND/OR tree), `sorts`, `groupBy`, `properties`, … |

Two things stop the room from running one:

1. **A view doesn't say what it selects.** `scope` names a manifest database; only the app's
   `defineApp` manifest knows that `…/finance/transactions` means type `Transaction`, or that a
   user table means `CollectionRecord` where `collectionId = …`. The room process can't load
   manifests (some are Svelte modules) and shouldn't.
2. **The `ViewConfig` dialect lives in the app.** turtlenote's `app-sdk` already compiles it to
   EQL-S (`browse/query/eqls.ts`, `compileViewQuery`, tested against the engine) and evaluates it
   in memory (`evaluate.ts`), but neither is in `trellis`.

KRN-515 first proposed a plugin hook so apps could register room tools in-process. That moves
app code into the graph process to answer a question the data could answer itself.

## Decision

1. **`View` becomes a kernel system type.** `trellis` defines `View` with today's turtlenote
   attributes plus those that make it self-describing (`targetFields`, decision 3, is the third):
   - `targetType`; the entity type the view selects (`Transaction`, `CollectionRecord`, …).
   - `targetScope`; optional JSON object of attribute equalities that narrow `targetType`
     (`{"collectionId":"collection:…"}`), matching `GraphDatabase.scope` in app-sdk.

   `scope` stays as an opaque client grouping key (nav path, tab rail). The room never interprets
   it. turtlenote stops defining `View` and imports it from `trellis`. The type name and existing
   attributes don't change, so existing rows stay valid; they gain `targetType` when next saved or
   through a one-time backfill by the client that owns the manifest.

2. **`ViewConfig`, its compiler, and its evaluator move to `trellis`.** A new `trellis/view/query`
   subpath owns the saved-view types (exported as `SavedViewConfig`, `FilterNode`, `SortSpec`), the EQL-S compiler (`compileViewQuery`,
   DNF expansion), the narrowing planner turtlenote ADR 0008 adds (`planBrowseQuery`), and the
   in-memory evaluator (`evaluateFilter`, `sortItems`). app-sdk re-exports them, so app imports keep
   working. The move happens after ADR 0008 phase 2 lands the planner in app-sdk, so it moves once,
   with its parity tests.

   `trellis/view` itself is taken: it is the headless view-state core from
   [ADR 0034](./0034-headless-ui-convention.md) (`createViewCore`: mode, columns, vantage, live sort),
   with its own unrelated `ViewConfig` of UI defaults. The saved-view dialect is a persisted query,
   not UI state. So it lives under the same family as a subpath, and its config type is renamed
   so the two `ViewConfig`s never meet in one import. app-sdk keeps its local `ViewConfig` name
   through the re-export.

3. **Views carry their key renames.** Filters and sorts name field *keys*, and clients rename
   attributes for display (turtlenote finance: `transactionType` → `type`,
   `syncedVia` → `integrationId`). A third attribute, `targetFields`, holds a JSON map from key to
   attribute for every key that differs. The room resolves a field as `targetFields[key] ?? key`,
   then checks it against the registered schema (or `CollectionField` rows for collections). An
   unknown or computed field makes the view not runnable, never silently wrong. A client may set a
   target only where its rows are graph entities one-to-one and each shown value is the stored
   attribute (turtlenote: `graphType` on a custom database). Derived reports, and lists whose
   values are recomputed, stay untargeted.

4. **The room MCP gets three read tools:**
   - `list_views({ targetType? })`; id, name, targetType, projection, plus whether the view is
     agent-runnable (has `targetType`).
   - `run_view({ viewId, limit?, offset? })`; follows turtlenote ADR 0008's invariant: EQL only
     narrows, the evaluator decides. Plan a superset query per DNF clause (conditions that don't
     compile are dropped, which only widens; no `ORDER BY` or `LIMIT`, since binding a sort attribute
     drops entities that lack it). Union by id, then always run `evaluateFilter` and `sortItems`
     on the result. Only then apply `offset`, `limit`, and a default cap, and report the total and
     whether results were truncated. Because the room holds every candidate row, the cap returns
     the true top N, unlike a capped subscription in the browser.
     Array values are stored as one array-valued atom, so `[?e "tags" "a"]` misses
     `tags: ["a","b"]` while the evaluator matches (found in ADR 0008 phase 1). The planner only
     pushes positive matches (`is`, `is_any_of`) for attributes proven scalar: declared by the
     registered schema, or observed through `describeAttributes(targetType)` (KRN-516), read
     fresh for each call. Otherwise it widens. `scalar` is false if even one entity of the
     type holds an array atom or more than one fact for the attribute. An attribute missing
     from the result, which includes every attribute of a type with no entities, counts as
     not scalar. The observed bit is safe here because `run_view` is a one-shot read; a live
     narrowed subscription must not rely on it without re-reading (turtlenote ADR 0008).
   - `describe_database({ targetType, targetScope? })`; fields from the registered schema (reuse
     the `trellis_form_descriptor` derivation, with computed fields marked read-only) plus the
     views that target it.

   They share the room's tenancy, budget, audit, and error shape. Errors set `isError` (KRN-512).

5. **No room plugin hook for now.** App-specific agent tools come from app data, not app code
   loaded into `db serve`. Revisit only when a tool genuinely can't be data. The likely first case
   is connector side effects, which stay behind each app's own server per turtlenote ADR 0007.

## Alternatives considered

- **Room plugin hook (KRN-515 as filed).** `.trellis-db.json` lists modules, and `db serve`
  imports them through a narrow tool API. Rejected for views: app code in the graph process, a
  plugin API to version, manifests that can't load outside their framework, and every app
  re-implementing `run_view`.
- **Persist compiled EQL-S on each `View`.** The room would just execute it. Rejected: the copy
  goes stale when the schema changes, there's no fallback for filters EQL-S can't express, and
  the filter is stored twice.
- **Trust EQL results and use the evaluator only when compilation fails.** Rejected: EQL is
  stricter than the evaluator in places (`is_not` on a missing attribute, case in `contains`, date
  representation, sort binding), so rows would vanish with no error. This is the failure turtlenote
  ADR 0008 §1 guards against.
- **Leave views app-side and let agents use `query_graph`.** Rejected: agents re-derive what the
  user already saved, and drift from what the UI shows.

## Non-goals

- Unifying fractal-playground `CollectionMeta.viewPrefs` and turtleOS `Selection` with `View`
  (the rest of 0045 open question 3)
- Agent writes to views (create/update a view through MCP)
- Server-side rendering of projections (table/board/calendar). `run_view` returns rows, and
  `groupBy` is reported, not applied
- Moving `evaluate.ts` formula/rollup handling for computed fields into the kernel

## Consequences

### Positive

- Every Trellis app's saved views become agent-runnable with no per-app tool code
- One `ViewConfig` dialect and compiler. UI and agents can't disagree about what a view selects
- The room stays free of app code, so the auth/audit perimeter stays one process wide
- Wiring the compiler upstream is also the step toward views reading from the graph directly,
  rather than from the client's in-memory ledger

### Tradeoffs

- `trellis` takes ownership of a dialect that started in one app; changes need a release
- Views saved before this change aren't runnable until they have `targetType` (`list_views`
  says so)
- Views filtering on computed fields only run through the evaluator fallback, and only when the
  room can compute the field. Initially they report as not runnable

## Implementation notes

1. **trellis:** add `src/view/query/` (types, compiler, planner, evaluator) and a `trellis/view/query`
   export beside the existing `trellis/view` core;
   define the `View` system type; add the three room tools in `src/mcp/views.ts`, registered beside
   `registerFormsTools`. Tests: compile parity cases from app-sdk `query.test.ts`; ADR 0008's
   superset property test (evaluator-accepted ids ⊆ EQL ids); `run_view` keeps rows that lack the
   sort attribute; cap applied after sort. Ordering: after turtlenote ADR 0008 phase 2.
2. **turtlenote (done):** write `targetType` / `targetScope` / `targetFields` when saving a view
   (resolved from the manifest database and its catalog fields), and backfill existing rows when
   each app starts. Targeted today: graph databases, plus finance `transactions` and `recurring`.
   Untargeted: finance `accounts` (recomputed `balance`; demo accounts hidden once Plaid is
   linked), `budgets` (rows depend on the selected month), `category-spend` (a report), and the
   custom explorer/type catalogs.
3. **turtlenote:** swap the local `View` and `query/*` for `trellis/view/query` re-exports once step 1
   is released.
