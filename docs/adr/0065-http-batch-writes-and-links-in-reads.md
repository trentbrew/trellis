# ADR 0065: HTTP batch writes with a command id; links in entity reads

**Status:** Proposed
**Date:** 2026-11-19
**Issues:** —
**Depends on:** [0018](./0018-explicit-ids-and-field-sync-tiers.md) (explicit ids, durable/realtime tiers), [0021](./0021-canonical-op-hashing-and-provenance.md) (op provenance), [0058](./0058-command-id-in-provenance.md) (`commandId` in provenance)
**Related:** turtleos (turtlehq) ADR 0006 (host tsh, read-only); os-sandbox ADR-0044 (host tsh writes: one undo frame and one `commandId` per command), ADR-0048 (packs)
**Supersedes:** nothing
**Superseded by:** —

## Context

`trellis db serve` is now a machine's hub: turtleOS keeps durable state in it and other processes reach it over HTTP, since the server must stay the only writer to its database. Two clients hit the same two gaps:

- **No multi-entity write.** `turtle pack install` writes a collection, its fields, seed rows and the workspace manifest as separate `POST`/`PUT`s, so an install isn't atomic: a failure partway leaves part of a pack, and the client has to delete what it wrote. Host tsh writes (os-sandbox ADR-0044) need one command to be one undo frame. Over HTTP that isn't possible today.
- **No command id over HTTP.** ADR 0058 put `commandId` in op provenance, but the REST handlers build provenance from the transport alone (`origin: 'http'`). An HTTP client can't say "these ops are one command", so undo-by-command and audit can't see HTTP writes as commands.
- **No links in reads.** `GET /entities` and `GET /entities/:id` return facts only (`entityRecordToPlain`), so a client can't follow relationships (`memberOf`, `blockedBy`, a collection's relation fields) without a query per entity. tsh's `linked` clause and relation columns have nothing to read.

The kernel already has what's needed. `mutate()` runs middleware over the whole op before applying anything, so one op is atomic, schema validation included; replay ignores the op `kind` and applies deletes then adds; and `OpProvenance.commandId` exists.

## Decision

### 1. `POST /batch`: several entity writes, one op

```http
POST /batch
{ "commandId": "cmd:pack:…",            // optional
  "actions": [
    { "op": "create", "id": "…", "type": "…", "attributes": { … }, "links": [{ "attribute": "…", "targetEntityId": "…" }] },
    { "op": "update", "id": "…", "attributes": { … } },
    { "op": "delete", "id": "…" },
    { "op": "link",   "source": "…", "attribute": "…", "target": "…" },
    { "op": "unlink", "source": "…", "attribute": "…", "target": "…" } ] }
→ 201 { "op": "trellis:op:…", "commandId": "…", "created": ["…"] }
```

- **One op, all or nothing.** Actions are applied in order to a batch-local view of the touched entities (stored facts plus earlier actions in the batch), and the net difference becomes **one** `mutate()` call: facts and links to add, facts and links to delete. Middleware validates the whole op; if it throws, nothing is written. Later actions see earlier ones: create then update, or create then link, in one batch.
- **Same rules as the single-entity routes.** `create` stamps `type` and `createdAt` (unless given), refuses an existing id (409), and drops realtime-tier attributes (ADR 0018) like `POST /entities`; `update` replaces each attribute's values and stamps `updatedAt` like `PUT`; `delete` removes every fact and link. Permissions are checked per action, as on the single routes. `update` and `delete` of an entity that doesn't exist are 404s.
- **The command id goes into provenance.** `commandId` lands in the op's `provenance.commandId` (ADR 0058) beside the HTTP surface's `origin` and `actorType`, so the op log shows the batch as one command. Absent, the op has no command id, as today.
- **Op kind.** The op is stored with the kind of what it mostly does (`addFacts` when it adds facts, else `addLinks`, `deleteFacts`, `deleteLinks`). Replay doesn't depend on it.
- **Limits.** At most 1,000 actions per batch; an empty batch is a 400.

### 2. Links in reads, on request

