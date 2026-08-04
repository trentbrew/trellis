import type { TrellisKernel } from '../core/kernel/trellis-kernel.js';
import { AgentHarness } from '../core/agents/harness.js';
import { WorkerPool } from '../core/agents/worker-pool.js';
import { DAGScheduler } from '../core/agents/dag-scheduler.js';
import { PROVENANCE } from '../core/persist/canonical-op.js';
import { formatEnvelope, type HandoffRole, type HandoffStatus } from '../protocol/envelope.js';
import type {
  PipelineRun,
  PhaseExecution,
  OrchestratorConfig,
  HandoffRecord,
} from './types.js';

const AGENT_CTX = { provenance: PROVENANCE.agent };
let runCounter = 0;

function now(): string {
  return new Date().toISOString();
}

export class Orchestrator {
  private kernel: TrellisKernel;
  private harness: AgentHarness;
  private config: Required<OrchestratorConfig>;
  private runs: Map<string, PipelineRun> = new Map();

  constructor(
    kernel: TrellisKernel,
    harness: AgentHarness,
    config?: OrchestratorConfig,
  ) {
    this.kernel = kernel;
    this.harness = harness;
    this.config = {
      concurrency: 1,
      failOnError: true,
      persistRuns: false,
      ...config,
    };
  }

  getConfig(): Required<OrchestratorConfig> {
    return { ...this.config };
  }

  async startPipeline(
    pipelineId: string,
    input: string,
  ): Promise<PipelineRun> {
    const entity = this.kernel.getEntity(pipelineId);
    if (!entity) {
      throw new Error(`Pipeline not found: ${pipelineId}`);
    }

    const name = String(entity.facts.find((f) => f.a === 'name')?.v ?? pipelineId);
    const runId = `pipeline:run:${++runCounter}`;

    const phases = await this._resolvePhases(pipelineId);
    if (phases.length === 0) {
      throw new Error(`Pipeline ${pipelineId} has no phases`);
    }

    const run: PipelineRun = {
      id: runId,
      pipelineId,
      pipelineName: name,
      input,
      status: 'running',
      phases: phases.map((p) => ({
        phaseId: p.id,
        phaseName: String(p.name ?? p.agentRole ?? 'unknown'),
        agentRole: String(p.agentRole ?? 'unknown'),
        status: 'pending',
        startedAt: now(),
      })),
      startedAt: now(),
    };

    this.runs.set(runId, run);

    if (this.config.persistRuns) {
      await this._saveRun(run);
    }

    await this._executePipeline(run);
    return run;
  }

  getRun(runId: string): PipelineRun | undefined {
    return this.runs.get(runId);
  }

  listRuns(): PipelineRun[] {
    return [...this.runs.values()];
  }

  private async _resolvePhases(
    pipelineId: string,
  ): Promise<{ id: string; name?: string; agentRole?: string; order: number; workflowId?: string }[]> {
    const allPhases = this.kernel.listEntities('PipelinePhase');
    const pipelineLinks = this.kernel.getStore().getLinksByEntity(pipelineId);
    const phaseIds = new Set(
      pipelineLinks.filter((l) => l.a === 'phases').map((l) => l.e2),
    );

    return allPhases
      .filter((e) => phaseIds.has(e.id))
      .map((e) => {
        const get = (a: string) => e.facts.find((f) => f.a === a)?.v;
        const wfField = get('workflow');
        const workflowId = wfField ? this._resolveRelationId(e.id, 'workflow') : undefined;
        return {
          id: e.id,
          name: String(get('name') ?? ''),
          agentRole: String(get('agentRole') ?? ''),
          order: Number(get('order') ?? 0),
          workflowId,
        };
      })
      .sort((a, b) => a.order - b.order);
  }

  private _resolveRelationId(entityId: string, relationAttr: string): string | undefined {
    const links = this.kernel.getStore().getLinksByEntityAndAttribute(entityId, relationAttr);
    return links.length > 0 ? links[0].e2 : undefined;
  }

