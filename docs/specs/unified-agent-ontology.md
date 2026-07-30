# Spec: Unified Agent & Workflow Ontology

**Status:** living · **Source of truth:** `src/core/ontology/core-ontology.ts`

## Context

The agent ontology is implemented as `SchemaDefinition` records in the kernel's
core ontology. All schemas below are registered at boot via `CORE_ONTOLOGY`
(array in `core-ontology.ts:704`). The graph kernel provides the runtime, the
agent harness (`src/core/agents/harness.ts`) loads agent entities from the graph,
and the registry system (`src/registry/`) publishes/shared packages against these
schemas.

## Design

All schemas use the `SchemaDefinition` / `f()` helper pattern. Fields use
`valueType` strings (`title`, `rich_text`, `select`, `multi_select`, `checkbox`,
`number`, `date`, `url`, `json`, `relation`). Relations are defined inline via
`relation: { targetSchema, cardinality }`.

### 1. Workflow Ontology

#### `core:Workflow` — automation / process definition

```typescript
const workflow: SchemaDefinition = {
  '@id': 'core:Workflow',
  '@type': 'trellis:Schema',
  version: '1.0.0',
  tier: 'core',
  subClassOf: 'core:Thing',
  label: 'Workflow',
  icon: 'lucide:git-branch',
  fields: [
    f('name', 'title', { required: true }),
    f('trigger', 'rich_text'),
    f('steps', 'multi_select'),         // string array, NOT a relation
    f('active', 'checkbox'),
  ],
};
```

**Note:** `steps` is a `multi_select` string array (simple convention), not a
relation to `WorkflowStep`. Workflow→Step/Edge/Gate relations are proposed but
not implemented (see Open Questions).

#### `core:WorkflowStep` — individual step within a workflow

```typescript
const workflowStep: SchemaDefinition = {
  '@id': 'core:WorkflowStep',
  '@type': 'trellis:Schema',
  version: '1.0.0',
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
```

#### `core:WorkflowEdge` — routing rule between steps

```typescript
const workflowEdge: SchemaDefinition = {
  '@id': 'core:WorkflowEdge',
  '@type': 'trellis:Schema',
  version: '1.0.0',
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
```

**Note:** Edge→Step relations exist (`from`/`to`), but there is no
Workflow→edges or WorkflowStep→edges relation. Edges are standalone entities.

#### `core:WorkflowGate` — quality gate between steps

```typescript
const workflowGate: SchemaDefinition = {
  '@id': 'core:WorkflowGate',
  '@type': 'trellis:Schema',
  version: '1.0.0',
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
```

**Note:** Gate→Step/Edge relations exist, but no inverse from Workflow.

#### DAG Runtime schemas

##### `trellis:DAGRun` — DAG workflow run tracking step-level execution state

```typescript
const dagRun: SchemaDefinition = {
  '@id': 'trellis:DAGRun',
  '@type': 'trellis:Schema',
  version: '1.0.0',
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
```

##### `trellis:WorkerPoolTask` — queued or active task in a WorkerPool

```typescript
const workerPoolTask: SchemaDefinition = {
  '@id': 'trellis:WorkerPoolTask',
  '@type': 'trellis:Schema',
  version: '1.0.0',
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
```

### 2. Pipeline Type

