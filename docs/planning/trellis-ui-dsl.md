# Trellis UI / DSL — Design Notes

**Status:** exploration (not a decision)
**Author:** revisiting the "Omni / trellis-ui" thread against the current codebase
**Date:** 2026-07-14

---

## TL;DR

The essay's core instinct is right: Trellis now has the runtime substrate that
the 2020-era "universal reactive framework" vision was hand-waving about. But
two things the essay assumes are wrong against the code as it exists today:

1. **The "compiler layer doesn't exist yet" premise is stale.** Trellis already
   ships a TypeScript-embedded DSL that covers most of what the essay's `doc`
   and `action` blocks want: `defineType` (schema), `useEntities` / `useEntity`
   / `useMutation` (typed reactive hooks) for **React, Vue, and Svelte**, plus a
   scaffold/codegen layer. The gap is smaller and differently-shaped than the
   essay claims.

2. **"Rules are TQL filters baked into the replication graph, so security is a
   type error" is not what the code does.** Access control today is
   `security-middleware.ts` — capability-based enforcement in the kernel op
   pipeline (`read/create/update/delete/link/unlink/admin`). That's *runtime*
   enforcement at write time, not a compile-time type guarantee, and it is
   explicitly middleware. The essay proposes a *different* model and presents it
   as the current one.

The central decision this doc exists to force: **do we build a novel `.trl`
language, or do we lean into the embedded-TS DSL that's already ~60% built?**
Recommendation below: **embedded first, surface syntax later (maybe never).**

Separately (§6): the **Block Protocol** (target **0.3** — 0.4 is paused) is a
strong candidate for the block↔embedder contract, and is the *correct*
resolution of the original multi-framework "Omni" idea — interop via an
isolation boundary, not a universal compiler. Steal its message contract; keep
ontology + TQL canonical.

And (§7) — **the most important section in this doc**: BP's *type* layer was
rescued as **SemType** (working draft, © 2026, Apache-2.0/MIT, consumed by HASH
and hgres). The block layer froze; the type layer survived and kept moving. It is
our kernel already specified, and its **provenance model** — `actorType` ∈
{`user`, `machine`, `ai`} plus per-value `confidence` and `sources` — is the
formalized trace format the AX/stigmergy thesis has been missing. Adopt the
*shape* as a projection (**conforming producer, not native kernel**), subset
hard, and **land provenance in the op-log now** — it's the one thing here that's
painful to retrofit.

---

## 1. Ground truth — what Trellis actually is today

Mapping the essay's claims to code, honestly:

| Essay claim | Reality in the repo | Verdict |
|---|---|---|
| `doc<T>` replication graph | EAV kernel (`core/store/eav-store.ts`) + content-addressed op-log | ✅ real |
| "CRDT merge log" | Op-log with content-addressed ops; **graph/entity conflict semantics still on the TODO list** | ⚠️ overstated — it's an op-log, not a proven CRDT merge |
| `rule Read/Write` scoping | TQL (Datalog) query engine with a string parser (`parseQuery/parseRule`) **for reads**, plus capability `security-middleware` **for writes** | ⚠️ two mechanisms, not one; not "baked into the graph" |
| "security is a type error" | Runtime capability check in kernel middleware | ❌ aspirational marketing, not true today |
| Offline-first optimistic updates | Local SQLite backends + sync layer | ✅ largely real |
| Presence primitives | Asserted "proven in Playlab demo" | ❓ unverified in this repo; treat as claim |
| The reactive UI binding | `src/react`, `src/vue`, `src/svelte` — typed `useEntities/useEntity/useMutation` over `defineType` | ✅ **already exists** |

The honest headline: **the runtime is real, and so is a first-class embedded
reactive DSL.** What's genuinely missing is (a) a declarative *view/action*
codegen surface and (b) a unified enforcement story for reads+writes.

## 2. The layer stack, corrected

