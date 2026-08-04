/**
 * Core Ontology — Built-in structural type hierarchy
 *
 * These types are immutable and ship with the Trellis kernel.
 * They define the foundational type system that all system
 * and user ontologies extend.
 *
 * tier: 'core' — kernel rejects mutations to these schemas.
 */

import type { SchemaDefinition, PropertyValueSpecification } from './types.js';

const VERSION = '1.0.0';
type PVS = PropertyValueSpecification;

function f(
  name: string,
  valueType: PVS['valueType'],
  opts?: Partial<Omit<PVS, 'name' | 'valueType'>>,
): PVS {
  return { name, valueType, ...opts } as PVS;
}

/**
 * core:Thing — Root type. All entities inherit from Thing.
 */
const thing: SchemaDefinition = {
  '@id': 'core:Thing',
  '@type': 'trellis:Schema',
  version: VERSION,
  tier: 'core',
  label: 'Thing',
  icon: 'lucide:box',
  fields: [
    f('id', 'title', { required: true }),
    f('createdAt', 'date'),
    f('updatedAt', 'date'),
    f('createdBy', 'relation', {
      relation: { targetSchema: 'core:Member', cardinality: 'one' },
    }),
    f('tags', 'multi_select'),
  ],
};

/**
 * core:Record — Base type for data records with title/description/status.
 */
const record: SchemaDefinition = {
  '@id': 'core:Record',
  '@type': 'trellis:Schema',
  version: VERSION,
  tier: 'core',
  subClassOf: 'core:Thing',
  label: 'Record',
  icon: 'lucide:file',
  fields: [
    f('title', 'title', { required: true }),
    f('description', 'rich_text'),
    f('status', 'select'),
    f('tags', 'multi_select'),
  ],
};

/**
 * core:Document — Rich content entities (notes, files, pages).
 */
const document: SchemaDefinition = {
  '@id': 'core:Document',
  '@type': 'trellis:Schema',
  version: VERSION,
  tier: 'core',
  subClassOf: 'core:Record',
  label: 'Document',
  icon: 'lucide:file-text',
  fields: [
    f('content', 'rich_text'),
    f('mimeType', 'rich_text'),
    f('fileUrl', 'url'),
  ],
};

/**
 * core:Event — Time-bound entities (tasks, appointments, etc.).
 */
const event: SchemaDefinition = {
  '@id': 'core:Event',
  '@type': 'trellis:Schema',
  version: VERSION,
  tier: 'core',
  subClassOf: 'core:Record',
  label: 'Event',
  icon: 'lucide:calendar',
  fields: [
    f('startDate', 'date'),
    f('endDate', 'date'),
    f('location', 'rich_text'),
    f('allDay', 'checkbox'),
  ],
};

/**
 * core:Collection — Groups/organizes other entities.
 */
const collection: SchemaDefinition = {
  '@id': 'core:Collection',
  '@type': 'trellis:Schema',
  version: VERSION,
  tier: 'core',
  subClassOf: 'core:Thing',
  label: 'Collection',
  icon: 'lucide:database',
  fields: [
    f('title', 'title', { required: true }),
    f('description', 'rich_text'),
    f('icon', 'rich_text'),
    f('schema', 'rich_text'),
    f('recordType', 'relation', {
      relation: { targetSchema: 'core:Record', cardinality: 'one' },
    }),
  ],
};

/**
 * core:Tag — Classification/labeling entities.
 */
const tag: SchemaDefinition = {
  '@id': 'core:Tag',
  '@type': 'trellis:Schema',
  version: VERSION,
  tier: 'core',
  subClassOf: 'core:Thing',
  label: 'Tag',
  icon: 'lucide:tag',
  fields: [
    f('name', 'title', { required: true }),
    f('slug', 'rich_text'),
    f('color', 'rich_text'),
    f('icon', 'rich_text'),
    f('parentTag', 'relation', {
      relation: { targetSchema: 'core:Tag', cardinality: 'one' },
    }),
  ],
};

/**
 * core:Workspace — Top-level organizational unit.
 */
const workspace: SchemaDefinition = {
  '@id': 'core:Workspace',
  '@type': 'trellis:Schema',
  version: VERSION,
  tier: 'core',
  subClassOf: 'core:Thing',
  label: 'Workspace',
  icon: 'lucide:building-2',
  fields: [
    f('name', 'title', { required: true }),
    f('slug', 'rich_text'),
    f('avatar', 'files'),
    f('plan', 'select'),
  ],
};

