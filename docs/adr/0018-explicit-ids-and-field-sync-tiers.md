# ADR 0018 — Explicit entity ids + field sync tiers

**Status:** accepted (2026-07-10) **Related:**
[0009](./0009-kernel-formula-syntax.md) (kernel formulas = derived-on-read),
[0010](./0010-kernel-rollups-and-relations.md),
[0016](./0016-relay-blob-serving.md) (blob byte tier), `src/client/sdk.ts`,
`src/server/server.ts`, `src/core/ontology/types.ts`,
`src/core/ontology/sync-policy.ts`, threlte-skeleton `durableStore.ts` /
`docs/ontology.md`

**Impl:** TRL-64 (Phase 1; branch
`issue/TRL-63-impl-adr-0018-phase-1-explicit-create-id`) · Spec:
[docs/specs/0018-phase-1-explicit-ids-sync-tiers.md](../specs/0018-phase-1-explicit-ids-sync-tiers.md)

## Context

Downstream game worlds (threlte-skeleton) already speak Trellis’s language —
entities, attribute bags, durable vs ephemeral state — but today they store a
whole JSON-LD graph as one **`WorldBundle` blob** and **poll + diff** for
durable edits. The engine’s own comment names the blocker:

> A true push requires per-field EAV entities (blocked on Trellis `create`
> accepting explicit `entity:*` ids).

That blocker is real at the **SDK / HTTP boundary**, not in the kernel:

| Layer                               | Behavior today                     |
| ----------------------------------- | ---------------------------------- |
| `TrellisKernel.createEntity(id, …)` | Accepts any caller-supplied id     |
| CLI `trellis entity create --id`    | Passes explicit id through         |
| `TrellisDb.create(type, attrs)`     | Always generates `${type}:${uuid}` |
| `POST /entities`                    | Same — ignores any client `id`     |

So JSON-LD authors cannot mint stable `entity:player-1` nodes that survive
reload and match the world file. Without stable ids, per-entity EAV and
attribute-level live subscribe never become the primary durable path.

Separately, the engine has a clean three-tier field model that Trellis lacks as
schema metadata:

| Policy     | Stored in op-log?   | On the wire?       | Computed?              |
| ---------- | ------------------- | ------------------ | ---------------------- |
| `durable`  | yes                 | on edit / spawn    | no                     |
| `realtime` | no (ephemeral mesh) | high-freq by owner | no                     |
| `derived`  | no                  | never              | locally (tick or read) |

Kernel formulas / rollups ([0009](./0009-kernel-formula-syntax.md),
[0010](./0010-kernel-rollups-and-relations.md)) already cover
**derived-on-read**. `trellis/realtime` already covers **ephemeral fan-out**.
What is missing is a single ontology field flag so Studio, MCP, and games share
one vocabulary instead of three ad-hoc persistence stories.

## Decision

### 1. Explicit ids on create (SDK + HTTP)

Extend create so callers may supply an id; omit → keep today’s
`${type.toLowerCase()}:${uuid}` generation.

```ts
// SDK — additive overload / options bag (no break of create(type, attrs))
await db.create("Thing", { label: "Player" }, { id: "entity:player-1" });
// or:
await db.create("Thing", attrs, links, { id: "entity:player-1" });
```

```http
POST /entities
{ "type": "Thing", "id": "entity:player-1", "attributes": { … } }
```

**Rules:**

- Id must be a non-empty string; recommend `prefix:slug` / `prefix:uuid`.
- If the id already exists → **409 Conflict** (do not overwrite).
- Server and browser SDK must honor the same contract as local kernel.
- Auto-generated ids remain the default for Studio CRUD and agents that do not
  care about stable external identity.

Kernel `createEntity` needs no change.

### 2. Field sync tier on ontology properties

Add an optional `sync` (or `syncPolicy`) on `PropertyValueSpecification`:

```ts
export type FieldSyncTier = "durable" | "realtime" | "derived";

export interface PropertyValueSpecification {
  // …existing fields…
  /**
   * Persistence / replication policy.
   * - durable (default): KernelOp / causal op-log
   * - realtime: ephemeral mesh only — never append to causal history
   * - derived: computed locally; strip from durable writes
   */
  sync?: FieldSyncTier;
}
```

**Defaults:**

- Omitted → `durable` (today’s behavior).
- `valueType: 'formula' | 'rollup'` or `computed: true` → treat as `derived`
  even if `sync` omitted (align with peel-formulas-out-of-writes).
