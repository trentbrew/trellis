/**
 * DAG Scheduler — Multi-step agent workflow execution via directed acyclic graphs.
 *
 * Each workflow step depends on zero or more predecessor steps. When all
 * dependencies are met, the step is enqueued in the WorkerPool for execution.
 *
 * @module trellis/core/agents
 */

import type { TrellisKernel } from '../kernel/trellis-kernel.js';
import { PROVENANCE } from '../persist/canonical-op.js';
import type { WorkerPool } from './worker-pool.js';
import { evaluateEdge } from './edge-evaluator.js';
import { evaluateGate } from './gate-keeper.js';
import type { DAGGate } from './gate-keeper.js';

const AGENT_CTX = { provenance: PROVENANCE.agent };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DAGStepStatus = 'pending' | 'ready' | 'running' | 'completed' | 'failed' | 'skipped';

export interface DAGEdge {
  targetStepId: string;
  condition?: string;
}

export interface DAGStep {
  id: string;
  agentId: string;
  input: string;
  dependsOn?: string[];
  edges?: DAGEdge[];
  gate?: DAGGate;
}

export interface DAGWorkflow {
  id: string;
  name: string;
  steps: DAGStep[];
}

export interface DAGRunStep {
  step: DAGStep;
  status: DAGStepStatus;
  runId?: string;
  result?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface DAGRun {
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  steps: DAGRunStep[];
  startedAt: string;
  completedAt?: string;
}

export interface DAGSchedulerConfig {
  failOnError?: boolean;
  /** Persist DAGRun state to the graph (survives restarts). Requires pool persistence. */
  persistToGraph?: boolean;
  /** Enable conditional edge-based routing. Steps with edges are evaluated for conditional dependency satisfaction. */
  enableEdgeRouting?: boolean;
  /** Enable pre/post-execution gate checks (test, manual, ac_check, semantic_diff). */
  enableGates?: boolean;
}

// ---------------------------------------------------------------------------
// DAG Scheduler
// ---------------------------------------------------------------------------

export class DAGScheduler {
  private pool: WorkerPool;
  private config: Required<DAGSchedulerConfig>;
  private runs: Map<string, DAGRun> = new Map();
  private boundHandler: (event: any) => void;

  constructor(pool: WorkerPool, config?: DAGSchedulerConfig) {
    this.pool = pool;
    this.config = { failOnError: true, persistToGraph: false, enableEdgeRouting: false, enableGates: false, ...config };
    this.boundHandler = (event) => this._onPoolEvent(event);
    this.pool.on(this.boundHandler);
  }

  /** Restore in-progress DAGRuns from the graph. Call after construction. */
  async restore(): Promise<void> {
    if (!this.config.persistToGraph) return;
    try {
      const k = await this._ensureKernel();
      for (const e of k.listEntities('DAGRun')) {
        const get = (a: string) => e.facts.find((f) => f.a === a)?.v;
        const status = get('status') as string;
        if (status !== 'running') continue;
        const stepsRaw = get('steps');
        const steps: DAGRunStep[] = typeof stepsRaw === 'string'
          ? JSON.parse(stepsRaw)
          : Array.isArray(stepsRaw) ? stepsRaw : [];
        this.runs.set(e.id, {
          workflowId: String(get('workflowId') ?? e.id),
          status: 'running',
          steps,
          startedAt: String(get('startedAt') ?? new Date().toISOString()),
        });
      }
      // Re-evaluate restored runs: re-enqueue 'ready' steps,
      // and 'running' steps reconnect via their preserved runId.
      for (const run of this.runs.values()) {
        this._evaluate(run);
      }
    } catch { /* swallow restore errors */ }
  }

  private async _ensureKernel(): Promise<TrellisKernel> {
    return this.pool.ensureKernel();
  }