/**
 * core:App — Application within a workspace.
 */
const app: SchemaDefinition = {
  '@id': 'core:App',
  '@type': 'trellis:Schema',
  version: VERSION,
  tier: 'core',
  subClassOf: 'core:Thing',
  label: 'App',
  icon: 'lucide:layout-grid',
  fields: [
    f('name', 'title', { required: true }),
    f('slug', 'rich_text'),
    f('icon', 'rich_text'),
    f('color', 'rich_text'),
    f('description', 'rich_text'),
    f('ontologies', 'multi_select'),
  ],
};

/**
 * core:Member — User within a workspace.
 */
const member: SchemaDefinition = {
  '@id': 'core:Member',
  '@type': 'trellis:Schema',
  version: VERSION,
  tier: 'core',
  subClassOf: 'core:Thing',
  label: 'Member',
  icon: 'lucide:user',
  fields: [
    f('name', 'title', { required: true }),
    f('email', 'email'),
    f('avatar', 'files'),
    f('role', 'select', {
      required: true,
      selectOptions: ['owner', 'admin', 'member', 'guest'],
      defaultValue: 'member',
    }),
    f('status', 'select', {
      required: true,
      selectOptions: ['pending', 'active', 'suspended'],
      defaultValue: 'pending',
    }),
    f('orgId', 'relation', {
      required: true,
      relation: { targetSchema: 'core:Workspace', cardinality: 'one' },
    }),
    f('userId', 'relation', {
      relation: { targetSchema: 'core:Person', cardinality: 'one' },
    }),
    f('invitedAt', 'date'),
    f('joinedAt', 'date'),
  ],
};

/**
 * core:Notification — In-app notification record.
 */
const notification: SchemaDefinition = {
  '@id': 'core:Notification',
  '@type': 'trellis:Schema',
  version: VERSION,
  tier: 'core',
  subClassOf: 'core:Thing',
  label: 'Notification',
  icon: 'lucide:bell',
  fields: [
    f('recipientId', 'relation', {
      required: true,
      relation: { targetSchema: 'core:Person', cardinality: 'one' },
    }),
    f('orgId', 'relation', {
      relation: { targetSchema: 'core:Workspace', cardinality: 'one' },
    }),
    f('orgName', 'rich_text'),
    f('type', 'select', {
      required: true,
      selectOptions: [
        'invite_accepted',
        'invite_sent',
        'member_joined',
        'member_removed',
        'role_changed',
        'mention',
        'comment',
        'entity_updated',
        'system',
      ],
    }),
    f('title', 'title', { required: true }),
    f('message', 'rich_text', { required: true }),
    f('actionUrl', 'url'),
    f('icon', 'rich_text'),
    f('variant', 'select', {
      selectOptions: ['default', 'success', 'warning', 'destructive', 'info'],
    }),
    f('isRead', 'checkbox', { defaultValue: false }),
    f('actorId', 'relation', {
      relation: { targetSchema: 'core:Person', cardinality: 'one' },
    }),
    f('actorName', 'rich_text'),
    f('metadata', 'rich_text'),
    f('createdAt', 'date', { required: true }),
  ],
};

/**
 * core:Share — Entity-level access grant (for guest sharing).
 */
const share: SchemaDefinition = {
  '@id': 'core:Share',
  '@type': 'trellis:Schema',
  version: VERSION,
  tier: 'core',
  subClassOf: 'core:Thing',
  label: 'Share',
  icon: 'lucide:share-2',
  fields: [
    f('entityId', 'relation', { required: true }),
    f('entityType', 'select', { selectOptions: ['entity', 'collection'] }),
    f('userId', 'relation', {
      required: true,
      relation: { targetSchema: 'core:Person', cardinality: 'one' },
    }),
    f('orgId', 'relation', {
      relation: { targetSchema: 'core:Workspace', cardinality: 'one' },
    }),
    f('permission', 'select', {
      required: true,
      selectOptions: ['view', 'comment', 'edit'],
      defaultValue: 'view',
    }),
    f('sharedBy', 'relation', {
      relation: { targetSchema: 'core:Person', cardinality: 'one' },
    }),
    f('createdAt', 'date', { required: true }),
  ],
};