```
┌───────────────────────────────────────────────┐
│  Surface syntax (.trl)          ← OPTIONAL, later / maybe never
├───────────────────────────────────────────────┤
│  Embedded DSL (TypeScript)      ← EXISTS, partial
│  defineType · useEntities/useMutation · eql()  │
│  (React / Vue / Svelte adapters, schema-hooks) │
├───────────────────────────────────────────────┤
│  Block Protocol boundary        ← PROPOSED (§6)
│  view → BP block · Studio = BP embedder        │
│  framework-agnostic via isolation, NOT shared  │
│  runtime · BP entities = lossy EAV projection  │
├───────────────────────────────────────────────┤
│  Schema + query layer           ← EXISTS
│  src/schema/{define,eql,mutations} · TQL     │
│  ↕ SemType projection (§7)      ← PROPOSED     │
│    conforming producer/validator, NOT internal │
├───────────────────────────────────────────────┤
│  Kernel + middleware            ← EXISTS
│  boot · logic · schema · SECURITY (capability) │
├───────────────────────────────────────────────┤
│  EAV kernel + op-log            ← EXISTS
├───────────────────────────────────────────────┤
│  Iroh                           ← EXISTS
└───────────────────────────────────────────────┘
```

The essay drew the DSL and compiler as the two missing top layers. In reality
the top layer already exists in embedded form; the open question is whether a
*surface syntax* on top earns its (very large) cost.

## 3. The central fork: novel language vs. embedded DSL

This is the decision. The essay defaults to "build a tree-sitter grammar → HIR →
codegen" without weighing the alternative. That default is the expensive one.

### Option A — Novel `.trl` language
- **Cost:** a real language is a 5–10 year artifact. Grammar, parser, LSP,
  formatter, syntax highlighting, error messages that don't leak internals,
  editor extensions, docs, versioning/migration of the *language itself*.
- **Payoff:** maximum semantic density; one `rule` block = an auth layer;
  bespoke ergonomics.
- **Reality check for a solo founder with a YC forcing function:** this is the
  yak-shave that eats the year.

### Option B — Embedded TS DSL (recommended)
- Extend what exists (`defineType`, typed hooks, `eql()`), the same way Convex,
  Drizzle, Zod, and Effect are "DSLs" without being languages.
- **Agents already speak TypeScript.** For the AX thesis this is *strictly
  better*: agents get type-checking, autocomplete, and existing tooling for
  free, and don't have to learn a syntax with zero ecosystem or training data.
- The "semantic density" gap is smaller than it looks — a well-designed builder
  API gets you most of the `rule`/`action` compression.

**Recommendation:** Option B now. Treat `.trl` as a *possible future skin* that
compiles to the same embedded API, justified only if the embedded surface proves
ergonomically insufficient in real use. Don't start with the grammar.

## 4. What the DSL blocks actually compile to (grounded)

Using the real APIs, not invented ones:

- **`doc projects: Project[]`** → `defineType(...)` + `useEntities(schema)` /
  `useMutation(schema)`. This binding *already works* across React/Vue/Svelte.
  The "compiler" here is mostly a naming/ergonomics wrapper.

- **`action rename(...) using (Write...)`** → a kernel op through
  `security-middleware` with the caller's capabilities, emitted as a
  content-addressed op-log entry, with optimistic client patch + rollback on
  reject. **Note the honest constraint:** the "using (Write)" clause maps to a
  *capability check*, not a proven type.

- **`rule Read(u) = projects.where(p => p.owner == u ...)`** → TQL
  (`parseRule`) attached to read paths. **This is a real second enforcement
  point**, separate from write-side capabilities. A DSL that unifies them has to
  target *both* the query scope (reads) and the capability middleware (writes).

- **`view { ... }`** → the genuinely new codegen. Two *composable* targets:
  **Svelte 5 runes** on the inside (closest compiler model, adapters already
  exist), wrapped as a **Block Protocol block** on the outside for the embedder
  boundary (§6). Pure-resumable bytecode is research-grade; defer.

## 5. The hard problem the essay skips: local-first read authorization

