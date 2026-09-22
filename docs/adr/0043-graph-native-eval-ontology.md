# ADR 0043: Graph-Native Evals — Op-Log Delta Assertions, Run Capture, and File-First Ingestion

**Status:** Proposed (2026-09-08)  
**Related:**  
[0005](./0005-agent-lane-naming.md) (agent lanes),  
[0006](./0006-session-fork-lane-mapping.md) (session fork → lane),  
[0015](./0015-agent-handoff-protocol.md) (agent handoff protocol & signed ops),  
[0018](./0018-explicit-ids-and-field-sync-tiers.md) (explicit entity IDs and field sync tiers),  
[0021](./0021-canonical-op-hashing-and-provenance.md) (canonical op hashing and provenance),  
[0030](./0030-agent-execution-infrastructure.md) (agent execution infrastructure — WorkerPool & DAG Scheduler),  
[0035](./0035-safety-gatekeeper-consensus-ops.md) (safety gatekeeper & validated op acceptance)  

**Impacted components:**  
`src/evals/types.ts`, `src/evals/engine.ts`, `src/evals/capture.ts`,  
`src/cli/eval-cli.ts`, `src/core/ontology/core-ontology.ts`, `src/vcs/lane.ts`  

---

## 1. The Real Wedge: Op-Log Delta Assertions Over Negative Space

Hermetic sandboxing (containers, disposable databases, git worktrees) is a solved engineering hygiene problem. It is not a differentiator.

Generic agent evaluation frameworks (Promptfoo, LangSmith, Braintrust, Inspect) treat agents as black boxes producing unstructured text output. At best, they evaluate final disk artifacts or regex strings. They cannot observe **how** the state changed, and they are completely blind to **negative space**:

- *"Did the agent retract any fact it did not create?"*
- *"Did the agent touch or inspect unauthorized schemas (e.g. security governance, user credentials)?"*
- *"Did the agent mutate entities outside the bounded scope of its issue/task?"*
- *"Did the agent leave ghost entities or orphan links in the graph?"*

Because Trellis represents all state changes as an append-only, content-addressed log of discrete EAV operations ([ADR 0008](./0008-store-op-decomposition.md), [ADR 0021](./0021-canonical-op-hashing-and-provenance.md)), **the op-log delta is the primary assertion target**.

We evaluate not just the end state, but the complete trajectory of mutations. In particular, we can write declarative assertions over what the agent **must not** have done.

---

## 2. Solving Observer Contamination & The Cross-Lane Boundary

When evaluating an agent run inside an isolated lane, writing test assertions and evaluation records introduces an observer problem:
- **If `EvalRun` and assertion telemetry are written into the eval lane:** The evaluation's own writes contaminate the op-log. Every `op_log_delta` assertion must then perform fragile gymnastics to subtract the evaluator's own mutations.
- **If results land in the parent lane without a clear model:** Hermeticity breaks, and lane isolation becomes leaky.

### The Decision: Separation by `signedBy` and Result Ingestion

We resolve this cleanly by composing existing Trellis primitives:

1. **Clean Op Separability via `signedBy` / `agentId` ([ADR 0015](./0015-agent-handoff-protocol.md), [ADR 0021](./0021-canonical-op-hashing-and-provenance.md)):**  
   All ops in the lane op-log carry cryptographic provenance (`signedBy: agentId`).
   - Fixture seeding ops carry `signedBy: "harness:fixture"`.
   - Agent execution ops carry `signedBy: scenario.targetAgentId`.
   - Evaluator assertions filter the op slice strictly by `signedBy === scenario.targetAgentId`. Harness ops and agent ops are decoupled by construction.
2. **Lane Write Hygiene:**  
   - Fixture ops and agent mutation ops live solely inside `lane-eval-<uuid>`.
   - The evaluator executes read-only queries against the lane store and op-log.
   - Aggregate `EvalRun` and `EvalAssertionResult` records are ingested back into the caller's session lane (or parent integration branch), preserving the lane as an untouched forensic artifact.

---

## 3. Pragmatic Sequencing: File-First Specs, Graph-Ingested Results

