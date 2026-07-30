/**
 * Agent Orchestration Types
 *
 * Multi-agent coordination, routing, and handoffs.
 */

import type { HandoffRole, HandoffStatus } from '../protocol/envelope.js';

export interface PhaseExecution {
  phaseId: string;
  phaseName: string;
  agentRole: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  handoffId?: string;
  runId?: string;
  output?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface PipelineRun {
  id: string;
  pipelineId: string;
  pipelineName: string;
  input: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  phases: PhaseExecution[];
  startedAt: string;
  completedAt?: string;
}

export interface OrchestratorConfig {
  concurrency?: number;
  failOnError?: boolean;
  persistRuns?: boolean;
}

export interface PipelineRoute {
  sourcePhase: string;
  targetPhase: string;
  condition?: string;
}

export interface HandoffRecord {
  from: HandoffRole;
  to: HandoffRole;
  re: string;
  status: HandoffStatus;
  body?: string;
  refs?: string[];
  graphEntityId?: string;
}
