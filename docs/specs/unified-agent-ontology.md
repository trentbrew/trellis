# Spec: Unified Agent & Workflow Ontology

**Status:** draft · **Parent:** unified-agent-architecture.md · **Issues:** N/A

## Context

The agent infrastructure has three fragmented layers:

1. **Workflow definitions** live as markdown files in `.devin/workflows/` and `.trellis/agents/workflows/`. They are prompt-level reference guides with no machine-readable format, no execution runtime, and no graph integration.

2. **Agent role definitions** live in `.cursor/skills/trellis-agent-*.md` files. They are IDE-specific, not versionable as data, and not queryable via TQL.

3. **Handoff protocol** is serialized as YAML footers in issue descriptions. The `HANDOFF_ROLES` and `HANDOFF_STATUSES` constants in `src/protocol/envelope.ts` are hardcoded, not schema-driven.

Meanwhile, the graph kernel already has:
- A mature ontology system (`core:Thing`, `core:Record`, etc.) with `@id`/`@type` JSON-LD patterns
- An agent harness that loads agents from the graph (`src/core/agents/harness.ts`)
- A `core:Workflow` schema that is defined but unused (only has `name`, `trigger`, `steps`, `active`)
- Orchestration types (`Route`, `SupervisorConfig`, `Orchestrator`) that are skeletal

The result: agents, workflows, and handoffs exist as **code and files** rather than **graph entities**. They cannot be queried, composed, versioned, or shared through the graph.

## Goal

Make agents, workflows, and handoffs **first-class graph entities** with formal ontologies, and establish `@trellis.computer` as the npm registry for community-published agent ecosystem packages.

### Objectives

1. **Workflow ontology** — Extend the existing `core:Workflow` pattern with structured step/edge/gate entities via a new `trellis:Pipeline` type. Workflows become queryable, composable, and executable.
2. **Agent ontology** — Formalize `core:Agent`, `core:Tool`, and `core:Handoff` as graph entities with proper schemas.
3. **Registry system** — Package workflows, agents, ontologies, and adapters as npm packages under `@trellis.computer`.
4. **Pipeline-as-data** — Replace IDE-specific skill files with graph-stored agent and pipeline definitions.
5. **Documentation strategy** — Bake doc gates, freshness checks, and ownership into the pipeline and CI.

## Scope

### In scope
- New ontology schemas: `core:WorkflowStep`, `core:WorkflowEdge`, `core:WorkflowGate`, `core:Agent`, `core:Tool`, `core:Handoff`
- New orchestration type: `trellis:Pipeline` (composes `core:Workflow` entities)
- Schema registration via `defineType()` and `kernel.createOntology()`
- CLI commands: `trellis workflow list/show/run`, `trellis add`, `trellis list`, `trellis remove`
- npm registry packages under `@trellis.computer`
- Migration of pipeline role definitions from `.cursor/skills/` to graph entities
- TQL queries for agent/workflow/handoff lookups
- Doc health infrastructure: link checking, freshness detection, ownership enforcement
- `documentation` issue label with its own workflow

### Out of scope
- Runtime workflow execution engine (Phase 2, separate spec)
- Full pipeline orchestration replacement (Phase 3, separate spec)
- Affordance formalization (deferred — let the UI work drive the schema)
- Governance policy for agent configurations
- IDE adapter generation (covered by unified-agent-architecture.md)

## Design

### 1. Workflow Ontology

Extend the existing `core:Workflow` schema (currently: `name`, `trigger`, `steps`, `active`) with structured step, edge, and gate entities. **Do not mutate `core:Workflow`.** Introduce a new `trellis:Pipeline` type that composes `core:Workflow` entities.

#### `core:Workflow` (extended, unchanged existing fields)

```typescript
defineType('Workflow', {
  name: z.string().min(1),
  description: z.string().optional(),
  trigger: z.string().optional(),
  active: z.boolean().default(true),
  turbo: z.enum(['none', 'partial', 'all']).default('none'),
}, {
  title: 'name',
  label: 'Workflow',
  tier: 'core',
  relations: {
    steps: rel(() => WorkflowStep, 'many'),
    edges: rel(() => WorkflowEdge, 'many'),
    gates: rel(() => WorkflowGate, 'many'),
  },
})
```