  private async _saveRun(run: DAGRun): Promise<void> {
    if (!this.config.persistToGraph) return;
    try {
      const k = await this._ensureKernel();
      if (!k.getEntity(run.workflowId)) {
        await k.createEntity(run.workflowId, 'DAGRun', {
          workflowId: run.workflowId,
          status: run.status,
          steps: JSON.stringify(run.steps),
          startedAt: run.startedAt,
        }, undefined, AGENT_CTX);
      }
    } catch { /* swallow */ }
  }

  private async _updateRun(run: DAGRun): Promise<void> {
    if (!this.config.persistToGraph) return;
    try {
      const k = await this._ensureKernel();
      const updates: Record<string, unknown> = {
        status: run.status,
        steps: JSON.stringify(run.steps),
      };
      if (run.completedAt) updates.completedAt = run.completedAt;
      await k.updateEntity(run.workflowId, updates, AGENT_CTX);
    } catch { /* swallow */ }
  }

  dispose(): void {
    this.pool.off(this.boundHandler);
  }

  // ---------------------------------------------------------------------------
  // Workflow execution
  // ---------------------------------------------------------------------------

  async run(workflow: DAGWorkflow): Promise<string> {
    const runId = workflow.id;
    const steps: DAGRunStep[] = workflow.steps.map((s) => ({
      step: s,
      status: 'pending',
    }));

    const run: DAGRun = {
      workflowId: runId,
      status: 'running',
      steps,
      startedAt: new Date().toISOString(),
    };

    this.runs.set(runId, run);
    await this._saveRun(run);
    this._evaluate(run);
    return runId;
  }

  getRun(runId: string): DAGRun | undefined {
    return this.runs.get(runId);
  }

  listRuns(): DAGRun[] {
    return [...this.runs.values()];
  }

