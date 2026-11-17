/**
 * Decision Trace Types
 *
 * Types for auto-captured agent decision traces. Decisions are first-class
 * entities in the EAV store, emitted automatically from MCP tool calls
 * and enrichable via pre/post hooks.
 */

// ---------------------------------------------------------------------------
// Decision Entity
// ---------------------------------------------------------------------------

export type DecisionErrorKind = 'thrown' | 'mcp_is_error';

export interface Decision {
  id: string;
  toolName: string;
  input?: Record<string, unknown>;
  outputSummary?: string;
  context?: string;
  /** Did the handler succeed? Absent on traces captured before TRL-58. */
  ok?: boolean;
  errorKind?: DecisionErrorKind;
  /** Monotonic handler duration, integer ms. */
  durationMs?: number;
  /** UTF-8 byte length of the JSON-serialized raw result. */
  resultBytes?: number;
  /** Only when the result exposes a numeric rowCount. */
  resultRows?: number;
  /** Stable session key (MCP extra.sessionId, else hook conversationId). */
  sessionId?: string;
  issueId?: string;
  laneId?: string;
  /** Value-free query fingerprint (tool + mode/type/filter keys). */
  queryShape?: string;
  rationale?: string;
  alternatives?: string[];
  confidence?: number;
  createdAt?: string;
  createdBy?: string;
  /** IDs of related entities (issues, files, milestones) affected by this decision */
  relatedEntities: string[];
  custom?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Decision Input (for recording)
// ---------------------------------------------------------------------------

export interface DecisionInput {
  toolName: string;
  input?: Record<string, unknown>;
  outputSummary?: string;
  context?: string;
  ok?: boolean;
  errorKind?: DecisionErrorKind;
  durationMs?: number;
  resultBytes?: number;
  resultRows?: number;
  sessionId?: string;
  issueId?: string;
  laneId?: string;
  queryShape?: string;
  rationale?: string;
  alternatives?: string[];
  confidence?: number;
  /** Entity IDs this decision relates to (e.g. "issue:TRL-5") */
  relatedEntities?: string[];
  custom?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Decision Filters (for querying)
// ---------------------------------------------------------------------------

export interface DecisionFilter {
  /** Filter by MCP tool name (glob-like, e.g. "trellis_issue_*") */
  toolPattern?: string;
  /** Filter by agent ID */
  agentId?: string;
  /** Only decisions after this ISO timestamp */
  since?: string;
  /** Only decisions before this ISO timestamp */
  until?: string;
  /** Only decisions referencing this entity */
  entityId?: string;
  /** Max results */
  limit?: number;
  /**
   * Resolve relatedTo links (default true). Set false for aggregate views that
   * do not need per-decision related entities — avoids a full link scan per row.
   */
  includeRelated?: boolean;
}

// ---------------------------------------------------------------------------
// Hook Types
// ---------------------------------------------------------------------------

export interface DecisionContext {
  prompt?: string;
  conversationId?: string;
  agentModel?: string;
  custom?: Record<string, unknown>;
}

export interface DecisionEnrichment {
  rationale?: string;
  alternatives?: string[];
  confidence?: number;
  relatedEntities?: string[];
  custom?: Record<string, unknown>;
}

export interface DecisionPreHook {
  name: string;
  /** Which tools to intercept — string (glob) or RegExp */
  toolPattern: string | RegExp;
  handler: (
    toolName: string,
    input: Record<string, unknown>,
  ) => Promise<DecisionContext>;
}

export interface DecisionPostHook {
  name: string;
  toolPattern: string | RegExp;
  handler: (
    toolName: string,
    input: Record<string, unknown>,
    output: unknown,
    preContext: DecisionContext,
  ) => Promise<DecisionEnrichment>;
}