This is the load-bearing risk and it deserves its own section because the essay
waves it away with "rules are query filters."

**In a local-first / p2p system, a read rule enforced as a query filter is not
security — it's a UI convenience.** If a peer has replicated the bytes to serve
offline queries, a query filter on that peer's own machine protects nothing; the
peer already holds the data. Real read-authorization in this model is about
**what you replicate to whom** — capability-scoped replication and/or
encryption — not about filtering at query time.

So the "security is a type error" line inverts the actual difficulty:
- **Writes:** tractable today (capability middleware validates ops; bad ops are
  rejected/won't integrate). This is the strong part.
- **Reads:** the genuinely unsolved part. Requires capability-scoped sync
  (which entities replicate to which peers) and likely per-entity encryption so
  that "not authorized" means "can't decrypt," not "query hid it."

Prior art to study before designing this: **UCAN** capabilities, Ink & Switch's
**Beehive/Keyhive** work on local-first access control, and the general
"encrypt-then-replicate" pattern. This should be a named ADR of its own before
any `rule Read` syntax is promised.

## 6. Block Protocol as the embedder boundary

**Spec status (checked 2026-07-14):** BP **0.4 is paused**, and it split the
monolithic Graph Module out into a standalone *SemType* spec. The mature,
actually-implemented target is **0.3**. Read BP as a well-designed vocabulary to
steal — *not* a living ecosystem to join. It never reached adoption mass outside
HASH, so price in **zero** network effects from "existing blocks." A frozen good
spec is still worth a lot; just don't buy the ecosystem story.

### Why it fits

BP is the *correct* resolution of the original "Omni" multi-framework dream.
Omni's fatal flaw was trying to unify React/Vue/Svelte reactivity at runtime. BP
sidesteps it: blocks are framework-agnostic **because** they only talk to the
embedder through a message contract across an **isolation boundary** (custom
element / iframe / shadow DOM), never through shared runtime. Astro's islands
lesson, formalized into a spec.

The data-model alignment with Trellis is close to 1:1:

| Block Protocol (graph module, 0.3) | Trellis today |
|---|---|
| entity graph; link entities (`leftEntityId` / `rightEntityId`) | EAV kernel + `src/links` |
| data types → property types → entity types (layered ontology) | `src/core/ontology` |
| `createEntity` / `updateEntity` / `deleteEntity` / `queryEntities` | kernel ops already gated by `security-middleware` |
| `blockEntitySubgraph` (roots + fixed-depth subgraph) | TQL query result |
| embedder owns data + persistence; block declares its schema | **Studio is already a BP embedder in disguise** |

The message vocabulary maps onto the existing kernel op pipeline. That's not
engineering luck — it falls out of both systems being entity-graph-shaped.

### It answers a different layer than the DSL

Important not to conflate these. They stack; they don't compete:

- **DSL** (`defineType` / `action` / `view`) = the *authoring* surface.
- **Block Protocol** = the *runtime embedding contract* — how a rendered view
  gets its data and talks to its host, framework-agnostically.

A `view` **compiles to** a BP block; Studio consumes it as an embedder.

### Three constraints to hold

1. **Steal the contract, not the type system.** BP entity types are closed-ish
   JSON-Schema shapes and its subgraph is *fixed-depth resolution*, not Datalog.
   Trellis's power is open triples + recursive TQL. Adopting BP's type system
   *as* our ontology would cap query expressiveness. Ontology + TQL stay
   canonical; **BP is the wire format at the block edge** — a deliberate, lossy
   projection. (BP's type system is in any case superseded — see **§7 SemType**,
   which is the live successor and a much better fit.)
2. **The isolation boundary trades away shared reactivity.** Framework-agnosticism
   exists *because* blocks are isolated. Reactivity becomes embedder-mediated at
   entity granularity (Studio pushes entity updates to blocks), not fine-grained
   signals shared across blocks. This restates the §3-era tradeoff: you get
   **interop** or **one shared signal graph**, not both cheaply. BP picks
   interop — the right default, but a real loss for tightly-coupled fine-grained
   UI. Know which one you're buying.
3. **BP does not touch read-auth (§5).** Its graph module assumes a *trusted
   embedder* answering queries — a client/server authority assumption. In
   local-first p2p, the peer holds the bytes. BP merely relocates the question to
   "what subgraph does the embedder hand the block." Orthogonal to the hard
   problem, not a solution to it. §5 still blocks Campus "room = file."

### The AX payoff

A BP block **self-describes** its required entity type. So: an agent authors a
block → Studio reads its declared data requirements → wires it to the graph
automatically. "Agent writes a block, drops it into Studio, it's live against the
graph" is a strong AX loop — and it reinforces the §3 thesis (the contract *is*
the agent interface) rather than competing with it.

