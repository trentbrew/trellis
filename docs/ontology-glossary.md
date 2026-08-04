# Trellis ontology glossary

Canonical vocabulary for kernel types, product surfaces, and demo-only names.
Use these terms consistently in code, issues, and docs — especially where English
words collide (`collection`, `framework`, `thing`).

## Core kernel (shipped, `tier: core`)

Immutable structural types in `src/core/ontology/core-ontology.ts`. Apps extend
these; they do not replace them.

| Term | `@id` | Meaning |
|------|-------|---------|
| **Thing** | `core:Thing` | Root identity. Every entity is a Thing (`id`, timestamps, optional `tags`). |
| **Record** | `core:Record` | Data row with `title`, `description`, `status`. Base for most user schemas. |
| **Document** | `core:Document` | Rich content (`content`, `mimeType`, `fileUrl`). |
| **Event** | `core:Event` | Time-bound row (`startDate`, `endDate`, …). |
| **Collection** | `core:Collection` | **Container metadata** in the graph: title, icon, and a `recordType` relation pointing at which Record subtype lives in the bucket. Not the same as a CMS table or a list API. |
| **Tag** | `core:Tag` | Classification entity (kernel sense). |

**Hierarchy (simplified):** `Thing` → `Record` → (`Document` \| `Event` \| *user types*).

## Agent / Workflow / Pipeline (`tier: system`)

Shipped with the kernel but versioned — not immutable like `core` tier types.
Defined in the same `core-ontology.ts`.

| Term | `@id` | Meaning |
|------|-------|---------|
| **Workflow** | `core:Workflow` | Automation/process definition. Fields: `name`, `trigger`, `steps` (multi_select string array), `active`. Not yet connected via relations to WorkflowStep/Edge/Gate. |
| **Workflow Step** | `core:WorkflowStep` | Individual step within a workflow. Has optional `commands` (JSON array), `turbo` flag, and `layer` (pre_flight, setup, implement, review, closure). |
| **Workflow Edge** | `core:WorkflowEdge` | Routing rule with `condition`, `status` (HANDOFF/CLARIFY/REJECT/BLOCKED/DECISION), and `from`/`to` relations to WorkflowStep. |
| **Workflow Gate** | `core:WorkflowGate` | Quality gate with `type` (test/manual/ac_check/semantic_diff), `onFail` (stop/retry/route_to), and relations to Step, retryStep, failRoute (Edge). |
| **Agent** | `core:Agent` | Agent role definition. Fields: `name`, `description`, `role` (enum), `inbox` (TQL query), `model`, `status`, `capabilities` (multi_select), `workflow` (relation). **Gap:** lacks `provider`, `systemPrompt`, `tools` (relation), `temperature`, `maxTokens` present in `AgentDef` interface. |
| **Tool** | `core:Tool` | Tool definition for agents. Fields: `name`, `description`, `schema` (JSON), `endpoint` (URL). Standalone — no relation to Agent yet. `AgentRun.usedTool` points here. |
| **Handoff** | `core:Handoff` | Structured agent handoff. Fields: `name`, `status` (enum), `body`, `refs`, `timestamp`, `from`/`to` (relations to Agent), `re` (generic relation). |
| **Pipeline** | `trellis:Pipeline` | Coordination definition composing workflows across agent roles. Has `phases` (relation to PipelinePhase) and `workflow` (relation to Workflow). |
| **Pipeline Phase** | `trellis:PipelinePhase` | Ordered step in a pipeline. Fields: `name`, `description`, `order`, `agentRole` (string enum, not a relation), `workflow` (relation to Workflow). |
| **AgentRun** | `trellis:AgentRun` | Single execution run of an agent. Links back to `executedBy` (Agent), `usedTool` (Tool), `handoffTo`/`handoffFrom` (AgentRun chain). |
| **DecisionTrace** | `trellis:DecisionTrace` | Decision recorded during an agent run. Links to `belongsToRun` (AgentRun) and `madeBy` (Agent). |
| **DAGRun** | `trellis:DAGRun` | DAG workflow run tracking step-level state (workflowId, status, steps JSON). |
| **WorkerPool Task** | `trellis:WorkerPoolTask` | Queued or active task in a WorkerPool (agentId, runId, status, timestamps). |

