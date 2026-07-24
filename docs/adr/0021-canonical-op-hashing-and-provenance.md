# ADR 0021: Canonical op hashing + op provenance

> **Terminology:** **Preimage** = the exact byte string fed to SHA-256 to produce
> an op's `hash`. **Provenance** = who asserted a fact, how confident they were,
> and what they read to decide. **actorType** = SemType's `user | machine | ai`
> classification of the asserting actor.

**Status:** Proposed
**Date:** 2026-07-14
**Related:** [0008](./0008-store-op-decomposition.md) (op decomposition),
[0018](./0018-explicit-ids-and-field-sync-tiers.md) (sync tiers),
[0020](./0020-qr-device-pairing.md) (identity / device signing),
[docs/planning/trellis-ui-dsl.md](../planning/trellis-ui-dsl.md) §7 (SemType),
`src/core/kernel/trellis-kernel.ts`, `src/core/persist/sqlite-backend.ts`,
`src/core/persist/better-sqlite-backend.ts`, `src/core/persist/sqljs-backend.ts`,
`src/core/store/eav-store.ts`, `src/vcs/ops.ts`

**Impl:** Phases A and B landed. `src/core/persist/canonical-op.ts` (shared
serializer, `hashKernelOp`, `verifyOpHash`, `PROVENANCE`), wired into
`trellis-kernel.ts` (mint) and all three backends (persist). Provenance is
resolved per-call (`payload ?? ctx ?? kernel default`) and threaded at every
production mint site: HTTP (`server/server.ts`), MCP (`mcp/room-helpers.ts`,
`plugins/brand/mcp-tools.ts`), import (`server/import.ts`), cron
(`plugins/cron/plugin.ts`), sync (`sync/multi-repo.ts`), the agent harness
(`core/agents/harness.ts`), and the agent-facing plugins (plan-approval,
idea-garden, agent-memory, proactive-watcher). Only `client/sdk.ts` takes the
`sdk` default, which is correct there. `Fact.meta` lives in
`core/store/eav-store.ts`.

Tests: `test/core/canonical-op.test.ts` (hashing + provenance round-trip),
`test/core/provenance-coverage.test.ts` (fitness test enforcing AC #5 — a new
mint site without a declared provenance fails the build).

> **Scope note (see §5).** The CLI does not mint kernel ops for graph writes —
> it mints `VcsOp`s. Provenance therefore rides `VcsPayload` for that path,
> hash-covered with no migration. `vcs:store*` ops are covered; other `VcsOp`
> kinds (branch/file/milestone) are not yet.

---



## Context

Two pressures arrive at the same line of code.

**Pressure 1 — we want SemType provenance in the op-log.** SemType (working
draft, Apache-2.0/MIT, consumed by HASH and hgres) mandates that every entity
edition carry `createdById`, `origin`, and `actorType ∈ {user, machine, ai}`, and
permits per-value `confidence ∈ [0,1]` plus `sources[]`. That is the formalized
trace format the agent-coordination (stigmergy) thesis needs: *which agent
asserted this, how sure was it, what did it read*. It is a schema decision, and
schema decisions are expensive to retrofit into an append-only log.

**Pressure 2 — op hashing is currently not verifiable, and nobody has noticed.**
Investigating where provenance would live surfaced a latent correctness bug.

### The bug

At mint (`trellis-kernel.ts:198`) the hash preimage is built from the **caller's**
payload object, `meta` included:

```ts
const payloadStr = JSON.stringify(payload); // { facts?, links?, deleteFacts?, deleteLinks?, meta? }
const hash = await hashOp(kind, timestamp, agentId, lastOp?.hash, payloadStr);
```

At persist the stored payload is **reconstructed from the op**, with a different
shape. All three backends do this independently (`sqlite-backend.ts:161`,
`better-sqlite-backend.ts`, `sqljs-backend.ts:206`); Node resolves to
`SqlJsKernelBackend` via `createKernelBackend()`, `sqlite-backend.ts` is Bun-only:

```ts
const payload = JSON.stringify({
  facts: op.facts,          // always present — kernel coerced absent → []
  links: op.links,          // always present — kernel coerced absent → []
  ...(op.deleteFacts?.length ? { deleteFacts: op.deleteFacts } : {}),
  ...(op.deleteLinks?.length ? { deleteLinks: op.deleteLinks } : {}),
  ...((op as any).vcs ? { vcs: (op as any).vcs } : {}),
  ...((op as any).signature ? { signature: (op as any).signature } : {}),
});
```

These disagree in three independent ways — two live, one latent:


| #   | Divergence                                                                                                                                                                                   | Status                                                                                                                                                                                  | Effect                                                       |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | `meta` is **hashed but never stored**. The kernel splats `payload.meta` onto the op as loose top-level props (`extOp[k] = v`, line 223–229); `append()` recovers only `vcs` and `signature`. | **Latent** — no caller passes `meta` (all 8 `mutate()` sites pass only facts/links/deleteFacts/deleteLinks), and nothing sets `vcs`/`signature` on a `KernelOp`. See "dead code" below. | Would be irrecoverable if exercised.                         |
| 2   | `facts`/`links` are coerced to `[]` when absent (line 213–214) but the preimage hashed the caller's object, where they may be **absent entirely**.                                           | **Live, universal**                                                                                                                                                                     | `{"facts":[…]}` hashed vs `{"facts":[…],"links":[]}` stored. |
| 3   | Key order is the caller's at mint, fixed at persist.                                                                                                                                         | **Live**                                                                                                                                                                                | Different byte string, different digest.                     |


Divergence #2 fires on **every** op: all 8 `mutate()` call sites omit at least one
of `facts`/`links`, so the `[]` coercion always injects a key the preimage never
saw. Verified end-to-end against the real kernel and the real Node backend:

```
stored hash       : trellis:op:4eb294ec…6b4368
backend payload   : {"facts":[{"e":"e:1","a":"name","v":"hello"}],"links":[]}
true preimage     : {"facts":[{"e":"e:1","a":"name","v":"hello"}]}

recomputed from persisted payload : trellis:op:8f28c95a…c336ce90   ✗
recomputed from true preimage     : trellis:op:4eb294ec…6b4368   ✓
```

**Consequence: an op's** `hash` **cannot be recomputed from the persisted op — for
every op in every existing log.** Content addressing is nominal, not actual —
`hash` is currently a unique-ish *identifier*, not a verifiable *content address*.

### Dead code: `vcs` / `signature` on kernel ops

All three backends read and write `(op as any).vcs` and `(op as any).signature`,
and they **disagree with each other** about it (`better-sqlite` drops both on
write; `better-sqlite` and `sqljs` drop both on read; only `sqlite` restores
them). None of this matters today: **no** `KernelOp` **ever carries these fields.**

`VcsOp` and `KernelOp` are separate systems with separate logs — `VcsOp` goes to
the `OpLog` interface (`vcs/op-log.ts:41`, `JsonOpLog`/`IdbOpLog`) via
`engine.opLog.append()`; `KernelOp` goes to `KernelBackend`. The apparent bridge,
`VcsMiddleware`, was never constructed anywhere in `src/` or `test/`, and has
been **deleted** (see below).

These divergent code paths are therefore a latent trap, not a live defect. Phase A
deletes them rather than preserving them (see Decision §1).

> `VcsMiddleware`**, deleted.** It decomposed a `VcsOp` and passed the resulting
> synthetic ops to `next()`, expecting them to be applied. That contract never
> existed: `handleOp` is documented as *"Can throw to block the operation"* —
> an observe-or-throw chain — and `next()` only advances the chain. `mutate()`
> ignoring middleware output is the design, not an oversight, and the terminal
> `next` returning early is correct chain termination. The file was also
> redundant: `engine.ts:2520` already calls `decompose()` and applies the result
> to the store directly, which is the path that actually runs.
>
> An earlier revision of this ADR called this a "middleware sink bug" that
> "blocks VCS-on-kernel". Both claims were wrong — inferred from the broken file
> rather than from the contract it violated. Nothing is blocked; `DESIGN.md`'s
> `kernel.mutate → VcsMiddleware → decompose` sequence documented a flow that was
> never built and has been corrected to match the engine's real path.

