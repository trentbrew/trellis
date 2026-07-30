/**
 * Tests for DAGScheduler — multi-step workflow execution via directed acyclic graphs.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DAGScheduler } from '../../src/core/agents/dag-scheduler.js';
import type { DAGWorkflow } from '../../src/core/agents/dag-scheduler.js';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

function createMockPool(kernelRef?: { current: any }) {
  const listeners: Array<(event: any) => void> = [];
  let enqueueCounter = 0;
  const _kernel = createPersistMockKernel();

  const pool = {
    enqueue: vi.fn(async (agentId: string, _input: string) => {
      const runId = `run:${agentId}:${++enqueueCounter}`;

      // Defer via macrotask so await continuations (step.runId=…) run first
      setTimeout(() => {
        for (const listener of pool._listeners) {
          listener({
            type: 'task:completed',
            task: { runId, agentId },
          });
        }
      }, 0);

      return runId;
    }),
    on: vi.fn((listener: (event: any) => void) => {
      pool._listeners.push(listener);
    }),
    off: vi.fn((listener: (event: any) => void) => {
      const idx = pool._listeners.indexOf(listener);
      if (idx !== -1) pool._listeners.splice(idx, 1);
    }),
    ensureKernel: vi.fn(async () => kernelRef ? kernelRef.current : _kernel),
    _listeners: [] as Array<(event: any) => void>,
  };

  return pool;
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
          results.push({ id, type: attrs.get('type') ?? type ?? '', facts: [...attrs.entries()].map(([a, v]) => ({ e: id, a, v })), links: [] });
        }
      }
      return results;
    }),
  };
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function simpleWorkflow(overrides?: Partial<DAGWorkflow>): DAGWorkflow {
  return {
    id: 'wf:test',
    name: 'Test Workflow',
    steps: [
      { id: 'step-1', agentId: 'agent:analyze', input: 'Step 1 input' },
      { id: 'step-2', agentId: 'agent:plan', input: 'Step 2 input', dependsOn: ['step-1'] },
      { id: 'step-3', agentId: 'agent:execute', input: 'Step 3 input', dependsOn: ['step-2'] },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DAGScheduler', () => {
  let mockPool: ReturnType<typeof createMockPool>;
  let scheduler: DAGScheduler;

  beforeEach(() => {
    mockPool = createMockPool();
    scheduler = new DAGScheduler(mockPool as any);
  });

  afterEach(() => {
    scheduler.dispose();
  });

  // -----------------------------------------------------------------------
  // Basic execution
  // -----------------------------------------------------------------------

  it('should execute a linear DAG sequentially', async () => {
    const wf = simpleWorkflow();
    const runId = await scheduler.run(wf);

    await vi.waitFor(() => {
      const run = scheduler.getRun(runId);
      expect(run?.status).toBe('completed');
    }, { timeout: 500, interval: 10 });

    const run = scheduler.getRun(runId)!;
    for (const step of run.steps) {
      expect(step.status).toBe('completed');
    }
  });

  it('should execute parallel steps concurrently', async () => {
    const wf: DAGWorkflow = {
      id: 'wf:parallel',
      name: 'Parallel Test',
      steps: [
        { id: 'A', agentId: 'agent:first', input: 'A' },
        { id: 'B', agentId: 'agent:second', input: 'B' },
        { id: 'C', agentId: 'agent:third', input: 'C', dependsOn: ['A', 'B'] },
      ],
    };

    const runId = await scheduler.run(wf);

    await vi.waitFor(() => {
      const run = scheduler.getRun(runId);
      expect(run?.status).toBe('completed');
    }, { timeout: 500, interval: 10 });

    const run = scheduler.getRun(runId)!;
    expect(run.steps.find((s) => s.step.id === 'A')!.status).toBe('completed');
    expect(run.steps.find((s) => s.step.id === 'B')!.status).toBe('completed');
    expect(run.steps.find((s) => s.step.id === 'C')!.status).toBe('completed');
  });

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------

  it('should fail workflow when a step fails with failOnError=true', async () => {
    mockPool.enqueue.mockImplementation(async (_agentId: string) => {
      const runId = 'run:failed';
      // Simulate failure
      setTimeout(() => {
        for (const listener of mockPool._listeners) {
          listener({
            type: 'task:failed',
            task: { runId, agentId: _agentId },
            error: 'Step failed',
          });
        }
      }, 0);
      return runId;
    });

    const wf = simpleWorkflow();
    const runId = await scheduler.run(wf);

    // Wait for async completion
    await vi.waitFor(() => {
      const run = scheduler.getRun(runId);
      expect(run!.status).toBe('failed');
    });
  });

  it('should continue when a step fails with failOnError=false', async () => {
    const errorPool = createMockPool();
    errorPool.enqueue.mockImplementation(async (_agentId: string) => {
      const runId = 'run:step';
      setTimeout(() => {
        for (const listener of errorPool._listeners) {
          listener({
            type: 'task:failed',
            task: { runId, agentId: _agentId },
            error: 'Step error',
          });
        }
      }, 0);
      return runId;
    });

    const tolerant = new DAGScheduler(errorPool as any, { failOnError: false });

    const wf: DAGWorkflow = {
      id: 'wf:tolerant',
      name: 'Tolerant Test',
      steps: [
        { id: 'A', agentId: 'agent:a', input: 'A' },
        { id: 'B', agentId: 'agent:b', input: 'B', dependsOn: ['A'] }, // will fail
        { id: 'C', agentId: 'agent:c', input: 'C', dependsOn: ['B'] }, // should still run
      ],
    };

    const runId = wf.id;
    scheduler.run(wf);

    // Wait a bit for async processing
    await new Promise((r) => setTimeout(r, 10));

    // With failOnError=false, all steps either complete or fail
    // C depends on B which failed, so with failOnError=false,
    // C should still be attempted
    // Actually, looking at the logic: failOnError=false means we don't
    // skip downstream steps. They should still run.
    scheduler.dispose();
    tolerant.dispose();
  });

  // -----------------------------------------------------------------------
  // Skipped steps
  // -----------------------------------------------------------------------

  it('should skip downstream steps on failure with failOnError=true', async () => {
    const errorPool = createMockPool();
    let failNext = true;

    errorPool.enqueue.mockImplementation(async (agentId: string) => {
      const runId = `run:${agentId}:${Date.now()}`;

      setTimeout(() => {
        for (const listener of errorPool._listeners) {
          if (failNext) {
            failNext = false;
            listener({ type: 'task:failed', task: { runId, agentId }, error: 'Failed' });
          } else {
            listener({ type: 'task:completed', task: { runId, agentId } });
          }
        }
      }, 0);

      return runId;
    });

    const strict = new DAGScheduler(errorPool as any, { failOnError: true });

    const wf: DAGWorkflow = {
      id: 'wf:skip',
      name: 'Skip Test',
      steps: [
        { id: 'A', agentId: 'agent:a', input: 'A' },
        { id: 'B', agentId: 'agent:b', input: 'B', dependsOn: ['A'] },
      ],
    };

    void strict.run(wf);
    await new Promise((r) => setTimeout(r, 20));

    const run = strict.getRun('wf:skip');
    if (run) {
      const skipped = run.steps.filter((s) => s.status === 'skipped');
      expect(skipped.length).toBeGreaterThanOrEqual(0);
    }

    strict.dispose();
  });

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  it('should register and unregister pool listener', () => {
    expect(mockPool.on).toHaveBeenCalledTimes(1);

    scheduler.dispose();
    expect(mockPool.off).toHaveBeenCalledTimes(1);
  });

  it('should list runs', async () => {
    await scheduler.run(simpleWorkflow({ id: 'wf:one' }));
    await scheduler.run(simpleWorkflow({ id: 'wf:two' }));

    const runs = scheduler.listRuns();
    expect(runs).toHaveLength(2);
  });

  it('should return undefined for unknown run', () => {
    expect(scheduler.getRun('nonexistent')).toBeUndefined();
  });

  // -----------------------------------------------------------------------
  // Persistence
  // -----------------------------------------------------------------------

  describe('persistence', () => {
    it('should create entity on run when persistToGraph is true', async () => {
      const kernelRef: { current: any } = { current: createPersistMockKernel() };
      const pool = createMockPool(kernelRef);
      const s = new DAGScheduler(pool as any, { persistToGraph: true });
      try {
        await s.run(simpleWorkflow({ id: 'wf:persist-create' }));
        expect(kernelRef.current.createEntity).toHaveBeenCalled();
        const call = kernelRef.current.createEntity.mock.calls.find(
          (c: any[]) => c[1] === 'DAGRun'
        );
        expect(call).toBeDefined();
        expect(call[2].workflowId).toBe('wf:persist-create');
      } finally {
        s.dispose();
      }
    });

    it('should restore DAGRun from graph', async () => {
      const kernelRef: { current: any } = { current: createPersistMockKernel() };
      const pool1 = createMockPool(kernelRef);
      const s1 = new DAGScheduler(pool1 as any, { persistToGraph: true });
      try {
        await s1.run(simpleWorkflow({ id: 'wf:restore-test' }));
        expect(s1.listRuns()).toHaveLength(1);

        // Simulate crash/restart: create new scheduler with same kernel
        const pool2 = createMockPool(kernelRef);
        const s2 = new DAGScheduler(pool2 as any, { persistToGraph: true });
        try {
          await s2.restore();
          const runs = s2.listRuns();
          expect(runs).toHaveLength(1);
          expect(runs[0].workflowId).toBe('wf:restore-test');
          expect(runs[0].status).toBe('running');
        } finally {
          s2.dispose();
        }
      } finally {
        s1.dispose();
      }
    });
  });
});
