# ADR 0048: Types, Relations and Objects — an Anytype-Style Model

**Status:** Proposed (2026-09-28)
**Related:**
[0045](./0045-user-defined-collections.md) (user-defined collections: storage this builds on),
turtleOS [ADR-0013](../../../os-sandbox/docs/adr/0013-derived-references.md) (ids stored, names computed),
turtleOS [ADR-0016 §6](../../../os-sandbox/docs/adr/0016-tsh-command-language.md) (vocabulary from schema facts),
turtleOS [ADR-0018](../../../os-sandbox/docs/adr/0018-user-defined-collections.md) (turtleOS adoption of 0045)

**Proving ground:** `lab/apps/FINANCE/client-svelte` (as in ADR 0045).

---

## 1. Context

ADR 0045 gave user-defined tables one storage model. The model is still **Notion-shaped**: a database *owns*
its schema. A `CollectionField` belongs to exactly one collection, and code types (`defineType`) own their
fields in code. Three problems follow.

1. **The same property is several unrelated fields.** A "Due date" on Tasks, Projects and a user's Reading
   list are three definitions. "Everything due this week" can't be asked, and tsh (ADR-0016 §6) has no single
   vocabulary to read.
2. **Properties are defined five ways:** code schemas (`defineType` + overlays), `CollectionField` (ADR 0045),
   `TypeExtension` + `RecordExtra` (FINANCE, from markdown paste, with values kept in side entities off the
   record), CMS `props` JSON, and fractal-playground's `TypeField` (prior art).
3. **Types are invisible, and people are local.** Nothing in the UI tells you what an object *is*. Projects'
   `Person` is private to Projects, so a finance transaction can't point at the same person. `core:Person`
   and `core:Member` exist in the kernel but nothing uses them.

**Anytype** has a model that fits the graph better than Notion's:

- **Objects**: every entity. Each has exactly one **type**, always visible, and changeable.
- **Types** are objects too. A type lists the **relations** it recommends.
- **Relations** (properties) are global objects in the space, reused across types. "Due date" is one
  relation, whatever it's attached to.
- **Sets** are live queries by type or relation. **Collections** are hand-picked lists.

## 2. Decision

### 2.1 Three concepts, named in the UI

| Anytype | Here (storage) | UI word |
|---|---|---|
| Object | any entity | the record's title |
| Type | a code type (`defineType`) **or** a user type (`CollectionMeta`, ADR 0045) | **Type** |
| Relation | `trellis:Relation` (new, §2.3) | **Property** |
| Set | a saved `View` whose query selects a type or relation | the database page |
| Collection | `core:Collection` (already "a folder", ADR 0045 §3.5) | **Collection** |

ADR 0045's storage stays as it is. A user type *is* a `CollectionMeta`, and an object's `collectionId` *is* its
type. Kernel names don't change. Only the UI says **Type**.

### 2.2 Every object shows its type

The record page, the dialog stack and the property list show a **type chip** (icon + name) that links to the
type's page. A **Types page** lists every type, code-defined (read-only definition, tagged with its app) and
user-defined (editable), with its properties, its vocabularies and how many objects it has. Changing an
object's type (Anytype's "change type") is later work. For user types it's a `collectionId` write.

### 2.3 Relations are global graph entities

`trellis:Relation` (system tier) is a property definition that belongs to no single type:

```
Relation { key, label, valueType, options?, vocabulary?, description? }
```

- `key` is the attribute the value is stored under on the object. It is stable, and never derived from the
  label (ADR 0045 §3.2).
- A type references relations by id, in order (`relations: [relationId…]`). The same relation on two types is
  *the same property*, so one query spans both.
- **Values live on the object**, under the relation's `key`, in the open-world EAV. `RecordExtra`-style side
  entities are retired.
- `CollectionField` becomes *Relation + its place on one type*. Its `collection` and `order` move into the
  type's `relations` list. It isn't published yet (4.0.8 is pending), so it's folded into `Relation` rather
  than kept alongside.

### 2.4 Code types get relations too

Each code type's fields are mirrored as Relation entities (read-only, tagged with the app that owns them), so
the Types page and cross-type queries treat code and user types alike.

- **Default identity is per type and attribute** (`rel:<app>.<type>.<attr>`). `Project.status` and
  `Task.status` are different vocabularies, so they must not merge by accident.
- **Sharing is explicit:** an overlay can bind a field to a global relation (`due → rel:due`). That's how "due
  this week" comes to span Tasks and Projects.
- `TypeExtension` (properties added to a code type at runtime) becomes "attach a Relation to this type".
  Existing `RecordExtra` values are migrated onto their objects.

### 2.5 People are platform objects

`core:Person` is the one person type. Assignee, lead, "paid to" and similar fields are relations to it.
`core:Member` (a workspace user) links to its `Person`. `core:Person` declares only `name`; `email`, `role`
and avatar are relations on it. Projects' `Person` needs no data migration: its entities already have
`type: "Person"`, which resolves to `core:Person` once Projects stops registering its own schema.

In turtleOS, agents are people-like actors that can be assignees too (ADR-0018). That's out of scope here.

## 3. Consequences

**Positive**
- One property, one definition, which enables queries across types and a single vocabulary for tsh.
- Types become visible and navigable.
- People can be referenced across apps.
- The five property models collapse into Relation plus a type's list of relations.