This has gone undetected because `hashOp` **is called from exactly one place —
mint — and nothing ever re-verifies a kernel op hash.** There is no
`verifyOpHash` for kernel ops. (`src/vcs/ops.ts` has `verifyVcsOpHash` for VCS
ops, and notably it hashes **correctly**, via a canonical `JSON.stringify` of a
fixed field set. The codebase already contains the right pattern; the kernel path
just doesn't use it.)

### A second, smaller flaw

`hashOp` builds its preimage by joining unescaped fields with `|`:

```ts
const data = `${kind}|${timestamp}|${agentId}|${previousHash ?? ''}|${payload}`;
```

Nothing constrains `agentId` to exclude `|`. Two semantically different ops can
therefore produce an identical preimage:

- `agentId="a|b"`, `previousHash="c"` → `…|a|b|c|…`
- `agentId="a"`, `previousHash="b|c"` → `…|a|b|c|…`

Today's agent ids (`user:<uuid>`, `cron:<uuid>`) don't contain `|`, so this is
latent rather than live. It is unenforced, and it is a collision in a system
where hash *is* identity.

### Why these two pressures are one decision

Provenance is only meaningful if it is **covered by the content hash** and
**survives persistence**. The natural home for it today — `payload.meta` — is
precisely the field that is hashed and then dropped. Adding `actorType` there
would produce provenance that is silently lost on write and unverifiable on read:
the exact opposite of the goal. Provenance that can be altered without
invalidating the hash is not provenance; it is decoration.

So fixing the preimage is a **prerequisite** for provenance, not an unrelated
cleanup. And since changing the preimage is the breaking, expensive part:

> **Change the preimage once. Land provenance in the same break.**

---



## Decision

> **Phasing note.** Phase A reserves the `provenance` slot in the canonical shape
> and normalizes it to `null` when absent; Phase B populates it. Both phases run
> the *same* normalization, so Phase B changes values, not shape — Phase-A ops
> keep verifying and provenance lands without a second preimage break. This is
> what makes "one break" real rather than aspirational, given that A and B ship
> separately.



### 1. Canonical op preimage (Phase A)

Replace the positional `|`-joined preimage with a canonical JSON preimage over a
**fixed, explicit field set**, mirroring the pattern already proven in
`hashVcsOp`:

```ts
interface OpPreimage {
  v: 2;                       // preimage version — see §3
  kind: KernelOpKind;
  timestamp: string;
  agentId: string;
  previousHash: string | null;
  facts: Fact[];              // always present, [] when empty — normalized
  links: Link[];              // always present, [] when empty — normalized
  deleteFacts: Fact[];
  deleteLinks: Link[];
  provenance: OpProvenance;   // §2 — inside the hash, by construction
}
```

Rules:

- **One serializer, shared by mint and persist.** The bug is structurally a
*two-writer* problem: two places independently construct the payload JSON. The
fix is that `hashOp` and `append()` must call the **same** canonicalization
function. Neither may hand-roll its own object literal.
- **Normalize before hashing**, don't hash the caller's object. Absent →
`[]`/`null` deterministically.
- **Fixed key order** (as written above), so serialization is reproducible.
- **No** `as any` **splatting.** The `extOp[k] = v` loop is deleted; anything that
needs to ride on an op gets a declared field.
- `vcs` **/** `signature` **are dropped, not preserved.** The canonical field set is
exactly `{facts, links, deleteFacts, deleteLinks}` (plus the header fields and
`provenance`). The `(op as any).vcs` / `(op as any).signature` reads and writes
come out of all three backends. Nothing sets them today, so preserving them
would mean carrying three mutually-inconsistent implementations of a field that
does not exist. If VCS-on-kernel becomes real, that is the moment to extend the
canonical shape deliberately, under a new preimage version, against a consumer
that actually exists.
- Add `verifyOpHash(op): Promise<boolean>` and call it on every op ingested
from a peer. An unverifiable op is rejected at the sync boundary, not stored.



### 2. Provenance model (Phase B)

Two levels, split by *what can be derived*.

**Op level —** `KernelOp.provenance` (new, required, in the preimage):

```ts
interface OpProvenance {
  actorType: 'user' | 'machine' | 'ai';   // SemType-aligned
  origin: 'cli' | 'sdk' | 'http' | 'mcp' | 'sync' | 'migration' | 'cron';
}
```

`createdById` is **not** added — `KernelOp.agentId` already is it. `transactionTime`
is **not** added — `KernelOp.timestamp` already is it. Both are already in the
preimage. This is the payoff of reading the code first: two of SemType's four
mandatory edition fields are already present and hashed.

**Value level —** `Fact.meta?` (new, optional):

```ts
interface Fact {
  e: string;
  a: string;
  v: Atom;
  meta?: {
    confidence?: number;      // [0,1], SemType-aligned
    dataTypeId?: string;      // SemType value-node requirement
    sources?: Source[];
  };
}
```

Only carries what **cannot be derived from the op**. `actorType`/`origin`/
`createdById` are *not* denormalized onto facts — a fact belongs to exactly one
op, so its actor provenance is the op's. `confidence` and `sources` genuinely
vary per-fact *within* one op (an agent may assert three facts at different
confidences from different sources in a single mutation), so they must live here.

`Fact.meta` rides inside `facts[]`, which is inside the preimage — so value-level
provenance is **tamper-evident for free**, with no additional preimage work.

**Resolution order.** `payload.provenance ?? ctx.provenance ?? kernel default`.
Provenance is per-*call*, not per-kernel: one `TenantPool` kernel is reached from
both the HTTP server and the MCP room, so `origin` cannot be a property of the
kernel instance. The kernel-level default exists for single-surface kernels (the
CLI pattern) and defaults to `{ actorType: 'machine', origin: 'sdk' }` — the
honest description of "something called the kernel API and did not say who it
was".

**On** `actorType` **honesty.** `origin` is knowable; `actorType` is an assertion
(see Deferred). The claims are kept defensible rather than flattering: HTTP only
claims `user` when an authenticated session exists — signup/OAuth stay `machine`,
being unauthenticated by definition; `PROVENANCE.agent` is `ai` over
`origin: 'sdk'` for in-process agents; the proactive watcher stays `machine`
because it matched a rule, it did not reason.

`Fact` is referenced in 19 files; `meta` is optional and additive, so this is a
type-widening, not a migration of call sites.

### 3. Migration

The preimage change means **existing op hashes will not reverify under v2**.
Since nothing verifies them today, nothing breaks *today* — but a peer running v2
must not reject a v1 log.

- Ops carry an explicit preimage version `v`. Absent ⇒ v1 (legacy).
- **v1 ops are grandfathered: never reverified, treated as opaque history.**
We cannot retroactively make them verifiable — their preimages are
unrecoverable, which is the bug.
- **v2 ops MUST verify.** All newly minted ops are v2.
- `verifyOpHash` returns `true` for v1 (with a `legacy: true` signal for callers
that care), and genuinely verifies v2.
- This is a **one-way ratchet**: the sooner it lands, the smaller the permanent
unverifiable prefix of every log.



### 4. Explicitly deferred

- **Bi-temporal** `decisionTime`**.** `timestamp` gives us SemType's
`transactionTime` free. `decisionTime` is a genuinely good idea and a genuinely
expensive one; add when a consumer needs it.
- **Unit conversions**, the exhaustive `format` list, the full closure
intersection algebra — see planning doc §7 "subset hard."
- **Signing provenance.** `actorType: 'ai'` is currently an *assertion by the
minting process*, not a proof. Binding it to a device key is ADR 0020's
territory; noted as a gap, not solved here.



### 5. The CLI is not on the kernel path — provenance rides `VcsOp` instead

Found while wiring Phase B. CLI graph writes (`entity create`, `fact add`,
`link add`, …) go through `TrellisVcsEngine` and mint a `VcsOp` **into**
`ops.json` — not a `KernelOp`. `withGraphStore` routes to the VCS engine
whenever `.trellis/config.json` exists, and `resolveRepoRoot` refuses to run
outside a repo, so **the kernel branch of** `withGraphStore` **is unreachable**. The
only CLI commands that boot a kernel — `query`, `repl`, `validate` — are
read-only. Verified by running the real CLI: it reports
`Journal: ops.json (vcs:storeAssert)` and writes no `kernel.db`.

So Phase B's kernel provenance could never have covered the CLI.

**Rejected: rerouting CLI writes through** `kernel.mutate()`**.** An earlier revision
of this ADR proposed exactly that. It is the wrong trade: a `VcsOp` carries
`filePath`, `branchName`, `laneId`, `milestoneId` — none of which a `KernelOp`
models — so rerouting means abandoning the journal, lanes, branches and
milestones to gain attribution that a far smaller change provides.

**Adopted:** `VcsPayload.provenance`**.** `hashVcsOp` hashes the `vcs` payload
wholesale, so a field placed *inside* `vcs` is covered by the op hash with **no
preimage change and no migration** — `JSON.stringify` omits the absent key, so
ops minted before the field existed hash exactly as they did before and keep
verifying. This is the opposite of the kernel's Phase A situation, and the
reason is instructive: `verifyVcsOpHash` is genuinely called
(`engine.ts:776`, `sync/room-core.ts:301`), so the VCS log has always had a real
verification path. It is the kernel that had the unverified hash, not the VCS.

Provenance is set per engine construction, since each site knows its surface:
CLI (`cli/*`), MCP (`mcp/server.ts`), UI/HTTP (`ui/*`), sync
(`federation/remote-manager.ts`), migration (`git/*`), SDK
(`client/vcs-client.ts`). `TrellisVcsEngine` defaults to
`{ actorType: 'machine', origin: 'sdk' }`.

Verified end-to-end against a real CLI run: `vcs:storeAssert` carries
`{"actorType":"user","origin":"cli"}`; forging or stripping it fails
`verifyVcsOpHash`; a journal minted before the change verifies 3/3 under the new
code.

## **Remaining gap.** Only `vcs/store.ts` ops (graph writes) carry provenance.
Other `VcsOp` kinds — `vcs:branchCreate`, `vcs:branchAdvance`, `vcs:fileAdd`,
milestone and issue ops — do not yet. File ops in particular are worth covering
for the stigmergy thesis (*which agent changed which file*); the mechanism is
now in place and the extension is mechanical.



## Consequences

**Good**

- Content addressing becomes real — `hash` verifiable, not just unique.
- Provenance is tamper-evident by construction, because it is inside the
preimage rather than beside it.
- Two of SemType's four mandatory edition fields (`createdById`,
`transactionTime`) turn out to already exist and already be hashed, so the
actual delta is `actorType` + `origin` + optional `Fact.meta`.
- The op-log gains something SemType cannot express: the full **confidence
trajectory** over time, not merely the current value's confidence. Export to
SemType is lossy *outward*, never inward.
- One preimage break instead of two.

**Costs / risks**

- **Every log acquires a permanent unverifiable v1 prefix.** Unavoidable — the
preimages are already unrecoverable. Cost grows daily until this lands.
- `hashOp`'s signature changes; `mutate()`'s `meta` escape hatch is removed. No
caller relies on it today — all 8 `mutate()` sites pass only
facts/links/deleteFacts/deleteLinks — so this costs nothing now and closes the
hole before it is used.
- The `vcs` / `signature` handling is removed from all three backends. This is
dead-code deletion, not a behaviour change; `VcsOp` persists via its own
`OpLog` and is unaffected.
- `origin` must be plumbed to every mint site, which means threading it through
the SDK/HTTP/MCP boundaries.
- `actorType` is self-asserted until signing lands (see Deferred).

**If we don't**

- The unverifiable prefix grows.
- Provenance added later either sits outside the hash (forgeable — worthless for
attribution) or forces a *second* preimage break.

---



## Acceptance criteria

1. `hashOp` and `append()` call one shared canonicalization function; neither
  constructs payload JSON independently.
2. `verifyOpHash(mint(op)) === true` for all op kinds, including empty
  `facts`/`links` and ops with `Fact.meta` — a round-trip property test through
   real persistence, not an in-memory equality check.
3. A v1 op read from an existing SQLite log does not throw and is reported
  `legacy`.
4. Two ops differing only in `agentId` vs `previousHash` split-point produce
  **different** hashes (the `|`-injection regression test).
5. Every op minted through kernel/SDK/HTTP/MCP carries a non-default
  `provenance.origin`; none report `sdk` by accident.
6. A `Fact` with `meta.confidence` round-trips through persist → read →
  `verifyOpHash` intact.

