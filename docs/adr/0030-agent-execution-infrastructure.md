# ADR 0030: Agent Execution Infrastructure — WorkerPool & DAG Scheduler

**Status**: Accepted  
**Date**: 2026-07-30  
**Context**: Trellis 3.5.0+

## Problem Statement

AgentHarness (ADR 0021) provides a single-agent, single-run execution model.
As agent systems scale, two gaps emerge:

1. **Concurrency**: Multiple agent runs compete for resources. Without a
   scheduler, concurrent runs block each other, exceed rate limits, and
   produce unpredictable system load.
2. **Multi-step workflows**: Complex tasks require orchestrating multiple
   agents in sequence or parallel, where each step depends on prior outputs.
   The existing `runAgentTask` loop is a single turn-taking loop; it has no
   mechanism for DAG-based composition across agents.

We need a lightweight, process-local execution layer that layers queue-based
concurrency and DAG orchestration on top of the existing harness.

## Decision

### 1. WorkerPool — Queue-based concurrency control

A `WorkerPool` sits between callers and `AgentHarness`. Every run request
goes through the pool, which:

- Maintains a FIFO queue of `WorkerTask`s
- Executes up to `concurrency` tasks simultaneously
- Supports `pause`/`resume`/`cancel` on individual tasks
- Emits lifecycle events (`task:queued`, `task:started`, `task:completed`,
  `task:failed`, `task:cancelled`, `task:paused`, `task:resumed`)
- Starts/stops via explicit `start()`/`stop()` lifecycle calls
- Polls on a configurable interval (`pollIntervalMs`) to drain the queue

```typescript
interface WorkerPoolConfig {
  concurrency: number;        // default 1
  pollIntervalMs: number;     // default 500
}
```

Rationale: A polling-based dispatcher is simpler than promise-based
channel semantics and avoids subtle microtask ordering issues. The
poll interval is trivially configurable and the `_tick` approach makes
queue state observable at any point.

### 2. DAGScheduler — Multi-step workflow orchestration

A `DAGScheduler` composes agent runs into directed acyclic graphs. Each
workflow step specifies zero or more `dependsOn` predecessor step IDs.
The scheduler:

- Accepts a `DAGWorkflow` and runs it as a `DAGRun`
- Evaluates the DAG on each completion event: when all dependencies of a
  step are met, the step transitions `pending → ready`
- Submits ready steps to a `WorkerPool` for execution
- Tracks step lifecycle: `pending → ready → running → completed/failed/skipped`
- Fails the entire workflow when a step fails (`failOnError: true`, default)
- Skips downstream steps on failure when configured continue-on-error

```typescript
interface DAGStep {
  id: string;
  agentId: string;
  input: string;
  dependsOn?: string[];
}

interface DAGWorkflow {
  id: string;
  name: string;
  steps: DAGStep[];
}
```

Rationale: A simple event-driven approach (listen to pool events, then
re-evaluate) avoids a central scheduler loop. DAG state is purely
derived from step statuses, making it inspectable at any point.

### 3. Integration with AgentHarness

Neither WorkerPool nor DAGScheduler replaces AgentHarness. They compose
with it:

```
Caller → DAGScheduler → WorkerPool → AgentHarness → TrellisKernel
```

- `DAGScheduler.run(workflow)` calls `WorkerPool.enqueue(agentId, input)`
- `WorkerPool._execute(task)` calls `AgentHarness.runAgentTask(agentId, input)`
- `AgentHarness` writes AgentRun/DecisionTrace entities to the kernel

### 4. Lifecycle events

Both classes expose a typed event bus for monitoring and integration:

```typescript
type WorkerPoolEvent =
  | { type: 'task:queued'; task: WorkerTask }
  | { type: 'task:started'; task: WorkerTask }
  | { type: 'task:completed'; task: WorkerTask }
  | { type: 'task:failed'; task: WorkerTask; error: string }
  | { type: 'task:cancelled'; task: WorkerTask }
  | { type: 'task:paused'; task: WorkerTask }
  | { type: 'task:resumed'; task: WorkerTask };
```

These enable UI dashboards, metrics collection, and webhook integrations
without coupling to any specific consumer.

## Consequences

### Positive

1. **Simple composition**: WorkerPool and DAGScheduler are independent,
   singly-responsible classes that can be used together or separately.
2. **Observable state**: Queue depth, active jobs, and DAG progress are
   always queryable via `getStatus()`, `getQueue()`, `getActiveJobs()`,
   and `getRun()`.
3. **Testable**: Both classes accept mock harnesses/pools, enabling
   fast unit tests without a Graph kernel or SQLite.
4. **Graceful degradation**: Without a DAGScheduler, WorkerPool alone
   provides concurrency. Without a WorkerPool, AgentHarness still works
   as before.

### Negative

1. **No persistence**: Queued tasks are lost on process restart. Future
   iterations may persist `WorkerTask` and `DAGRun` state to the graph.
2. **Polling loop overhead**: The interval-driven `_tick` introduces a
   small scheduling latency (default 500ms). This is acceptable for agent
   workloads where runs typically take seconds to minutes.
3. **No distributed execution**: Both classes are in-process only. Cross-
   process or cross-machine distribution is out of scope for this layer.

## Future Work

- Persist WorkerPool queue to the graph (survive restarts)
- Add `maxRetries` per DAG step with exponential backoff
- Export pool/run metrics for Prometheus
- DAG visualisation via MCP tools

## References

- ADR 0021: Canonical Op Hashing and Provenance (AgentHarness)
- ADR 0015: Agent Handoff Protocol
- TRL-337: Ontology formalization (AgentRun, DecisionTrace)
- TRL-339: WorkerPool
- TRL-340: DAG scheduler
- TRL-341: Integration tests + ADR 0030
