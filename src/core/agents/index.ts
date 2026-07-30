/**
 * Agent System — Public API Surface
 *
 * @module trellis/core/agents
 */

export { AgentHarness } from './harness.js';
export { WorkerPool } from './worker-pool.js';
export { DAGScheduler } from './dag-scheduler.js';
export { evaluateCondition, evaluateEdge } from './edge-evaluator.js';
export { evaluateGate } from './gate-keeper.js';

export type {
  AgentDef,
  ToolDef,
  ToolHandler,
  ToolResult,
  AgentRun,
  DecisionTrace,
  RunStatus,
  AgentHarnessConfig,
  RunTaskOptions,
} from './types.js';

export type {
  WorkerTask,
  WorkerTaskStatus,
  WorkerPoolConfig,
  WorkerPoolEvent,
  PoolStatus,
} from './worker-pool.js';

export type {
  DAGStep,
  DAGStepStatus,
  DAGWorkflow,
  DAGRunStep,
  DAGRun,
  DAGSchedulerConfig,
  DAGEdge,
} from './dag-scheduler.js';

export type {
  GateType,
  GateFailAction,
  DAGGate,
  GateResult,
} from './gate-keeper.js';

export type {
  EdgeResult,
} from './edge-evaluator.js';
