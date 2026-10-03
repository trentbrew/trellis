/**
 * Built-in Ontology Definitions
 *
 * Pre-defined ontologies for common domain models:
 *   - Team: team/developer organizational entities
 *   - Agent: AI agent entities for the agent harness
 *
 * The former Project ontology (Project/Module/Feature/Dependency/Config/
 * Artifact/Release) was retired in ADR-0036 §4 — it shipped an example schema
 * nothing consumed. The thin `core:Project` and `core:Repo` types in
 * `core-ontology.ts` replace it.
 *
 * @module trellis/core/ontology
 */

import type { OntologySchema } from './types.js';

// ---------------------------------------------------------------------------
// Team / Developer Ontology
// ---------------------------------------------------------------------------

export const teamOntology: OntologySchema = {
  id: 'trellis:team',
  name: 'Team Ontology',
  version: '1.0.0',
  description: 'Entity types for team and developer organization.',
  entities: [
    {
      name: 'Team',
      description: 'A team or organizational group.',
      attributes: [
        { name: 'name', type: 'string', required: true },
        { name: 'description', type: 'string' },
        { name: 'slug', type: 'string', description: 'URL-safe identifier' },
      ],
    },
    {
      name: 'Developer',
      description: 'A developer or contributor.',
      attributes: [
        { name: 'name', type: 'string', required: true },
        { name: 'email', type: 'string' },
        { name: 'handle', type: 'string', description: 'Username or handle' },
        { name: 'role', type: 'string', enum: ['admin', 'maintainer', 'contributor', 'reviewer'] },
      ],
    },
    {
      name: 'Role',
      description: 'A named role with specific permissions.',
      attributes: [
        { name: 'name', type: 'string', required: true },
        { name: 'description', type: 'string' },
        { name: 'permissions', type: 'string', unique: false, description: 'Permission strings (multi-valued)' },
      ],
    },
    {
      name: 'Capability',
      description: 'A skill or capability.',
      attributes: [
        { name: 'name', type: 'string', required: true },
        { name: 'category', type: 'string' },
        { name: 'level', type: 'string', enum: ['beginner', 'intermediate', 'advanced', 'expert'] },
      ],
    },
  ],
  relations: [
    { name: 'hasMember', sourceTypes: ['Team'], targetTypes: ['Developer'], cardinality: 'many', inverse: 'memberOf', description: 'Team has member' },
    { name: 'memberOf', sourceTypes: ['Developer'], targetTypes: ['Team'], cardinality: 'many', inverse: 'hasMember', description: 'Developer is member of team' },
    { name: 'owns', sourceTypes: ['Developer'], targetTypes: ['core:Project'], cardinality: 'many', description: 'Developer owns/maintains a project' },
    { name: 'reviewsFor', sourceTypes: ['Developer'], targetTypes: ['core:Project'], cardinality: 'many', description: 'Developer reviews for a project' },
    { name: 'hasCapability', sourceTypes: ['Developer'], targetTypes: ['Capability'], cardinality: 'many', description: 'Developer has capability' },
    { name: 'hasRole', sourceTypes: ['Developer'], targetTypes: ['Role'], cardinality: 'many', description: 'Developer has role' },
    { name: 'assignedTo', sourceTypes: ['Developer'], targetTypes: ['core:Project'], cardinality: 'many', description: 'Developer is assigned to a project' },
  ],
};

// ---------------------------------------------------------------------------
// Agent Ontology
// ---------------------------------------------------------------------------

export const agentOntology: OntologySchema = {
  id: 'trellis:agent',
  name: 'Agent Ontology',
  version: '1.0.0',
  description: 'Entity types for AI agents, runs, plans, and tools.',
  entities: [
    {
      name: 'Agent',
      description: 'An AI agent definition.',
      attributes: [
        { name: 'name', type: 'string', required: true },
        { name: 'description', type: 'string' },
        { name: 'model', type: 'string', description: 'LLM model identifier' },
        { name: 'provider', type: 'string', description: 'LLM provider (openai, anthropic, local, etc.)' },
        { name: 'systemPrompt', type: 'string' },
        { name: 'status', type: 'string', enum: ['active', 'inactive', 'deprecated'], default: 'active' },
      ],
    },
    {
      name: 'AgentCapability',
      description: 'A capability or skill an agent possesses.',
      attributes: [
        { name: 'name', type: 'string', required: true },
        { name: 'description', type: 'string' },
        { name: 'category', type: 'string' },
      ],
    },
    {
      name: 'AgentRun',
      description: 'A single execution run of an agent.',
      attributes: [
        { name: 'startedAt', type: 'date', required: true },
        { name: 'completedAt', type: 'date' },
        { name: 'status', type: 'string', enum: ['running', 'plan_pending', 'paused', 'completed', 'failed', 'cancelled'], default: 'running' },
        { name: 'input', type: 'string' },
        { name: 'output', type: 'string' },
        { name: 'totalTokens', type: 'number' },
        { name: 'promptTokens', type: 'number' },
        { name: 'completionTokens', type: 'number' },
      ],
    },
    {
      name: 'AgentPlan',
      description: 'A plan or strategy created by an agent.',
      attributes: [
        { name: 'title', type: 'string', required: true },
        { name: 'description', type: 'string' },
        { name: 'status', type: 'string', enum: ['draft', 'active', 'completed', 'abandoned'], default: 'draft' },
      ],
    },
    {
      name: 'Tool',
      description: 'A tool available to agents.',
      attributes: [
        { name: 'name', type: 'string', required: true },
        { name: 'description', type: 'string' },
        { name: 'schema', type: 'string', description: 'JSON schema for tool parameters' },
        { name: 'endpoint', type: 'string' },
      ],
    },
  ],
  relations: [
    { name: 'hasCapability', sourceTypes: ['Agent'], targetTypes: ['AgentCapability'], cardinality: 'many' },
    { name: 'hasTool', sourceTypes: ['Agent'], targetTypes: ['Tool'], cardinality: 'many' },
    { name: 'executedBy', sourceTypes: ['AgentRun'], targetTypes: ['Agent'], cardinality: 'one' },
    { name: 'hasPlan', sourceTypes: ['AgentRun'], targetTypes: ['AgentPlan'], cardinality: 'many' },
    { name: 'usedTool', sourceTypes: ['AgentRun'], targetTypes: ['Tool'], cardinality: 'many' },
    { name: 'createdBy', sourceTypes: ['AgentPlan'], targetTypes: ['Agent'], cardinality: 'one' },
  ],
};

// ---------------------------------------------------------------------------
// All built-in ontologies
// ---------------------------------------------------------------------------

export const builtinOntologies: OntologySchema[] = [
  teamOntology,
  agentOntology,
];
