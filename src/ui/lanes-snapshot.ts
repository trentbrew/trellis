/**
 * Agent lane snapshot for the lanes dashboard (demo / sanity check).
 */

import { join } from 'path';
import type { TrellisVcsEngine } from '../engine.js';
import { getPromoteLockStatus } from '../vcs/promote-lock.js';
import type { LaneMeta } from '../vcs/lane.js';

export interface LaneRow {
  id: string;
  status: LaneMeta['status'];
  issueId?: string;
  issueTitle?: string;
  claimedSessionId?: string;
  sessionId?: string;
  agentId: string;
  opCount: number;
  fileCount: number;
  worktreePath?: string;
  baseBranch: string;
  targetBranch: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LanesSnapshot {
  at: string;
  rootPath: string;
  integrationBranch: string;
  activeLaneId?: string;
  promoteLock: {
    locked: boolean;
    stale?: boolean;
    laneId?: string;
    pid?: number;
    acquiredAt?: string;
  };
  lanes: LaneRow[];
  inProgressIssues: Array<{
    id: string;
    title?: string;
    claimedLaneId?: string;
    claimedSessionId?: string;
  }>;
}

export function buildLanesSnapshot(
  engine: TrellisVcsEngine,
  rootPath: string,
): LanesSnapshot {
  const trellisDir = join(rootPath, '.trellis');
  const lock = getPromoteLockStatus(trellisDir);
  const activeLaneId = engine.getActiveLaneId();

  const lanes = engine.listLanes().map((meta) => {
    const summary = safeSummarize(engine, meta.id);
    const issuePlain = meta.issueId?.replace(/^issue:/, '');
    const issue = issuePlain ? engine.getIssue(issuePlain) : null;

    return {
      id: meta.id,
      status: meta.status,
      issueId: meta.issueId,
      issueTitle: issue?.title,
      claimedSessionId: issue?.claimedSessionId,
      sessionId: meta.sessionId,
      agentId: meta.agentId,
      opCount: engine.getLaneOpCount(meta.id),
      fileCount: summary.fileCount,
      worktreePath: meta.worktreePath,
      baseBranch: meta.baseBranch,
      targetBranch: meta.targetBranch,
      isActive: activeLaneId === meta.id,
      createdAt: meta.createdAt,
      updatedAt: meta.updatedAt,
    } satisfies LaneRow;
  });

  lanes.sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    if (a.status !== b.status) {
      const order = ['active', 'promoting', 'promoted', 'dropped'];
      return order.indexOf(a.status) - order.indexOf(b.status);
    }
    return b.updatedAt.localeCompare(a.updatedAt);
  });

  const inProgressIssues = engine.getActiveIssues().map((issue) => ({
    id: issue.id,
    title: issue.title,
    claimedLaneId: issue.claimedLaneId,
    claimedSessionId: issue.claimedSessionId,
  }));

  return {
    at: new Date().toISOString(),
    rootPath,
    integrationBranch: engine.getCurrentBranch?.() ?? 'main',
    activeLaneId,
    promoteLock: {
      locked: lock.locked,
      stale: lock.stale,
      laneId: lock.record?.laneId,
      pid: lock.record?.pid,
      acquiredAt: lock.record?.acquiredAt,
    },
    lanes,
    inProgressIssues,
  };
}

function safeSummarize(
  engine: TrellisVcsEngine,
  laneId: string,
): { fileCount: number } {
  try {
    const { filePaths } = engine.summarizeLane(laneId);
    return { fileCount: filePaths.length };
  } catch {
    return { fileCount: 0 };
  }
}
