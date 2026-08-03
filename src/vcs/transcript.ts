import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createVcsOp } from './ops.js';
import type { EngineContext } from './engine-context.js';
import type { VcsOp } from './types.js';

/**
 * Harness chat transcripts as first-class ops (vcs:chatMessage).
 *
 * Gated by `transcripts.enabled` in `.trellis/config.json` (default **false**):
 * recording is opt-in. Transcript ops are **local-only by default** — they are
 * excluded from peer sync (see LOCAL_ONLY_OP_KINDS in sync-policy.ts) unless a
 * team explicitly opts into syncing. Privacy is the default; sync is the
 * decision.
 */

export interface ChatMessageInput {
  /** Stable message id (harness message id). */
  messageId?: string;
  /** Session this message belongs to (harness session id). */
  sessionId: string;
  /** Lane the session is bound to, if any. */
  laneId?: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  text: string;
  /** Tool name for `tool`-role messages. */
  toolName?: string;
  /** Token usage (input+output) for cost rollups. */
  tokens?: number;
}

export interface TranscriptConfig {
  /** Master switch. Default false. */
  enabled: boolean;
  /**
   * Opt-in to peer sync of transcript ops. Default false — transcripts stay
   * local to the desk unless a team explicitly enables sync.
   */
  sync: boolean;
}

const DEFAULT_TRANSCRIPT_CONFIG: TranscriptConfig = {
  enabled: false,
  sync: false,
};

/** Read transcript config from `.trellis/config.json`. */
export function readTranscriptConfig(rootPath: string): TranscriptConfig {
  try {
    const raw = readFileSync(join(rootPath, '.trellis', 'config.json'), 'utf-8');
    const cfg = JSON.parse(raw) as {
      transcripts?: Partial<TranscriptConfig>;
    };
    return {
      enabled: cfg.transcripts?.enabled ?? false,
      sync: cfg.transcripts?.sync ?? false,
    };
  } catch {
    return DEFAULT_TRANSCRIPT_CONFIG;
  }
}

/**
 * Record one chat message as a vcs:chatMessage op.
 *
 * Returns null when transcripts are disabled (config-gated). The op is
 * journaled like any other op; peer sync excludes it unless `transcripts.sync`
 * is enabled (see sync-policy.ts LOCAL_ONLY_OP_KINDS).
 */
export async function recordChatMessage(
  ctx: EngineContext,
  rootPath: string,
  input: ChatMessageInput,
): Promise<VcsOp | null> {
  const config = readTranscriptConfig(rootPath);
  if (!config.enabled) return null;

  const op = await createVcsOp('vcs:chatMessage', {
    agentId: ctx.agentId,
    previousHash: ctx.getLastOp()?.hash,
    vcs: {
      chatMessageId: input.messageId,
      chatSessionId: input.sessionId,
      chatLaneId: input.laneId,
      chatRole: input.role,
      chatText: input.text,
      chatToolName: input.toolName,
      chatTokens: input.tokens,
    },
  });
  await ctx.applyOp(op);
  return op;
}

/** Query transcripts from the op log (all sessions, most recent first). */
export function listChatMessages(
  ops: readonly VcsOp[],
  opts?: { sessionId?: string; laneId?: string; limit?: number },
): Array<{ op: VcsOp; sessionId: string; laneId?: string }> {
  const limit = opts?.limit ?? 100;
  const rows: Array<{ op: VcsOp; sessionId: string; laneId?: string }> = [];
  for (let i = ops.length - 1; i >= 0 && rows.length < limit; i--) {
    const op = ops[i];
    if (op.kind !== 'vcs:chatMessage' || !op.vcs) continue;
    const vcs = op.vcs;
    if (opts?.sessionId && vcs.chatSessionId !== opts.sessionId) continue;
    if (opts?.laneId && vcs.chatLaneId !== opts.laneId) continue;
    rows.push({ op, sessionId: vcs.chatSessionId ?? '', laneId: vcs.chatLaneId });
  }
  return rows;
}

export const transcriptsEnabled = (rootPath: string): boolean =>
  readTranscriptConfig(rootPath).enabled;
