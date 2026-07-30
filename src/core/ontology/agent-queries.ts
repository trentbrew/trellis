import { entitiesQuery, type WhereInput } from '../../schema/eql.js';

export function listAgents(where?: WhereInput): string {
  return entitiesQuery('Agent', where);
}

export function listActiveAgents(): string {
  return listAgents({ status: 'active' });
}

export function listAgentsByRole(role: string): string {
  return listAgents({ role });
}

export function listWorkflows(where?: WhereInput): string {
  return entitiesQuery('Workflow', where);
}

export function listActiveWorkflows(): string {
  return listWorkflows({ active: true });
}

export function listWorkflowSteps(workflowId?: string): string {
  const where: WhereInput = {};
  if (workflowId) where['workflow'] = workflowId;
  return entitiesQuery('WorkflowStep', where);
}

export function listWorkflowEdges(where?: WhereInput): string {
  return entitiesQuery('WorkflowEdge', where);
}

export function listWorkflowGates(where?: WhereInput): string {
  return entitiesQuery('WorkflowGate', where);
}

export function listPipelines(where?: WhereInput): string {
  return entitiesQuery('Pipeline', where);
}

export function listActivePipelines(): string {
  return listPipelines({ active: true });
}

export function listPipelinePhases(pipelineId?: string): string {
  const where: WhereInput = {};
  if (pipelineId) where['pipeline'] = pipelineId;
  return entitiesQuery('PipelinePhase', where);
}

export function listTools(where?: WhereInput): string {
  return entitiesQuery('Tool', where);
}

export function listHandoffs(where?: WhereInput): string {
  return entitiesQuery('Handoff', where);
}

export function listHandoffsByStatus(status: string): string {
  return listHandoffs({ status });
}

export function listHandoffsFromAgent(agentId: string): string {
  return listHandoffs({ from: agentId });
}

export function listHandoffsToAgent(agentId: string): string {
  return listHandoffs({ to: agentId });
}

export function listAgentRuns(where?: WhereInput): string {
  return entitiesQuery('AgentRun', where);
}

export function listAgentRunsByStatus(status: string): string {
  return listAgentRuns({ status });
}

export function listAgentRunsByAgent(agentId: string): string {
  return listAgentRuns({ executedBy: agentId });
}

export function listDecisionTraces(where?: WhereInput): string {
  return entitiesQuery('DecisionTrace', where);
}

export function listDecisionTracesByRun(runId: string): string {
  return listDecisionTraces({ belongsToRun: runId });
}

export function listDAGRuns(where?: WhereInput): string {
  return entitiesQuery('DAGRun', where);
}

export function listDAGRunsByWorkflow(workflowId: string): string {
  return listDAGRuns({ workflowId });
}
