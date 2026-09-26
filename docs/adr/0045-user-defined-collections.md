# ADR 0045: User-Defined Collections — One Model for "a Table People Make"

**Status:** Proposed (2026-09-26)
**Related:**
[0018](./0018-explicit-ids-and-field-sync-tiers.md) (explicit entity IDs and field sync tiers),
[0038](./0038-git-authoritative-file-tier.md) (git-authoritative file tier),
turtleOS [ADR-0013](../../../os-sandbox/docs/adr/0013-derived-references.md) (derived references — ids stored, names computed),
turtleOS [ADR-0016 §6](../../../os-sandbox/docs/adr/0016-tsh-command-language.md) (vocabulary comes from the schema),
turtleOS [ADR-0018](../../../os-sandbox/docs/adr/0018-user-defined-collections.md) (turtleOS alignment — two graph planes, guardrails, tsh)

**Impacted components:**
`src/core/ontology/core-ontology.ts`, `src/core/kernel/schema-middleware.ts`,
`src/mcp/room.ts`, `src/mcp/room-helpers.ts`, `src/cms/`, `docs/ontology-glossary.md`;
consumers `demo/realtime-app`, `fractal-playground`, `lab/apps/FINANCE/client-svelte`

---

## 1. Context

"A table of records whose schema a person defines at runtime" (a Notion database, an Airtable base) has
**four** implementations across the Trellis ecosystem today. Each was reasonable locally, and none
knows about the others.

| # | Model | Where | Collection is… | Rows are… | Fields live in… | Status |
|---|-------|-------|----------------|-----------|-----------------|--------|
| 1 | `core:Collection` | `core-ontology.ts:103-121` | entity: `title`, `icon`, `schema` (rich_text), `recordType` → `core:Record` | unspecified | untyped `schema` string | **Unused.** Glossary calls it an "optional grouping/folder" |
| 2 | CMS collection | `src/cms/` | a `schema:<Name>` TypeSchema with `cms=true` | entities whose `type` is `<Name>` | JSON array in the schema entity's `props` | Read-only client; writes via the IDE panel or the agent tool |
| 3 | `CollectionMeta` + `CollectionRecord` | `demo/realtime-app`, `fractal-playground` | `CollectionMeta` (`extends: core:Record`) with a slug | one `CollectionRecord` type with a `collectionId` pointer | per-collection schema `…/collections/<slug>/Record` | Glossary: "demo-only". But the **kernel** validates it (`schema-middleware.ts:96-137`) and the MCP tool `create_collection_record` writes it |
| 4 | `Database` + `Field` | FINANCE client (`user-databases.ts`) | `Database` entity | a **type per database** (`Db_<uuid>`), compiled at runtime | `Field` entities (stable keys, JSON options) | Shipped 2026-09-25; one test database, since deleted |

Model 4 was built without knowing that 1–3 existed. It is the fourth reinvention, not a new idea.

Two defects are shared, and they matter more than which model wins:

- **Select options are bare strings** in all four (`cms/types.ts:29-42`, `record-fields.ts:15-31`,
  `user-databases.ts`). Renaming an option orphans every row that used it. This is exactly the failure
  turtleOS ADR-0013 names: *a stored name where identity should be.*
- **Open vocabularies are trapped in schemas.** `core:Record.tags` is a `multi_select` of strings.
  `core:Tag` exists but nothing uses it (`core-ontology.ts:124-143`). Apps that need shared, user-extensible
  labels (FINANCE `Category`, Projects `Task.tags`) each invent their own.

The glossary itself is split on this. It maps the user-visible table to CMS collections (model 2) and
demotes `core:Collection` to a folder. Meanwhile the kernel special-cases model 3, and the product
direction from turtleOS (`os-sandbox/docs/notes/JOURNAL.md`, 2026-09-25) wants *"a globally scoped Database
with shared records we can use and reference everywhere, even across apps."*

## 2. The deciding axis: a type per table, or one row type plus a pointer?

Everything else follows from this choice.

| | **Type per table** (models 2, 4) | **One row type + `collectionId`** (model 3) |
|---|---|---|
| Query one table | `entitiesStore(client, Type)` | `entitiesStore(client, CollectionRecord, { where: { collectionId } })` |
| Query across tables ("all my records") | union over N registered types | one query |
| Create or delete a table | register a type, and deleting the table leaves the type behind. `kernel.deleteOntology` exists (`trellis-kernel.ts:703`), but the client SDK and server expose only register (`sdk.ts:347-386`, `POST /ontologies`), so the FINANCE test database left `Db_9cd9…` registered | create or retract a `CollectionMeta`. Nothing accumulates in the schema registry |
| Move a row between tables | re-create it under a new type (new id, references break) | one attribute write (`collectionId`); id and references survive |
| Per-table validation | native, by type | already implemented: `schema-middleware.ts` resolves `…/collections/<slug>/Record` from `collectionId` |
| Cross-app references (turtleOS goal) | need a type registry lookup to render | uniform: every row is a `CollectionRecord` |
| Schema change cost | re-register the type; clients rebuild the runtime (FINANCE `d5c8313` needed a settle protocol to survive this) | update the per-collection schema; the row type is stable |

Type-per-table gets validation "for free" and pays for it with registry growth (which clients can't
clean up), fragile moves, and union queries. Model 3 already has the validation, through the middleware. The only thing it lacks is
its status: it's labelled a demo when it's the model the kernel actually enforces.

## 3. Decision

1. **Adopt model 3 as the kernel's user-defined-collection primitive.** Promote `CollectionMeta` and
   `CollectionRecord` out of "demo-only" into `core-ontology.ts` as `tier: system` types (versioned,
   migratable; not `core`, so they can evolve). Keep the names, since the kernel middleware, the MCP tool and two
   clients already use them.