**Costs**
- `Relation` is a new kernel type, and `CollectionField` must be replaced **before 4.0.8 publishes**, or
  kept and migrated later.
- Mirroring code types' fields as Relation entities needs an owner (the kernel at registration, or the
  app runtime) and a story for version changes (§5).
- `TypeExtension`/`RecordExtra` data needs a one-time migration.

## 4. Phases

1. **Visible types** (UI only, no model change). A type chip on the record page and dialog, and a read-only
   **Types** page listing code and user types with their properties, vocabularies and object counts.
2. **People.** Projects' `Person` becomes `core:Person` (typed handle, not registered), relations target it,
   and `Member` gets a `person` link.
3. **Relations.** Add the kernel `Relation` type, fold in `CollectionField`, mirror code types' fields,
   convert `TypeExtension`/`RecordExtra`, and let overlays bind shared relations.
4. **Sets across types and change-type.** Views that query by relation across types, and changing an object's
   type.

## 5. Open questions

1. **Who mirrors code types into Type/Relation entities?** The kernel on `registerType`, which is
   universal, or the app runtime, which is simpler. It also has to handle a code change that renames or
   removes a field.
2. **Is a user type's "recommended relations" list exclusive?** Anytype lets any object carry any relation.
   Our per-collection schema validates declared keys only and is open-world otherwise, so it's compatible,
   but the UI needs an "add a property to just this object" affordance.
3. **Does 4.0.8 ship `CollectionField`?** If it does, phase 3 migrates it; if not, it's replaced first.

## Addendum — FINANCE proving ground (2026-09-28)

**Phase 1** (FINANCE `cf9fb41`): the record page and dialog show a type chip that links to the type, and the
workspace **Types** page lists every type by app, with property kinds, vocabularies, paste-added properties
and object counts.

**Phase 2** (FINANCE `635bf8b`):
- **Relations resolve across apps.** A runtime answers for its own types, then falls back to a resolver
  installed by the apps layer (the browse layer stays app-agnostic). The resolver finds the app that owns the
  target type and starts it on first use. The start happens in a microtask, never inside the reaction asking,
  and a reactive version bump fills labels in afterwards. This closes the "relations can't cross apps" gap.
- **People are a platform app** on `core:Person` (a typed handle, not registered). Projects no longer
  defines `Person`. `lead`/`assignee` are unchanged, keep `rel('Person')`, and resolve across apps. Existing
  Person entities needed no migration. The People database moved from `/projects/people` to
  `/people/people`, and views saved under the old scope are orphaned.
- **Not done:** `core:Member` → `Person` (this app has no Member entities; workspace members aren't in the
  graph yet). Cross-app `@` mentions landed in `dcfd34c` (`mention-search` + `mention-registry`).

**Types as records** (FINANCE `dcfd34c`, 2026-09-28) — a client-track step *between* ADR phases 2 and 3
(see **Phase numbering** below). The Types page is now a browse surface, not a static directory:

- **`typesApp`** + **`ManifestTypeSource`** — one row per installed type (`app.database` id), object counts
  from each contributing runtime's source, views/search/filter/group via the generic `DatabaseBrowseShell`.
- **Open in the dialog stack** — `Record:type` projection (`type-page.svelte`): metadata properties +
  read-only schema table (including paste-added extension fields, marked "added"). Code types are
  read-only; user types link to **Open collection** and **Edit database** on the ADR 0045 route.
- **Type chip stacks in-dialog** — from a record dialog, the type chip pushes a type frame instead of
  navigating away. Hash deep links (`/types#type-{app}.{database}`) still auto-open the type dialog.
- **Browse layer stays app-agnostic** — type resolution lives in `resolve-type.ts`; cross-app `@` mention
  search is late-bound via `mention-registry.ts` (apps layer binds `mention-search` at init).

**Not done** (still before kernel Relations): graph `Type` entities backing the same UI (client **3b**),
inline schema editing inside the type dialog, `core:Member` → `Person`, finance↔projects cross-app links.

**Next** (ADR §4 phase 3 — **Relations**): kernel `trellis:Relation`, fold `CollectionField`, mirror code
types' fields as Relation entities, migrate `TypeExtension`/`RecordExtra`. The Types browse UI should
swap from `ManifestTypeSource` to graph-backed type rows without changing the surface.

### Phase numbering

ADR §4 and the FINANCE client use different phase numbers for the middle of the roadmap. This table
keeps them aligned:

| ADR §4 phase | FINANCE client track | What |
|---|---|---|
| 1 — Visible types | Phase 1 (`cf9fb41`) | Type chip + static Types directory |
| 2 — People | Phase 2 (`635bf8b`) | `core:Person` platform app, cross-app relation resolver |
| *(addendum)* | Phase 3 / **3a** (`dcfd34c`) | **Types as records** — manifest-derived browse + `Record:type` dialog |
| 3 — Relations | Phase **3b** + kernel work | `trellis:Relation`, field mirroring, extension migration |
| 4 — Sets / change-type | *(not started)* | Cross-type views, change an object's type |

**Rule of thumb:** ADR "phase 3" = kernel Relations. Client "phase 3" = types-as-records UI (manifest
first). Client "3b" = graph `Type` entities behind the same UI, still before Relations land.
