/**
 * Issue claim lock — one active lane/session per in-progress issue.
 */

import { join } from 'path';
import type { EngineContext } from './engine-context.js';
import { createVcsOp } from './ops.js';
import type { VcsOp } from './types.js';
import { issueEntityId } from './types.js';
import { loadLaneMeta } from './lane.js';

export interface IssueClaim {
  issueId: string;
  laneId: string;
  sessionId?: string;
  claimedAt?: string;
}

function normalizeIssueId(id: string): string {
  return id.startsWith('issue:') ? id.replace(/^issue:/, '') : id;
}

function getIssueFact(
  ctx: EngineContext,
  entityId: string,
  attr: string,
): string | undefined {
  const facts = ctx.store.getFactsByEntity(entityId);
  const matches = facts.filter((f) => f.a === attr);
  return matches.length > 0
    ? String(matches[matches.length - 1].v)
    : undefined;
}

function laneStillActive(rootPath: string, laneId: string): boolean {
  const meta = loadLaneMeta(join(rootPath, '.trellis'), laneId);
  return meta?.status === 'active' || meta?.status === 'promoting';
}

/** Read claim from materialized store; ignores stale claims when lane is gone. */
export function getIssueClaim(
  ctx: EngineContext,
  issueId: string,
  rootPath?: string,
): IssueClaim | null {
  const id = normalizeIssueId(issueId);
  const eid = issueEntityId(id);
  const laneId = getIssueFact(ctx, eid, 'claimedLaneId');
  if (!laneId) return null;

  if (rootPath && !laneStillActive(rootPath, laneId)) {
    return null;
  }

  return {
    issueId: id,
    laneId,
    sessionId: getIssueFact(ctx, eid, 'claimedSessionId'),
    claimedAt: getIssueFact(ctx, eid, 'claimedAt'),
  };
}

export interface ClaimIssueParams {
  issueId: string;
  laneId: string;
  sessionId?: string;
  /** When true, reclaim if same lane/session. */
  allowSame?: boolean;
}

/**
 * Claim an issue for a lane. Throws when another active lane/session holds it.
 */
export async function claimIssue(
  ctx: EngineContext,
  params: ClaimIssueParams,
  rootPath?: string,
): Promise<{ op?: VcsOp; alreadyClaimed: boolean }> {
  const id = normalizeIssueId(params.issueId);
  const existing = getIssueClaim(ctx, id, rootPath);

  if (existing) {
    const sameLane = existing.laneId === params.laneId;
    const sameSession =
      !params.sessionId ||
      !existing.sessionId ||
      existing.sessionId === params.sessionId;
    if (sameLane && sameSession) {
      return { alreadyClaimed: true };
    }
    throw new Error(
      `Issue ${id} is claimed by lane ${existing.laneId}` +
        (existing.sessionId ? ` (session ${existing.sessionId})` : '') +
        `. Release via pause/close or use that lane.`,
    );
  }

  const op = await createVcsOp('vcs:issueClaim', {
    agentId: ctx.agentId,
    previousHash: ctx.getLastOp()?.hash,
    vcs: {
      issueId: id,
      claimedLaneId: params.laneId,
      claimedSessionId: params.sessionId,
    },
  });
  await ctx.applyOp(op);
  return { op, alreadyClaimed: false };
}

/** Release issue claim (pause, close, lane drop). */
export async function releaseIssueClaim(
  ctx: EngineContext,
  issueId: string,
): Promise<VcsOp | undefined> {
  const id = normalizeIssueId(issueId);
  const existing = getIssueClaim(ctx, id);
  if (!existing) return undefined;

  const op = await createVcsOp('vcs:issueClaimRelease', {
    agentId: ctx.agentId,
    previousHash: ctx.getLastOp()?.hash,
    vcs: {
      issueId: id,
      claimedLaneId: existing.laneId,
      claimedSessionId: existing.sessionId,
      claimedAt: existing.claimedAt,
    },
  });
  await ctx.applyOp(op);
  return op;
}
