# ADR 0059: Frozen formula core + dialect adapters

**Status:** Accepted (2026-10-12)
**Date:** 2026-10-12
**Issues:** TRL-470 (4b proposal) · TRL-472 (spec slice 1) · TRL-473 (impl slice 1, review TRL-474) · TRL-475 (spec slice 2) · TRL-476 (impl slice 2, review TRL-477) · TRL-471 (pb-node spike — sequenced after core)
**Amends:** [0009](./0009-kernel-formula-syntax.md) — kernel/CMS syntax split; unification now decided (was deferred)
**Related:** [0010](./0010-kernel-rollups-and-relations.md) (rollups), [0018](./0018-explicit-ids-and-field-sync-tiers.md) (derived tier), [0039](./0039-no-vendor-kernel-backends-compatibility-bridge.md) (compat bridge ≠ vendor backend), [0049](./0049-git-bug-compatibility-adapter.md) (clean-room compat adapter precedent), [0050](./0050-notes-and-derived-operator-surface.md) (derived surface discipline)
**Supersedes:** nothing
**Impacted components:** new formula-core module (zero-dep, single-file artifact) in the `trellis` package · `src/core/computation/expr-evaluator.ts` (consumer → adapter) · `trellis/cms` formula path (adapter) · external: shablon PB fence, `os/client/trellis-client` collection formulas, museum-oss world-engine, turtlenote/`@turtle.tech/app-sdk`

## Context

Trellis evaluates formulas in several places today, on several different engines:

| Surface | Syntax | Evaluator | Status |
| --- | --- | --- | --- |
| CMS collections | `{field} * {quantity}` | client-side (`trellis/cms`) | live |
| Kernel ontology | `$mul($price, $quantity)` | `ExprEvaluator` post-TQL (`src/core/computation/expr-evaluator.ts`) | live |
| Client collections | JS-ish + 25+ `$` helpers | `useCollectionFormulas.ts` (~650 lines) | live (`os/client/trellis-client`) |
| PB dialect (compat fence) | `@request.auth.id != '' && …` | none — classified/guarded only | shablon 4a |
| World-engine (museum-oss) | `=Health.current / max` | per-client recompute | live |

