/**
 * Tests for WorkerPool — queue management, concurrency, pause/resume/cancel.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorkerPool } from '../../src/core/agents/worker-pool.js';

// ---------------------------------------------------------------------------
// Mock harness — substitutes AgentHarness for unit tests
// ---------------------------------------------------------------------------

function createMockHarness() {
  let runCounter = 0;
  const runs = new Map<string, any>();

  return {
    startRun: vi.fn(async (agentId: string, input?: string) => {
      const runId = `run:${agentId}:${Date.now()}:${++runCounter}`;
      runs.set(runId, { agentId, input, status: 'running' });
      return runId;
    }),
    runAgentTask: vi.fn(async (_agentId: string, _input: string) => {
      return 'mock-run-id';
    }),
    failRun: vi.fn(async (runId: string, error: string) => {
      const r = runs.get(runId);
      if (r) r.status = 'failed';
    }),
  };
}

function createMockKernel() {
  return {
    updateEntity: vi.fn(async () => {}),
  };
}

function createPersistMockKernel() {
  const store = new Map<string, Map<string, any>>();
  return {
    getEntity: vi.fn((id: string) => store.has(id) ? { id, facts: [...store.get(id)!.entries()].map(([a, v]) => ({ e: id, a, v })), links: [] } : null),
    createEntity: vi.fn(async (id: string, type: string, attrs: Record<string, any>) => {
      const m = new Map<string, any>([['type', type], ...Object.entries(attrs)]);
      store.set(id, m);
    }),
    updateEntity: vi.fn(async (id: string, updates: Record<string, any>) => {
      const m = store.get(id);
      if (m) for (const [a, v] of Object.entries(updates)) m.set(a, v);
    }),
    listEntities: vi.fn((type?: string) => {
      const results: any[] = [];
      for (const [id, attrs] of store) {
        if (!type || attrs.get('type') === type) {
          results.push({
            id,
            type: attrs.get('type') ?? type ?? '',
            facts: [...attrs.entries()].map(([a, v]) => ({ e: id, a, v })),
            links: [],
          });
        }
      }
      return results;
    }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WorkerPool', () => {
  let mockHarness: ReturnType<typeof createMockHarness>;
  let pool: WorkerPool;

  beforeEach(() => {
    vi.useFakeTimers();
    mockHarness = createMockHarness();
    const mockKernel = createMockKernel();
    pool = new WorkerPool(mockKernel as any, mockHarness as any, {
      concurrency: 2,
      pollIntervalMs: 100,
    });
  });

  afterEach(() => {
    pool.stop();
    vi.useRealTimers();
  });

  // -----------------------------------------------------------------------
  // Queue operations
  // -----------------------------------------------------------------------

  it('should enqueue a task', async () => {
    const runId = await pool.enqueue('agent:test', 'hello');

    expect(runId).toContain('run:');

    const task = pool.getTask(runId);
    expect(task).toBeDefined();
    expect(task!.status).toBe('queued');
  });

  it('should queue multiple tasks', async () => {
    await pool.enqueue('agent:a', 'first');
    await pool.enqueue('agent:b', 'second');

    expect(pool.getQueue()).toHaveLength(2);
    expect(pool.getStatus().queued).toBe(2);
  });

  // -----------------------------------------------------------------------
  // Concurrency control
  // -----------------------------------------------------------------------

  it('should execute up to concurrency limit on tick', async () => {
    await pool.enqueue('agent:a', 'task1');
    await pool.enqueue('agent:b', 'task2');
    await pool.enqueue('agent:c', 'task3');

    pool.start();

    // First tick should pick 2 tasks (concurrency=2)
    vi.advanceTimersByTime(100);

    expect(pool.getActiveJobs()).toHaveLength(2);
    expect(pool.getQueue()).toHaveLength(1);
    expect(pool.getStatus().active).toBe(2);
    expect(pool.getStatus().queued).toBe(1);
  });

  it('should not exceed concurrency limit', async () => {
    const harness = createMockHarness();
    // Make runAgentTask very slow
    harness.runAgentTask.mockImplementation(() => new Promise(() => {}));
    const mockKernel = createMockKernel();
    const slowPool = new WorkerPool(mockKernel as any, harness as any, {
      concurrency: 1,
      pollIntervalMs: 100,
    });

    await slowPool.enqueue('agent:a', 'task1');
    await slowPool.enqueue('agent:b', 'task2');
    slowPool.start();

    vi.advanceTimersByTime(100);

    expect(slowPool.getActiveJobs()).toHaveLength(1);
    expect(slowPool.getQueue()).toHaveLength(1);

    slowPool.stop();
  });

  // -----------------------------------------------------------------------
  // Cancel
  // -----------------------------------------------------------------------

  it('should cancel a queued task', async () => {
    const runId = await pool.enqueue('agent:a', 'hello');

    await pool.cancel(runId);

    const task = pool.getTask(runId);
    expect(task).toBeUndefined(); // removed from queue
    expect(mockHarness.failRun).not.toHaveBeenCalled(); // queued tasks have no graph entity
  });

  it('should cancel an active task', async () => {
    mockHarness.runAgentTask.mockImplementation(() => new Promise(() => {}));

    await pool.enqueue('agent:a', 'hello');
    pool.start();
    vi.advanceTimersByTime(100);

    const active = pool.getActiveJobs();
    expect(active).toHaveLength(1);

    pool.cancel(active[0].runId);
    expect(pool.getActiveJobs()).toHaveLength(0);
  });

  // -----------------------------------------------------------------------
  // Pause / Resume
  // -----------------------------------------------------------------------

  it('should pause and resume an active task', async () => {
    // Make runAgentTask block so the task stays active
    mockHarness.runAgentTask.mockImplementation(() => new Promise(() => {}));

    await pool.enqueue('agent:a', 'hello');
    pool.start();
    vi.advanceTimersByTime(100);

    const active = pool.getActiveJobs();
    expect(active).toHaveLength(1);

    await pool.pause(active[0].runId);
    expect(pool.getTask(active[0].runId)?.status).toBe('paused');

    await pool.resume(active[0].runId);
    expect(pool.getTask(active[0].runId)?.status).toBe('running');
  });

  it('should resume a queued task', async () => {
    await pool.enqueue('agent:a', 'hello');
    const task = pool.getQueue()[0];

    await pool.pause(task.runId);
    await pool.resume(task.runId);

    expect(pool.getTask(task.runId)?.status).toBe('queued');
  });

  // -----------------------------------------------------------------------
  // Events
  // -----------------------------------------------------------------------

  it('should emit task:queued on enqueue', async () => {
    const events: any[] = [];
    pool.on((e) => events.push(e));

    await pool.enqueue('agent:a', 'hello');

    expect(events[0].type).toBe('task:queued');
    expect(events[0].task.agentId).toBe('agent:a');
  });

  it('should emit task:started when task begins execution', async () => {
    const events: any[] = [];
    pool.on((e) => events.push(e));

    await pool.enqueue('agent:a', 'hello');
    pool.start();
    vi.advanceTimersByTime(100);

    const started = events.find((e) => e.type === 'task:started');
    expect(started).toBeDefined();
    expect(started.task.status).toBe('running');
  });

  it('should emit task:completed on successful execution', async () => {
    const events: any[] = [];
    pool.on((e) => events.push(e));

    pool.enqueue('agent:a', 'hello');
    pool.start();

    // runAgentTask resolves immediately, so the task should complete on first tick
    await vi.advanceTimersByTimeAsync(100);

    const completed = events.find((e) => e.type === 'task:completed');
    expect(completed).toBeDefined();
    expect(completed.task.status).toBe('completed');
  });

  it('should emit task:failed on execution error', async () => {
    const harness = createMockHarness();
    harness.runAgentTask.mockRejectedValue(new Error('LLM unavailable'));
    const mockKernel = createMockKernel();
    const errorPool = new WorkerPool(mockKernel as any, harness as any, {
      concurrency: 1,
      pollIntervalMs: 100,
    });

    const events: any[] = [];
    errorPool.on((e) => events.push(e));

    errorPool.enqueue('agent:a', 'hello');
    errorPool.start();

    await vi.advanceTimersByTimeAsync(100);

    const failed = events.find((e) => e.type === 'task:failed');
    expect(failed).toBeDefined();
    expect(failed!.error).toBe('LLM unavailable');

    errorPool.stop();
  });

  // -----------------------------------------------------------------------
  // Pool lifecycle
  // -----------------------------------------------------------------------

  it('should report pool status', async () => {
    await pool.enqueue('agent:a', 'first');
    await pool.enqueue('agent:b', 'second');

    expect(pool.getStatus()).toMatchObject({
      active: 0,
      queued: 2,
      maxConcurrency: 2,
      running: false,
    });
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  it('should ignore duplicate start calls', () => {
    pool.start();
    pool.start(); // should be no-op
    expect(pool.getStatus().running).toBe(true);
  });

  it('should handle operations on unknown run IDs', async () => {
    await expect(pool.cancel('nonexistent')).resolves.toBeUndefined();
    await expect(pool.pause('nonexistent')).resolves.toBeUndefined();
    expect(pool.getTask('nonexistent')).toBeUndefined();
  });

  // -----------------------------------------------------------------------
  // Persistence
  // -----------------------------------------------------------------------

  describe('persistence', () => {
    it('should create entity on enqueue when persistToGraph is true', async () => {
      const mockKernel = createPersistMockKernel();
      const p = new WorkerPool(mockKernel as any, createMockHarness() as any, {
        concurrency: 1,
        persistToGraph: true,
      });
      await p.enqueue('agent:a', 'hello');
      expect(mockKernel.createEntity).toHaveBeenCalledTimes(1);
      const call = mockKernel.createEntity.mock.calls[0];
      expect(call[1]).toBe('WorkerPoolTask');
      expect(call[2].status).toBe('queued');
    });

    it('should update entity status on cancel', async () => {
      const mockKernel = createPersistMockKernel();
      const p = new WorkerPool(mockKernel as any, createMockHarness() as any, {
        concurrency: 1,
        persistToGraph: true,
      });
      const runId = await p.enqueue('agent:a', 'hello');
      await p.cancel(runId);
      expect(mockKernel.updateEntity).toHaveBeenCalled();
      const statusUpdate = mockKernel.updateEntity.mock.calls.find(
        (c: any[]) => c[1]?.status === 'cancelled'
      );
      expect(statusUpdate).toBeDefined();
    });

    it('should restore queued tasks from graph', async () => {
      const mockKernel = createPersistMockKernel();
      const p1 = new WorkerPool(mockKernel as any, createMockHarness() as any, {
        concurrency: 1,
        persistToGraph: true,
      });
      await p1.enqueue('agent:a', 'hello');
      await p1.enqueue('agent:b', 'world');
      expect(p1.getQueue()).toHaveLength(2);

      const p2 = new WorkerPool(mockKernel as any, createMockHarness() as any, {
        concurrency: 1,
        persistToGraph: true,
      });
      await p2.restore();
      expect(p2.getQueue()).toHaveLength(2);
    });
  });
});