### Recommendation

Adopt the BP **graph-module message contract** as Studio's block↔embedder
boundary; compile `view` output to BP blocks; keep ontology + TQL canonical and
project to BP entities at the edge. Target **0.3**. This beats "compile to
Svelte" for the *interop* story specifically — and the two compose: Svelte 5 is
the compile target *inside* the block.

## 7. SemType as the type layer

**Spec status (checked 2026-07-14):** **working draft**, © 2026, dual
**Apache-2.0 / MIT**. Explicitly supersedes *the Block Protocol Type System* and
*the Graph Module 0.3 draft*. Named consumers: **HASH**, **hgres**.

This is the asset deliberately rescued from the BP wreck, and it is still moving.
The pattern holds: **the block layer froze; the type layer survived.** It is a
much closer match to Trellis than BP ever was.

### It is our kernel, specified

Data types → property types → entity types; links are themselves entities;
ontology separated from knowledge; entities carry `entityTypeIds` (MUST have ≥1;
multiple types satisfied simultaneously via merged closure). That is EAV +
`defineType` with the homework done.

Read the **type-closure** rules specifically — they are subtle enough that
inventing them badly is a year of bugs:

- *Data types (intersection):* `minimum` keeps the **greater**; `maximum` keeps
  the **lesser**; `enum` **intersects** (empty ⇒ closure MUST fail); string
  `format` MUST be equal across ancestors; conflicting `type` ⇒ closure MUST fail.
- *Entity types (merge):* `properties` **union**; `required` **union**; `links`
  **union** — but link **destination sets intersect**; `minItems` takes the
  greater, `maxItems` the lesser.

Note the asymmetry: links union while their destinations intersect. That is
precisely the kind of thing you get wrong by hand.

### The biggest steal is the provenance model, not the types

Every entity edition MUST carry `createdById`, `origin`, and **`actorType` ∈
{`user`, `machine`, `ai`}**. At the *value* level, each metadata node may carry
**`confidence` ∈ `[0,1]`** and `provenance.sources[]` with `authors`,
`location.uri`, and `loadedAt` / `firstPublished` / `lastUpdated`.

Someone has specified, in an open standard, **per-value attribution of which
agent asserted this, how confident it was, and what it read to decide** — with a
first-class `ai` actor type. That is the substrate the AX / stigmergy thesis has
been missing: if agents coordinate by leaving traces in a shared graph rather
than messaging each other, **this is the trace format** — formalized,
permissively licensed, already specified.

**Take this early.** It is a schema decision, and schema decisions are painful to
retrofit into an op-log.

*Subtlety in the mapping:* SemType annotates **editions and value nodes** — a
*state* model. The op-log is an *event* model. The asymmetry favours us (the log
holds the whole confidence **trajectory**; a SemType value node holds only the
current one), but export must choose *which* edition's provenance it projects.
Lossy outward, not inward.

### Why Trellis is a structurally better SemType host

The spec's most awkward requirement is our natural shape. It mandates that the
`metadata.properties` tree correspond **one-to-one** with the properties tree,
and that **every value node MUST carry a `dataTypeId`** (omit it ⇒ the entity is
non-conforming).

