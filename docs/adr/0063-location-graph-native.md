---
title: ADR 0063: Location is graph-native, not a property type
description: No location PropertyType; Place entities plus role relations and numeric coordinates; text stays a label; geocoding is an adapter/cache.
created: 2026-10-27
updated: 2026-10-27
status: accepted
---

# ADR 0063: Location is graph-native, not a property type

**Status:** Accepted
**Date:** 2026-10-27
**Issues:** TRL-78 (Locations 3D tactical observatory — os desk graph)
**Depends on:** [0045](./0045-user-defined-collections.md) (user-defined collections), [0048](./0048-types-relations-objects.md) (types, relations, objects)
**Related:** [0018](./0018-explicit-ids-and-field-sync-tiers.md) (field sync tiers), [0032](./0032-identity-addressed-clone.md) (identity-scoped entities)
**Supersedes:** [`docs/specs/geodata-proposal.md`](../specs/geodata-proposal.md) as the decision of record for location. Spatial predicates, federated geometry, and the full geodata layer remain future work.
**Impacted components:** kernel ontology (`src/core/ontology/types.ts`, `core-ontology.ts`), collection compile (`src/core/ontology/collections.ts`), `trellis-client` locations surface (`app/lib/locations/`), Turtle Note entity schema. No kernel code change is required by this ADR.

## Context

Trellis has no first-class geographic property type. `PropertyTypeSchema`
(`src/core/ontology/types.ts`) is a closed set — `title`, `rich_text`, `number`,
`select`, `date`, `relation`, `json`, and the rest — with no `location`, `geo`,
`coordinates`, or `point`. `core:Event.location` is `rich_text`
(`src/core/ontology/core-ontology.ts`), not structured geography. That is
intentional at the kernel layer: types are schema, values are EAV facts.

The application layer already has a location model, though it is implicit:

- `trellis-client/apps/web/app/lib/locations/extract-pins.ts` maps `event`,
  `trip`, and `appointment` entities to map pins.
- It reads flat `latitude` / `longitude` fields when present.
- Otherwise it falls back to the text fields `location` (events/appointments) or
  `origin` / `destination` (trips) and geocodes them through
  `server/api/geocode.get.ts`.
- Results are cached (`app/lib/locations/geocode-cache.ts`); the graph is not
  rewritten with provider coordinates.

So three different things are currently called "location":

1. **A place** — a durable thing with coordinates and a name ("Ferry Building").
2. **A role** — how a record relates to a place ("happened at", "departed from",
   "going to").
3. **A label** — human text on a record ("Ferry Building, SF"), which may be
   geocoded on demand.

A `location` property type would collapse all three into one column and force
every editor, renderer, import/export, and query path to grow a geo case. The
2026-07-31 geodata proposal reached the same conclusion from the other direction:
"the graph is primary, geometry is just one projection of it." Its implementation
plan, however, never landed (all four target paths are gone), and it overreached
toward a full GIS stack.

## Decision

### 1. No `location` property type

`PropertyTypeSchema` stays closed. Do not add `location`, `geo`, `coordinates`,
or `point` as kernel property types. Location is modeled with the primitives
Trellis already has: entities, relations, and typed fields.

### 2. Places are entities

A place is a record, not an attribute. It may become a core type later
(`core:Place`); today a user-defined `Place` collection is sufficient and does
not require a kernel release. A place carries:

- `title` — the display name.
- `latitude` / `longitude` — `number` fields, WGS84 decimal degrees. These names
  are the compatibility contract with the existing map extractor.
- `address` — optional `rich_text`.
- `geometry` — optional `json`, a GeoJSON object, validated by the consumer
  (app-side schema), not the kernel.

`json` is deliberate: geometry is opaque to the EAV kernel and must not become a
second schema language. Consumers that need shapes validate them; consumers that
only need pins ignore the field.

### 3. Roles are relations

How a record points at a place is a relation, not a string:

