import { describe, it, expect } from 'vitest';
import {
  listAgents,
  listActiveAgents,
  listAgentsByRole,
  listWorkflows,
  listActiveWorkflows,
  listWorkflowSteps,
  listPipelines,
  listActivePipelines,
  listPipelinePhases,
  listTools,
  listHandoffs,
  listHandoffsByStatus,
  listHandoffsFromAgent,
  listHandoffsToAgent,
  listAgentRuns,
  listAgentRunsByStatus,
  listAgentRunsByAgent,
  listDecisionTraces,
  listDecisionTracesByRun,
  listDAGRuns,
  listDAGRunsByWorkflow,
} from '../../src/core/ontology/agent-queries.js';

describe('Agent Queries', () => {
  it('listAgents generates correct query', () => {
    expect(listAgents()).toBe('find ?e where type = "Agent"');
  });

  it('listAgents with where generates correct query', () => {
    expect(listAgents({ status: 'active' })).toBe('find ?e where type = "Agent" and status = "active"');
  });

  it('listActiveAgents generates correct query', () => {
    expect(listActiveAgents()).toBe('find ?e where type = "Agent" and status = "active"');
  });

  it('listAgentsByRole generates correct query', () => {
    expect(listAgentsByRole('strategist')).toBe('find ?e where type = "Agent" and role = "strategist"');
  });
});

describe('Workflow Queries', () => {
  it('listWorkflows generates correct query', () => {
    expect(listWorkflows()).toBe('find ?e where type = "Workflow"');
  });

  it('listActiveWorkflows generates correct query', () => {
    expect(listActiveWorkflows()).toBe('find ?e where type = "Workflow" and active = true');
  });

  it('listWorkflowSteps generates correct query', () => {
    expect(listWorkflowSteps()).toBe('find ?e where type = "WorkflowStep"');
  });
});

describe('Pipeline Queries', () => {
  it('listPipelines generates correct query', () => {
    expect(listPipelines()).toBe('find ?e where type = "Pipeline"');
  });

  it('listActivePipelines generates correct query', () => {
    expect(listActivePipelines()).toBe('find ?e where type = "Pipeline" and active = true');
  });

  it('listPipelinePhases generates correct query', () => {
    expect(listPipelinePhases()).toBe('find ?e where type = "PipelinePhase"');
  });
});

describe('Handoff Queries', () => {
  it('listHandoffs generates correct query', () => {
    expect(listHandoffs()).toBe('find ?e where type = "Handoff"');
  });

  it('listHandoffsByStatus generates correct query', () => {
    expect(listHandoffsByStatus('HANDOFF')).toBe('find ?e where type = "Handoff" and status = "HANDOFF"');
  });

  it('listHandoffsFromAgent generates correct query', () => {
    expect(listHandoffsFromAgent('agent:strategist-1')).toBe('find ?e where type = "Handoff" and from = "agent:strategist-1"');
  });

  it('listHandoffsToAgent generates correct query', () => {
    expect(listHandoffsToAgent('agent:executor-1')).toBe('find ?e where type = "Handoff" and to = "agent:executor-1"');
  });
});

describe('AgentRun Queries', () => {
  it('listAgentRuns generates correct query', () => {
    expect(listAgentRuns()).toBe('find ?e where type = "AgentRun"');
  });

  it('listAgentRunsByStatus generates correct query', () => {
    expect(listAgentRunsByStatus('running')).toBe('find ?e where type = "AgentRun" and status = "running"');
  });

  it('listAgentRunsByAgent generates correct query', () => {
    expect(listAgentRunsByAgent('agent:1')).toBe('find ?e where type = "AgentRun" and executedBy = "agent:1"');
  });
});

describe('DecisionTrace Queries', () => {
  it('listDecisionTraces generates correct query', () => {
    expect(listDecisionTraces()).toBe('find ?e where type = "DecisionTrace"');
  });

  it('listDecisionTracesByRun generates correct query', () => {
    expect(listDecisionTracesByRun('run:1')).toBe('find ?e where type = "DecisionTrace" and belongsToRun = "run:1"');
  });
});

describe('DAGRun Queries', () => {
  it('listDAGRuns generates correct query', () => {
    expect(listDAGRuns()).toBe('find ?e where type = "DAGRun"');
  });

  it('listDAGRunsByWorkflow generates correct query', () => {
    expect(listDAGRunsByWorkflow('wf:1')).toBe('find ?e where type = "DAGRun" and workflowId = "wf:1"');
  });
});
