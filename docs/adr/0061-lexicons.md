# ADR 0061: Lexicons — named groups of types, with membership as data

**Status:** Proposed
**Date:** 2026-10-27
**Issues:** KRN-505 (relation ids; amends in-flight TRL-494), KRN-506 (Lexicon slice). Input to TRL-496, TRL-498, TRL-500
**Depends on:** [0048](./0048-types-relations-objects.md) (Types, Relations and Objects), [0045](./0045-user-defined-collections.md) (user-defined collections)
**Related:** turtlenote [ADR 0001](../../../../lab/apps/note/turtlenote/docs/adr/0001-workspace-ontology-navigation.md) (ontology nav sections), [`graph-ontology/registry.json`](../../../graph-ontology/registry.json) (extension grammar `[owner/]name@major`)
**Supersedes:** nothing
**Superseded by:** —

## Context

Every type belongs to a group. Four layers name that group differently, and none of them stores it as
graph data:

| Layer | Name | What it is | Where membership comes from |
| ----- | ---- | ---------- | --------------------------- |
| Kernel registry | `OntologySchema` (`src/core/ontology/types.ts`) | `{ id, name, version, entities, relations }` in the in-memory `OntologyRegistry` | a `register()` call. Not persisted, not synced |
| Kernel type registration | "ontology" (`createOntology`, `listOntologies`, `POST /ontologies`) | **one** type's `SchemaDefinition`. `defineType` mints `@id` = `trellis:<Name>`; core types are `core:<Name>` | none. The `@id` prefix is a tier (`trellis`, `core`), not a group |
| Kernel relations (TRL-494, uncommitted) | `owner: 'app:<app>'` | code relation id `rel:<app>.<Type>.<key>` | an `app` argument from the caller, else the `@id` prefix |
| Clients (turtlenote, FINANCE) | "app" | `AppManifest.databases`, `appName`, nav section `app:<appId>`, type descriptor id `<appId>.<databaseId>` | the app manifest |
| graph-ontology | extension | versioned document `[owner/]name@major` (`world@1`, `raster@1`) | a registry entry |

Four problems follow:

1. **"Ontology" means two things.** `OntologySchema` is a group of types; `createOntology` registers a
   single type. Neither reading is safe to assume.
2. **The group is an app.** An app is code: views, routes, a manifest. Grouping types by app means a
   user can't make a group, because users can't make apps. turtlenote puts every user type under one
   fixed "Custom types" section for this reason.
3. **Code relation ids depend on the caller.** `deriveCodeRelations(schema, app)` writes `app` into the
   id. Every `defineType` type has `@id: trellis:<Name>`, so a caller that passes no `app` gets
   `rel:trellis.Task.status` and a caller that passes `projects` gets `rel:projects.Task.status`. Derived
   relations aren't persisted, so this is harmless until something persisted points at one: a user type
   reusing a code relation in `CollectionMeta.relations`, or a shared-relation overlay (TRL-495). Then a
   different caller resolves a dangling id.
4. **Semantics live in the client.** Trellis owns semantics, but the grouping users see is defined by
   client app manifests. Another client (Studio, tsh, an agent over MCP) cannot read it.

## Decision

### 1. A lexicon is a named group of types and relations, stored in the graph

New system-tier type:

```
trellis:Lexicon { name, description?, icon?, color?, version?, readOnly? }
```

The UI word is **Lexicon**: the set of words a domain's graph can say. New kernel surface uses the same
word (`trellis:Lexicon`, `listLexicons()`, the `lexicon` fields below).

### 2. Two origins, the same pattern as relations

This follows decision 3 of 0048's phase 3 addendum (code relations derived on read, user relations
persisted):

- **User lexicons** are persisted, with id `lex:user.<slug>`. Users create, rename and delete them.
- **Code lexicons** are derived on read and never written to the op log. Each registered
  `OntologySchema` yields one (`lex:<OntologySchema.id>`), and so does each lexicon id declared through
  `SchemaDefinition.lexicon` (§3). Derived lexicons are `readOnly: true`.

Types that declare no lexicon belong to `lex:trellis`. In clients, an app that declares none passes its
app id, which keeps turtlenote ADR 0001 phase A (one app = one section) unchanged.

### 3. Membership is a field. Ids are opaque

- A **user type's** lexicon is `CollectionMeta.lexicon` (optional). If it's absent, the type is in the
  workspace's default user lexicon, which is what "Custom types" is today.
- A **code type's** lexicon is `SchemaDefinition.lexicon` (optional), set at registration.
- A **relation** gets an optional `lexicon` field. `owner` goes back to marking provenance only:
  `user` | `code`.
- **No code may split a type, relation or lexicon id to find a group, app or type.**
  `parseSchemaNamespaceAndType` reading an app out of `@id` is the existing case to remove.