- `defineType` / schema DX gains `sync('realtime')` (or field option) so typed
  schemas can declare tiers without raw ontology JSON.

**Runtime obligations (phased):**

| Tier       | Mutate path                                                                 | Subscribe / wire       |
| ---------- | --------------------------------------------------------------------------- | ---------------------- |
| `durable`  | `KernelOp` as today                                                         | Live EQL / entity subs |
| `realtime` | Reject or no-op on durable mutate; client uses `trellis/realtime`           | Ephemeral room only    |
| `derived`  | Strip / reject on durable write; evaluate on read (existing formula/rollup) | Never replicate        |

Phase 1 ships the **schema metadata + strip/reject on write**. Phase 2 wires
middleware enforcement and SDK helpers. Games keep their own tick-derived
evaluator; kernel derived stays read-time.

### 3. Per-entity durable worlds (consequence, not a separate product)

With (1), threlte-skeleton (and Studio collections) can map each Thing to a
Trellis entity and each durable component field to an attribute (or
`Component.field` path fact). Live subscribe on

```
find ?e where ?e type Thing
```

(or per-id `useEntity`) then fires on attribute updates — retiring WorldBundle
poll+diff as the _primary_ durable path. Blob store
([0016](./0016-relay-blob-serving.md)) remains for GLB/bytes; the graph owns
which hash a field references.

WorldBundle may remain a **seed / import** format, not the live store shape.

## Sketch — game component → Trellis schema

```ts
import { defineType, sync } from "trellis/schema";
import { z } from "zod";

// Illustrative — sync() helper lands with this ADR’s Phase 1 schema DX.
const Transform = defineType("Transform", {
  // Nested bags may flatten to Transform.position etc. via existing jsonEntityFacts
  position: z.tuple([z.number(), z.number(), z.number()]),
  rotation: z.tuple([z.number(), z.number(), z.number(), z.number()])
    .optional(),
  scale: z.tuple([z.number(), z.number(), z.number()]).default([1, 1, 1]),
}, {
  fieldOptions: {
    position: { sync: "realtime" },
    rotation: { sync: "realtime" },
    scale: { sync: "durable" },
  },
});

const Thing = defineType("Thing", {
  label: z.string().optional(),
  // component bags as json or flattened attrs — engine chooses projection
}, {/* … */});

// Stable id from JSON-LD @id
await db.create("Thing", { label: "Hero" }, { id: "entity:hero" });
await db.update("entity:hero", {
  "Transform.scale": [1, 1, 1], // durable → KernelOp
});
// Transform.position patches go through realtime room, not db.update
```

Engine side (target state): drop `TrellisDurableStore` poll; subscribe to entity
set + apply attribute patches; keep tick/ownership/physics local.

## Consequences

**Positive**

- Unblocks per-entity EAV durable sync for games and any content-addressed
  authoring format with stable ids.
- One sync vocabulary across kernel, Studio, MCP, and engines.
- Preserves “servers never own state”: realtime stays ephemeral; derived never
  hits the op-log; relay still only moves bytes
  ([0016](./0016-relay-blob-serving.md)).

**Negative / costs**

- Create API gains an options surface; remote clients must learn
  409-on-conflict.
- Schema authors must think about tiers (default durable keeps the footgun
  small).
- Enforcing `realtime` rejection on durable mutate needs middleware + tests.
- Migrating threlte-skeleton off WorldBundle is engine work, not automatic.

**Out of scope (explicit non-goals)**

- Per-frame tick / ECS in the kernel.
- CRDT conflict resolution for concurrent durable field writes (separate ADR;
  VCS reconciler remains file-oriented until SPEC-v1.1 fact-level work).
- Hosted TurtleDB / browser-embedded kernel (related gaps; not this decision).
- Changing auto-id format for callers that omit `id`.

## Acceptance criteria (implementation)

1. `POST /entities` and `TrellisDb.create` / browser SDK accept optional `id`;
   conflict → 409; omit → existing uuid scheme.
2. Round-trip test: create `entity:fixture-1`, read back same id (local +
   remote).
3. `PropertyValueSpecification.sync` typed + documented; formula/rollup default
   to derived semantics on write strip.
4. Unit test: durable write of a `sync: 'derived'` field is stripped or
   rejected.
5. ADR marked **accepted** when (1)–(4) land; engine migration tracked as a
   follow-up issue, not a gate for this ADR.