  private async _executePipeline(run: PipelineRun): Promise<void> {
    const pool = new WorkerPool(this.kernel, this.harness, { concurrency: this.config.concurrency, simulate: true });
    const scheduler = new DAGScheduler(pool, { failOnError: this.config.failOnError });
    pool.start();

    try {
      let previousOutput = run.input;

      for (const phase of run.phases) {
        const phaseDef = await this._resolvePhases(run.pipelineId).then(
          (ps) => ps.find((p) => p.id === phase.phaseId),
        );
        if (!phaseDef) {
          phase.status = 'failed';
          phase.error = 'Phase definition not found';
          if (this.config.failOnError) {
            run.status = 'failed';
            run.completedAt = now();
            return;
          }
          continue;
        }

        phase.status = 'running';

        const handoff = await this._recordHandoff({
          from: (run.phases[run.phases.indexOf(phase) - 1]?.agentRole as HandoffRole) ?? 'human',
          to: phaseDef.agentRole as HandoffRole,
          re: run.pipelineId,
          status: 'HANDOFF',
          body: `Phase ${phaseDef.order}: ${phaseDef.name}\n\nInput: ${previousOutput}`,
        });
        phase.handoffId = handoff.graphEntityId;

        try {
          if (phaseDef.workflowId) {
            const wfEntity = this.kernel.getEntity(phaseDef.workflowId);
            if (wfEntity) {
              const stepsField = wfEntity.facts.find((f) => f.a === 'steps');
              const stepsList = Array.isArray(stepsField?.v) ? stepsField.v as string[] : [];

              if (stepsList.length > 0) {
                const dagSteps = stepsList.map((stepName, i) => ({
                  id: `${phaseDef.workflowId}/step-${i}`,
                  agentId: `agent:${phaseDef.agentRole}`,
                  input: `${stepName}: ${previousOutput}`,
                  dependsOn: i > 0 ? [`${phaseDef.workflowId}/step-${i - 1}`] : undefined,
                }));

                phase.runId = await scheduler.run({
                  id: phaseDef.workflowId,
                  name: String(wfEntity.facts.find((f) => f.a === 'name')?.v ?? phaseDef.workflowId),
                  steps: dagSteps,
                });

                const dagRun = await scheduler.waitForRun(phase.runId);
                phase.output = dagRun.steps
                  .filter((s) => s.status === 'completed')
                  .map((s) => s.step.input)
                  .join('\n');
                if (dagRun.status === 'failed') {
                  phase.status = 'failed';
                  phase.error = dagRun.steps.find((s) => s.error)?.error;
                  if (this.config.failOnError) {
                    run.status = 'failed';
                    run.completedAt = now();
                    return;
                  }
                  continue;
                }
              }
            }
          }

          if ((phase.status as string) !== 'failed') {
            phase.status = 'completed';
            phase.completedAt = now();
            previousOutput = phase.output ?? previousOutput;
          }
        } catch (err: any) {
          phase.status = 'failed';
          phase.error = err.message;
          if (this.config.failOnError) {
            run.status = 'failed';
            run.completedAt = now();
            return;
          }
        }
      }

      run.status = run.phases.every((p) => p.status === 'completed') ? 'completed' : 'failed';
    } catch (err: any) {
      run.status = 'failed';
    } finally {
      run.completedAt = now();
      if (this.config.persistRuns) {
        await this._saveRun(run);
      }
      scheduler.dispose();
      pool.stop();
    }
  }

  private async _recordHandoff(record: HandoffRecord): Promise<HandoffRecord> {
    const id = `handoff:${runCounter}:${Date.now()}`;
    const envelope = formatEnvelope({
      from: record.from,
      to: record.to,
      re: record.re,
      status: record.status,
      body: record.body,
      refs: record.refs,
    });

    await this.kernel.createEntity(id, 'Handoff', {
      name: `${record.from} → ${record.to}`,
      status: record.status,
      body: envelope,
      timestamp: now(),
    }, undefined, AGENT_CTX);

    if (record.from) {
      const fromAgents = this.harness.listAgents().filter((a) => a.name === record.from);
      if (fromAgents.length > 0) {
        await this.kernel.addLink(id, 'from', fromAgents[0].id, AGENT_CTX);
      }
    }
    if (record.to) {
      const toAgents = this.harness.listAgents().filter((a) => a.name === record.to);
      if (toAgents.length > 0) {
        await this.kernel.addLink(id, 'to', toAgents[0].id, AGENT_CTX);
      }
    }
    if (record.re) {
      await this.kernel.addLink(id, 're', record.re, AGENT_CTX);
    }

    return { ...record, graphEntityId: id };
  }

  private async _saveRun(run: PipelineRun): Promise<void> {
    try {
      const existing = this.kernel.getEntity(run.id);
      if (!existing) {
        await this.kernel.createEntity(run.id, 'DAGRun', {
          workflowId: run.pipelineId,
          status: run.status,
          steps: JSON.stringify(run.phases),
          startedAt: run.startedAt,
          completedAt: run.completedAt ?? '',
        }, undefined, AGENT_CTX);
      } else {
        await this.kernel.updateEntity(run.id, {
          status: run.status,
          steps: JSON.stringify(run.phases),
          completedAt: run.completedAt ?? '',
        }, AGENT_CTX);
      }
    } catch {
      // swallow persistence errors
    }
  }
}