`trellis:Pipeline` composes `core:Workflow` entities into a coordinated agent
sequence. Unlike `core:Workflow` (which defines a single agent's procedure), a
Pipeline connects multiple workflows across agent roles.

#### `trellis:Pipeline`

```typescript
const pipeline: SchemaDefinition = {
  '@id': 'trellis:Pipeline',
  '@type': 'trellis:Schema',
  version: '1.0.0',
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
```

#### `trellis:PipelinePhase`

```typescript
const pipelinePhase: SchemaDefinition = {
  '@id': 'trellis:PipelinePhase',
  '@type': 'trellis:Schema',
  version: '1.0.0',
  tier: 'system',
  subClassOf: 'core:Thing',
  label: 'Pipeline Phase',
  icon: 'lucide:step-forward',
  fields: [
    f('name', 'title', { required: true }),
    f('description', 'rich_text'),
    f('order', 'number'),
    f('agentRole', 'select', {          // string enum, NOT a relation to Agent
      required: true,
      selectOptions: [
        'strategist', 'designer', 'architect', 'executor', 'reviewer',
        'optimizer', 'synthesist', 'writer', 'human',
      ],
    }),
    f('workflow', 'relation', {
      relation: { targetSchema: 'core:Workflow', cardinality: 'one' },
    }),
  ],
};
```

#### Pipeline composition diagram

```
trellis:Pipeline
  ├── phases → trellis:PipelinePhase[] (ordered)
  │              ├── agentRole: "strategist" → workflow: strategic-research
  │              ├── agentRole: "architect"  → workflow: design-to-spec
  │              ├── agentRole: "executor"   → workflow: feature-development
  │              └── agentRole: "reviewer"   → workflow: quality-gate
  └── workflow → core:Workflow[] (referenced workflows)
```

### 3. Agent Ontology

#### `core:Agent` — agent role definition

```typescript
const agent: SchemaDefinition = {
  '@id': 'core:Agent',
  '@type': 'trellis:Schema',
  version: '1.0.0',
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
        'strategist', 'designer', 'architect', 'executor', 'reviewer',
        'optimizer', 'synthesist', 'writer', 'human',
      ],
    }),
    f('inbox', 'rich_text'),
    f('model', 'rich_text'),
    f('status', 'select', {
      defaultValue: 'active',
      selectOptions: ['active', 'inactive', 'deprecated'],
    }),
    f('capabilities', 'multi_select'),
    f('workflow', 'relation', {
      relation: { targetSchema: 'core:Workflow', cardinality: 'one' },
    }),
  ],
};
```

**Gap:** `AgentDef` (the runtime TS interface in `types.ts:21`) has additional
fields not in the schema: `provider`, `systemPrompt`, `tools: string[]`,
`temperature`, `maxTokens`. The schema also lacks a `tools` relation to
`core:Tool`. These should be added to align the ontology with the runtime type.

#### `core:Tool` — tool definition for agents

```typescript
const tool: SchemaDefinition = {
  '@id': 'core:Tool',
  '@type': 'trellis:Schema',
  version: '1.0.0',
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
```

**Current state:** `core:Tool` is a standalone entity — no relations to Agent or
any other schema. The `AgentDef.tools: string[]` is a list of tool IDs, not a
graph relation. This means tools cannot be queried via TQL traversal from an
agent.

##### Tool ontology considerations

1. **Bidirectional relation (proposed):** Add `tools` relation to `core:Agent`
   (`relation: { targetSchema: 'core:Tool', cardinality: 'many' }`) and an
   optional `usedBy` inverse on `core:Tool`. This makes `TQL.agent(id).tools`
   work natively.

2. **Tool schemas as package schemas:** Tools in the registry should carry their
   JSON schema as the `schema` field. The `endpoint` field supports both HTTP
   URLs and `package://` URIs for local MCP tools.

3. **Tool categories:** Consider adding a `category` select field (e.g.,
   `read`, `write, `search`, `execute`, `communicate`) for UI filtering, though
   this can also be derived from the schema shape.

4. **Versus MCP tools:** `core:Tool` entities represent tool *definitions*
   (what the tool is, what schema it expects, where it lives). MCP tool
   invocation records live in `trellis:DecisionTrace`.

#### `core:Handoff` — structured agent handoff between roles

```typescript
const handoff: SchemaDefinition = {
  '@id': 'core:Handoff',
  '@type': 'trellis:Schema',
  version: '1.0.0',
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
      relation: { cardinality: 'one' },   // generic, any entity
    }),
  ],
};
```

### 4. Execution Trace Schemas

#### `trellis:AgentRun` — single execution run of an agent

```typescript
const agentRun: SchemaDefinition = {
  '@id': 'trellis:AgentRun',
  '@type': 'trellis:Schema',
  version: '1.0.0',
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
      relation: { cardinality: 'many' },  // generic, any entity
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
```

#### `trellis:DecisionTrace` — decision recorded during an agent run

```typescript
const decisionTrace: SchemaDefinition = {
  '@id': 'trellis:DecisionTrace',
  '@type': 'trellis:Schema',
  version: '1.0.0',
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
      relation: { cardinality: 'many' },  // generic, any entity
    }),
  ],
};
```

### 5. Cross-Entity Relationship Diagram

```
core:Workflow ── steps: multi_select (strings, NOT a relation)
    ↑ workflow (Agent→Workflow)
    │
core:Agent ── tools: string[] (IDs, NOT a relation — proposed: relation to core:Tool)
    │
    ├── executedBy (AgentRun→Agent)
    ├── madeBy (DecisionTrace→Agent)
    ├── from (Handoff→Agent)
    └── to (Handoff→Agent)
    │
core:Tool ── standalone (proposed: usedBy inverse from Agent)
    ↑ usedTool (AgentRun→Tool)

core:Handoff ── from→Agent, to→Agent, re→any

trellis:Pipeline
    ├── phases → trellis:PipelinePhase[]  (ordered)
    │              └── agentRole: string enum, workflow→core:Workflow
    └── workflow → core:Workflow[]        (referenced workflows)

