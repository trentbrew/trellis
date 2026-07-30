import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DAGScheduler } from '../../src/core/agents/dag-scheduler.js';
import { evaluateCondition } from '../../src/core/agents/edge-evaluator.js';
import { evaluateGate } from '../../src/core/agents/gate-keeper.js';
import type { DAGWorkflow, DAGRunStep } from '../../src/core/agents/dag-scheduler.js';
import type { DAGGate } from '../../src/core/agents/gate-keeper.js';

// ---------------------------------------------------------------------------
// Mock pool (reused from dag-scheduler tests)
// ---------------------------------------------------------------------------

function createMockPool() {
  const listeners: Array<(event: any) => void> = [];
  let enqueueCounter = 0;

  const pool = {
    enqueue: vi.fn(async (agentId: string, _input: string) => {
      const runId = `run:${agentId}:${++enqueueCounter}`;
      setTimeout(() => {
        for (const listener of pool._listeners) {
          listener({ type: 'task:completed', task: { runId, agentId }, result: `output-${agentId}` });
        }
      }, 0);
      return runId;
    }),
    on: vi.fn((listener: (event: any) => void) => { pool._listeners.push(listener); }),
    off: vi.fn((listener: (event: any) => void) => {
      const idx = pool._listeners.indexOf(listener);
      if (idx !== -1) pool._listeners.splice(idx, 1);
    }),
    ensureKernel: vi.fn(async () => ({
      getEntity: vi.fn(() => null),
      createEntity: vi.fn(async () => {}),
      updateEntity: vi.fn(async () => {}),
      listEntities: vi.fn(() => []),
    })),
    _listeners: listeners,
  };
  return pool;
}

// ---------------------------------------------------------------------------
// Edge Evaluator — unit tests
// ---------------------------------------------------------------------------

