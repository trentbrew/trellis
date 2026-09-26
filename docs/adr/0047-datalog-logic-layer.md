# ADR 0047: Datalog as the logic layer — correct recursion, rules as graph data, provenance, one IR for every query surface

**Status:** Proposed (2026-09-26). Decision 1 is implemented (TRL-457).
**Issues:** TRL-458 (epic), TRL-457 (decision 1)
**Related:** turtleOS [ADR-0016](../../os-sandbox/docs/adr/0016-tsh-command-language.md) (tsh selections), turtleOS [ADR-0013](../../os-sandbox/docs/adr/0013-derived-references.md) (derived tier), [0021](./0021-canonical-op-hashing-and-provenance.md) (op provenance)
**Impacted components:** `src/core/query/engine.ts`, `src/core/query/datalog.ts`, `src/core/query/parser.ts`, `src/core/ontology/core-ontology.ts` (new `Rule` type)

## Context

EQL-S is already a Datalog: named rules (`head :- body`), recursion (built-in transitive closure, reverse reachability, siblings), negation (`not`), disjunction (`or`), and aggregates (`count`, `sum`, `avg`, `min`, `max`, `collect`). The question that prompted this ADR — "do we need a Prolog on top of Trellis' Datalog?" — turned out to have a more urgent answer first.

### Recursive rules were silently wrong

Probing the engine (2026-09-26) showed that **every recursive rule stopped after two hops**:

| Query | Expected | Returned |
|-------|----------|----------|
| `reach(n:0, ?y)` on a 40-node chain | 40 | 2 |
| `reach(?x, ?y)` on a 10-node chain | 55 | 19 |

The top-down evaluator ran each rule body with a *copy of the caller's bindings*. In the recursive step, the inner rule's body variables (`?z`) arrived already bound to the outer call's values (variable capture), so the link lookup demanded a link that didn't exist. The declared `maxRuleDepth = 32` never applied either: nested calls restarted at depth 0. The test fixtures only had two-hop chains, so everything passed.

### Other gaps

- **Rules are code, not data.** They're registered with `addRule()` from plugins. They can't sync, be versioned by the op log, be forked with a graph, or be read by an agent asking "why?". turtleOS computes its derived facts (`gapOpen`, `laptopUsable`; soon `posixPath` and ref backlinks) in hand-written JavaScript for the same reason.
- **No provenance.** Nothing can say *why* a derived fact holds. That's what turtleOS `why` / `explain` and an agent justifying an answer need.
- **Query surfaces multiply.** turtleOS tsh selections (ADR-0016 phase 2) are evaluated by their own JavaScript over graph views rather than compiled to EQL-S, so there are now two evaluators that can disagree. Cypher has been raised as a surface; SQL comes up too.

## Decision

### 1. Bottom-up, semi-naive evaluation (implemented)

A rule application joins the caller's bindings with the rule's **relation**, computed bottom-up to a fixpoint:

- **Fresh scope:** every rule body is evaluated with fresh bindings; only the rule's params cross the boundary. No capture.
- **Components:** a rule is solved together with the rules it reaches through positive applications (its recursive component), so mutual recursion works.
- **Semi-naive:** after round 0, each recursive occurrence in a body reads only the previous round's new tuples (the delta), and the rest read full relations. Every new derivation must use at least one new tuple, so this is complete. It terminates because the store is finite and there are no function symbols.
- **Stratified negation:** rules negated from a component are solved first. Negating a rule that depends back on the component is rejected with an error ("unstratified negation is not supported") rather than answered wrongly.
- **Range restriction:** a param the body doesn't bind is an error, not a silent `undefined`.
- **Indexed joins:** relations are indexed by bound argument positions, and indexes are reused while a relation hasn't grown.
- **Scope:** relations are cached for the duration of one `execute()` (the store is fixed for a query).

Results: 40-hop chain 40/40; all-pairs 55/55; cycles terminate with the complete answer; left recursion and mutual recursion (even/odd path lengths) are correct; a 500-node chain takes ~0.2s (a naive fixpoint took ~40s at 500, ~41s at 200). Regression tests: `test/core/query-engine.test.ts` → "Datalog recursion". Nine of the ten fail on the old evaluator; the tenth (stratified negation) happens to pass there because its data is two hops deep.

### 2. Rules are graph entities

A new core type `Rule` holds `name`, `source` (EQL-S rule text, e.g. `reach(?x, ?y) :- (?x "next" ?z), reach(?z, ?y)`; `parseRule` already exists), `enabled`, and optional `description`. The engine loads enabled `Rule` entities at query time, alongside built-ins registered in code (code rules stay for plugins and built-ins).

- **Writing a rule is an ordinary op:** it's versioned, synced, attributed (0021), and forked with the graph.
- **Validated on write:** a middleware rejects a `Rule` whose source doesn't parse, isn't range-restricted, or would create unstratified negation with the existing rules. Invalid rules never reach the evaluator.
- **Consumers:** turtleOS moves its JavaScript-derived tier to `Rule` entities (`gapOpen`, `laptopUsable`, then `posixPath` over `parent` links, and ref backlinks), and agents can list the rules they reason with.

### 3. Provenance: "why does this fact hold?"

While solving, the engine can record one derivation per tuple: the rule and the body bindings that produced it (first derivation wins; this is cheap). `engine.why(rule, tuple)` walks those records into a proof tree whose leaves are base facts and links (each already carries op provenance, 0021). It's opt-in per query, so ordinary queries pay nothing.

This is the Prolog-feeling payoff, delivered inside Datalog. turtleOS `why` and `explain`, and `?` answers, can cite the derivation instead of paraphrasing it.

### 4. One IR for every query surface

Every surface compiles to the EQL-S `Query` IR and runs on this one engine:

```text
turtleOS tsh selections · EQL-S text · agent typed tools · Cypher (future)
                     ↓ compile
          EQL-S Query IR (patterns, rules, filters, aggregates)
                     ↓ this engine (decision 1)
                 EAV store / op log
```

- **tsh selections** (turtleOS ADR-0016) compile to this IR, retiring their separate JavaScript evaluator. `explain` shows the compiled query, which also makes EQL-S learnable.
- **Cypher** is the most natural graph surface, and both people and models already know it. In turtleOS's dialect experiment, a small model wrote Cypher 60% of the time unprompted. A Cypher *subset* is admissible as a surface: node labels = entity types, relationships = link attributes, `WHERE`, `RETURN`, and variable-length paths compiled to rule applications. It is not in scope here; this ADR only fixes the shape so it can be added without a new engine.
- **No surface gets its own evaluator.** A surface that can't be compiled to the IR is a missing IR feature, not a reason for a second engine.

### 5. Not Prolog

Prolog adds function symbols (structured terms), unification over trees, cut, side effects, and depth-first resolution that can fail to terminate and depends on clause order. In a kernel that runs in-process (turtleOS PID 1) and syncs between peers, those are liabilities: every query must terminate, and two peers holding the same ops must derive the same facts regardless of order. Datalog's restrictions exist to guarantee exactly that.

Goal-directed search ("what would have to change for `laptopUsable` to hold?") is planning, and belongs in a planner beside the kernel that calls it, not in the query language.

## Consequences

**Positive**
- Recursive queries return correct answers. They were wrong before for anything deeper than two hops.
- A path to rules as shared, versioned, inspectable data, and to derived facts that explain themselves.
- One engine behind every surface; no semantic drift between evaluators.

**Negative / costs**
- Rule relations are computed in full for the query, not goal-directed. A bound first argument doesn't prune the computation, so `reach(n:0, ?y)` computes all pairs over the component. That's fine at today's graph sizes; magic-sets rewriting or tabling is the fix when it isn't.
- Relations are recomputed per `execute()`. Caching across queries (keyed by op-log head) and incremental maintenance on the op stream are follow-ups.
- `Rule` entities add a write-time validator and a load step to query execution.
- Stratification is enforced as an error. Programs that relied on the old (wrong) evaluation of negation through recursion will now fail loudly.

## Alternatives considered

| Alternative | Verdict | Why |
|-------------|---------|-----|
| Keep top-down evaluation; fix capture, add a cycle check | Rejected | A cycle check that returns no answers for a goal already in progress loses answers under left recursion and mutual recursion; correct top-down needs full tabling, which is more machinery than semi-naive for the same result. |
| Raise an error past a depth cap | Rejected | It only relabels wrong answers; the cap never applied anyway. |
| Embed a Prolog | Rejected | Non-termination and order dependence (decision 5). |
| SQL as the query surface | Rejected as the IR; possible as a surface | EAV plus links fits Datalog better than tables (links become self-joins). A small SQL subset could compile to the IR like Cypher. |
| A separate evaluator per surface | Rejected | Semantic drift (already happened once with tsh selections). |

## Rollout

1. **Correct recursion (done 2026-09-26):** semi-naive evaluation, stratification, range restriction, indexed joins, regression tests.
2. **`Rule` entities:** core type, write-time validation middleware, loading into the engine, a CLI (`trellis rule list/add/rm`).
3. **Provenance:** derivation records, `engine.why()`, proof trees in the CLI and MCP.
4. **turtleOS:** move the derived tier to `Rule` entities; compile tsh selections to the IR.
5. **Performance, when needed:** cross-query relation cache keyed by op-log head, then magic sets or tabling for goal-directed queries, then incremental maintenance on the op stream.
6. **Cypher subset surface:** a separate ADR when it's picked up.

## Open questions

1. Should `Rule` entities be scoped per zone (0022), or be global to a store?
2. Rule source format: EQL-S rule text only, or also a structured (JSON) body for agents that build rules?
3. Provenance: keep the first derivation only, or all derivations (bounded) for "every reason this holds"?
4. Do aggregates inside recursive rules need support (e.g. shortest path), or stay non-recursive?

## Addendum — 2026-09-26: decision 2 implemented

- **Type:** `core:Rule` (label `Rule`) with `source` (required EQL-S rule text), `description`, `enabled`. Several `Rule` entities may define clauses of one rule name; they union with code-registered rules of that name.
- **Engine:** `execute()` loads enabled `Rule` entities from the store (`src/core/query/rules.ts`). A stored rule that fails to parse doesn't break unrelated queries; a query that uses it fails with the entity and parse error. This means `kernel.query()`, which previously had no rules at all (only `DatalogRuntime` instances did), now sees every stored rule.
- **Write-time validation:** `createRuleMiddleware` is always installed first in `TrellisKernel` and rejects a write that creates or edits a rule so that it doesn't parse, has no `source`, has a param its body never binds, or makes negation go through recursion (checked statically with an SCC pass over the rule graph). Only problems a write *introduces* block it.
- **Two write paths:** the VCS engine's store writes (`trellis` CLI in a repo) don't run kernel middleware. `trellis rule add/enable` runs the same program check itself; other VCS-path writes of `Rule` entities (sync, `entity create -t Rule`) are caught by the engine when a query uses them, not at write time. Closing that gap means running the rule check on VCS store ops too.
- **CLI:** `trellis rule list | add <source> [--id] [-d] | rm <id> | enable <id> | disable <id>`.
- **Tests:** `test/core/rule-entities.test.ts` (kernel queries use stored rules, enable/disable, every rejection case, edits, stratified negation across rules, non-rule writes untouched; static checks).