`GET /entities/:id?links=1` and `GET /entities?…&links=1` add an `@links` array to each entity: its links as the store holds them, `{ e1, a, e2 }`. The key is `@`-prefixed so it can't collide with an attribute called `links`, and it's opt-in so existing clients see the same JSON.

## Consequences

- `turtle pack install` becomes one batch: atomic, with its command id in the op log, and its client-side rollback goes away.
- Host tsh can implement writes as one batch per command, which is ADR-0044's one-undo-frame-per-command rule over HTTP. Undo then means inverting that one op.
- Clients can read relationships without N queries.
- A batch is one op, so one large batch is one large op row. The 1,000-action cap keeps that bounded.
- The batch-local view is computed in the server from the store and the actions, so it doesn't see concurrent writes between reads and `mutate()`. The server is single-threaded per tenant and `mutate()` is awaited without yielding between computing and applying in the common path, but the batch isn't a transaction across separate requests.

## Alternatives considered

- **A transaction protocol (begin/commit over several requests).** Rejected: needs server-side session state and timeouts for what one request already expresses.
- **Raw op upload (`POST /ops` with facts and links).** Rejected for now: it bypasses the entity rules (`createdAt`, realtime filtering, 409 on existing ids, permissions per type) that clients would then reimplement. Sync already has its own path for raw ops.
- **Links always in reads.** Rejected: changes the JSON every existing client parses, and `@links` can be large for hub entities with many relations.

## Addendum — 2026-11-19: apply a delta; full ops by command id

Host tsh (turtleos) writes collection records and undoes commands through os-sandbox's dispatcher, whose whole write path is one call: write this exact delta (facts and links to add, facts and links to delete) as one op. Undo is that call with an op's two lists swapped, and its conflict check scans later ops for the same entity and attribute. Two additions serve it.

### 3. `POST /batch { apply }`: an exact delta as one op

```http
POST /batch
{ "commandId": "cmd:…", "apply": { "kind": "addFacts",   // or addLinks, deleteFacts, deleteLinks, undo, redo
                                    "facts": [{ "e": "…", "a": "…", "v": … }], "links": [{ "e1": "…", "a": "…", "e2": "…" }],
                                    "deleteFacts": [ … ], "deleteLinks": [ … ] } }
→ 201 { "op": "trellis:op:…", "commandId": "…" }
```

One `mutate()`, so middleware (schema validation) runs over the whole op and nothing is written if it refuses (422). The entity conveniences of `actions` don't apply: no stamps, no 409 on existing ids, no realtime-attribute filtering, because the caller said exactly what to write. Permissions are checked per touched entity type. Up to 5,000 entries; an empty apply or an unknown `kind` is a 400. `apply` and `actions` are separate request shapes.

### 4. `GET /ops?full=1&commandId=…`

`full=1` returns whole ops (`facts`, `links`, `deleteFacts`, `deleteLinks`, `provenance`, `previousHash`) instead of summaries, so a client can invert an op and look for later ops that touch the same attributes. `commandId` keeps ops whose `provenance.commandId` matches (ADR 0058). Both compose with the existing `kind`, `entity`, `limit` and `offset` filters.

### Why the log is enough for undo

`/batch` writes the net difference, so an op already holds the old values it replaced (`deleteFacts`) and the new ones (`facts`). Undo needs nothing stored beside it: it writes `apply` with the lists swapped, under its own command id, after checking that nothing later touched the same entity and attribute.

## Addendum — 2026-11-19: facts in reads

### 5. `?facts=1`: every stored fact

The flat attributes in `GET /entities` keep one value per attribute (the last), so a client that computes a delta from them can't see a second value. A host tsh `unset` or `untag` then deletes one fact and leaves the other, and the undo it records inverts the wrong delta.

`GET /entities/:id?facts=1` and `GET /entities?…&facts=1` add `@facts: [{ e, a, v }]` to each entity: every stored fact, `type` and repeated values included, values as stored. It follows `@links` (§2): opt-in, under a key no attribute can be called, composes with `links=1`, and leaves the flat attributes and existing clients unchanged. A client computing a write should read pre-images from `@facts`, not from the flat attributes.