### 4. Code relation ids come from the type alone

A code relation's id is `rel:<type @id>.<key>`, for example `rel:trellis:Task.status` and
`rel:core:Person.name`. A type's `@id` is already unique within a kernel, so this keeps 0048 §2.4's
per-type-and-attribute identity (`Project.status` ≠ `Task.status`) without the app. Every caller derives
the same id. Registration rejects attribute keys that contain `.`, so the id stays unambiguous.

User relation ids (`rel:user.<slug>.<key>`) are unchanged. They are minted once, stored, and opaque from
then on.

**Timing:** TRL-494 is uncommitted and nothing persisted references a derived id yet, so changing the
rule now costs nothing. Once TRL-495 overlays or user types reference code relations, it needs a
migration.

### 5. Names elsewhere stay as they are

- `OntologySchema` and `OntologyRegistry` keep their names in code. This follows 0048 §2.1's precedent:
  kernel names don't change, and only the UI uses the new word.
- `createOntology` / `listOntologies` are not renamed here. Docs call them type registration.
- Tag vocabularies: `Relation.vocabulary` keeps its name, and UIs say **tag set**, so "lexicon" and
  "vocabulary" don't compete as near-synonyms.
- Export: a lexicon is the unit that becomes a graph-ontology extension document. The exporter decides
  the mapping (lexicon id → extension `name`, `version` → `@major`) under TRL-498.

### 6. User relations on code types live in a per-type layer (input to TRL-496)

Code relations are derived on read, so a code type has no persisted relation list to add to. User-added
properties on a code type (today's client-side `TypeExtension`) need one:

```
trellis:TypeLayer { type: '<type @id>', relations: '[relationId…]' }   // user-owned, ordered
```

A type's relations are its code relations, in code order, followed by its layer's relations. Code
changes never touch the layer, and the layer never edits a code relation. TRL-496 turns each
`TypeExtension` row into user Relations plus one `TypeLayer` row. `RecordExtra` values move onto their
objects, as 0048 §2.4 already says.

## Alternatives considered

| Option | Pros | Cons | Why not |
| ------ | ---- | ---- | ------- |
| A — `trellis:Lexicon`, membership as a field (chosen) | Users can create groups; every client reads the same grouping; ids stay stable | One more system type and derived projection | — |
| B — Keep "app" as the group | No work | Users can't create groups; grouping stays in client manifests | Problems 2 and 4 |
| C — Use `OntologySchema` as is | Already exists | In memory only, not synced, code-only | Users can't create one; other peers never see it |
| D — Put the group in ids (`rel:<app>…`, `<appId>.<databaseId>`) | Readable ids | Moving a type or renaming a group changes identity; ids depend on the caller | Problem 3 |
| E — Call it "Ontology" | Already in specs | Already means a single type (`createOntology`); jargon in the UI | Ambiguous |
| F — "Namespace" / "Domain" / "Schema" | Familiar | "Namespace" implies the group is in the id, which §3 forbids; "domain" collides with web domains; "schema" already means one type's definition | Each misleads |

## Consequences

### Positive

- Users can create groups (for example "Reading": Book, Author, Quote). User types are no longer one
  fixed bucket.
- Every client and agent reads the same grouping from the graph.
- Code relation ids are deterministic.
- Export gets a natural unit: lexicon → graph-ontology extension.

### Negative / tradeoffs

- One more system-tier type, and one more derived-on-read projection to keep in step with registration.
- **AT Protocol uses "Lexicon"** for a single schema document per NSID (`app.bsky.feed.post`), and
  groups schemas by NSID namespace. Readers from that ecosystem will expect one lexicon per type, and
  may assume interop. Docs should say plainly that a Trellis lexicon is a group of types.
- TRL-494 must change its code relation id rule and its `owner` values before it is committed (§3, §4).
- Clients rename `appName`, "By app" and `app:<appId>` nav ids to lexicon terms. Behavior doesn't
  change while one app = one lexicon.

### Follow-ups

- [x] KRN-505 (amends TRL-494): code relation ids per §4; `owner` = `user` | `code`; optional `lexicon` on relations;
      stop parsing the app out of `@id`
- [ ] KRN-506: `trellis:Lexicon`, `SchemaDefinition.lexicon`, `CollectionMeta.lexicon`,
      `listLexicons()` (persisted + derived)
- [ ] TRL-496: `trellis:TypeLayer` per §6
- [ ] TRL-498: lexicon → extension mapping at the exporter boundary
- [ ] TRL-500 and turtlenote ADR 0001: group by lexicon; "Custom types" becomes the default user lexicon
- [ ] Later, optional: let a user file a code type under a user lexicon (`TypeLayer.lexicon`)
- [x] Update `docs/adr/README.md` index

## Addenda

<!-- Append dated notes here. Do not rewrite accepted decision text above. -->