describe('evaluateCondition', () => {
  const makeStep = (overrides: Partial<DAGRunStep> = {}): DAGRunStep => ({
    step: { id: 's1', agentId: 'agent:a', input: '' },
    status: 'completed',
    result: 'Pipeline ran successfully with 0 errors',
    ...overrides,
  });

  it('empty or true condition passes', () => {
    expect(evaluateCondition('', { sourceStep: makeStep() })).toBe(true);
    expect(evaluateCondition('true', { sourceStep: makeStep() })).toBe(true);
    expect(evaluateCondition('  ', { sourceStep: makeStep() })).toBe(true);
  });

  it('false condition fails', () => {
    expect(evaluateCondition('false', { sourceStep: makeStep() })).toBe(false);
  });

  it('status == "completed" matches', () => {
    expect(evaluateCondition('status == "completed"', { sourceStep: makeStep({ status: 'completed' }) })).toBe(true);
    expect(evaluateCondition('status == "completed"', { sourceStep: makeStep({ status: 'failed' }) })).toBe(false);
  });

  it('status != "failed" works', () => {
    expect(evaluateCondition('status != "failed"', { sourceStep: makeStep({ status: 'completed' }) })).toBe(true);
    expect(evaluateCondition('status != "failed"', { sourceStep: makeStep({ status: 'failed' }) })).toBe(false);
  });

  it('output contains matches substring', () => {
    expect(evaluateCondition('output contains "successfully"', { sourceStep: makeStep({ result: 'Pipeline ran successfully' }) })).toBe(true);
    expect(evaluateCondition('output contains "error"', { sourceStep: makeStep({ result: 'Pipeline ran successfully' }) })).toBe(false);
  });

  it('output matches uses regex', () => {
    const condPass = String.raw`output matches "success"`;
    const condFail = String.raw`output matches "error"`;
    expect(evaluateCondition(condPass, { sourceStep: makeStep({ result: 'Pipeline ran successfully' }) })).toBe(true);
    expect(evaluateCondition(condFail, { sourceStep: makeStep({ result: 'Pipeline ran successfully' }) })).toBe(false);
  });

  it('unknown expression returns false', () => {
    expect(evaluateCondition('foo bar baz', { sourceStep: makeStep() })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Gate Evaluation — unit tests
// ---------------------------------------------------------------------------

describe('evaluateGate', () => {
  const makeStep = (overrides: Partial<DAGRunStep> = {}): DAGRunStep => ({
    step: { id: 's1', agentId: 'agent:a', input: '' },
    status: 'completed',
    result: 'Step output with quality metrics',
    ...overrides,
  });

  describe('test gate', () => {
    it('passes with exit 0', async () => {
      const gate: DAGGate = { type: 'test', onFail: 'stop', criteria: 'echo ok' };
      const result = await evaluateGate(gate, makeStep());
      expect(result.passed).toBe(true);
      expect(result.action).toBe('continue');
    });

    it('fails on non-zero exit', async () => {
      const gate: DAGGate = { type: 'test', onFail: 'stop', criteria: 'false' };
      const result = await evaluateGate(gate, makeStep());
      expect(result.passed).toBe(false);
      expect(result.action).toBe('stop');
    });

    it('fails with no criteria', async () => {
      const gate: DAGGate = { type: 'test', onFail: 'stop' };
      const result = await evaluateGate(gate, makeStep());
      expect(result.passed).toBe(false);
    });
  });

  describe('ac_check gate', () => {
    it('passes when keywords match', async () => {
      const gate: DAGGate = { type: 'ac_check', onFail: 'stop', criteria: 'quality metrics' };
      const result = await evaluateGate(gate, makeStep({ result: 'Step output with quality metrics' }));
      expect(result.passed).toBe(true);
    });

    it('fails when few keywords match', async () => {
      const gate: DAGGate = { type: 'ac_check', onFail: 'stop', criteria: 'unrelated garbage' };
      const result = await evaluateGate(gate, makeStep({ result: 'Step output with quality metrics' }));
      expect(result.passed).toBe(false);
    });

    it('passes with no criteria', async () => {
      const gate: DAGGate = { type: 'ac_check', onFail: 'stop' };
      const result = await evaluateGate(gate, makeStep());
      expect(result.passed).toBe(true);
    });
  });

  describe('manual gate', () => {
    it('returns failed with stop action when no kernel', async () => {
      const gate: DAGGate = { type: 'manual', onFail: 'stop' };
      const result = await evaluateGate(gate, makeStep());
      expect(result.passed).toBe(false);
      expect(result.action).toBe('stop');
    });

    it('returns retry action when configured', async () => {
      const gate: DAGGate = { type: 'manual', onFail: 'retry', retryStepId: 'step-retry' };
      const result = await evaluateGate(gate, makeStep(), undefined);
      expect(result.passed).toBe(false);
      expect(result.action).toBe('stop');
    });
  });

  describe('semantic_diff gate', () => {
    it('is a no-op that always passes in v1', async () => {
      const gate: DAGGate = { type: 'semantic_diff', onFail: 'stop' };
      const result = await evaluateGate(gate, makeStep());
      expect(result.passed).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// DAGScheduler integration — edge routing
// ---------------------------------------------------------------------------

describe('DAGScheduler with edge routing', () => {
  let mockPool: ReturnType<typeof createMockPool>;
  let scheduler: DAGScheduler;

  beforeEach(() => {
    mockPool = createMockPool();
    scheduler = new DAGScheduler(mockPool as any, { enableEdgeRouting: true, failOnError: true });
  });

  afterEach(() => {
    scheduler.dispose();
  });

  it('routes to downstream step when edge condition passes', async () => {
    const wf: DAGWorkflow = {
      id: 'wf:edge-pass',
      name: 'Edge passes',
      steps: [
        { id: 'A', agentId: 'agent:a', input: 'A', edges: [{ targetStepId: 'B', condition: 'status == "completed"' }] },
        { id: 'B', agentId: 'agent:b', input: 'B', dependsOn: ['A'] },
      ],
    };

    const runId = await scheduler.run(wf);
    await vi.waitFor(() => {
      const run = scheduler.getRun(runId);
      expect(run?.status).toBe('completed');
    }, { timeout: 500, interval: 10 });

    const run = scheduler.getRun(runId)!;
    expect(run.steps.find((s) => s.step.id === 'A')?.status).toBe('completed');
    expect(run.steps.find((s) => s.step.id === 'B')?.status).toBe('completed');
  });

  it('blocks downstream step when edge condition fails', async () => {
    const wf: DAGWorkflow = {
      id: 'wf:edge-block',
      name: 'Edge blocks',
      steps: [
        { id: 'A', agentId: 'agent:a', input: 'A', edges: [{ targetStepId: 'B', condition: 'status == "failed"' }] },
        { id: 'B', agentId: 'agent:b', input: 'B', dependsOn: ['A'] },
      ],
    };

    const runId = await scheduler.run(wf);
    await new Promise((r) => setTimeout(r, 30));

    const run = scheduler.getRun(runId);
    if (run) {
      expect(run.steps.find((s) => s.step.id === 'A')?.status).toBe('completed');
      expect(run.steps.find((s) => s.step.id === 'B')?.status).toBe('pending');
    }
  });

  it('routes to different targets based on condition', async () => {
    mockPool.enqueue.mockImplementation(async (agentId: string) => {
      const runId = `run:${agentId}:${Date.now()}`;
      setTimeout(() => {
        for (const listener of mockPool._listeners) {
          if (agentId === 'agent:a') {
            listener({ type: 'task:failed', task: { runId, agentId }, error: 'Failed', result: '' });
          } else {
            listener({ type: 'task:completed', task: { runId, agentId }, result: `output-${agentId}` });
          }
        }
      }, 0);
      return runId;
    });

    const wf: DAGWorkflow = {
      id: 'wf:route-conditional',
      name: 'Conditional Route',
      steps: [
        { id: 'A', agentId: 'agent:a', input: 'A', edges: [{ targetStepId: 'B', condition: 'status == "completed"' }, { targetStepId: 'C', condition: 'status == "failed"' }] },
        { id: 'B', agentId: 'agent:b', input: 'B', dependsOn: ['A'] },
        { id: 'C', agentId: 'agent:c', input: 'C', dependsOn: ['A'] },
      ],
    };

    const runId = await scheduler.run(wf);
    await new Promise((r) => setTimeout(r, 30));

    const run = scheduler.getRun(runId);
    if (run) {
      expect(run.steps.find((s) => s.step.id === 'A')?.status).toBe('failed');
    }
  });

  it('works without edge routing enabled (backward compat)', async () => {
    const s = new DAGScheduler(mockPool as any, { enableEdgeRouting: false });
    const wf: DAGWorkflow = {
      id: 'wf:no-edge',
      name: 'No edges',
      steps: [
        { id: 'A', agentId: 'agent:a', input: 'A' },
        { id: 'B', agentId: 'agent:b', input: 'B', dependsOn: ['A'] },
      ],
    };

    const runId = await s.run(wf);
    await vi.waitFor(() => {
      const run = s.getRun(runId);
      expect(run?.status).toBe('completed');
    }, { timeout: 500, interval: 10 });

    s.dispose();
  });
});

// ---------------------------------------------------------------------------
// DAGScheduler integration — gates
// ---------------------------------------------------------------------------

describe('DAGScheduler with gates', () => {
  let mockPool: ReturnType<typeof createMockPool>;
  let scheduler: DAGScheduler;

  beforeEach(() => {
    mockPool = createMockPool();
    scheduler = new DAGScheduler(mockPool as any, { enableGates: true, failOnError: true });
  });

  afterEach(() => {
    scheduler.dispose();
  });

  it('passes when gate passes', async () => {
    const wf: DAGWorkflow = {
      id: 'wf:gate-pass',
      name: 'Gate passes',
      steps: [
        { id: 'A', agentId: 'agent:a', input: 'A' },
        {
          id: 'B',
          agentId: 'agent:b',
          input: 'B',
          dependsOn: ['A'],
           gate: { type: 'ac_check', onFail: 'stop', criteria: 'output-agent:b' },
        },
      ],
    };

    const runId = await scheduler.run(wf);
    await vi.waitFor(() => {
      const run = scheduler.getRun(runId);
      expect(run?.status).toBe('completed');
    }, { timeout: 500, interval: 10 });

    const run = scheduler.getRun(runId)!;
    expect(run.steps.find((s) => s.step.id === 'B')?.status).toBe('completed');
  });

  it('fails when test gate fails', async () => {
    const wf: DAGWorkflow = {
      id: 'wf:gate-fail',
      name: 'Gate fails',
      steps: [
        {
          id: 'A',
          agentId: 'agent:a',
          input: 'A',
          gate: { type: 'test', onFail: 'stop', criteria: 'false' },
        },
      ],
    };

    const runId = await scheduler.run(wf);
    await new Promise((r) => setTimeout(r, 30));

    const run = scheduler.getRun(runId);
    if (run) {
      expect(run.steps.find((s) => s.step.id === 'A')?.status).toBe('failed');
    }
  });

  it('works without gates enabled (backward compat)', async () => {
    const s = new DAGScheduler(mockPool as any, { enableGates: false });
    const wf: DAGWorkflow = {
      id: 'wf:no-gate',
      name: 'No gates',
      steps: [
        { id: 'A', agentId: 'agent:a', input: 'A' },
      ],
    };

    const runId = await s.run(wf);
    await vi.waitFor(() => {
      const run = s.getRun(runId);
      expect(run?.status).toBe('completed');
    }, { timeout: 500, interval: 10 });

    s.dispose();
  });
});
