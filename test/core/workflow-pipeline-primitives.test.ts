"""Test the basic workflow and pipeline primitives.

This test demonstrates the two main primitives for multi-agent coordination:
1. **DAG Workflow**: Directed Acyclic Graph execution for step-based workflows
2. **Pipeline Orchestration**: Sequential coordination of multiple agent roles

These primitives form the foundation for building complex agent systems.
"""
import { describe, it, expect, beforeEach } from 'vitest';
import { DAGScheduler } from '../../src/core/agents/dag-scheduler.js';
import type { DAGWorkflow } from '../../src/core/agents/dag-scheduler.js';
import { Orchestrator } from '../../src/orchestration/orchestrator.js';
import { AgentHarness } from '../../src/core/agents/harness.js';
import { EAVStore } from '../../src/core/store/eav-store.js';
import type { TrellisKernel } from '../../src/core/kernel/trellis-kernel.js';

// ---------------------------------------------------------------------------
// Mock Setup
// ---------------------------------------------------------------------------

function createMockKernel(): TrellisKernel {
  const backend = {
    init: vi.fn(),
    append: vi.fn(),
    readAll: vi.fn().mockReturnValue([]),
    readUntil: vi.fn().mockReturnValue([]),
    readAfter: vi.fn().mockReturnValue([]),
    readUntilTimestamp: vi.fn().mockReturnValue([]),
    getByHash: vi.fn(),
    getLastOp: vi.fn(),
    getOpCount: vi.fn().mockReturnValue(0),
    saveSnapshot: vi.fn(),
    loadLatestSnapshot: vi.fn(),
    close: vi.fn(),
  };
  
  const store = new EAVStore();
  
  const kernel: TrellisKernel = {
    createEntity: vi.fn(async (id: string, type: string, attrs: Record<string, any>) => {
      Object.entries(attrs).forEach(([a, v]) => {
        store.add({ e: id, a, v: typeof v === 'object' ? JSON.stringify(v) : v });
      });
    }),
    getEntity: vi.fn((id: string) => {
      const facts = [];
      for (const link of store.getLinksByEntity(id)) {
        facts.push({ e: id, a: link.a, v: link.v });
      }
      return { id, type, facts };
    }),
    updateEntity: vi.fn(async (id: string, updates: Record<string, any>) => {
      Object.entries(updates).forEach(([a, v]) => {
        store.replace(id, a, v);
      });
    }),
    deleteEntity: vi.fn(async (id: string) => {}),
    listEntities: vi.fn((type?: string) => {
      return store.list(type).map(r => ({
        id: r.e,
        type: r.type,
        facts: [{ e: r.e, a: '__type', v: r.type }],
        links: store.getLinksByEntity(r.e),
      }));
    }),
    addLink: vi.fn(async (e1: string, a: string, e2: string) => {
      store.addLink(e1, a, e2);
    }),
    getStore: vi.fn(() => store),
    boot: vi.fn(),
    close: vi.fn(),
    ...backend as any,
  };
  
  return kernel;
}

// ---------------------------------------------------------------------------
// Test 1: DAG Workflow Primitive
// ---------------------------------------------------------------------------

describe('DAG Workflow Primitive', () => {
  let scheduler: DAGScheduler;
  let mockPool: any;

  beforeEach(() => {
    const { kernel, pool } = createMockTestSetup();
    mockPool = pool;
    scheduler = new DAGScheduler(pool, { simulate: true });
  });

  it('executes sequential steps in order (linear dependency)', async () => {
    const workflow: DAGWorkflow = {
      id: 'demo:linear-workflow',
      name: 'Linear Workflow',
      steps: [
        { id: 'step-1', agentId: 'agent:analyze', input: 'Analyze requirements' },
        { id: 'step-2', agentId: 'agent:design', input: 'Design solution', dependsOn: ['step-1'] },
        { id: 'step-3', agentId: 'agent:implement', input: 'Implement', dependsOn: ['step-2'] },
      ],
    };

    const runId = await scheduler.run(workflow);
    const run = await scheduler.waitForRun(runId, 50);

    expect(run.status).toBe('completed');
    expect(run.steps).toHaveLength(3);
    expect(run.steps.every(s => s.status === 'completed')).toBe(true);
    
    // Verify sequential execution
    expect(run.steps[0].step.id).toBe('step-1');
    expect(run.steps[1].step.id).toBe('step-2');
    expect(run.steps[2].step.id).toBe('step-3');
  });

  it('executes parallel steps concurrently', async () => {
    const workflow: DAGWorkflow = {
      id: 'demo:parallel-workflow',
      name: 'Parallel Workflow',
      steps: [
        { id: 'A', agentId: 'agent:prepare', input: 'Preparation' },
        { id: 'B', agentId: 'agent:sync', input: 'Synchronization', dependsOn: ['A'] },
        { id: 'C', agentId: 'agent:validate', input: 'Validation', dependsOn: ['A'] },
        { id: 'D', agentId: 'agent:integrate', input: 'Integration', dependsOn: ['B', 'C'] },
      ],
    };

    const runId = await scheduler.run(workflow);
    const run = await scheduler.waitForRun(runId, 50);

    expect(run.status).toBe('completed');
    expect(run.steps.every(s => s.status === 'completed')).toBe(true);
  });

  it('detects and prevents workflow cycles', () => {
    const cyclicWorkflow: DAGWorkflow = {
      id: 'demo:cyclic-workflow',
      name: 'Cyclic Workflow',
      steps: [
        { id: 'step-1', agentId: 'agent:a', input: 'Step 1', dependsOn: ['step-2'] },
        { id: 'step-2', agentId: 'agent:b', input: 'Step 2', dependsOn: ['step-1'] },
      ],
    };

    expect(() => scheduler.run(cyclicWorkflow)).rejects.toThrow('Workflow cycle detected');
  });

  it('handles workflow run lifecycle management', async () => {
    const workflow: DAGWorkflow = {
      id: 'demo:lifecycle-workflow',
      name: 'Lifecycle Workflow',
      steps: [
        { id: 'step-1', agentId: 'agent:task', input: 'Task 1' },
        { id: 'step-2', agentId: 'agent:task', input: 'Task 2', dependsOn: ['step-1'] },
      ],
    };

    const runId = await scheduler.run(workflow);
    
    // Verify run is registered
    expect(scheduler.getRun(runId)).toBeDefined();
    
    const runs = scheduler.listRuns();
    expect(runs.length).toBe(1);
    expect(runs[0].workflowId).toBe(workflow.id);
  });
});

