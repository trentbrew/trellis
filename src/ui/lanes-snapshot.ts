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

export interface IssueRow {
  id: string;
  title?: string;
  status?: string;
  priority?: string;
  labels: string[];
  createdAt?: string;
  claimedLaneId?: string;
  claimedSessionId?: string;
  laneCount: number;
  laneIds: string[];
}

export interface MilestoneRow {
  id: string;
  message?: string;
  createdAt?: string;
  createdBy?: string;
  fileCount: number;
  affectedFiles: string[];
}

export interface LanesSnapshotExtras {
  /** Bound HTTP port for the dashboard (status bar). */
  port?: number;
  /** Connected SSE viewers (admin/dashboard clients). */
  viewers?: number;
}

export interface LanesSnapshot {
  at: string;
  rootPath: string;
  integrationBranch: string;
  activeLaneId?: string;
  /** Dashboard listen port when served via lanes-dashboard. */
  port?: number;
  /** Connected SSE clients watching this dashboard. */
  viewers: number;
  /** Distinct agentIds on active lanes. */
  activeAgents: number;
  promoteLock: {
    locked: boolean;
    stale?: boolean;
    laneId?: string;
    pid?: number;
    acquiredAt?: string;
  };
  lanes: LaneRow[];
  issues: IssueRow[];
  milestones: MilestoneRow[];
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
  extras: LanesSnapshotExtras = {},
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

  const inProgressIssues = engine.getActiveIssues().map((issue) => ({
    id: issue.id,
    title: issue.title,
    claimedLaneId: issue.claimedLaneId,
    claimedSessionId: issue.claimedSessionId,
  }));

  // Query issues from the global integration store, not lane-scoped
  const savedLaneId = engine.getActiveLaneId();
  const savedLaneLog = (engine as any).activeLaneLog;
  (engine as any).activeLaneId = undefined;
  (engine as any).activeLaneLog = null;
  engine.open();

  const allIssues = engine.listIssues().map((issue) => {
    const issueLanes = lanes.filter(l => l.issueId === issue.id || l.issueId === `issue:${issue.id}`);
    return {
      id: issue.id,
      title: issue.title,
      status: issue.status,
      priority: issue.priority,
      labels: issue.labels || [],
      createdAt: issue.createdAt,
      claimedLaneId: issue.claimedLaneId,
      claimedSessionId: issue.claimedSessionId,
      laneCount: issueLanes.length,
      laneIds: issueLanes.map(l => l.id),
    } satisfies IssueRow;
  });

  // Newest first — kanban columns, and any issue lists, show creates at the top.
  allIssues.sort((a, b) => {
    const ac = a.createdAt || '';
    const bc = b.createdAt || '';
    if (ac && bc && ac !== bc) return bc.localeCompare(ac);
    return b.id.localeCompare(a.id, undefined, { numeric: true });
  });

  const milestones = engine.listMilestones().map((m) => ({
    id: m.id.replace(/^milestone:/, ''),
    message: m.message,
    createdAt: m.createdAt,
    createdBy: m.createdBy,
    fileCount: m.affectedFiles?.length ?? 0,
    affectedFiles: m.affectedFiles ?? [],
  } satisfies MilestoneRow));

  milestones.sort((a, b) => {
    const ac = a.createdAt || '';
    const bc = b.createdAt || '';
    if (ac && bc && ac !== bc) return bc.localeCompare(ac);
    return b.id.localeCompare(a.id, undefined, { numeric: true });
  });

  // Restore lane context
  (engine as any).activeLaneId = savedLaneId;
  (engine as any).activeLaneLog = savedLaneLog;
  if (savedLaneId) engine.open();

  // Newest / most recently updated lanes first within status (grid + table).
  lanes.sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    if (a.status !== b.status) {
      const order = ['active', 'promoting', 'promoted', 'dropped'];
      return order.indexOf(a.status) - order.indexOf(b.status);
    }
    const au = a.updatedAt || a.createdAt || '';
    const bu = b.updatedAt || b.createdAt || '';
    if (au !== bu) return bu.localeCompare(au);
    return b.id.localeCompare(a.id, undefined, { numeric: true });
  });

  const activeAgentIds = new Set(
    lanes
      .filter((l) => l.isActive || l.status === 'active')
      .map((l) => l.agentId)
      .filter(Boolean),
  );

  return {
    at: new Date().toISOString(),
    rootPath,
    integrationBranch: engine.getCurrentBranch?.() ?? 'main',
    activeLaneId,
    port: extras.port,
    viewers: extras.viewers ?? 0,
    activeAgents: activeAgentIds.size,
    promoteLock: {
      locked: lock.locked,
      stale: lock.stale,
      laneId: lock.record?.laneId,
      pid: lock.record?.pid,
      acquiredAt: lock.record?.acquiredAt,
    },
    lanes,
    issues: allIssues,
    milestones,
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