- `locatedAt` — the general case.
- `origin` / `destination` — travel roles.
- Domain-specific roles (`venue`, `meetingPoint`, …) are user relations.

A record MAY also keep a text label (`core:Event.location`, trip
`origin`/`destination`) for display and for data that has not been geocoded. The
label is never the source of truth for coordinates; it is a query seed.

Cardinality is one place per role by default; multi-place roles use a
multi-value relation. That is a schema decision per type, not a kernel change.

### 4. Text `location` stays

`core:Event.location` remains `rich_text`. It is the human-entered label and the
offline fallback. It MUST NOT be parsed as a structured coordinate or used as an
identity for a place. A geocoder may resolve it to coordinates, but that result
is a candidate, not a fact.

### 5. Geocoding is an adapter and a cache

Geocoding lives outside the kernel (today: server route plus cache in
`trellis-client`). Provider results are keyed by normalized query + provider +
locale, cached with a TTL, and never written silently into graph truth.
Promoting a geocode result to a durable `Place` is an explicit user/agent action
that creates or links an entity.

### 6. Compatibility with today's flat fields

Existing entities with flat `latitude` / `longitude` remain valid. The map
extractor reads them as a place-in-progress: if coordinates are present, show
the pin; if not, geocode the label. Linking to a `Place` entity is additive and
does not require a migration. When both exist, the relation wins for identity
and the flat fields may be backfilled or left as a denormalized cache.

## Consequences

**Positive**

- Zero kernel surface change: no new property type, no editor/renderer/query
  branches, no tarball churn.
- One model spans Turtle Note, the Trellis locations page, and future
  world/geodata work: a place is a node, a visit is an edge.
- The existing locations surface keeps working; adopting `Place` relations is
  incremental.
- Coordinates and labels have different lifecycles, so they can be edited,
  attested, and synced independently.
- Text-only data remains first-class; no forced geocoding, no provider
  dependency.

**Negative / cost**

- A place is a second write (create/link) rather than a single column edit.
  Editors must offer "create place from this label."
- Deduplication becomes a graph problem (the same café entered twice), requiring
  identity/merge policy later.
- Spatial predicates (`within`, `intersects`) are not available from this
  decision. They remain a future query-layer feature over `json` geometry or an
  index.
- Consumers must agree on the `latitude` / `longitude` names and the GeoJSON
  profile; these are conventions, not kernel-enforced.

**Neutral**

- Does not decide the `core:Place` tier. A user-defined `Place` collection can
  ship first; promoting it to core is additive.
- Does not adopt the 2026-07-31 proposal's address-space hierarchy, federated
  GIS, or attestation model. Those remain optional future layers.
- Does not change `core:Event.location` semantics.

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Add `location` to `PropertyTypeSchema` | Permanent kernel/editor/query surface for a domain concept; collapses place, role, and label into one value; every consumer grows a geo branch. |
| Store `{ lat, lng, label }` in `json` only | No identity, no relations, no dedup, no graph queries; coordinates and labels still have different lifecycles. Acceptable as an interim app-side shape, not as the model. |
| Keep everything as flat `latitude` / `longitude` fields | Works for pins, but cannot express roles, provenance, or "same place" across records; duplicates forever. |
| Adopt the full graph-native geodata proposal now | Unshipped, stale paths, and far broader than the current need (spatial predicates, federation, attestation). This ADR is the decision of record; the proposal is prior art. |

## Follow-up

- `trellis-client`: extract a `placeFromEntity` adapter that prefers a linked
  `Place` relation and falls back to flat coordinates/label (no behavior change
  required for v0).
- Turtle Note: location v0 is a `Place` collection plus `locatedAt`; no kernel
  work.
- If `core:Place` is promoted, it starts as a thin type (`title`, `latitude`,
  `longitude`, `address`) and does not add a property type.
- Create a spec/issue only when a consumer needs spatial predicates or federated
  places; until then this ADR is the whole commitment.