For a JSON-document store that is miserable — a parallel shadow tree maintained
purely to annotate leaves. For an EAV op-log it is **free**: an op is already
(entity, attribute, value) and already carries op metadata, so **a SemType value
node is literally an op**.

Real, checkable claim, worth making out loud: **Trellis is a better host for
SemType than the document stores it was written against.**

### The two p2p clashes — both softer than they look

**Identity.** SemType names types with versioned HTTPS URLs
(`.../types/entity-type/person/v/1`); validators **MUST resolve all referenced
ontology types prior to validation** and **MUST report unresolvable references as
errors rather than treating them as permissive**. That reads like a DNS-and-HTTP
assumption sitting inside a content-addressed, Iroh-transported system.

**It isn't.** The spec is **silent on resolution mechanism** — it requires types
be *resolvable*, not *fetched*. Versioned URLs function as **identifiers**
resolvable by unspecified means (local store, cache, bundle, registry). So:
**ontology records are entities in the room's graph**, replicated with it; `$id`
URLs are **names, not locations** (XML-namespace style). This is *within spec*,
not a deviation requiring justification.

And it makes "a room is a file" strictly better: the room **carries its own
types**, so it is self-describing to any peer or agent that receives it,
**offline**. BP never had that property.

**Closed-world.** Validators **MUST reject unknown fields**; SemType is
explicitly closed-world. Centralized, that's a feature. In p2p with concurrent
schema evolution, a peer holding an older ontology *rejecting* entities minted
against a newer type is not a clean error — it's a **partition**.

**The spec hands us the answer in its own vocabulary: be a _forwarder_.** Of the
four conformance targets, a **forwarder MAY preserve fields it does not
recognize** and is **not required to validate, perform closure, or resolve
references** — it may relay documents as opaque pass-throughs. Peer roles map
directly onto conformance targets:

- **Forwarder** — ops referencing types this peer hasn't replicated: relay,
  preserve, **don't reject**.
- **Validator** — only for types it has actually replicated.
- **Producer** — when minting locally (MUST emit only spec-defined fields).

So "quarantine-and-backfill" isn't a semantic we must invent — it's
**forwarder-until-you-can-be-a-validator**. Version pinning (v1 stays v1 forever)
plus draft lanes (`v/2-draft.alice.4`, SemVer pre-release grammar — effectively
**per-peer schema branching**) do the rest. Still an ADR, but a smaller one than
it looked, and the type-layer twin of the §5 read-auth ADR.

### The call: conforming producer, not native kernel

Keep **EAV + TQL canonical**. The conformance model explicitly permits this —
targets are *document / validator / producer / forwarder*, none of which require
SemType to be the internal representation. So:

- Adopt the **shape** into `defineType` now: three type kinds, links-as-entities,
  `allOf` closure semantics, `provenance.edition.actorType`, `confidence`.
- Implement SemType **import/export as a projection**.

Consistent with §6's "steal the contract, not the type system": SemType becomes
the *boundary* type format, never the internal one. Payoff: HASH/hgres interop as
a checkbox, plus "our types are an open standard, not a bespoke schema DSL" for
the OSS story — without surrendering semantics.

### Subset hard — this is the `.trl` trap wearing a new hat

Full conformance is **big**: bi-temporal versioning on every edition, the
complete closure intersection algebra, unit conversions as arithmetic expression
trees (`+ - * /` over `"self"` and consts), the metadata tree invariants. Months
of work, and the same yak-shave shape that ate the year in the earlier plan.

**Ship the subset, claim the subset:**

- **In:** entity / property / data types, `allOf` closure,
  `provenance.edition.actorType`, `confidence`.
- **Out:** bi-temporal (`decisionTime` is a genuinely good idea *and* a genuinely
  expensive one — the op-log gives **`transactionTime`** free; add decision time
  when someone actually needs it), unit conversions, the exhaustive format list.

The conformance vocabulary lets us state the subset **honestly**: conforming
producer + validator over a named type subset, forwarder for everything else.

