import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DAGScheduler, WorkerPool, AgentHarness } from '../../src/core/agents/index.js';
import type { DAGWorkflow } from '../../src/core/agents/dag-scheduler.js';

function createTestKernel() {
  const store = new Map<string, Map<string, any>>();
  return {
    getEntity: vi.fn((id: string) => store.has(id) ? { id, type: store.get(id)!.get('type') ?? '', facts: [...store.get(id)!.entries()].map(([a, v]) => ({ e: id, a, v })), links: [] } : null),
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
    getStore: vi.fn(() => ({
      getLinksByEntityAndAttribute: vi.fn(() => []),
      getLinksByAttribute: vi.fn(() => []),
      getLinksByEntity: vi.fn(() => []),
    })),
    addLink: vi.fn(async () => {}),
    close: vi.fn(() => {}),
  };
}

describe('Workflow E2E (simulated execution)', () => {
  function createPool(concurrency = 2) {
    const kernel = createTestKernel() as any;
    const harness = new AgentHarness(kernel);
    const pool = new WorkerPool(kernel, harness, { concurrency, simulate: true, pollIntervalMs: 10 });
    const scheduler = new DAGScheduler(pool, { failOnError: true });
    pool.start();
    return { kernel, harness, pool, scheduler };
  }

  afterEach(() => {
    // Cleanup handled in each test
  });

  it('runs a workflow end-to-end with simulate mode', async () => {
    const { pool, scheduler } = createPool();

    const wf: DAGWorkflow = {
      id: 'wf:e2e-test',
      name: 'E2E Test',
      steps: [
        { id: 'analyze', agentId: 'agent:analyzer', input: 'Analyze requirements' },
        { id: 'design', agentId: 'agent:designer', input: 'Design solution', dependsOn: ['analyze'] },
        { id: 'implement', agentId: 'agent:executor', input: 'Implement', dependsOn: ['design'] },
      ],
    };

    const runId = await scheduler.run(wf);
    const run = await scheduler.waitForRun(runId, 20);

    expect(run.status).toBe('completed');
    expect(run.steps.every((s) => s.status === 'completed')).toBe(true);

    scheduler.dispose();
    pool.stop();
  });

  it('handles parallel steps', async () => {
    const { pool, scheduler } = createPool(5);

    const wf: DAGWorkflow = {
      id: 'wf:parallel-e2e',
      name: 'Parallel E2E',
      steps: [
        { id: 'A', agentId: 'agent:a', input: 'A' },
        { id: 'B', agentId: 'agent:b', input: 'B' },
        { id: 'C', agentId: 'agent:c', input: 'C' },
        { id: 'D', agentId: 'agent:d', input: 'D', dependsOn: ['A', 'B', 'C'] },
      ],
    };

    const runId = await scheduler.run(wf);
    const run = await scheduler.waitForRun(runId, 20);

    expect(run.status).toBe('completed');
    expect(run.steps.find((s) => s.step.id === 'D')?.status).toBe('completed');

    scheduler.dispose();
    pool.stop();
  });

  it('handles edge routing with conditions', async () => {
    const kernel = createTestKernel() as any;
    const harness = new AgentHarness(kernel);
    const pool = new WorkerPool(kernel, harness, { concurrency: 2, simulate: true, pollIntervalMs: 10 });
    const scheduler = new DAGScheduler(pool, { enableEdgeRouting: true, failOnError: false });

    pool.start();

    const wf: DAGWorkflow = {
      id: 'wf:edge-e2e',
      name: 'Edge E2E',
      steps: [
        { id: 'A', agentId: 'agent:a', input: 'A', edges: [{ targetStepId: 'B', condition: 'status == "completed"' }] },
        { id: 'B', agentId: 'agent:b', input: 'B', dependsOn: ['A'] },
      ],
    };

    const runId = await scheduler.run(wf);
    const run = await scheduler.waitForRun(runId, 20);

    expect(run.status).toBe('completed');
    expect(run.steps.find((s) => s.step.id === 'B')?.status).toBe('completed');

    scheduler.dispose();
    pool.stop();
  });
});