trellis:PipelinePhase ── agentRole: string enum (NOT a relation to Agent)

trellis:AgentRun ── executedBy→Agent, usedTool→Tool, handoffTo→AgentRun, handoffFrom→AgentRun
    ↑ belongsToRun (DecisionTrace→AgentRun)

trellis:DecisionTrace ── belongsToRun→AgentRun, madeBy→Agent

trellis:DAGRun ── standalone, tracks workflow execution state

trellis:WorkerPoolTask ── standalone, tracks queued agent tasks
```

### 6. Registry System

#### Package format

Registry packages are JSON-LD entities matching the ontology schemas above.
The `PackageManifest` interface:

```typescript
interface PackageManifest {
  name: string;           // e.g. "@trellis.computer/agents/strategist"
  version: string;        // semver
  content: string;        // content hash
  schemas: RegistrySchemaEntry[];  // schema @id + @type + version
  depends?: Record<string, string>;  // dependency constraints
}
```

**Gap:** There is no agent-specific extension of `PackageManifest`. For agent
packages, the manifest should carry optional fields: `model`, `provider`,
`systemPrompt`, `tools` (list of package references), `capabilities`,
`temperature`, `maxTokens`.

#### Current CLI surface

| Command | Status | Notes |
|---------|--------|-------|
| `trellis add <type> <name>` | ✅ Implemented | Registers schemas; does NOT create entities |
| `trellis list [type]` | ✅ Implemented | Reads lockfile |
| `trellis remove <type> <name>` | ✅ Implemented | Unregisters schemas |
| `trellis update [scope]` | ✅ Implemented | Re-resolves deps |
| `trellis registry migrate [scope]` | ✅ Implemented | Schema version migrations |

#### Gaps

1. **`handleAdd` never creates entities** — only registers schemas via
   `kernel.createOntology()`. For `agent` type, it should create a `core:Agent`
   entity with the package's agent config. For `workflow` type, a `core:Workflow`
   entity. Etc.

2. **No `trellis publish init <type> <name>`** — `scaffoldPackage` creates a
   bare package body with a placeholder schema. No type-specific scaffolding
   (e.g., `publish init agent` should populate `model`, `provider`,
   `systemPrompt`, `tools`, `capabilities`).

3. **No `trellis publish` command** — `publishPackage` exists but has no CLI
   binding.

#### Proposed agent package manifest

```json
{
  "name": "@trellis.computer/agents/strategist",
  "version": "0.1.0",
  "agent": {
    "model": "claude-sonnet-4-20250514",
    "provider": "anthropic",
    "systemPrompt": "You are a strategic planning agent...",
    "tools": ["@trellis.computer/tools/research", "@trellis.computer/tools/plan"],
    "capabilities": ["research", "planning", "decision-making"],
    "temperature": 0.3,
    "maxTokens": 4096
  },
  "schemas": [
    {
      "@id": "agent:strategist",
      "@type": "core:Agent",
      "version": "0.1.0"
    }
  ]
}
```

On `trellis add agent strategist`:
1. Resolve and download the package
2. Register its schemas (current behavior)
3. Create a `core:Agent` entity with fields from `agent` block
4. Link any tool dependencies by resolving their packages

### 7. Open Questions

1. **Workflow→steps relation:** Should `core:Workflow.steps` be upgraded from
   `multi_select` (string array) to a relation to `core:WorkflowStep`?
   **Current thinking:** yes, but needs a migration path for existing workflows.
   The `multi_select` convention works for simple cases; relations enable TQL
   traversal.

2. **Agent→tools relation:** Should `core:Agent` get a `tools` relation to
   `core:Tool`? **Decision: yes** — this is the most impactful single change.
   It enables `TQL.agent(id).tools` and makes the graph the source of truth for
   agent capabilities. The current `AgentDef.tools: string[]` can be derived
   from the relation.

3. **PipelinePhase.agentRole as relation:** Currently an enum string. Should it
   become a relation to `core:Agent`? This would enable reusing the same agent
   definition across phases. On the other hand, a phase defines *what role to
   run*, not *which specific agent instance* — the agent is resolved at
   runtime. **Deferred** — revisit when pipeline execution needs dynamic agent
   resolution.

4. **Schema tier:** `core:Agent` and `core:Handoff` are `system` tier
   (configurable with releases), not `core` tier (kernel-locked). This allows
   them to evolve without kernel changes.

5. **Registry entity creation:** Should `trellis add agent` auto-create graph
   entities, or should that be a separate step? **Decision: auto-create** —
   the install should produce a usable agent, not just a schema registration.
   The entity creation is idempotent (upsert by `@id`).