/**
 * core:Person — Actor entity.
 */
const person: SchemaDefinition = {
  '@id': 'core:Person',
  '@type': 'trellis:Schema',
  version: VERSION,
  tier: 'core',
  subClassOf: 'core:Thing',
  label: 'Person',
  icon: 'lucide:user',
  fields: [f('name', 'title', { required: true })],
};

/**
 * core:Workflow — Automation/process definition.
 */
const workflow: SchemaDefinition = {
  '@id': 'core:Workflow',
  '@type': 'trellis:Schema',
  version: VERSION,
  tier: 'core',
  subClassOf: 'core:Thing',
  label: 'Workflow',
  icon: 'lucide:git-branch',
  fields: [
    f('name', 'title', { required: true }),
    f('trigger', 'rich_text'),
    f('steps', 'multi_select'),
    f('active', 'checkbox'),
  ],
};

/**
 * core:WorkflowStep — Individual step within a pipeline or workflow.
 */
const workflowStep: SchemaDefinition = {
  '@id': 'core:WorkflowStep',
  '@type': 'trellis:Schema',
  version: VERSION,
  tier: 'system',
  subClassOf: 'core:Thing',
  label: 'Workflow Step',
  icon: 'lucide:list-checks',
  fields: [
    f('name', 'title', { required: true }),
    f('description', 'rich_text'),
    f('commands', 'json'),
    f('turbo', 'checkbox'),
    f('layer', 'select', {
      selectOptions: ['pre_flight', 'setup', 'implement', 'review', 'closure'],
    }),
  ],
};

/**
 * core:WorkflowEdge — Routing rule between steps.
 */
const workflowEdge: SchemaDefinition = {
  '@id': 'core:WorkflowEdge',
  '@type': 'trellis:Schema',
  version: VERSION,
  tier: 'system',
  subClassOf: 'core:Thing',
  label: 'Workflow Edge',
  icon: 'lucide:arrow-right',
  fields: [
    f('name', 'title', { required: true }),
    f('condition', 'rich_text'),
    f('status', 'select', {
      selectOptions: ['HANDOFF', 'CLARIFY', 'REJECT', 'BLOCKED', 'DECISION'],
      defaultValue: 'HANDOFF',
    }),
    f('from', 'relation', {
      relation: { targetSchema: 'core:WorkflowStep', cardinality: 'one' },
    }),
    f('to', 'relation', {
      relation: { targetSchema: 'core:WorkflowStep', cardinality: 'one' },
    }),
  ],
};

/**
 * core:WorkflowGate — Quality gate between steps.
 */
const workflowGate: SchemaDefinition = {
  '@id': 'core:WorkflowGate',
  '@type': 'trellis:Schema',
  version: VERSION,
  tier: 'system',
  subClassOf: 'core:Thing',
  label: 'Workflow Gate',
  icon: 'lucide:shield-check',
  fields: [
    f('name', 'title', { required: true }),
    f('type', 'select', {
      required: true,
      selectOptions: ['test', 'manual', 'ac_check', 'semantic_diff'],
    }),
    f('criteria', 'rich_text'),
    f('onFail', 'select', {
      selectOptions: ['stop', 'retry', 'route_to'],
      defaultValue: 'stop',
    }),
    f('step', 'relation', {
      relation: { targetSchema: 'core:WorkflowStep', cardinality: 'one' },
    }),
    f('retryStep', 'relation', {
      relation: { targetSchema: 'core:WorkflowStep', cardinality: 'one' },
    }),
    f('failRoute', 'relation', {
      relation: { targetSchema: 'core:WorkflowEdge', cardinality: 'one' },
    }),
  ],
};

/**
 * core:Agent — Agent role definition for the pipeline and harness.
 */
const agent: SchemaDefinition = {
  '@id': 'core:Agent',
  '@type': 'trellis:Schema',
  version: VERSION,
  tier: 'system',
  subClassOf: 'core:Thing',
  label: 'Agent',
  icon: 'lucide:bot',
  fields: [
    f('name', 'title', { required: true }),
    f('description', 'rich_text'),
    f('role', 'select', {
      required: true,
      selectOptions: [
        'strategist',
        'designer',
        'architect',
        'executor',
        'reviewer',
        'optimizer',
        'synthesist',
        'writer',
        'human',
      ],
    }),
    f('inbox', 'rich_text'),
    f('model', 'rich_text'),
    f('status', 'select', {
      defaultValue: 'active',
      selectOptions: ['active', 'inactive', 'deprecated'],
    }),
    f('capabilities', 'multi_select'),
    f('provider', 'rich_text'),
    f('systemPrompt', 'rich_text'),
    f('temperature', 'number'),
    f('maxTokens', 'number'),
    f('workflow', 'relation', {
      relation: { targetSchema: 'core:Workflow', cardinality: 'one' },
    }),
    f('tools', 'relation', {
      relation: { targetSchema: 'core:Tool', cardinality: 'many' },
    }),
  ],
};

