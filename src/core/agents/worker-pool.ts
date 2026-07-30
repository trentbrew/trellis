/**
 * WorkerPool — Concurrent agent run execution with queue-based concurrency control.
 *
 * @module trellis/core/agents
 */

import type { TrellisKernel } from '../kernel/trellis-kernel.js';
import { PROVENANCE } from '../persist/canonical-op.js';
import { AgentHarness } from './harness.js';
import type { RunTaskOptions } from './types.js';

const AGENT_CTX = { provenance: PROVENANCE.agent };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WorkerTaskStatus = 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface WorkerTask {
  id: string;
  agentId: string;
  runId: string;
  input: string;
  status: WorkerTaskStatus;
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface WorkerPoolConfig {
  /** Maximum concurrent agent runs (default 1). */
  concurrency: number;
  /** Interval in ms to poll for ready tasks (default 500). */
  pollIntervalMs: number;
  /** Persist queue state to the graph (survives restarts). */
  persistToGraph?: boolean;
}

export type WorkerPoolEvent =
  | { type: 'task:queued'; task: WorkerTask }
  | { type: 'task:started'; task: WorkerTask }
  | { type: 'task:completed'; task: WorkerTask }
  | { type: 'task:failed'; task: WorkerTask; error: string }
  | { type: 'task:cancelled'; task: WorkerTask }
  | { type: 'task:paused'; task: WorkerTask }
  | { type: 'task:resumed'; task: WorkerTask };

export type WorkerPoolListener = (event: WorkerPoolEvent) => void;

export interface PoolStatus {
  active: number;
  queued: number;
  maxConcurrency: number;
  running: boolean;
}

// ---------------------------------------------------------------------------
// WorkerPool
// ---------------------------------------------------------------------------

export type KernelFactory = () => TrellisKernel | Promise<TrellisKernel>;

export class WorkerPool {
  private kernel: TrellisKernel | null = null;
  private harness: AgentHarness | null = null;
  private kernelFactory: KernelFactory | null = null;
  private config: WorkerPoolConfig;
  private queue: WorkerTask[] = [];
  private active: Map<string, WorkerTask> = new Map();
  private stopped = false;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private listeners: WorkerPoolListener[] = [];

  constructor(
    kernel: TrellisKernel | KernelFactory,
    harness?: AgentHarness,
    config?: Partial<WorkerPoolConfig>,
  ) {
    if (typeof kernel === 'function') {
      this.kernelFactory = kernel;
    } else {
      this.kernel = kernel;
      this.harness = harness ?? null;
    }
    this.config = {
      concurrency: 1,
      pollIntervalMs: 500,
      ...config,
    };
  }

  /** Lazily resolve and expose the kernel (for DAGScheduler & consumers). */
  async ensureKernel(): Promise<TrellisKernel> {
    return this._ensureKernel();
  }

  private async _ensureKernel(): Promise<TrellisKernel> {
    if (!this.kernel && this.kernelFactory) {
      this.kernel = await this.kernelFactory();
    }
    if (!this.kernel) throw new Error('WorkerPool: No kernel available');
    return this.kernel;
  }

  private async _ensureHarness(): Promise<AgentHarness> {
    if (!this.harness) {
      this.harness = new AgentHarness(await this._ensureKernel());
    }
    return this.harness;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  start(): void {
    if (this.pollTimer) return;
    this.stopped = false;
    this.pollTimer = setInterval(() => this._tick(), this.config.pollIntervalMs);
  }

  stop(): void {
    this.stopped = true;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  getStatus(): PoolStatus {
    return {
      active: this.active.size,
      queued: this.queue.length,
      maxConcurrency: this.config.concurrency,
      running: this.pollTimer !== null,
    };
  }

  // ---------------------------------------------------------------------------
  // Event bus
  // ---------------------------------------------------------------------------

  on(listener: WorkerPoolListener): void {
    this.listeners.push(listener);
  }

  off(listener: WorkerPoolListener): void {
    const idx = this.listeners.indexOf(listener);
    if (idx !== -1) this.listeners.splice(idx, 1);
  }

  private _emit(event: WorkerPoolEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch { /* swallow handler errors */ }
    }
  }

  // ---------------------------------------------------------------------------
  // Queue operations
  // ---------------------------------------------------------------------------

  async enqueue(agentId: string, input: string, opts?: RunTaskOptions): Promise<string> {
    const runId = `run:${agentId.replace('agent:', '')}:${Date.now()}`;

    const task: WorkerTask = {
      id: `task:${runId}`,
      agentId,
      runId,
      input,
      status: 'queued',
      queuedAt: new Date().toISOString(),
    };

    this.queue.push(task);
    await this._saveTask(task);
    this._emit({ type: 'task:queued', task });
    return runId;
  }

  async cancel(runId: string): Promise<void> {
    const idx = this.queue.findIndex((t) => t.runId === runId);
    if (idx !== -1) {
      const [task] = this.queue.splice(idx, 1);
      task.status = 'cancelled';
      task.completedAt = new Date().toISOString();
      await this._updateTask(task);
      this._emit({ type: 'task:cancelled', task });
      return;
    }

    const active = this.active.get(runId);
    if (active) {
      active.status = 'cancelled';
      active.completedAt = new Date().toISOString();
      this.active.delete(runId);
      try {
        const h = await this._ensureHarness();
        await h.failRun(runId, 'Cancelled by user');
      } catch { /* run may not exist in graph yet */ }
      await this._updateTask(active);
      this._emit({ type: 'task:cancelled', task: active });
    }
  }

  async pause(runId: string): Promise<void> {
    const active = this.active.get(runId);
    if (!active) return;
    active.status = 'paused';
    try {
      const k = await this._ensureKernel();
      await k.updateEntity(runId, { status: 'paused' }, AGENT_CTX);
    } catch { /* entity may not exist yet */ }
    await this._updateTask(active);
    this._emit({ type: 'task:paused', task: active });
  }

  async resume(runId: string): Promise<void> {
    const task = this.queue.find((t) => t.runId === runId) ?? this.active.get(runId);
    if (!task) return;

    if (this.active.has(runId)) {
      task.status = 'running';
      try {
        const k = await this._ensureKernel();
        await k.updateEntity(runId, { status: 'running' }, AGENT_CTX);
      } catch { /* entity may not exist yet */ }
      await this._updateTask(task);
      this._emit({ type: 'task:resumed', task });
    } else if (task.status === 'queued' || task.status === 'paused') {
      task.status = 'queued';
      this.active.delete(runId);
      if (!this.queue.find((t) => t.runId === runId)) {
        this.queue.push(task);
      }
      await this._updateTask(task);
      this._emit({ type: 'task:resumed', task });
    }
  }

  getQueue(): WorkerTask[] {
    return [...this.queue];
  }

  getActiveJobs(): WorkerTask[] {
    return [...this.active.values()];
  }

  getTask(runId: string): WorkerTask | undefined {
    return this.queue.find((t) => t.runId === runId) ?? this.active.get(runId);
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private _tick(): void {
    if (this.stopped) return;
    while (this.active.size < this.config.concurrency && this.queue.length > 0) {
      const task = this.queue.shift()!;
      if (task.status === 'cancelled') continue;
      this._execute(task);
    }
  }

  private async _execute(task: WorkerTask): Promise<void> {
    task.status = 'running';
    task.startedAt = new Date().toISOString();
    this.active.set(task.runId, task);
    this._emit({ type: 'task:started', task });

    try {
      const h = await this._ensureHarness();
      await h.runAgentTask(task.agentId, task.input);
      task.status = 'completed';
      this._emit({ type: 'task:completed', task });
    } catch (err: any) {
      task.status = 'failed';
      task.error = err.message;
      this._emit({ type: 'task:failed', task, error: err.message });
    } finally {
      task.completedAt = new Date().toISOString();
      this.active.delete(task.runId);
      await this._updateTask(task);
    }
  }

  // ---------------------------------------------------------------------------
  // Persistence (optional — enabled via config.persistToGraph)
  // ---------------------------------------------------------------------------

  /** Restore queued/paused tasks from the graph. Call after construction. */
  async restore(): Promise<void> {
    if (!this.config.persistToGraph) return;
    try {
      const k = await this._ensureKernel();
      const entities = k.listEntities('WorkerPoolTask');
      for (const e of entities) {
        const get = (a: string) => e.facts.find((f) => f.a === a)?.v;
        const status = get('status') as string;
        if (status !== 'queued' && status !== 'paused') continue;
        const task: WorkerTask = {
          id: e.id,
          agentId: String(get('agentId') ?? ''),
          runId: String(get('runId') ?? ''),
          input: String(get('input') ?? ''),
          status: status as WorkerTaskStatus,
          queuedAt: String(get('queuedAt') ?? new Date().toISOString()),
          startedAt: get('startedAt') as string | undefined,
          completedAt: get('completedAt') as string | undefined,
          error: get('error') as string | undefined,
        };
        this.queue.push(task);
      }
    } catch { /* swallow restore errors */ }
  }

  private async _saveTask(task: WorkerTask): Promise<void> {
    if (!this.config.persistToGraph) return;
    try {
      const k = await this._ensureKernel();
      if (!k.getEntity(task.id)) {
        await k.createEntity(task.id, 'WorkerPoolTask', {
          agentId: task.agentId,
          runId: task.runId,
          input: task.input,
          status: task.status,
          queuedAt: task.queuedAt,
        }, undefined, AGENT_CTX);
      }
    } catch { /* swallow persistence errors */ }
  }

  private async _updateTask(task: WorkerTask): Promise<void> {
    if (!this.config.persistToGraph) return;
    try {
      const k = await this._ensureKernel();
      const updates: Record<string, unknown> = {
        status: task.status,
      };
      if (task.startedAt) updates.startedAt = task.startedAt;
      if (task.completedAt) updates.completedAt = task.completedAt;
      if (task.error) updates.error = task.error;
      await k.updateEntity(task.id, updates, AGENT_CTX);
    } catch { /* swallow persistence errors */ }
  }
}
