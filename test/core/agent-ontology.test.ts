import { describe, it, expect } from 'vitest';
import { CORE_ONTOLOGY, CORE_VERSION } from '../../src/core/ontology/core-ontology.js';
import type { SchemaDefinition } from '../../src/core/ontology/types.js';

describe('Agent & Pipeline Ontology Schemas', () => {
  const index = new Map<string, SchemaDefinition>();
  for (const s of CORE_ONTOLOGY) index.set(s['@id'], s);

  it('core:Workflow has expected fields', () => {
    const wf = index.get('core:Workflow');
    expect(wf).toBeDefined();
    expect(wf!.tier).toBe('core');
    const fields = Object.fromEntries(wf!.fields.map((f) => [f.name, f]));
    expect(fields.name).toBeDefined();
    expect(fields.name.valueType).toBe('title');
    expect(fields.trigger).toBeDefined();
    expect(fields.steps).toBeDefined();
    expect(fields.steps.valueType).toBe('multi_select');
    expect(fields.active).toBeDefined();
    expect(fields.active.valueType).toBe('checkbox');
  });

  it('core:WorkflowStep has expected fields', () => {
    const step = index.get('core:WorkflowStep');
    expect(step).toBeDefined();
    expect(step!.tier).toBe('system');
    const fields = Object.fromEntries(step!.fields.map((f) => [f.name, f]));
    expect(fields.name).toBeDefined();
    expect(fields.commands).toBeDefined();
    expect(fields.commands.valueType).toBe('json');
    expect(fields.layer).toBeDefined();
    expect(fields.layer.valueType).toBe('select');
    expect(fields.layer.selectOptions).toContain('pre_flight');
    expect(fields.layer.selectOptions).toContain('implement');
    expect(fields.layer.selectOptions).toContain('review');
  });

  it('core:WorkflowEdge has from/to relations to WorkflowStep', () => {
    const edge = index.get('core:WorkflowEdge');
    expect(edge).toBeDefined();
    const fields = Object.fromEntries(edge!.fields.map((f) => [f.name, f]));
    expect(fields.from.valueType).toBe('relation');
    expect(fields.from.relation?.targetSchema).toBe('core:WorkflowStep');
    expect(fields.from.relation?.cardinality).toBe('one');
    expect(fields.to.valueType).toBe('relation');
    expect(fields.to.relation?.targetSchema).toBe('core:WorkflowStep');
    expect(fields.to.relation?.cardinality).toBe('one');
    expect(fields.status.valueType).toBe('select');
    expect(fields.status.selectOptions).toEqual(
      expect.arrayContaining(['HANDOFF', 'CLARIFY', 'REJECT', 'BLOCKED', 'DECISION']),
    );
  });

  it('core:WorkflowGate has step/retryStep/failRoute relations', () => {
    const gate = index.get('core:WorkflowGate');
    expect(gate).toBeDefined();
    const fields = Object.fromEntries(gate!.fields.map((f) => [f.name, f]));
    expect(fields.step.valueType).toBe('relation');
    expect(fields.step.relation?.targetSchema).toBe('core:WorkflowStep');
    expect(fields.retryStep.valueType).toBe('relation');
    expect(fields.retryStep.relation?.targetSchema).toBe('core:WorkflowStep');
    expect(fields.failRoute.valueType).toBe('relation');
    expect(fields.failRoute.relation?.targetSchema).toBe('core:WorkflowEdge');
    expect(fields.type.selectOptions).toEqual(
      expect.arrayContaining(['test', 'manual', 'ac_check', 'semantic_diff']),
    );
  });

  it('trellis:Pipeline has phases and workflow relations', () => {
    const pl = index.get('trellis:Pipeline');
    expect(pl).toBeDefined();
    expect(pl!.tier).toBe('system');
    const fields = Object.fromEntries(pl!.fields.map((f) => [f.name, f]));
    expect(fields.name).toBeDefined();
    expect(fields.description).toBeDefined();
    expect(fields.trigger).toBeDefined();
    expect(fields.active).toBeDefined();
    expect(fields.phases).toBeDefined();
    expect(fields.phases.valueType).toBe('relation');
    expect(fields.phases.relation?.targetSchema).toBe('trellis:PipelinePhase');
    expect(fields.phases.relation?.cardinality).toBe('many');
    expect(fields.workflow).toBeDefined();
    expect(fields.workflow.valueType).toBe('relation');
    expect(fields.workflow.relation?.targetSchema).toBe('core:Workflow');
    expect(fields.workflow.relation?.cardinality).toBe('many');
  });

  it('trellis:PipelinePhase has workflow relation', () => {
    const phase = index.get('trellis:PipelinePhase');
    expect(phase).toBeDefined();
    const fields = Object.fromEntries(phase!.fields.map((f) => [f.name, f]));
    expect(fields.name).toBeDefined();
    expect(fields.order).toBeDefined();
    expect(fields.agentRole).toBeDefined();
    expect(fields.agentRole.selectOptions).toContain('strategist');
    expect(fields.agentRole.selectOptions).toContain('executor');
    expect(fields.agentRole.selectOptions).toContain('reviewer');
    expect(fields.workflow.valueType).toBe('relation');
    expect(fields.workflow.relation?.targetSchema).toBe('core:Workflow');
    expect(fields.workflow.relation?.cardinality).toBe('one');
  });

  it('core:Agent has expected fields', () => {
    const agent = index.get('core:Agent');
    expect(agent).toBeDefined();
    expect(agent!.tier).toBe('system');
    const fields = Object.fromEntries(agent!.fields.map((f) => [f.name, f]));
    expect(fields.name).toBeDefined();
    expect(fields.role).toBeDefined();
    expect(fields.role.selectOptions).toContain('strategist');
    expect(fields.role.selectOptions).toContain('human');
    expect(fields.status).toBeDefined();
    expect(fields.status.selectOptions).toContain('active');
    expect(fields.status.selectOptions).toContain('inactive');
    expect(fields.capabilities).toBeDefined();
    expect(fields.capabilities.valueType).toBe('multi_select');
    expect(fields.workflow.valueType).toBe('relation');
    expect(fields.workflow.relation?.targetSchema).toBe('core:Workflow');
  });

  it('core:Tool has expected fields', () => {
    const tool = index.get('core:Tool');
    expect(tool).toBeDefined();
    const fields = Object.fromEntries(tool!.fields.map((f) => [f.name, f]));
    expect(fields.name).toBeDefined();
    expect(fields.schema).toBeDefined();
    expect(fields.schema.valueType).toBe('json');
    expect(fields.endpoint).toBeDefined();
    expect(fields.endpoint.valueType).toBe('url');
  });

  it('core:Handoff has from/to/re relations', () => {
    const handoff = index.get('core:Handoff');
    expect(handoff).toBeDefined();
    const fields = Object.fromEntries(handoff!.fields.map((f) => [f.name, f]));
    expect(fields.from.valueType).toBe('relation');
    expect(fields.from.relation?.targetSchema).toBe('core:Agent');
    expect(fields.to.valueType).toBe('relation');
    expect(fields.to.relation?.targetSchema).toBe('core:Agent');
    expect(fields.re.valueType).toBe('relation');
    expect(fields.status.selectOptions).toEqual(
      expect.arrayContaining(['HANDOFF', 'CLARIFY', 'REJECT', 'BLOCKED', 'DECISION']),
    );
  });

  it('trellis:AgentRun has the correct schema fields', () => {
    const run = index.get('trellis:AgentRun');
    expect(run).toBeDefined();
    const fields = Object.fromEntries(run!.fields.map((f) => [f.name, f]));
    expect(fields.executedBy.valueType).toBe('relation');
    expect(fields.executedBy.relation?.targetSchema).toBe('core:Agent');
    expect(fields.handoffTo.relation?.targetSchema).toBe('trellis:AgentRun');
    expect(fields.handoffFrom.relation?.targetSchema).toBe('trellis:AgentRun');
  });

  it('trellis:DAGRun has workflowId and steps', () => {
    const dag = index.get('trellis:DAGRun');
    expect(dag).toBeDefined();
    const fields = Object.fromEntries(dag!.fields.map((f) => [f.name, f]));
    expect(fields.workflowId).toBeDefined();
    expect(fields.steps).toBeDefined();
    expect(fields.status.selectOptions).toContain('running');
    expect(fields.status.selectOptions).toContain('completed');
    expect(fields.status.selectOptions).toContain('failed');
  });

  it('all types have version consistent with CORE_VERSION', () => {
    for (const schema of CORE_ONTOLOGY) {
      expect(schema.version).toBe(CORE_VERSION);
    }
  });

  it('all types have a valid subClassOf chain (or are the root Thing)', () => {
    const allIds = new Set(CORE_ONTOLOGY.map((s) => s['@id']));
    for (const schema of CORE_ONTOLOGY) {
      if (schema['@id'] === 'core:Thing') {
        expect(schema.subClassOf).toBeUndefined();
      } else {
        expect(schema.subClassOf).toBeDefined();
        expect(allIds.has(schema.subClassOf!)).toBe(true);
      }
    }
  });
});
