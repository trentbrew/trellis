/**
 * Context Management Interface and Types
 */

import type { LLMMessage } from '../llm/types.js';

export interface ContextWindow {
  maxTokens: number;
  currentTokens: number;
  messages: LLMMessage[];

  // RAG-based context injection
  availableRagResults?: string[];

  // Graph-based context
  relatedEntityIds?: string[];
}

export interface ContextManager {
  addMessage(message: LLMMessage): void;
  getHistory(): LLMMessage[];

  // Context pruning/summarization
  prune(targetTokenCount: number): Promise<void>;
  summarize(): Promise<string>;

  // Vector search integration
  injectRagContext(query: string, limit?: number): Promise<void>;

  // Token calculation
  calculateTokenCount(message: LLMMessage): number;
}

// ---------------------------------------------------------------------------
// Budgeted context pack (TRL-127 / docs/specs/context-pack-v0.md)
// ---------------------------------------------------------------------------

export type ContextVantage = 'boot' | 'edit' | 'review';

export interface ContextPackRef {
  kind: 'issue' | 'file' | 'entity' | 'decision' | 'milestone' | 'policy';
  id: string;
  /** ≤ ~120 chars; never full body */
  summary?: string;
}

export interface ContextPackFocus {
  issueId: string;
  title: string;
  status: string;
  priority?: string;
  labels?: string[];
  ac: Array<{
    description: string;
    status: string;
  }>;
}

export interface ContextPackWaiting {
  issueId: string;
  from: string;
  to: string;
  status: string;
  re: string;
  /** First line, ≤ 80 chars */
  preview: string;
}

export interface ContextPack {
  version: 1;
  vantage: ContextVantage;
  budgetTokens: number;
  estimatedTokens: number;
  truncated: boolean;
  generatedAt: string;
  lane: {
    id: string | null;
    worktreePath: string | null;
    editRoot: string;
  };
  focus: ContextPackFocus | null;
  waitingOnYou: ContextPackWaiting[];
  milestone: { id: string; message: string; at: string } | null;
  decisions: ContextPackRef[];
  links: ContextPackRef[];
  policyRefs: ContextPackRef[];
}

export interface ContextPackOptions {
  budgetTokens?: number;
  vantage?: ContextVantage;
  /** Focus issue id (e.g. TRL-127). Required for edit/review unless unique in_progress. */
  issueId?: string;
  /** Repo root used for editRoot fallback when no lane worktree. */
  rootPath: string;
}

/** Thrown when edit/review cannot resolve a single focus issue. */
export class ContextPackFocusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContextPackFocusError';
  }
}