### Minor, but note it

SemType still points at a **`blockprotocol.org`** URL for the link base type
(`https://blockprotocol.org/@blockprotocol/types/entity-type/link/`) — it never
fully escaped BP's namespace. Under names-not-locations this is harmless, but
it's a dependency-in-name on a frozen project's domain, worth knowing before it
shows up in our exports.

## 8. Positioning — what's actually the wedge

A declarative data+reactivity+auth DSL over a sync engine is **table stakes**,
not a differentiator: Convex, InstantDB, Jazz, LiveStore, Electric SQL, and
Fireproof all have some version of it. If the pitch is "we have a nice DSL," the
comparison is unflattering and crowded.

Trellis's actual novel surface is the **substrate the DSL sits on**:
- a **semantic graph** (EAV + TQL/Datalog) rather than tables or documents,
- **p2p Iroh** transport rather than a hosted sync server (cloud never owns
  state), and
- **agent-native** operation (the DSL as an AX interface).

The doc/DSL should be framed as *the ergonomic surface of the graph*, and the
graph is the moat. "Trellis owns semantics, Iroh moves bytes" — the DSL is how
humans and agents express semantics; keep it in that lane.

### The four-layer stack — the actual "why now"

With §7 in hand the positioning gets much stronger, because it stops being "we
invented a stack" and becomes "we're the missing layer in a stack the ecosystem
has already mostly agreed on":

| Layer | Answer | Ours? |
|---|---|---|
| Move bytes | **Iroh** | adopted |
| Gate access | **Keyhive/UCAN-style capabilities** (§5) | adopted |
| Name things | **SemType** (§7) | adopted |
| **Query** | **TQL** | **novel** |

Three adopted layers, one novel one — and the novel one is precisely the gap
reviewers have named out loud. That's a far better "why now" than any DSL pitch.

**But state the claim precisely, because the loose version is puncturable.**
"Nobody has built TQL" is false and someone in the room will know it: Datomic,
XTDB, and Logica are all Datalog over EAV; HASH has its own structural query
layer. What is genuinely unbuilt is the **conjunction**:

> a Datalog query layer over a **local-first, p2p-replicated semantic graph**.

Datomic/XTDB have the query, centralized. HASH has the semantic graph, hosted.
Jazz/Automerge/Electric have local-first, with no semantic query. Each has two of
three. **Nobody has all three.** That claim survives contact with someone who
knows Datomic; the loose one doesn't. Use the precise version.

## 9. Phased path (grounded in what exists)

- **Phase 0 — name the model.** Two ADRs, both blocking:
  1. **Read authorization** (§5) — before promising `rule Read`. Decide the
     reads-vs-writes enforcement unification.
  2. **Type resolution & conformance roles** (§7) — ontology-as-entities,
     names-not-locations, and peer-role↦conformance-target mapping
     (forwarder / validator / producer).
- **Phase 0.5 — canonical op hashing + provenance → [ADR 0021](../adr/0021-canonical-op-hashing-and-provenance.md).**
  **Do this first of all the code work.** Scoping this against the code turned up
  a latent bug: the op hash preimage includes `payload.meta`, but `append()`
  drops it — so **an op's hash generally cannot be recomputed from the persisted
  op**. Content addressing is nominal, not actual; it went unnoticed because
  nothing ever re-verifies a kernel op hash. That *reorders* this phase:
  provenance in `payload.meta` today would be hashed-then-dropped — forgeable and
  lost. So the preimage must be fixed **first**, and since that's the breaking
  part, provenance lands **in the same break**. Good news from reading the code:
  `agentId` and `timestamp` already supply SemType's `createdById` and
  `transactionTime`, already inside the hash — the real delta is `actorType` +
  `origin` + optional `Fact.meta`. **Every log grows a permanent unverifiable
  prefix until this lands. This is the single most time-sensitive item in this
  doc.**
