# Spec: ADR 0018 Phase 1 — explicit create ids + field sync tiers

**Status:** ready for impl · **ADR:**
[0018](../adr/0018-explicit-ids-and-field-sync-tiers.md) · **Issues:** TRL-57
(proposal) / TRL-58 (spec)

## Goal

Ship the two kernel/SDK contracts that unblock per-entity durable worlds:

1. Caller-supplied entity ids on create
2. Field sync tier metadata + durable-write peel for derived / reject for
   realtime

**Out of scope:** tick/ECS, WorldBundle→EAV engine migration, CRDT conflicts,
browser-embedded kernel, hosted TurtleDB, `needs-e2e`.

## API — explicit ids

### CreateEntityOptions

```ts
export interface CreateEntityOptions {
  /** Stable id (e.g. entity:player-1). Omit → `${type.toLowerCase()}:${uuid}`. */
  id?: string;
}
```

### SDK signature (backward compatible)

Keep 3rd arg as links. Add optional **4th** options bag only (no 3rd-arg
`{ id }` overload — avoids ambiguity):

```ts
create(
  type: string,
  attributes?: Record<string, unknown>,
  links?: Array<{ attribute: string; targetEntityId: string }>,
  options?: CreateEntityOptions,
): Promise<string>
```

Mirror on `src/client/sdk.ts` and `src/client/sdk.browser.ts`.

### HTTP

`POST /entities` body may include `id`:

```json
{ "type": "Thing", "id": "entity:fixture-1", "attributes": {}, "links": [] }
```

| Case                                      | Result                                            |
| ----------------------------------------- | ------------------------------------------------- |
| Missing / empty `id`                      | Generate `${type.toLowerCase()}:${uuid}` as today |
| Whitespace-only `id`                      | **400**                                           |
| Non-empty `id` and `getEntity(id)` exists | **409** `{ error: "Conflict", id }`               |
| Non-empty new `id`                        | **201** `{ id, op }` with supplied id             |

Kernel `createEntity` unchanged (already accepts any id).

### Files

- `src/client/sdk.ts`
- `src/client/sdk.browser.ts`
- `src/server/server.ts` (`handleCreate`)
- `test/db/sdk.test.ts` — local explicit id + conflict
- Server/HTTP fixture test for 409 + round-trip (extend existing harness)

## API — field sync tiers

### Types (`src/core/ontology/types.ts`)

```ts
export type FieldSyncTier = 'durable' | 'realtime' | 'derived';

// on PropertyValueSpecification:
sync?: FieldSyncTier;
```

### Effective sync (`src/core/ontology/sync-policy.ts`)

```ts
effectiveFieldSync(field: PropertyValueSpecification): FieldSyncTier
```

- if `field.sync` set → use it
- else if `valueType` is `formula` | `rollup` OR `computed === true` → `derived`
- else → `durable`

### Write enforcement (Phase 1)

On durable `createEntity` / `updateEntity` attribute bags (shared path for SDK +
HTTP + CLI):

1. Resolve entity type → registered `SchemaDefinition` fields
2. For each attribute key in the mutation:
   - no field spec → allow (open-world)
   - `effectiveFieldSync` === `derived` → **strip** (silent peel)
   - `effectiveFieldSync` === `realtime` → **reject** (throw / 400) naming the
     field — use `trellis/realtime`
3. Persist remaining attrs

Prefer one helper/middleware so all entry points share behavior. No
realtime-room integration tests in Phase 1.

### defineType DX (`src/schema/define.ts`)

```ts
fieldSync?: Partial<Record<Extract<keyof Z, string>, FieldSyncTier>>;
```

Set `sync` on leaf `PropertyValueSpecification` from `fieldSync[name]`. Export
`FieldSyncTier` / `effectiveFieldSync` from the appropriate public surface.

### Files

- `src/core/ontology/types.ts`
- `src/core/ontology/sync-policy.ts` (new)
- `src/core/kernel/trellis-kernel.ts` and/or middleware
- `src/schema/define.ts`, `src/schema/index.ts`
- `test/schema/define.test.ts`
- `test/core/sync-policy.test.ts` (or extend `ontology.test.ts`)

## ADR closeout

When impl AC green: set ADR 0018 **Status: accepted** and cite impl issue id.
Engine WorldBundle migration is a Strategist follow-up — not this wedge.

## Acceptance criteria

1. `test:bunx vitest run test/db/sdk.test.ts`
2. `test:bunx vitest run test/schema/define.test.ts`
3. `test:bunx vitest run test/core/sync-policy.test.ts` (or ontology suite
   covering sync)
4. Optional id on local+browser `TrellisDb.create` and `POST /entities`; omit
   keeps `type:uuid`; duplicate → 409
5. Round-trip `entity:fixture-1` create → read same id (local + HTTP)
6. `PropertyValueSpecification.sync` typed; formula/rollup/computed → effective
   `derived`
7. Durable write strips `derived`; rejects `realtime` with clear error
8. `defineType({ fieldSync })` covered by define tests
9. ADR 0018 → accepted; WorldBundle migration not in this impl