  /** Wait for a run to complete (terminal status). Returns the final run state. */
  async waitForRun(runId: string, pollMs: number = 100): Promise<DAGRun> {
    return new Promise((resolve) => {
      const check = () => {
        const run = this.runs.get(runId);
        if (!run || run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled') {
          resolve(run ?? { workflowId: runId, status: 'failed', steps: [], startedAt: '' });
        } else {
          setTimeout(check, pollMs);
        }
      };
      check();
    });
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private _evaluate(run: DAGRun): void {
    if (run.status !== 'running') return;

    const stepById = new Map(run.steps.map((rs) => [rs.step.id, rs]));

    const edgeIndex = this.config.enableEdgeRouting
      ? this._buildEdgeIndex(run)
      : null;

    for (const rs of run.steps) {
      if (rs.status !== 'pending') continue;

      const deps = rs.step.dependsOn ?? [];
      const allMet = deps.every((depId) => {
        const dep = stepById.get(depId);
        if (!dep || dep.status !== 'completed') return false;

        if (edgeIndex) {
          const condition = edgeIndex.get(depId)?.get(rs.step.id);
          if (condition !== undefined) {
            const result = evaluateEdge(dep, condition);
            return result.passed;
          }
        }

        return true;
      });

      if (allMet) {
        rs.status = 'ready';
      }
    }

    for (const rs of run.steps) {
      if (rs.status !== 'ready') continue;

      const skippedDep = (rs.step.dependsOn ?? []).find((depId) => {
        const dep = stepById.get(depId);
        return dep && dep.status === 'failed';
      });

      if (skippedDep && this.config.failOnError) {
        rs.status = 'skipped';
        continue;
      }

      this._execute(run, rs);
    }
  }

  private _buildEdgeIndex(run: DAGRun): Map<string, Map<string, string | undefined>> {
    const idx = new Map<string, Map<string, string | undefined>>();
    for (const rs of run.steps) {
      for (const edge of rs.step.edges ?? []) {
        if (!idx.has(rs.step.id)) idx.set(rs.step.id, new Map());
        idx.get(rs.step.id)!.set(edge.targetStepId, edge.condition);
      }
    }
    return idx;
  }

  private _isPreGate(type: string): boolean {
    return type === 'manual';
  }

  private async _execute(run: DAGRun, step: DAGRunStep): Promise<void> {
    if (this.config.enableGates && step.step.gate && this._isPreGate(step.step.gate.type)) {
      const kernel = this.config.enableGates ? await this._ensureKernel().catch(() => undefined) : undefined;
      const result = await evaluateGate(step.step.gate, step, kernel);
      if (!result.passed) {
        step.status = 'failed';
        step.error = `Gate failed: ${result.message}`;
        step.completedAt = new Date().toISOString();

        if (result.action === 'retry' && result.retryStepId) {
          const retryTarget = run.steps.find((rs) => rs.step.id === result.retryStepId);
          if (retryTarget) {
            retryTarget.status = 'pending';
            retryTarget.error = undefined;
            retryTarget.completedAt = undefined;
          }
        }

        this._failWorkflow(run, step);
        return;
      }
    }

    step.status = 'running';
    step.startedAt = new Date().toISOString();

    try {
      step.runId = `step:${step.step.id}:${Date.now()}`;
      await this.pool.enqueue(step.step.agentId, step.step.input, undefined, step.runId);
    } catch (err: any) {
      step.status = 'failed';
      step.error = err.message;
      step.completedAt = new Date().toISOString();
      this._failWorkflow(run, step);
    }
  }

  private async _onPoolEvent(event: any): Promise<void> {
    if (event.type !== 'task:completed' && event.type !== 'task:failed' && event.type !== 'task:cancelled') return;

    for (const run of this.runs.values()) {
      if (run.status !== 'running') continue;

      for (const rs of run.steps) {
        if (rs.runId !== event.task.runId) continue;

        if (event.type === 'task:completed' || event.type === 'task:cancelled') {
          rs.status = event.type === 'task:completed' ? 'completed' : 'failed';
          rs.error = event.type === 'task:cancelled' ? 'Cancelled' : undefined;
          rs.result = event.result ?? event.output ?? rs.result;
          rs.completedAt = new Date().toISOString();

          if (rs.status === 'failed' && this.config.failOnError) {
            this._failWorkflow(run, rs);
            await this._updateRun(run);
            return;
          }

          if (this.config.enableGates && rs.step.gate && !this._isPreGate(rs.step.gate.type) && rs.status === 'completed') {
            const kernel = this.config.enableGates ? await this._ensureKernel().catch(() => undefined) : undefined;
            const result = await evaluateGate(rs.step.gate, rs, kernel);
            if (!result.passed) {
              rs.status = 'failed';
              rs.error = `Post-gate failed: ${result.message}`;

              if (result.action === 'retry' && result.retryStepId) {
                const retryTarget = run.steps.find((s) => s.step.id === result.retryStepId);
                if (retryTarget) {
                  retryTarget.status = 'pending';
                  retryTarget.error = undefined;
                  retryTarget.completedAt = undefined;
                }
              }

              if (this.config.failOnError) {
                this._failWorkflow(run, rs);
                await this._updateRun(run);
                return;
              }
            }
          }

          this._evaluate(run);
          this._checkCompletion(run);
        } else if (event.type === 'task:failed') {
          rs.status = 'failed';
          rs.error = event.error;
          rs.result = event.result ?? event.output ?? rs.result;
          rs.completedAt = new Date().toISOString();

          if (this.config.failOnError) {
            this._failWorkflow(run, rs);
            await this._updateRun(run);
            return;
          }

          this._evaluate(run);
          this._checkCompletion(run);
        }

        await this._updateRun(run);
        return;
      }
    }
  }

  private _checkCompletion(run: DAGRun): void {
    const terminal = run.steps.every(
      (rs) => rs.status === 'completed' || rs.status === 'failed' || rs.status === 'skipped',
    );
    if (terminal) {
      run.status = run.steps.some((rs) => rs.status === 'failed') ? 'failed' : 'completed';
      run.completedAt = new Date().toISOString();
    }
  }

  private _failWorkflow(run: DAGRun, source: DAGRunStep): void {
    run.status = 'failed';
    run.completedAt = new Date().toISOString();

    for (const rs of run.steps) {
      if (rs.status === 'pending' || rs.status === 'ready') {
        rs.status = 'skipped';
      }
    }
  }
}
