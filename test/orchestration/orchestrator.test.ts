import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Orchestrator } from '../../src/orchestration/orchestrator.js';
import { AgentHarness } from '../../src/core/agents/harness.js';
import { EAVStore } from '../../src/core/store/eav-store.js';
import { TrellisKernel } from '../../src/core/kernel/trellis-kernel.js';

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
  const kernel = new TrellisKernel({ backend: backend as any, agentId: 'test' });
  kernel.boot();
  return kernel;
}

async function seedPipeline(kernel: TrellisKernel): Promise<{ pipelineId: string; phaseIds: string[]; workflowIds: string[] }> {
  const pipelineId = 'pipeline:test-1';
  const wf1Id = 'workflow:phase-a';
  const wf2Id = 'workflow:phase-b';
  const phase1Id = 'phase:1';
  const phase2Id = 'phase:2';

  await kernel.createEntity(pipelineId, 'Pipeline', {
    name: 'Test Pipeline',
    description: 'A test pipeline with two phases',
    active: true,
  });

  await kernel.createEntity(wf1Id, 'Workflow', {
    name: 'Phase A Workflow',
    active: true,
    steps: ['analyze requirements', 'design solution'],
  });

  await kernel.createEntity(wf2Id, 'Workflow', {
    name: 'Phase B Workflow',
    active: true,
    steps: ['implement solution', 'run tests'],
  });

  await kernel.createEntity(phase1Id, 'PipelinePhase', {
    name: 'Research & Design',
    agentRole: 'strategist',
    order: 1,
  });

  await kernel.createEntity(phase2Id, 'PipelinePhase', {
    name: 'Implementation',
    agentRole: 'executor',
    order: 2,
  });

  kernel.getStore().addLinks([
    { e1: pipelineId, a: 'phases', e2: phase1Id },
    { e1: pipelineId, a: 'phases', e2: phase2Id },
    { e1: pipelineId, a: 'workflow', e2: wf1Id },
    { e1: pipelineId, a: 'workflow', e2: wf2Id },
    { e1: phase1Id, a: 'workflow', e2: wf1Id },
    { e1: phase2Id, a: 'workflow', e2: wf2Id },
  ]);

  return { pipelineId, phaseIds: [phase1Id, phase2Id], workflowIds: [wf1Id, wf2Id] };
}

describe('Orchestrator', () => {
  let kernel: TrellisKernel;
  let harness: AgentHarness;

  beforeEach(() => {
    kernel = createMockKernel();
    harness = new AgentHarness(kernel);
  });

  describe('phase resolution', () => {
    it('resolves pipeline phases in order', async () => {
      const { pipelineId, phaseIds } = await seedPipeline(kernel);
      const orch = new Orchestrator(kernel, harness);

      const run = await orch.startPipeline(pipelineId, 'build a feature');
      expect(run.phases).toHaveLength(2);
      expect(run.phases[0].phaseId).toBe(phaseIds[0]);
      expect(run.phases[0].agentRole).toBe('strategist');
      expect(run.phases[1].phaseId).toBe(phaseIds[1]);
      expect(run.phases[1].agentRole).toBe('executor');
    });

    it('sets pipeline metadata on the run', async () => {
      const { pipelineId } = await seedPipeline(kernel);
      const orch = new Orchestrator(kernel, harness);

      const run = await orch.startPipeline(pipelineId, 'hello');
      expect(run.pipelineId).toBe(pipelineId);
      expect(run.pipelineName).toBe('Test Pipeline');
      expect(run.input).toBe('hello');
      expect(run.status).toBe('completed');
    });

    it('rejects non-existent pipeline', async () => {
      const orch = new Orchestrator(kernel, harness);
      await expect(orch.startPipeline('pipeline:nope', 'test')).rejects.toThrow('Pipeline not found');
    });
  });

  describe('handoff recording', () => {
    it('creates Handoff graph entities between phases', async () => {
      const { pipelineId } = await seedPipeline(kernel);
      const orch = new Orchestrator(kernel, harness);

      const run = await orch.startPipeline(pipelineId, 'build feature');

      for (const phase of run.phases) {
        if (phase.handoffId) {
          const entity = kernel.getEntity(phase.handoffId);
          expect(entity).not.toBeNull();
          expect(entity!.type).toBe('Handoff');
        }
      }
    });
  });

  describe('run lifecycle', () => {
    it('listRuns returns started runs', async () => {
      const { pipelineId } = await seedPipeline(kernel);
      const orch = new Orchestrator(kernel, harness);

      expect(orch.listRuns()).toHaveLength(0);

      await orch.startPipeline(pipelineId, 'test');
      expect(orch.listRuns()).toHaveLength(1);
    });

    it('getRun returns a specific run by id', async () => {
      const { pipelineId } = await seedPipeline(kernel);
      const orch = new Orchestrator(kernel, harness);

      const run = await orch.startPipeline(pipelineId, 'test');
      const fetched = orch.getRun(run.id);
      expect(fetched).toBeDefined();
      expect(fetched!.id).toBe(run.id);
    });
  });

  describe('configuration', () => {
    it('uses default config when none provided', () => {
      const orch = new Orchestrator(kernel, harness);
      expect(orch.getConfig()).toEqual({
        concurrency: 1,
        failOnError: true,
        persistRuns: false,
      });
    });

    it('merges provided config with defaults', () => {
      const orch = new Orchestrator(kernel, harness, { concurrency: 3 });
      expect(orch.getConfig().concurrency).toBe(3);
      expect(orch.getConfig().failOnError).toBe(true);
      expect(orch.getConfig().persistRuns).toBe(false);
    });
  });
});