/**
 * core:Tool — Tool definition for agents.
 */
const tool: SchemaDefinition = {
  '@id': 'core:Tool',
  '@type': 'trellis:Schema',
  version: VERSION,
  tier: 'system',
  subClassOf: 'core:Thing',
  label: 'Tool',
  icon: 'lucide:wrench',
  fields: [
    f('name', 'title', { required: true }),
    f('description', 'rich_text'),
    f('schema', 'json'),
    f('endpoint', 'url'),
  ],
};

/**
 * trellis:AgentRun — A single execution run of an agent.
 */
const agentRun: SchemaDefinition = {
  '@id': 'trellis:AgentRun',
  '@type': 'trellis:Schema',
  version: VERSION,
  tier: 'system',
  subClassOf: 'core:Thing',
  label: 'AgentRun',
  icon: 'lucide:play',
  fields: [
    f('startedAt', 'date', { required: true }),
    f('completedAt', 'date'),
    f('status', 'select', {
      required: true,
      selectOptions: ['running', 'plan_pending', 'paused', 'completed', 'failed', 'cancelled'],
      defaultValue: 'running',
    }),
    f('input', 'rich_text'),
    f('output', 'rich_text'),
    f('totalTokens', 'number'),
    f('promptTokens', 'number'),
    f('completionTokens', 'number'),
    f('maxRetries', 'number'),
    f('timeoutMs', 'number'),
    f('executedBy', 'relation', {
      relation: { targetSchema: 'core:Agent', cardinality: 'one' },
    }),
    f('hasPlan', 'relation', {
      relation: { cardinality: 'many' },
    }),
    f('usedTool', 'relation', {
      relation: { targetSchema: 'core:Tool', cardinality: 'many' },
    }),
    f('handoffTo', 'relation', {
      relation: { targetSchema: 'trellis:AgentRun', cardinality: 'many' },
    }),
    f('handoffFrom', 'relation', {
      relation: { targetSchema: 'trellis:AgentRun', cardinality: 'one' },
    }),
  ],
};

/**
 * trellis:DecisionTrace — A decision recorded during an agent run.
 */
const decisionTrace: SchemaDefinition = {
  '@id': 'trellis:DecisionTrace',
  '@type': 'trellis:Schema',
  version: VERSION,
  tier: 'system',
  subClassOf: 'core:Thing',
  label: 'DecisionTrace',
  icon: 'lucide:git-branch',
  fields: [
    f('toolName', 'title', { required: true }),
    f('timestamp', 'date', { required: true }),
    f('input', 'json'),
    f('output', 'rich_text'),
    f('rationale', 'rich_text'),
    f('alternatives', 'json'),
    f('belongsToRun', 'relation', {
      relation: { targetSchema: 'trellis:AgentRun', cardinality: 'one' },
    }),
    f('madeBy', 'relation', {
      relation: { targetSchema: 'core:Agent', cardinality: 'one' },
    }),
    f('relatedTo', 'relation', {
      relation: { cardinality: 'many' },
    }),
  ],
};

/**
 * trellis:WorkerPoolTask — A queued or active task in a WorkerPool.
 */
const workerPoolTask: SchemaDefinition = {
  '@id': 'trellis:WorkerPoolTask',
  '@type': 'trellis:Schema',
  version: VERSION,
  tier: 'system',
  subClassOf: 'core:Thing',
  label: 'WorkerPool Task',
  icon: 'lucide:list-queue',
  fields: [
    f('agentId', 'title', { required: true }),
    f('runId', 'title', { required: true }),
    f('input', 'rich_text'),
    f('status', 'select', {
      required: true,
      selectOptions: ['queued', 'running', 'paused', 'completed', 'failed', 'cancelled'],
      defaultValue: 'queued',
    }),
    f('queuedAt', 'date', { required: true }),
    f('startedAt', 'date'),
    f('completedAt', 'date'),
    f('error', 'rich_text'),
  ],
};