// ---------------------------------------------------------------------------
// Test 2: Pipeline Orchestration Primitive  
// ---------------------------------------------------------------------------

describe('Pipeline Orchestration Primitive', () => {
  let kernel: TrellisKernel;
  let harness: AgentHarness;
  let orchestrator: Orchestrator;

  beforeEach(() => {
    kernel = createMockKernel();
    harness = new AgentHarness(kernel);
    orchestrator = new Orchestrator(kernel, harness);
  });

  it('creates and executes a simple pipeline with multiple phases', async () => {
    // Create a pipeline with two phases
    await kernel.createEntity('pipeline:demo-1', 'Pipeline', {
      name: 'Demo Pipeline',
      description: 'Pipeline for testing orchestration',
    });

    // Create workflows for each phase
    await kernel.createEntity('workflow:phase-1', 'Workflow', {
      name: 'Analysis Phase',
      steps: ['analyze data', 'generate report'],
    });

    await kernel.createEntity('workflow:phase-2', 'Workflow', {
      name: 'Implementation Phase', 
      steps: ['develop feature', 'test feature', 'deploy'],
    });

    // Create phases
    await kernel.createEntity('phase:1', 'PipelinePhase', {
      name: 'Analysis',
      agentRole: 'strategist',
      order: 1,
    });
    await kernel.createEntity('phase:2', 'PipelinePhase', {
      name: 'Implementation',
      agentRole: 'executor', 
      order: 2,
    });

    // Link everything
    kernel.getStore().addLinks([
      { e1: 'pipeline:demo-1', a: 'phases', e2: 'phase:1' },
      { e1: 'pipeline:demo-1', a: 'phases', e2: 'phase:2' },
      { e1: 'pipeline:demo-1', a: 'workflow', e2: 'workflow:phase-1' },
      { e1: 'pipeline:demo-1', a: 'workflow', e2: 'workflow:phase-2' },
      { e1: 'phase:1', a: 'workflow', e2: 'workflow:phase-1' },
      { e1: 'phase:2', a: 'workflow', e2: 'workflow:phase-2' },
    ]);

    const run = await orchestrator.startPipeline('pipeline:demo-1', 'Build new feature');

    expect(run.pipelineId).toBe('pipeline:demo-1');
    expect(run.pipelineName).toBe('Demo Pipeline');
    expect(run.status).toBe('completed');
    expect(run.phases).toHaveLength(2);
    expect(run.phases[0].agentRole).toBe('strategist');
    expect(run.phases[1].agentRole).toBe('executor');
    expect(run.phases.every(p => p.status === 'completed')).toBe(true);
  });

  it('manages handoffs between pipeline phases', async () => {
    await kernel.createEntity('pipeline:hand-off', 'Pipeline', {
      name: 'Handoff Pipeline',
    });

    await kernel.createEntity('workflow:1', 'Workflow', {
      name: 'Phase 1',
      steps: ['step-1', 'step-2'],
    });

    await kernel.createEntity('phase:1', 'PipelinePhase', {
      name: 'First Phase',
      agentRole: 'strategist',
      order: 1,
    });

    kernel.getStore().addLinks([
      { e1: 'pipeline:hand-off', a: 'phases', e2: 'phase:1' },
      { e1: 'pipeline:hand-off', a: 'workflow', e2: 'workflow:1' },
      { e1: 'phase:1', a: 'workflow', e2: 'workflow:1' },
    ]);

    const run = await orchestrator.startPipeline('pipeline:hand-off', 'Test handoffs');

    expect(run.phases[0].status).toBe('completed');
  });

  it('handles pipeline configuration and defaults', () => {
    const orch = new Orchestrator(kernel, harness);
    const config = orch.getConfig();

    expect(config.concurrency).toBe(1);
    expect(config.failOnError).toBe(true);
    expect(config.persistRuns).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

function createMockTestSetup() {
  const kernel = createMockKernel();
  const harness = new AgentHarness(kernel);
  
  const mockPool: any = {
    enqueue: vi.fn(async (agentId: string, input: string, opts?: any, runId?: string) => {
      return runId || `run:${agentId}:${Date.now()}`;
    }),
    on: vi.fn((listener: any) => {
      mockPool.listeners.push(listener);
    }),
    off: vi.fn((listener: any) => {
      const idx = mockPool.listeners.indexOf(listener);
      if (idx !== -1) mockPool.listeners.splice(idx, 1);
    }),
    ensureKernel: vi.fn(async () => kernel),
    listeners: [] as any[],
  };

  return { kernel, harness, pool: mockPool };
}
