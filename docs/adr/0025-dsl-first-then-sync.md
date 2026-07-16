# ADR 0025: DSL-first, then sync transport (frozen-contract rule + bounded Iroh spike)

**Status:** Accepted
**Date:** 2026-07-15
**Issue:** TRL-108 (stream ops, not snapshots) · TRL-110 (SPEC-v1.1 sync protocol) · TRL-111 (Spike: Iroh transport)
**Depends on:** ADR 0011 (app-shell three bands), ADR 0012 (graph overlay config surface), `src/core/query/engine.ts` (TQL), `demo/realtime-app/src/lib/fractal/shells.ts` (fractal shells)
**Supersedes:** nothing

## Naming (canonical)

- The query language is **TQL** (public / brand name). This ADR and all
  user-facing docs use TQL.
- Internal source keeps the historical `eql` codename — `src/schema/eql.ts`,
  `EqlQuery`, `eqlLiteral`, `WHERE_OP_TO_EQL`, `formatEqlLiteral`. This is a
  **deliberate external/internal split, not a half-finished rename.** Do not
  "fix" the code to match; the brand lives in docs/CLI/strings only.
- The cloud / TrellisDB product exposes the **same TQL** over its MCP transport.
  There is one TQL, expressed over two transports: local (VCS kernel) and cloud
  (MCP). The `trellis-graph` skill's "TQL Graph API" is this same language.
- (Future) **TML** is the companion markup language: declarative attributes
  (`tml-query`, `tml-projection`, `tml-swap`) that bind a TQL query to a DOM
  element and project results into it.

## Context

Trellis now has several client surfaces that read the same graph: the web
`realtime-app` (Svelte), the CLI (`src/cli`), and a proposed native TUI (OpenTUI,
treated as a *separate ingestion target*, not a feature bolted onto the CLI).
Each should render through a **shared DSL / projection engine** — the fractal
shell model (`node | row | card` at vantages 2/5/8) and the TQL query language
are the two halves of that contract.

Separately, the **sync transport** (Iroh, per TRL-111) would move graph state
between surfaces and devices. The open question: build the DSL (authoring /
projection contract) first, or the Iroh transport first, or both at once?

Two facts drive the decision:

1. **The DSL is the contract every surface depends on.** Web, CLI, and TUI all
   "speak the same DSL." Transport only moves whatever schema the DSL defines.
   Building transport first means syncing a schema that is still mutating as the
   DSL evolves → guaranteed rework.
2. **Cost asymmetry is extreme.** The DSL is pure logic — fast to iterate,
   unit-testable (`test/core/query-engine.test.ts`), no external infra. Iroh is a
   native Rust dependency (NAT traversal, op-streaming) with a heavy build and
   test burden. Cheap work should stabilize the contract *before* expensive work
   consumes it.

Session context: the CLI `issue list` semantic views (`src/cli/views.ts`) and the
TQL engine fixes (semantic `ORDER BY`, aggregate projection) shipped this
session. The settled principle from that work — *the CLI text view is one surface
among others; `trellis query --json` is the agent/machine contract, `trellis issue
list` is the human curated view* — is the same separation applied at the transport
boundary: machine-readable graph output is the contract; formatted views are
per-surface.

## Decision

**Build the DSL first. Run a time-boxed Iroh feasibility spike in parallel.
Do not build full sync transport until the DSL contract is frozen to v1.**

### 1. DSL-first (primary workstream)

Stabilize the two halves of the shared contract:

- **Projection / authoring DSL** — the fractal shell + view-mode model
  (`demo/realtime-app/src/lib/fractal/shells.ts`, `src/lib/ui/page-variants.ts`):
  one vantage→shell mapping, one set of collection view modes, consumed
  identically by web, CLI, and (future) TUI.
- **Query DSL (TQL)** — `src/core/query/`: fact/link patterns, `FILTER`,
  `AGGREGATE`, `ORDER BY`, `LIMIT/OFFSET`, with semantic enum ordering already
  implemented for `priority`/`status`.

Target: a documented, versioned DSL that all surfaces can be pointed at.

### 2. Frozen-contract rule

- Surfaces (web, CLI, TUI) and transport (Iroh) MUST consume a **versioned** DSL
  schema. Any change to entity attributes, shell names, view modes, or TQL
  grammar requires a version bump.
- The sync transport MUST NOT sync a schema that is still in active mutation.
  Iroh work targets only the frozen v1 subset.

### 3. Bounded Iroh spike (parallel, not a full build)

TRL-111 stays a **feasibility spike**, explicitly time-boxed:

- Prove NAT traversal + op-streaming (`stream ops, not snapshots`, TRL-108) over
  Iroh against the frozen v1 DSL subset.
- Produce a **go / no-go** for the full transport build (ADR 0016/0017 blob
  serving + GC context applies once sync lands).
- No production sync, no permanent schema coupling, no native-build gating of the
  CLI in the spike's scope.

## Consequences

- **Good:** DSL unblocks every surface at once; Iroh risk is contained to a spike;
  transport team gets a stable target instead of a moving one; the human/agent
  read split (`query --json` vs `issue list`) is now a documented contract.
- **Bad / cost:** sync is delayed until the DSL freezes; two workstreams need
  coordination on the versioned schema.
- **Neutral:** concurrency is permitted *only* against the frozen subset — full
  parallel build of transport is explicitly deferred.

## Handoff note (fresh session)

This ADR closes a long context session. State at handoff:

- **Done:** CLI `issue list` semantic views (`--view/--sort/--group-by/--json`,
  `src/cli/views.ts`); TQL engine `ORDER BY` semantic enum ranking + aggregate
  projection fix (`src/core/query/engine.ts`); `trellis query`/`repl` now read the
  VCS EAV store (was booting an empty kernel store); `trellis-vcs` skill documents
  the human-vs-agent read split.
- **Next:** ADR 0025 §Decision — freeze the DSL contract (projection + TQL) to
  v1, then scope full Iroh transport against it. Keep TRL-111 as a spike.
- **Principle to preserve:** client surfaces are separate ingestion targets
  speaking one DSL; rendering logic lives in the surface, not in the CLI command
  layer.