/**
 * trellis:DAGRun — A DAG workflow run, tracking step-level execution state.
 */
const dagRun: SchemaDefinition = {
  '@id': 'trellis:DAGRun',
  '@type': 'trellis:Schema',
  version: VERSION,
  tier: 'system',
  subClassOf: 'core:Thing',
  label: 'DAG Run',
  icon: 'lucide:workflow',
  fields: [
    f('workflowId', 'title', { required: true }),
    f('workflowName', 'title'),
    f('status', 'select', {
      required: true,
      selectOptions: ['running', 'completed', 'failed', 'cancelled'],
      defaultValue: 'running',
    }),
    f('steps', 'json'),
    f('startedAt', 'date', { required: true }),
    f('completedAt', 'date'),
  ],
};

/**
 * core:Handoff — Structured agent handoff between roles.
 */
const handoff: SchemaDefinition = {
  '@id': 'core:Handoff',
  '@type': 'trellis:Schema',
  version: VERSION,
  tier: 'system',
  subClassOf: 'core:Thing',
  label: 'Handoff',
  icon: 'lucide:arrow-left-right',
  fields: [
    f('name', 'title', { required: true }),
    f('status', 'select', {
      required: true,
      selectOptions: ['HANDOFF', 'CLARIFY', 'REJECT', 'BLOCKED', 'DECISION'],
    }),
    f('body', 'rich_text'),
    f('refs', 'multi_select'),
    f('timestamp', 'date'),
    f('from', 'relation', {
      relation: { targetSchema: 'core:Agent', cardinality: 'one' },
    }),
    f('to', 'relation', {
      relation: { targetSchema: 'core:Agent', cardinality: 'one' },
    }),
    f('re', 'relation', {
      relation: { cardinality: 'one' },
    }),
  ],
};

/**
 * trellis:Pipeline — Coordination definition composing workflows across agent roles.
 */
const pipeline: SchemaDefinition = {
  '@id': 'trellis:Pipeline',
  '@type': 'trellis:Schema',
  version: VERSION,
  tier: 'system',
  subClassOf: 'core:Thing',
  label: 'Pipeline',
  icon: 'lucide:git-merge',
  fields: [
    f('name', 'title', { required: true }),
    f('description', 'rich_text'),
    f('trigger', 'rich_text'),
    f('active', 'checkbox'),
    f('phases', 'relation', {
      relation: { targetSchema: 'trellis:PipelinePhase', cardinality: 'many' },
    }),
    f('workflow', 'relation', {
      relation: { targetSchema: 'core:Workflow', cardinality: 'many' },
    }),
  ],
};

/**
 * trellis:PipelinePhase — Ordered step in a pipeline linking an agent role to a workflow.
 */
const pipelinePhase: SchemaDefinition = {
  '@id': 'trellis:PipelinePhase',
  '@type': 'trellis:Schema',
  version: VERSION,
  tier: 'system',
  subClassOf: 'core:Thing',
  label: 'Pipeline Phase',
  icon: 'lucide:step-forward',
  fields: [
    f('name', 'title', { required: true }),
    f('description', 'rich_text'),
    f('order', 'number'),
    f('agentRole', 'select', {
      required: true,
      selectOptions: [
        'strategist',
        'designer',
        'architect',
        'executor',
        'reviewer',
        'optimizer',
        'synthesist',
        'writer',
        'human',
      ],
    }),
    f('workflow', 'relation', {
      relation: { targetSchema: 'core:Workflow', cardinality: 'one' },
    }),
  ],
};

/**
 * All core structural type schemas.
 * Auto-loaded into the kernel at construction time.
 */
export const CORE_ONTOLOGY: SchemaDefinition[] = [
  thing,
  record,
  document,
  event,
  collection,
  tag,
  workspace,
  app,
  member,
  notification,
  share,
  person,
  workflow,
  workflowStep,
  workflowEdge,
  workflowGate,
  agent,
  tool,
  agentRun,
  decisionTrace,
  workerPoolTask,
  dagRun,
  handoff,
  pipeline,
  pipelinePhase,
];

/**
 * Core ontology version.
 */
export const CORE_VERSION = VERSION;
