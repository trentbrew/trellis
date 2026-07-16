/**
 * Ambient presence ledger (TRL — Layer 1 of agent stigmergy).
 *
 * Each agent session writes a heartbeat to `.trellis/presence/<sessionId>.json`.
 * `trellis who` reads all non-stale heartbeats to give ambient awareness of
 * who else is working in the repo right now — no server, no relay. This is
 * pure stigmergy: presence is discovered through the shared repo environment.
 *
 * Presence lives OUTSIDE the causal op log on purpose: liveness is ephemeral
 * and must not pollute milestones, the garden, or sync. It rides beside the
 * repo, not in it.
 */

import { randomUUID } from 'crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';

/** A single agent's live presence record. */
export interface PresenceInfo {
  /** Stable per-session key: TRELLIS_SESSION_ID || TRELLIS_LANE_ID || generated. */
  sessionId: string;
  /** Agent identity entity id (identity:<did>). */
  agentId: string;
  /** Human-readable name from local identity. */
  displayName: string;
  /** Client/provider: opencode | claude | gemini | codex | unknown. */
  client: string;
  /** Lane this session is working in, if any. */
  laneId?: string;
  /** Current branch name, if known. */
  branch?: string;
  /** Issue this session has claimed, if any. */
  claimedIssueId?: string;
  /** Title of the claimed issue, for quick scan. */
  claimedIssueTitle?: string;
  /** Self-reported liveness. */
  status: 'active' | 'idle' | 'away';
  /** ISO timestamp this session first announced. */
  startedAt: string;
  /** ISO timestamp of the last heartbeat (drives staleness pruning). */
  lastHeartbeat: string;
}

/** Heartbeats older than this are considered offline. */
export const DEFAULT_STALE_MS = 5 * 60 * 1000;

export function presenceDir(rootPath: string): string {
  return join(rootPath, '.trellis', 'presence');
}

function heartbeatPath(rootPath: string, sessionId: string): string {
  return join(presenceDir(rootPath), `${sessionId}.json`);
}

export function writeHeartbeat(rootPath: string, info: PresenceInfo): void {
  const dir = presenceDir(rootPath);
  mkdirSync(dir, { recursive: true });
  writeFileSync(heartbeatPath(rootPath, info.sessionId), JSON.stringify(info, null, 2));
}

export function clearHeartbeat(rootPath: string, sessionId: string): void {
  const p = heartbeatPath(rootPath, sessionId);
  if (existsSync(p)) rmSync(p);
}

export interface ReadPresenceOpts {
  /** Override the staleness window (ms). */
  staleMs?: number;
  /** Include the calling session's own record (default: false). */
  includeSelf?: boolean;
  /** The calling session's id, used to exclude self unless includeSelf. */
  selfSessionId?: string;
}

/** Read all non-stale presence records, newest heartbeat first. */
export function readPresence(rootPath: string, opts: ReadPresenceOpts = {}): PresenceInfo[] {
  const dir = presenceDir(rootPath);
  if (!existsSync(dir)) return [];
  const staleMs = opts.staleMs ?? DEFAULT_STALE_MS;
  const now = Date.now();
  const out: PresenceInfo[] = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    try {
      const info = JSON.parse(readFileSync(join(dir, f), 'utf-8')) as PresenceInfo;
      if (now - new Date(info.lastHeartbeat).getTime() > staleMs) continue;
      if (!opts.includeSelf && opts.selfSessionId && info.sessionId === opts.selfSessionId) {
        continue;
      }
      out.push(info);
    } catch {
      /* skip corrupt records */
    }
  }
  out.sort(
    (a, b) => new Date(b.lastHeartbeat).getTime() - new Date(a.lastHeartbeat).getTime(),
  );
  return out;
}

/** Stable session key for this process: session id, else lane id, else ephemeral uuid. */
export function resolveSessionId(): string {
  return process.env.TRELLIS_SESSION_ID || process.env.TRELLIS_LANE_ID || `sess-${randomUUID()}`;
}