The existing `steps: multi_select` field is replaced by the proper relation. Any existing data is migrated by the `trellis agent migrate` CLI command from the unified-agent-architecture spec.

#### `core:WorkflowStep`

```typescript
defineType('WorkflowStep', {
  name: z.string().min(1),
  description: z.string().optional(),
  commands: z.array(z.string()).optional(),
  turbo: z.boolean().default(false),
  layer: z.enum(['pre_flight', 'setup', 'implement', 'review', 'closure']).optional(),
}, {
  title: 'name',
  label: 'Workflow Step',
  tier: 'system',
  relations: {
    subworkflow: rel(() => Workflow, 'one').optional(),
  },
})
```

#### `core:WorkflowEdge`

```typescript
defineType('WorkflowEdge', {
  name: z.string().min(1),
  condition: z.string().optional(),
  status: z.enum(['HANDOFF', 'CLARIFY', 'REJECT', 'BLOCKED', 'DECISION']).default('HANDOFF'),
}, {
  title: 'name',
  label: 'Workflow Edge',
  tier: 'system',
  relations: {
    from: rel(() => WorkflowStep, 'one'),
    to: rel(() => WorkflowStep, 'one'),
  },
})
```

#### `core:WorkflowGate`

```typescript
defineType('WorkflowGate', {
  name: z.string().min(1),
  type: z.enum(['test', 'manual', 'ac_check', 'semantic_diff']),
  criteria: z.string().optional(),
  onFail: z.enum(['stop', 'retry', 'route_to']).default('stop'),
}, {
  title: 'name',
  label: 'Workflow Gate',
  tier: 'system',
  relations: {
    step: rel(() => WorkflowStep, 'one'),
    retryStep: rel(() => WorkflowStep, 'one').optional(),
    failRoute: rel(() => WorkflowEdge, 'one').optional(),
  },
})
```

### 2. Pipeline Type