- **Phase 1 — harden the embedded DSL.** Round out `defineType` + typed hooks
  into a coherent `doc` story; align `defineType`'s shape with SemType's three
  type kinds + `allOf` closure (§7) while keeping EAV canonical; add an `action`
  builder that emits capability-scoped ops with optimistic patch/rollback. No new
  syntax. Ships in weeks because the pieces exist.
- **Phase 1.5 — SemType import/export as a projection.** Conforming producer +
  validator over the named subset; forwarder for the rest. Buys HASH/hgres
  interop and the "open standard, not bespoke schema DSL" line.
- **Phase 2 — `view` codegen + BP boundary.** The one truly new compiler
  surface: Svelte 5 inside, Block Protocol 0.3 block contract outside (§6). Prove
  Studio as a BP embedder against the existing kernel ops — that mapping is
  cheap and de-risks the whole rendering story. Start with the todo demo (below)
  end-to-end across two Iroh peers.
- **Phase 3 — (optional) `.trl` surface syntax** that lowers to the Phase 1 API,
  *only if* embedded ergonomics prove insufficient. This is where a grammar/HIR
  would finally earn its keep.
- **Phase 4 — resumable runtime.** Research-grade; after everything above is
  proven.

### The "holy shit it works" demo (unchanged, now backed by real APIs)
```
doc todos: Todo[]                      // defineType + useEntities/useMutation
view App {
  for t in todos { <li>{t.text}</li> }
  <input on:submit={e => todos.push({ text: e.value })} />
}
```
Parse → TQL subscription for `todos` → Svelte component → syncs across two
clients via Iroh. Every layer under `view` already exists.

## 10. Implications

- **Trellis Studio / AX:** the embedded DSL *is* the agent interface. Agents
  emitting typed `defineType`/`action` calls are verifiable by `tsc` today —
  a stronger AX story than "agents learn a new language." This is the biggest
  near-term win and it needs no new language.
- **YC "why now":** the arc is "the runtime exists; the DSL makes it feel like
  nothing." Keep it honest — the runtime is real, the reactive binding is real,
  and the remaining work (view codegen, read-auth) is scoped and legible. Don't
  claim the language exists; claim the substrate does.
- **Campus Commons:** "a room is a `.trl` file" is a genuinely novel deployment
  primitive — but it depends entirely on Phase 0 (read-auth). A shared room
  where read rules are just query filters would leak. Gate this on §5.
- **OSS/licensing:** engine + language stay open (the TypeScript-is-open,
  Azure-is-not logic). Managed/relay/hosted components are where BSL could
  apply. The *language must be open* or agents/ecosystem never adopt it.

## 11. Open decisions