ADR 0009 documented the split and deliberately deferred unification ("unify later if
CMS schemas migrate to kernel ontologies"). That deferral now has a cost: the drift
is **shipped**, not hypothetical.

- `lab/apps/note/turtlenote` persists `computedExpression` + `computedKind:
  'formula' | 'rollup'`, specs an editable formula field
  (`docs/adr/0005-universal-entity-dialog.md`), and records the fragmentation as a
  gap — formula evaluation "confirmed live only for `entitiesStore`-backed (graph)
  apps, i.e. Projects, not finance's `LedgerSource`"; "Not yet: … formulas in user
  databases."
- The richest real dialect lives in the client, not in ADR 0009's `{field}`
  arithmetic: graph-edge context (all records + edges), hand-rolled value
  normalization (JSON-LD single-item arrays, `{value,color}` options,
  `"Due date" → dueDate`), and a helper registry — i.e. the core must pin context
  shape, normalization semantics, identifier derivation, and helper names aligned
  with `TRELLIS_SPEC` Appendix D and kernel `ExprEvaluator`.
- Determinism: museum-oss treats formulas as derived state —
  "never stored or sent; recomputed locally on every client," every client
  agreeing "without a byte crossing the wire." `os/os-sandbox` elevates that to an
  OS axiom in its tri-tier durability split (**derived** = "recomputed locally
  in-place, zero persistence overhead").
- Security: client evaluation patches around dynamic code today. A parse-based core
  removes the `eval` / `new Function` surface.
- Distribution is already solved once and must not be re-invented:
  `os/trellis-studio/script/sync-trellis-core.ts` builds → verifies → pins the
  `trellis` package (file-link dev, npm pin after publish); `shell-builder`'s
  `pack-trellis.mjs` is a second consumer of the same package. Per-consumer wiring
  scripts are symptoms, not mechanisms.

## Decision

### 1. One frozen formula core is THE primitive

A zero-dep, pure-Node module: **tokenize / parse / evaluate / serialize** over a
frozen v1 subset — scalars, field refs, operators, resolver-injected context
(`@request.*` via host bindings), functions via a **versioned registry**. Semantics
are pinned in `SPEC.md`: numeric precision; string and date determinism; JSON-LD
value normalization; context shape (record + graph edges + helpers); identifier
derivation ("Due date" → `dueDate`). Freeze v1 hard; extension only at the edges.

### 2. Parse-based evaluation only

No `eval`, no `new Function`, anywhere in the core. This is both the security
decision (no dynamic-code surface) and the determinism decision (cross-client
agreement is only meaningful if evaluation is a pure function of pinned semantics).

### 3. Dialects are adapters, not evaluators

CMS `{field}`, kernel `$fn`, PB rules (incl. `@request.*`), and museum-oss `=` each
become a thin adapter over the core. `trellis/schema`'s declarative ergonomics
(`formula(...)`, `rollup()`) are unchanged — **the core is an extraction, not a new
DSL**. The freeze names THE primitive; existing surfaces are demoted to
distribution channels and adapters — not semantics authorities.

### 4. The corpus is the contract

Grow 4a's classification corpus into an **evaluation-equivalence matrix**
(dialect × expression × context × expected). The core ships only when the matrix
passes with zero semantic loss on every surface, and shablon's
`pb-formula-compat-unit` + `pb-schema-unit` pass unchanged wired to the core.
`computedExpression` must round-trip unchanged through parse/serialize (editor path,
per turtlenote ADR 0005).

### 5. Distribution reuses the incumbent pin

Single-file amalgamation, zero runtime deps, Node LTS; propagated via the `trellis`
package pin mechanism (`sync-trellis-core` precedent: file-link dev → npm pin). No
fourth mechanism, no new artifact family. The spike may incubate in
`trellis-node/experiments/`; the frozen artifact's home is the package.

### 6. pb-node (if pursued) is a consumer, not a sibling

The PB-shaped backend spike (`node:http` / `node:sqlite` subset over SQLite,
clean-room, real-PB oracle) consumes this core as its filter/expression engine,
sequenced after it and taking frozen semantics as given. Its own decision record
(clone vs bridge over Trellis storage; scope; hosting) is created when the spike
resolves — pass or fail.

## Alternatives considered

| Option | Pros | Cons | Why not |
| --- | --- | --- | --- |
| **A — extract frozen core; dialects become adapters (chosen)** | one semantics authority; client/PB/determinism surfaces can all ride it; zero-dep preserves ethos | corpus + SPEC must be pinned before migration; adapters to build | — |
| B — merge into kernel `ExprEvaluator` (the handoff's fallback) | fewest moving parts; stays in-repo | TQL post-processor, not a standalone artifact; CMS client path, PB fence, and museum-oss determinism can't ride it | fallback only, if the spike fails its corpus |
| C — adopt a third-party expression lib (JSONata / expr-eval / jsep) | less parser to own | deps + unpinnable semantics; PB compat and round-trip serialization become fights | rejected |
| D — invent a new DSL | clean sheet | breaks `trellis/schema` ergonomics and persisted `computedExpression`; the need is extraction, not syntax | rejected |
| E — status quo (ADR 0009 deferral) | zero change | drift already shipping (turtlenote gaps); triple maintenance grows | rejected |

## Consequences

### Positive

- ADR 0009's deferral resolves: kernel, CMS, PB, and client unify under one frozen,
  corpus-verified semantics.
- Dynamic-code surface removed from evaluation (parse-based).
- Derived-tier determinism (os-sandbox / museum-oss) gets a named semantics contract
  instead of per-client re-implementation.
- pb-node's filter engine falls out of the same primitive when the spike succeeds.

### Negative / tradeoffs

- Corpus and `SPEC.md` must be frozen before any surface migrates; sequencing
  discipline required.
- Adapter layer exists per surface in the interim (three dialects → core before CMS
  fully retires its client evaluator).
- Naming cleanup: ≥5 kernel-ish surfaces must be re-articulated as core /
  distribution / adapter roles.

### Follow-ups

- [x] Create 4b proposal issue (**TRL-470**)
- [x] Create pb-node spike issue, sequenced after the core (**TRL-471**, parent TRL-470)
- [ ] Corpus: lift shablon 4a classification corpus → evaluation-equivalence matrix
- [ ] `SPEC.md`: precision, determinism, normalization, context shape, registry
- [ ] Adapter wiring: CMS, kernel, PB; shablon tests pass unchanged
- [x] Update `docs/adr/README.md` index (accepted 2026-10-12)

## Addenda

<!-- Append dated notes here. Do not rewrite accepted decision text above. -->
