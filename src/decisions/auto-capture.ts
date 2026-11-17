/**
 * Decision Auto-Capture Middleware
 *
 * Wraps MCP tool handlers to automatically emit vcs:decisionRecord ops
 * for every tool invocation. Pre/post hooks can enrich the trace with
 * rationale, alternatives, and prompt context.
 */

import type { HookRegistry } from './hooks.js';
import type {
  DecisionInput,
  DecisionContext,
  DecisionEnrichment,
} from './types.js';
import { deriveQueryShape } from './query-shape.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal structural shape of MCP's second handler argument. */
export interface ToolExtra {
  sessionId?: string;
}

/** A generic MCP tool handler: receives params + optional transport extra. */
export type ToolHandler = (
  params: Record<string, unknown>,
  extra?: ToolExtra,
) => Promise<unknown>;

/** Callback invoked after auto-capture builds the DecisionInput. */
export type DecisionRecorder = (decision: DecisionInput) => Promise<void>;

export interface AutoCaptureOpts {
  /** The hook registry for pre/post enrichment. */
  hooks: HookRegistry;
  /** Called to persist the decision as a VcsOp. */
  recorder: DecisionRecorder;
  /** Tool names to exclude from auto-capture (e.g. read-only queries). */
  exclude?: Set<string>;
}

// ---------------------------------------------------------------------------
// Wrapper
// ---------------------------------------------------------------------------

/**
 * Wrap an MCP tool handler for automatic decision trace capture.
 */
export function wrapToolHandler(
  toolName: string,
  handler: ToolHandler,
  opts: AutoCaptureOpts,
): ToolHandler {
  return async (params, extra) => {
    // Skip excluded tools
    if (opts.exclude?.has(toolName)) {
      return handler(params, extra);
    }

    // Run pre-hooks
    const preContext: DecisionContext = await opts.hooks.runPreHooks(
      toolName,
      params,
    );

    // Execute the actual tool. A throw must still leave a trace (TRL-74):
    // failures are the calls a quality signal needs most.
    const startedAt = performance.now();
    let result: unknown;
    try {
      result = await handler(params, extra);
    } catch (error) {
      const durationMs = elapsedSince(startedAt);
      const decision = buildDecisionInput(toolName, params, preContext, {
        ok: false,
        errorKind: 'thrown',
        durationMs,
        outputSummary: errorSummary(error),
        sessionId: sessionIdFrom(extra, preContext),
      });
      record(opts, decision);
      throw error;
    }

    const durationMs = elapsedSince(startedAt);

    // Run post-hooks
    const enrichment = await opts.hooks.runPostHooks(
      toolName,
      params,
      result,
      preContext,
    );

    const failed = isErrorResult(result);
    const decision = buildDecisionInput(
      toolName,
      params,
      preContext,
      {
        ok: !failed,
        ...(failed ? { errorKind: 'mcp_is_error' as const } : {}),
        durationMs,
        outputSummary: summarize(result),
        resultBytes: byteSize(result),
        resultRows: resultRowCount(result),
        sessionId: sessionIdFrom(extra, preContext),
      },
      enrichment,
    );

    // Record asynchronously — don't block tool response
    record(opts, decision);

    return result;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Remove potentially large/sensitive fields from tool input before storing.
 */
function sanitizeInput(
  params: Record<string, unknown>,
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string' && value.length > 2000) {
      sanitized[key] = value.slice(0, 2000) + '…';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Summarize a tool result to a concise string (max 500 chars).
 */
function summarize(result: unknown): string {
  if (result === null || result === undefined) return '';

  // MCP-style { content: [{ type: 'text', text: '...' }] }
  if (typeof result === 'object' && result !== null && 'content' in result) {
    const content = (result as any).content;
    if (Array.isArray(content)) {
      const texts = content
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('\n');
      return texts.length > 500 ? texts.slice(0, 500) + '…' : texts;
    }
  }

  const str =
    typeof result === 'string' ? result : JSON.stringify(result, null, 0);
  return str.length > 500 ? str.slice(0, 500) + '…' : str;
}

function elapsedSince(start: number): number {
  return Math.max(0, Math.round(performance.now() - start));
}

function record(opts: AutoCaptureOpts, decision: DecisionInput): void {
  opts.recorder(decision).catch(() => {
    // Silently ignore recording failures.
  });
}

function isErrorResult(result: unknown): boolean {
  return Boolean(
    result &&
      typeof result === 'object' &&
      (result as { isError?: unknown }).isError === true,
  );
}

function byteSize(result: unknown): number | undefined {
  try {
    const json = JSON.stringify(result);
    return json === undefined ? undefined : Buffer.byteLength(json, 'utf8');
  } catch {
    return undefined;
  }
}

function resultRowCount(result: unknown): number | undefined {
  if (!result || typeof result !== 'object') return undefined;
  const record = result as {
    rowCount?: unknown;
    structuredContent?: { rowCount?: unknown };
  };
  for (const value of [record.rowCount, record.structuredContent?.rowCount]) {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      return value;
    }
  }
  return undefined;
}

function textOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function envValue(name: string): string | undefined {
  return textOrUndefined(process.env[name]);
}

function sessionIdFrom(
  extra: ToolExtra | undefined,
  preContext: DecisionContext,
): string | undefined {
  return (
    textOrUndefined(extra?.sessionId) ??
    textOrUndefined(preContext.conversationId)
  );
}

function errorSummary(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const text = `Error: ${message}`;
  return text.length > 500 ? `${text.slice(0, 500)}…` : text;
}

function buildDecisionInput(
  toolName: string,
  params: Record<string, unknown>,
  preContext: DecisionContext,
  extra: Partial<DecisionInput>,
  enrichment?: DecisionEnrichment,
): DecisionInput {
  const custom = {
    ...preContext.custom,
    ...(enrichment?.custom ?? {}),
    ...(preContext.agentModel ? { agentModel: preContext.agentModel } : {}),
  };
  return {
    toolName,
    input: sanitizeInput(params),
    context: preContext.prompt ?? preContext.conversationId,
    queryShape: deriveQueryShape(toolName, params),
    issueId:
      textOrUndefined(preContext.custom?.issueId) ??
      envValue('TRELLIS_ISSUE_ID'),
    laneId: envValue('TRELLIS_LANE_ID'),
    ...extra,
    ...(enrichment
      ? {
          rationale: enrichment.rationale,
          alternatives: enrichment.alternatives,
          confidence: enrichment.confidence,
          relatedEntities: enrichment.relatedEntities,
        }
      : {}),
    custom,
  };
}

export { summarize as _summarizeForTest };