0. **Peer materialization — the fork that gates the rest** (TRL-110, and see
   `trl-108-op-stream-findings.md`). Does a peer apply ops to its own store and
   query locally, or receive server-derived projections? **Recommend
   materialize.** Iroh peers must (no server to ask), so the alternative is two
   divergent paths for one job — which is how the VcsOp/KernelOp split happened.
   The infrastructure already exists and was never wired up: `SqlJsKernelBackend`
   ("pure-WASM SQLite … browser"), `IdbOpLog` ("browser-side companion to
   JsonOpLog"), and TQL has no node-only imports. Nobody builds an IndexedDB op
   log for a thin client.
   - **Refinement:** ship *decomposed payloads + `kind`*. The peer then needs
     only apply-facts and query — not `decompose.ts`, not the 33-kind vocabulary.
     `kind` rides as metadata for legibility but is never interpreted. This
     dissolves the consensus risk (a pure `decompose` run client-side makes two
     peers on different versions derive different state from identical
     hash-verified ops) and makes the store a pure function of ops received —
     convergence by construction.
   - **Cost, stated honestly:** materialization makes the *replication unit* the
     *authorization unit*. A peer that materializes holds every fact you shipped
     it, so per-fact read filtering is client-side theatre. §5 stops being
     deferrable. That is a feature: server projections let you pretend you have
     per-fact auth while being a thin client.
   - **Would change the answer:** an TQL + sql.js bundle too large for the
     browser (unmeasured); a real per-fact authorization need rooms cannot
     express.
   - **This decision precedes 1 and 4 below** — a DSL binds to a substrate, and
     `tx-query`/`use:query` reads identically whether it runs locally or asks a
     server. Design it first and you may write syntax the client cannot execute.

 1. **Novel language vs. embedded DSL** (§3) — **RESOLVED (2026-07-16).**
    See the implemented spec: `docs/specs/tml-v0.md`.
    - **Option C — htmx-style attribute DSL** (proposed 2026-07-15). Philosophy:
      *"the graph is the engine of application state"* — decorate markup with
      graph relationships instead of HTTP requests. Four primitives: `query`
      (derive), `op` (mutate), `live` (subscribe), `ref` (bind to identity).
      `live` is the real differentiator: it is exactly what htmx lacks and Trellis
      has.
    - **Take the philosophy; reject the string form.** `tx-query="todos.where(done
      = false)"` *is* a novel language — §3's Option A wearing an attribute, and
      worse on every axis §3 cared about: no type-check, no autocomplete, no LSP,
      runtime errors instead of compile errors, and invisible to tooling
      (including the `pnpm check` promote gate). §3's own argument — "agents
      already speak TypeScript … strictly better for the AX thesis" — is decisive
      against it: an agent that writes `don = false` gets a blank div and no
      diagnostic.
    - **Synthesis — RESOLVED as `tml-*` attributes with scoped field expressions.**
      The four primitives ship as **`tml-query`, `tml-op`, `tml-live`, `tml-ref`**
      attributes (ADR 0025 naming) binding to *typed, scoped field-path
      expressions* (e.g. `tml-text="lane.id"`, `tml-attr-class="lane.status"`,
      `tml-op="promote(lane.id)"`) — not raw TQL strings, not inline JS. This is
      one language with **two transport adapters**: the **Web driver** (client-side
      `evaluateQuery` over a seeded snapshot + `fetch` mutation + SSE `live`)
      ships in v0 on the sterile `/tml-lanes` route; the **Tauri driver** is a
      deferred adapter (TRL-9) over the same attribute vocabulary. htmx needed
      attribute strings because HTML had no other extension mechanism; we control
      the runtime and do not inherit that constraint.
    - **Two flagged before this becomes a spec:** (a) `tx-agent` is a capability
      grant in markup — "who may invoke this, on whose behalf, reading what" is §5
      + capability middleware, and must exist before the syntax; (b) optimistic
      update/rollback does *not* "emerge from the four primitives" — it is a
      protocol concern (SPEC-v1.1+) that depends on what the server does with a
      rejected op. Both remain open; TML v0 scopes `tml-op` to a fire-and-reflect
      model (server is authoritative; the live stream re-renders).
2. **Read-authorization model** (§5) — needs a dedicated ADR before `rule Read`
   is real. Blocking for Campus "room = file."
3. **Reads/writes enforcement unification** — one mechanism or two? Today it's
   two (TQL scope + capability middleware).
4. **`view` target** — recommend Svelte 5 runes *inside* a **Block Protocol 0.3**
   block (§6), vs. own reactive runtime.
5. **How much Block Protocol?** (§6) — message contract only (recommended), or
   its type system too? The type system caps TQL expressiveness at the
   boundary. Also requires accepting that 0.4 is paused and we'd be targeting a
   de-facto frozen spec.
6. **Is "CRDT" claimed or earned?** — need the graph conflict-semantics work
   before the marketing uses the word.
7. **SemType subset — where's the line?** (§7) — recommend in: three type kinds,
   `allOf` closure, `actorType`, `confidence`. Out: bi-temporal, conversions,
   exhaustive formats. **Needs your call**, because it's the difference between
   weeks and months.
8. **Provenance now or later?** (§7, Phase 0.5) — recommend **now**. The only
   genuinely time-sensitive item here; everything else can wait, this can't.
