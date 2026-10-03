# ADR 0058: `commandId` in op provenance — durable per-command undo targeting

**Status:** Accepted
**Date:** 2026-10-02
**Issues:** TRL-176 (this) · TRL-175/TRL-174 (tsh write layer, where the deferral originated) · ADR-0016 §7 (tsh command language — `undo <commandId>`)
**Depends on:** [0021](./0021-canonical-op-hashing-and-provenance.md) (canonical op hashing + provenance; the null-slot technique)
**Related:** os-sandbox ADR-0035 (write-layer gate) · ADR-0004 (mutation tagging)
**Supersedes:** nothing

## Context

ADR-0016 §7 specifies that every op a tsh command emits carries a per-command `commandId`, so `undo <commandId>` can target one command durably — not just "the last command in this session".

Today that is **not possible**:

- `OpProvenance` (`src/core/persist/canonical-op.ts:35`) is `{ actorType, origin }` — no command/correlation field.
- The guest `buildMutationTag` (`os-sandbox/lib/zone-context.mjs:28`) has no slot for it either.
- The tsh write layer (TRL-175/TRL-177) therefore uses a **session-tier** `cmd:<n>` id held in the undo stack — it works within a connection but is lost on reload and cannot be queried from the op log.

The blocker is **placement + hashing**, not the feature. The op hash covers `provenance` **wholesale**: `hashKernelOp` → `canonicalPreimage` → `toCanonicalBody` → `canonicalProvenance`, which emits exactly `{ actorType, origin }`. Any change to that object changes the hashed bytes, so the decision must preserve the verify-old-ops guarantee.

**ADR-0021 already solved this class of problem** and left the precedent in the source: a provenance slot may be added **normalized to `null` when absent** ("Phase-A ops keep verifying, and provenance lands without a second preimage break" — `canonical-op.ts:27-34`).

## Decision

### 1. Add `commandId` to `OpProvenance`, normalized to null when absent

```ts
export interface OpProvenance {
  actorType: 'user' | 'machine' | 'ai';
  origin: 'cli' | 'sdk' | 'http' | 'mcp' | 'sync' | 'migration' | 'cron';
  /** Per-command id (ADR-0016 §7) — null when the caller does not group a command. */
  commandId?: string | null;
}
```

`canonicalProvenance` emits `commandId` **always**, `null` when absent — the ADR-0021 null-slot technique. This keeps the canonical shape stable: an op minted without a commandId hashes with `"commandId":null`, and every future op does too, so verification is deterministic.

**This is a preimage-affecting change for newly minted ops** (their hashes differ from what the old shape would produce) — that is acceptable and expected: hashes are content addresses, not external references; **old ops are not re-hashed** and continue to verify against their stored `payload` bytes, which simply lack the key. The null slot exists so the *shape* is stable going forward, not to preserve old hashes.

**No separate op column.** A column would fragment provenance across two storage locations (the hashed body and the row), and `commandId` is provenance — it answers "which command produced this op", exactly what `actorType`/`origin` answer. Keeping it in `OpProvenance` keeps the fitness test (`provenance-coverage.test.ts`) enforced at mint.

### 2. Mint sites populate it; the guest threads it through

- `buildMutationTag` (os-sandbox) gains an optional `commandId`; tsh's `writeTag()` passes its session `cmd:<n>`.
- `mutationTag` (`guest/graph.js`) forwards it into the ctx provenance.
- The mint path (`trellis-kernel.ts`) carries `ctx.provenance.commandId` into the op body unchanged.

The session-tier id becomes the durable id: no second source.

### 3. `undo <commandId>` reads the op log, not session memory

With the id in provenance, `undo <commandId>` resolves its target by scanning the op log for the matching `commandId` (replayable, survives reload) instead of the in-memory undo stack. Session undo (`undo`) keeps working; the commandId path is the durable superset.

### 4. Hashing review (required by the deferral)

- `canonicalProvenance` change is the **only** preimage change; it adds one key.
- `provenance-coverage.test.ts` (fitness) must be updated so a mint site that omits `commandId` still passes (null is valid) — the test enforces *declared* provenance, not the presence of every optional field.
- A round-trip test: mint with a commandId → hash → persist → read → `verifyOpHash` true; and a legacy op (no commandId) still verifies.

## Alternatives considered

| Option | Pros | Cons | Why not |
| ------ | ---- | ---- | ------- |
| **A — `commandId` in `OpProvenance`, null-normalized (chosen)** | provenance stays one place; fitness test covers it; ADR-0021 precedent | preimage change for new ops; hash of a given op changes vs the old shape | — |
| B — separate `command_id` column on the op row | no preimage touch; queryable directly | provenance split across row + hashed body; a commandId outside the hash is forgeable/unaudited; two write paths | rejected |
| C — session-tier only (status quo) | zero change | not durable; `undo <commandId>` dies on reload; not queryable | rejected (ADR-0016 §7 unmet) |
| D — overload `origin` with `cli:cmd-3` | no new field | origin is a bounded transport enum; smuggling a command id breaks its meaning and the coverage test | rejected |
| E — new `Command` entity + link per op | rich, queryable | an entity per command for a correlation id is heavy; the op log already records the command's ops | rejected for v1 |

## Consequences

### Positive

- ADR-0016 §7's `undo <commandId>` becomes implementable durably; session undo is a special case.
- Provenance stays single-sourced and hash-covered (no unaudited side channel).
- Reuses the ADR-0021 null-slot pattern — no new hashing technique.

### Negative / tradeoffs

- The canonical body changes shape for new ops (one key); any external tool that hardcodes the preimage must normalize the same way (the canonicalizer is the contract).
- One more optional field to thread through `buildMutationTag` → mint.

### Follow-ups

- [ ] Update `docs/adr/README.md` index (trellis-node ADR series)
- [ ] Link TRL-176 spec/impl issues
- [ ] `canonicalProvenance` + `OpProvenance` change; round-trip + legacy tests
- [ ] os-sandbox `buildMutationTag`/`writeTag` threading; tsh `undo <commandId>` reads the log
- [ ] Update `provenance-coverage.test.ts` (null is valid, still declared)

## Addenda

<!-- Append dated notes here. Do not rewrite accepted decision text above. -->