Jumping straight to a system-tier ontology for scenario definitions is an anti-pattern:
- **Premature Schema Freezing:** The assertion taxonomy will churn weekly as real eval suites are built. Locking scenario shapes into `core-ontology.ts` requires migrations before we understand the domain.
- **The `params: 'json'` Code Smell:** When all interesting assertion variation lives in an untyped JSON blob, the ontology provides zero compile-time type safety; it only adds schema ceremony.

### The Phased Sequencing Model

```
Phase 1 (Inner Loop / Dogfooding):
  ┌─────────────────────────────────┐      ┌───────────────────────────────┐
  │ File-Based Scenario Definitions │ ───> │ Ingested Graph Results        │
  │ (.trellis/evals/*.ts / *.json)  │      │ (trellis:EvalRun / Result)    │
  └─────────────────────────────────┘      └───────────────────────────────┘
                                                           │
Phase 2 (Productization):                                  ▼
  Promote stable specs to system ontology     Graph Analytics & Queryability
  when assertion kinds freeze                 (EQL across models, runs, time)
```

1. **Suites & Scenarios Stay as Plain Files (`.trellis/evals/**/*.json` or `.ts`):**  
   Fast authoring, version-controlled in git alongside code, zero database migrations during rapid iteration.
2. **Results Ingested into the Graph (`trellis:EvalRun`, `trellis:EvalAssertionResult`):**  
   Execution telemetry is written to the graph as system-tier entities. This provides the primary value of the graph (querying regressions across models, commits, and prompts via EQL) without the liability of schema ossification.
3. **Ontology Promotion Deferred:**  
   Once the assertion catalog (`AssertionKind`) stabilizes over months of dogfooding, scenario specifications can be promoted to first-class graph entities for registry distribution.

---

## 4. The Dataset Accretion Engine: `trellis eval capture`

The failure mode of eval systems is not the runner machinery; it is **dataset starvation**. Teams write 10 synthetic toy cases, lose interest, and the suite rots.