2. **Fields are data, compiled to the per-collection schema.** A collection's field list is durable graph
   data owned by its `CollectionMeta`. It is compiled into the `…/collections/<slug>/Record` schema that
   `schema-middleware.ts` already validates against. Field **keys** are stable ids assigned on creation,
   never derived from labels (as FINANCE's `f_xxxxxx` keys already are). Labels are display-only.
3. **Select options have identity.** An option is `{ id, label, color? }`. Rows store the option **id**;
   label and color are derived on read (turtleOS ADR-0013). This replaces `options?: string[]` in every
   field model. Legacy string options migrate by minting one id per distinct string.
4. **Shared, open vocabularies are `core:Tag` relations, not options.** When a label set should span
   collections or apps (categories, tags, people-ish lists), the field is a relation to `core:Tag` scoped by
   a parent tag. Options (3) are for vocabularies local to one field. This gives `core:Tag` its first real
   consumer and a migration path for `core:Record.tags`.
5. **`core:Collection` stays a folder.** It keeps the glossary meaning: optional grouping of any entities,
   including `CollectionMeta`s (sidebar sections, workspaces). It is not a table. Its `schema` and
   `recordType` fields are deprecated for table use.
6. **CMS collections (model 2) become a publishing projection, later.** Draft/publish and `cms.list` can
   read `CollectionRecord`s of a `CollectionMeta` flagged `cms: true`. Until that convergence ADR, `src/cms`
   is unchanged. Nothing in this ADR breaks it.
7. **Views stay app-side for now.** Saved views (filter/sort/group/projection) are graph entities in the
   FINANCE client (`View`) and prefs on `CollectionMeta.viewPrefs` in fractal-playground. Unifying them is
   out of scope here; see Open questions.

## 4. Consequences

### Positive

- One answer to "where do user tables live", matching what the kernel already enforces.
- No schema-registry growth per table. Moves keep ids, so references survive (ADR-0013).
- Cross-collection and cross-app queries are one query. This is the substrate for the turtleOS "records
  usable everywhere" goal and for `@entity` references.
- Option renames and recolors become attribute writes on the field, not data migrations on every row.
- `core:Tag` gets a purpose. `tsh` (turtleOS ADR-0016 §6) gets field metadata to derive vocabulary from.

### Negative / costs

- **The FINANCE client re-targets its compiler.** `compileDatabase` emits a per-collection schema over
  `CollectionRecord` instead of `defineType('Db_<id>')`. The browse layer keeps its manifest contract, but
  `GraphSource` needs a `where: { collectionId }` variant. No user data to migrate; the only database was a
  test and was deleted.
- **fractal-playground and realtime-app** migrate `options: string[]` → option objects (decision 3).
- **Per-collection validation lives in middleware, not in a registered type.** That path only runs when
  an op carries a `type` fact (`schema-middleware.ts:47-59`), so an update-only op may skip validation.
  That hole must be closed before relying on it (see Phases).
- The glossary, MCP tool docs and the two demos need rewording. "Demo-only" becomes "system tier".

### Neutral

- `core:Record`'s own fields (`title`, `description`, `status`, `tags`) are inherited by `CollectionRecord`.
  `tags` stays a string array until decision 4 migrates it.

## 5. Alternatives considered

- **`core:Collection` + `core:Record` (model 1).** This was the first instinct after finding it. Rejected: its own
  glossary scopes it to folders. `recordType` is a relation to a *record* entity, not to a schema. And
  `schema` is an untyped string with no reader or validator. Adopting it means building model 3 again
  under a less accurate name.
- **CMS TypeSchemas (model 2).** It has the best publishing story, but it is type-per-table (§2 costs), read-only in
  the kernel today, and its fields hide in a JSON `props` string.
- **Keep FINANCE `Database` + `Field` (model 4).** It works, and it has the best field model of the four (stable keys,
  colors). Rejected as the *storage* model for the §2 reasons. Its field model is what decisions 2–3 carry
  forward.
- **Leave all four.** Every new app would pick one at random, and cross-app references would never work.

## 6. Phases

1. **Spike (FINANCE client).** Re-point `user-databases.ts` at `CollectionMeta` + `CollectionRecord`, with
   option ids. Keep the app-manifest contract so nothing above `compileDatabase` changes. Exit: the
   2026-09-25 live scenario (create, rename, add properties, inline options, board) passes unchanged.
2. **Kernel promotion.** Move both types into `core-ontology.ts` (`tier: system`), make field + option
   shapes a shared kernel type, close the update-without-`type` validation gap, and update the glossary
   and MCP tool.
3. **Option identity everywhere.** Migrate fractal-playground and realtime-app. Provide a one-shot
   string→id migration helper.
4. **Tags.** `core:Tag` relations for shared vocabularies; plan `core:Record.tags` migration.
5. **CMS convergence** (separate ADR): CMS reads `CollectionRecord`s.

## 7. Open questions

1. **Where does the field list live durably?** Options: `Field` entities linked to the `CollectionMeta`
   (queryable, per-field history, what FINANCE does), or a JSON field on `CollectionMeta` (atomic, what the
   demos do). Either way the per-collection schema is *derived* from it.
2. **How is the per-collection schema registered and persisted?** Is it re-registered by each client on
   start (today's pattern), or stored in the graph and loaded at kernel boot?
3. **Views.** One saved-view entity for all surfaces (FINANCE `View`, fractal `viewPrefs`, turtleOS
   `Selection`)?
4. **Workspace scoping.** `CollectionMeta` has no workspace pointer, and neither do FINANCE pages. The graph isn't partitioned by
   workspace yet.
5. **`laneId` on `CollectionRecord`.** Is it a data field or a VCS concern? It probably belongs to the lane layer, not
   the row.