## User / app layer

What application authors define and instantiate.

| Term | API / artifact | Meaning |
|------|----------------|---------|
| **Type** (schema) | `defineType('Invoice', …)` | Runtime ontology + Zod shape + TS inference. Registers via `registerType`. |
| **Entity** / **instance** / **record (instance)** | `{ id, type, …attrs }` | One row in the EAV graph. |
| **Relation** | `rel(() => OtherType)` | Reference field (`Ref<T>` unresolved, expanded when `resolve` is set). |
| **Join entity** | e.g. `MyCustomEntityTag` | Sidecar-visible assignment row when graph links are not used (demo tag toggles). |

**Naming rule:** Prefer **Type** for the schema handle, **entity** for a stored instance.
Avoid overloading **Record** in prose when you mean “user-defined type” — say **Type** or
**user schema**.

## Product: CMS

| Term | API | Meaning |
|------|-----|---------|
| **Collection** (CMS) | `cms.collection('blog_post')` | Named content table: TypeSchemas with `cms=true`, draft/publish, `list` / `subscribe`. Closest product meaning of “a table of user-defined records.” |
| **Entry** | `Entry<T>` | One CMS row with `status` + `fields` bag. |

**Collection (CMS)** ≈ named table users see. **Type** ≈ schema behind that table.

## SDK / transport (not ontology)

| Term | Location | Meaning |
|------|----------|---------|
| **Live read** | `entitiesStore`, `liveEntities` | WebSocket subscription + hydrated rows for a Type. |
| **Mutations** | `mutations(client, Type)` | Typed create / update / remove. |
| **Entity repository** (legacy) | `demo/.../collection.ts` → `createEntityCollection()` | Pre-SDK server helper (hand-written TQL + subscribe). **Not** `core:Collection`. Retire in favor of typed SDK. |

## Demo-only (`demo/realtime-app`)

Names that must not be mistaken for kernel primitives.

| Term | What it is |
|------|------------|
| **CollectionMeta** | User-defined table header (name, slug, icon, color, description). `subClassOf: core:Record`. |
| **CollectionRecord** | Row in a collection; scoped by `collectionId`. Fractal wedge + platform status read this type. |
| **MyCustomEntity** | *(removed)* — superseded by **CollectionRecord**. |
| **MyCustomEntityTag** | *(removed)* — tag join demo retired with collections v1. |
| **Thing** (fractal UI) | Representation contract: same graph identity, many shells at different **vantages**. Not a graph `type` string. |
| **Lane** | Version / draft axis (`main` vs `agent:…`), VCS journal overlay — not an ontology tier. |

## Disambiguation cheatsheet

| Word | If you mean… | Say instead |
|------|----------------|-------------|
| **framework** | JS UI library | **UI framework** (React, Vue, Svelte) — never a graph type |
| **framework** | Old demo entity type | **MyCustomEntity** (removed) |
| **collection** | Kernel container type | **core:Collection** |
| **collection** | User-visible table | **CMS collection** or **typed list** |
| **collection** | `collection.ts` helper | **entity repository** (legacy) |
| **thing** | Graph root type | **core:Thing** |
| **thing** | Fractal widget | **Thing shell** / **vantage render** |

## Intended product mapping (target)

```
defineType('Invoice', …)     →  Type (schema)
registerType + create        →  Entity instances
cms.collection('invoice')    →  Collection (product): named table + publish rules
core:Collection entity       →  Optional grouping/folder in the graph
entitiesStore(client, Type)  →  Live list (SDK), not a separate ontology primitive
```

## Related

- Kernel schemas: `src/core/ontology/core-ontology.ts`
- Typed SDK: `src/schema/define.ts`, `trellis/svelte/typed`
- CMS: `src/cms/`
- Explorer demo schemas: `demo/realtime-app/src/lib/schemas/`