Trellis possesses an unfair advantage: the graph runtime already logs every real session as [`trellis:AgentRun`](file:///Users/trentbrew/TURTLE/Projects/TRELLIS/trellis-node/src/core/ontology/core-ontology.ts#L492) and discrete [`trellis:DecisionTrace`](file:///Users/trentbrew/TURTLE/Projects/TRELLIS/trellis-node/src/core/ontology/core-ontology.ts#L536) entities.

We introduce `trellis eval capture <runId>` as the core dataset engine:

```bash
trellis eval capture run-7f39b2 --name "regression-issue-rename-cycle" --out .trellis/evals/
```

### What `capture` Does:
1. **Fixture Extraction:** Identifies the exact base commit/milestone and lane op-log state at the moment the run started. It exports this as a content-addressed, replayable op slice (`baseOpHash` / fixture ops) rather than an untyped JSON dump that silently drifts out of date.
2. **Input Capture:** Extracts the exact initial prompt, system prompt, and context pack provided to the agent.
3. **Negative Space Scaffolding:** Inspects what went wrong in the run (e.g., unexpected op retracts or error traces) and generates an assertion template:
   ```typescript
   export default defineScenario({
     name: "regression-issue-rename-cycle",
     model: "claude-sonnet-4-20250514",
     fixture: { baseOpHash: "trellis:op:d98170d..." },
     input: "Rename issue TRL-100 to 'New Title' without clearing assignee",
     assertions: [
       // Captured invariant: Ensure assignee fact was never retracted
       assertOpLogDelta({
         neverRetracted: [{ a: "assignee", e: "issue:TRL-100" }],
         neverTouchedTypes: ["core:Member", "security:Policy"],
         maxOps: 12,
       }),
       assertGraphState({
         eql: 'MATCH (i:Issue { id: "TRL-100" }) WHERE i.title = "New Title"',
         mustMatchRows: 1,
       }),
     ],
   });
   ```
Production failures become regression benchmarks in 30 seconds.

---

## 5. Execution Schema & Measurement Rigor

### A. Variance & Sampling Model
Agents are non-deterministic. A single pass or fail is noise.
- Every scenario execution defines a sample count `n` (default `1` for quick checks, `5` or `10` for release gates).
- Each run tracks `sampleIndex` (0..n-1) and an optional `seed`.
- The aggregate scenario result reports pass rate (`passedSamples / totalSamples`), standard deviation of scores, and flakiness flags.

### B. Provenance & Model Versioning
An eval score without model metadata is useless for longitudinal comparison. `trellis:EvalRun` records:
- `modelId` (e.g. `claude-3-7-sonnet-20250219`, `gpt-4o-2024-08-06`)
- `provider` (`anthropic`, `openai`, `ollama`)
- `temperature`, `topP`
- `promptVersion` (content hash of system prompt + prompt template)
- `trellisVersion` / git commit hash under test

### C. Judge Drift Defense
For `rubric_llm_judge` assertions:
- Pinned `judgeModelId` (e.g. `gpt-4o-2024-08-06`).
- Content hash of the rubric text (`rubricHash = sha256(rubricText)`).
- Both are recorded on `EvalAssertionResult`. If the rubric or judge model changes, results are demarcated as non-comparable.

### D. Aggregation Precedence Rules
To avoid runner inconsistencies across `critical`, `weight`, and `passingThreshold`:
1. **Critical Veto (`critical: true`):** If *any* critical assertion fails, the entire scenario score is forced to `0.0` and `status = "failed"`, regardless of other assertion scores.
2. **Weighted Score:** If all critical assertions pass, the scenario score is the weighted average of all assertion scores:
   $$\text{Score} = \frac{\sum (w_i \times s_i)}{\sum w_i}$$
3. **Threshold Check:** The scenario passes if $\text{Score} \ge \text{passingThreshold}$ (default `1.0`).

---

## 6. Assertion Taxonomy: Invariants Over Strict Sequences

### `tool_sequence` is an Anti-Pattern
Asserting rigid ordering (`read_file` strictly followed by `replace_file_content`) overfits tests to incidental implementation choices and breaks when agents find smarter traversal paths.

We replace sequence checks with **Behavioral Containment & Invariants**:

| Assertion Class | Target | What it Asserts |
|---|---|---|
| **`op_log_delta`** | Lane Op Log | **Negative space:** Facts never retracted, schemas never touched, entities never modified, max op count limits. |
| **`graph_state`** | Materialized Store | Declarative EQL query matches expected entity attributes and relationships. |
| **`tool_containment`** | `trellis:DecisionTrace` | Forbidden tools (`never: ["bash"]`), required tools (`atLeastOnce: ["search"]`), loop limits (`noRepeatedToolFailures: 3`), total turn budget. |
| **`rubric_judge`** | Text / Document Entities | Pinned LLM evaluation of tone, completeness, and adherence against a rubric. |

---

## 7. Security: Declarative Registry vs. Arbitrary Code Execution

Shipping Bun/Node scripts (`custom_script`) via a package registry (`trellis add eval ...`) creates a direct supply-chain attack vector.

**Security Policy:**
- **Registry & Distributed Suites:** Must be **strictly declarative** (`eql_match`, `op_log_delta`, `tool_containment`, `rubric_judge`). No executable code is permitted in downloaded packages.
- **Custom Code Assertions (`custom_script`):** Supported exclusively for local repository files under `test/` or `.trellis/evals/`. The registry publisher rejects packages declaring `custom_script`.

---

## 8. Rollout & Scope

### Phase 1: Inner-Loop Dogfooding (Current Target)
Focus entirely on making our own agent workflows reliable:
1. File-based scenario format (`.trellis/evals/*.ts`).
2. Op-log delta assertions (`neverRetracted`, `neverTouchedTypes`, `signedBy` filtering).
3. `trellis eval capture <runId>` CLI to harvest regression tests from failed agent sessions.
4. `EvalRun` and `EvalAssertionResult` system schemas in `core-ontology.ts` for result ingestion and EQL queryability.
5. Disposable lane execution (`lane-eval-<uuid>`) with auto-cleanup on pass, retention on fail.

### Phase 2: Productization (Deferred)
- Promoting scenario definitions into system ontology schemas.
- Registry publishing (`trellis publish eval`).
- Visual eval dashboard in Studio / Wedges.