`trellis:Pipeline` is a new orchestration type that composes `core:Workflow` entities into a coordinated agent sequence. Unlike `core:Workflow` (which defines a single agent's procedure), a `Pipeline` connects multiple workflows across agent roles.

```typescript
defineType('Pipeline', {
  name: z.string().min(1),
  description: z.string().optional(),
  trigger: z.string().optional(),
  active: z.boolean().default(true),
}, {
  title: 'name',
  label: 'Pipeline',
  tier: 'system',
  relations: {
    phases: rel(() => PipelinePhase, 'many'),
    workflow: rel(() => Workflow, 'many'),
  },
})

defineType('PipelinePhase', {
  name: z.string().min(1),
  description: z.string().optional(),
  order: z.number(),
  agentRole: z.enum([
    'strategist', 'designer', 'architect', 'executor', 'reviewer',
    'optimizer', 'synthesist', 'writer', 'human',
  ]),
  workflow: rel(() => Workflow, 'one'),
}, {
  title: 'name',
  label: 'Pipeline Phase',
  tier: 'system',
})
```

#### Pipeline → Workflow composition

```
trellis:Pipeline
  ├── phases → core:PipelinePhase[] (ordered)
  │              ├── agentRole: "strategist" → workflow: strategic-research
  │              ├── agentRole: "architect" → workflow: design-to-spec
  │              ├── agentRole: "executor" → workflow: feature-development
  │              └── agentRole: "reviewer" → workflow: quality-gate
  └── workflow → core:Workflow[] (referenced workflows)
```

A pipeline defines **who does what, in what order, and how they hand off**. The edge/routing logic lives in the individual `core:Workflow` schemas. The pipeline is the coordination layer.

#### Why not mutate `core:Workflow`?

- `core:Workflow` currently has `steps: multi_select` (string array) — a simple convention. Replacing it with structured relations is a breaking change.
- A pipeline is a **composition of workflows**, not a workflow itself. Conflating the two leads to schemas that try to be both a single-agent procedure and a multi-agent orchestration.
- Existing `core:Workflow` entities (even if few) are preserved. The new type is additive.
- The migration path is simpler: migrate `core:Workflow` relations, introduce `trellis:Pipeline` alongside it.

### 3. Agent Ontology

Formalize agents, tools, and handoffs as graph entities. These map directly to the existing `AgentDef`, `ToolDef`, and `HandoffEnvelope` types in `src/core/agents/` and `src/protocol/envelope.ts`.

#### `core:Agent`

```typescript
defineType('Agent', {
  name: z.string().min(1),
  description: z.string().optional(),
  role: z.enum([
    'strategist', 'designer', 'architect', 'executor', 'reviewer',
    'optimizer', 'synthesist', 'writer', 'human'
  ]),
  inbox: z.string().optional(),         // TQL query for discovering work
  model: z.string().optional(),          // LLM model for model policy
  status: z.enum(['active', 'inactive', 'deprecated']).default('active'),
  capabilities: z.array(z.string()).optional(),
}, {
  title: 'name',
  label: 'Agent',
  tier: 'system',
  relations: {
    workflow: rel(() => Workflow, 'one').optional(),
    tools: rel(() => Tool, 'many'),
  },
})
```

#### `core:Tool`

```typescript
defineType('Tool', {
  name: z.string().min(1),
  description: z.string().optional(),
  schema: z.string().optional(),        // JSON schema as string
  endpoint: z.string().url().optional(), // HTTP endpoint
}, {
  title: 'name',
  label: 'Tool',
  tier: 'system',
})
```

#### `core:Handoff`

```typescript
defineType('Handoff', {
  name: z.string().min(1),
  status: z.enum(['HANDOFF', 'CLARIFY', 'REJECT', 'BLOCKED', 'DECISION']),
  body: z.string().optional(),
  refs: z.array(z.string()).optional(),
  timestamp: z.string().datetime().optional(),
}, {
  title: 'name',
  label: 'Handoff',
  tier: 'system',
  relations: {
    from: rel(() => Agent, 'one'),
    to: rel(() => Agent, 'one'),
    re: rel(/* Issue or any entity */, 'one').optional(),
  },
})
```

#### Relationship to existing types

| Existing type | Maps to | Notes |
|---|---|---|
| `AgentDef` (`src/core/agents/types.ts`) | `core:Agent` | 1:1 mapping — `AgentHarness` already loads from graph |
| `ToolDef` (`src/core/agents/types.ts`) | `core:Tool` | 1:1 mapping |
| `HandoffEnvelope` (`src/protocol/envelope.ts`) | `core:Handoff` | `from`/`to`/`re`/`status`/`body` map directly |
| `HANDOFF_ROLES` constant | `Agent.role` selectOptions | 9 roles become schema field options |
| `HANDOFF_STATUSES` constant | `Handoff.status` selectOptions | 5 statuses become schema field options |
| `DecisionTrace` (`src/core/agents/types.ts`) | Already a graph entity | No change needed |

### 4. Registry System

Package ecosystem artifacts as npm packages under `@trellis.computer`. The `trellis` CLI provides the entry point for discovery and installation.

#### Registry packages

| Package | Contents | Example |
|---------|----------|---------|
| `@trellis.computer/workflows` | Workflow definitions (JSON-LD) | `feature-development`, `bug-fix`, `release` |
| `@trellis.computer/agents` | Agent role definitions | `strategist`, `executor`, `reviewer` |
| `@trellis.computer/ontologies` | Schema definitions | `design-system`, `project-management` |
| `@trellis.computer/adapters` | IDE adapter generators | `cursor`, `devin`, `claude` |
| `@trellis.computer/projections` | Self-contained renderer definitions | `kanban`, `table`, `graph` |
| `@trellis.computer/themes` | Visual contracts (fonts, colors, tokens) | `trellis-dark`, `trellis-light` |
| `@trellis.computer/affordance` | Whole-app bundles (contracts + ontologies + projections) | `trellis-admin`, `trellis-studio` |

The three UI package categories are intentionally separate:

- **Themes** define the visual contract — fonts, colors, tokens, animations — shared by everything that renders
- **Projections** define a rendering contract — what can project onto them, what field types they require — and let the theme dictate how they look and feel
- **Affordances** define whole applications — they bundle their own contracts, ontologies, and projections; the user's theme still controls the visual layer

This separation ensures that changing a theme doesn't break a projection's rendering contract, and that projections from different sources can coexist under the same theme.

#### Package format

Each package exports JSON-LD entities matching the ontology schemas:

```json
{
  "$schema": "https://trellis.computer/schemas/workflow-v1.json",
  "@id": "workflow:feature-development",
  "@type": "core:Workflow",
  "name": "Feature Development",
  "steps": [
    {
      "@id": "workflow:feature-development/pre-flight",
      "@type": "core:WorkflowStep",
      "name": "Pre-flight",
      "commands": ["trellis status", "trellis garden search -k \"<keyword>\""],
      "turbo": true,
      "layer": "pre_flight"
    }
  ],
  "edges": [...],
  "gates": [...]
}
```

#### CLI commands

```bash
trellis add workflow feature-development   # install from @trellis.computer/workflows
trellis add agent strategist               # install from @trellis.computer/agents
trellis add ontology design-system         # install from @trellis.computer/ontologies
trellis add adapter cursor                 # install from @trellis.computer/adapters
trellis add projection kanban              # install from @trellis.computer/projections
trellis add theme trellis-dark             # install from @trellis.computer/themes
trellis add affordance trellis-admin       # install from @trellis.computer/affordance

trellis list workflows                     # list installed workflows
trellis list agents                        # list installed agents
trellis list ontologies                    # list installed ontologies
trellis list themes                        # list installed themes
trellis list projections                   # list installed projections
trellis list affordances                   # list installed affordances

trellis remove workflow feature-development # uninstall
```

#### Installation flow

1. `trellis add workflow feature-development`
2. CLI resolves `@trellis.computer/workflows-feature-development` (or scoped subpath)
3. Downloads package, extracts JSON-LD entities
4. Registers entities in the local graph via entity creation
5. Updates `.trellis/agent-manifest.json` (unified architecture manifest)

### 5. Documentation Strategy

Documentation health is infrastructure, not a task-level check-in. It has its own lifecycle (draft → review → publish → freshness check) and should be enforced by the pipeline and CI.

#### 5.1 Unify doc locations

```
docs/
├── adr/               # all ADRs (move from .trellis/adr/)
├── architecture/       # ARCHITECTURE.md, DESIGN.md, PILLARS.md
├── workflows/          # feature-development.md, documentation-development.md
├── agents/             # AGENTS.md, agent-context.json
└── reference/          # generated API docs, CLI reference
```

Delete duplicates. Symlink if tools need old paths (e.g., `.cursor/skills/` looking for `.trellis/adr/`).

#### 5.2 Doc gates in the feature workflow

Extend `.trellis/agents/workflows/feature-development.md` Phase 3:

```markdown
### Phase 3: Review

10. Before requesting review, verify acceptance criteria:

    ```bash
    trellis issue check <issue-id>
    ```

11. **Check documentation health:**

    ```bash
    trellis doc check <issue-id>   # validates links, freshness, ownership
    ```

    Add `--ac "doc:trellis doc check <issue-id>"` to issue creation template.
```

#### 5.3 Automate freshness & link health

Add a `pnpm doc:check` script that:
- Validates all `[[wiki-links]]` resolve
- Flags ADRs older than 6 months without `superseded-by` or `reviewed:` frontmatter
- Runs markdown-link-check on all `.md`
- Fails CI if broken

#### 5.4 Generate, don't hand-write, reference docs

- CLI reference → generate from `trellis --help` / command metadata
- API surface → generate from TypeScript exports (TypeDoc or custom)
- ADR index → generate from frontmatter (already partially done in `README.md`)

#### 5.5 Ownership frontmatter

Every doc file gets explicit ownership:

```markdown
---
owner: "@agent-architect"
reviewer: "@agent-reviewer"
review-cycle: "quarterly"
supersedes: ["0001", "0002"]
superseded-by: "0005"
---
```

The `owner` drafts and maintains; the `reviewer` owns freshness. This mirrors the pipeline's `author` → `reviewer` handoff pattern.

#### 5.6 Documentation issue workflow

Add a `documentation` issue label with its own workflow: `.trellis/agents/workflows/documentation-development.md`.

```markdown
---
description: Repeatable documentation procedure from draft to published.
---

# Documentation Development Workflow

## Steps

1. Define audience (agent, human, or both)
2. Link to related code/ADR/issue
3. Write draft with ownership frontmatter
4. Review for accuracy and freshness
5. Publish to unified docs location
6. Add freshness date (quarterly review cycle)
```

#### 5.7 Triage: detect stale docs at the triage gate

In the feature development workflow's pre-flight phase, check if the issue has documentation-related acceptance criteria. If it does, the `doc:check` gate becomes mandatory before closure.

---

## Implementation Plan

### Phase 1: Ontology Schemas

1. Extend `core:Workflow` with relations to `WorkflowStep`, `WorkflowEdge`, `WorkflowGate`
2. Define `trellis:Pipeline` and `core:PipelinePhase` via `defineType()`
3. Define `core:Agent`, `core:Tool`, `core:Handoff` via `defineType()`
4. Register all schemas in kernel (`system` tier for Agent/Handoff/Workflow types, `core` tier for the base Workflow)
5. Write TQL queries for common lookups
6. Unit tests for schema validation

**Dependencies:** None
**Estimated:** 2-3 days

### Phase 2: Workflow Runtime

1. Implement `trellis workflow list/show/run` CLI
2. Implement step execution (run commands, check gates)
3. Implement edge routing (evaluate conditions, route to next step/agent)
4. Wire to handoff envelope system
5. Integration tests

**Dependencies:** Phase 1
**Estimated:** 3-5 days

### Phase 3: Pipeline-as-Data

1. Migrate pipeline role definitions from `.cursor/skills/` to graph entities
2. Replace Cursor stop hook with kernel-native orchestration
3. `trellis pipeline start` runs the full strategist → reviewer flow from graph data
4. E2E tests

**Dependencies:** Phase 2
**Estimated:** 5-7 days

### Phase 4: Registry System

1. Set up `@trellis.computer` npm org packages
2. Implement `trellis add/list/remove` CLI
3. Create initial workflow/agent packages
4. Documentation

**Dependencies:** Phase 1
**Estimated:** 3-5 days

### Phase 5: Documentation Infrastructure

1. `trellis doc check` CLI command
2. `pnpm doc:check` script in CI
3. `documentation` issue label and workflow file
4. Doc location unification (moves, symlinks)
5. Generated reference docs (CLI, API, ADR index)

**Dependencies:** Phase 1 (for `trellis doc check` CLI)
**Estimated:** 3-4 days

## Open Questions

1. **Schema tier:** Should `core:Agent` and `core:Handoff` be `core` tier (immutable, shipped with kernel) or `system` tier (versioned with releases, mutable)? **Decision: system** — they're configurable, not kernel-locked.

2. **Registry naming:** `@trellis.computer/workflows` as a single package with all workflows, or per-workflow packages? **Decision: Single package** — per-workflow packages create npm sprawl.

3. **`core:Workflow` vs new type:** The current `core:Workflow` has `steps: multi_select` (string array). Should we replace it with structured relations, or add `trellis:Pipeline` as a new type? **Decision: Add `trellis:Pipeline` as a new type.** Preserves backward compat, lets Pipeline compose Workflows.

4. **Affordance formalization:** Should affordances get a formal `core:Affordance` schema, or remain a design-level concept? **Decision: Defer.** Let the UI work drive the formalization.

5. **Themes/projections/affordances split:** Should these be separate `@trellis.computer` packages? **Decision: Yes** — `@trellis.computer/themes`, `@trellis.computer/projections`, `@trellis.computer/affordance` with the contract boundaries described in the registry design.

## Success Criteria

- [ ] All new schemas defined via `defineType()` and registered in kernel
- [ ] `trellis:Pipeline` composes `core:Workflow` entities for multi-agent orchestration
- [ ] Workflows are queryable via TQL
- [ ] Agents are stored as graph entities with proper schemas
- [ ] Handoffs are auditable graph entities
- [ ] `trellis add` installs packages from `@trellis.computer`
- [ ] Pipeline definitions live in the graph, not in IDE-specific files
- [ ] `trellis doc check` validates links, freshness, and ownership
- [ ] `pnpm doc:check` fails CI on broken links/stale ADRs
- [ ] `documentation` issue label with its own workflow
- [ ] No regression in existing agent functionality
- [ ] Documentation updated with new ontology and registry workflow