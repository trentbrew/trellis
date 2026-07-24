/**
 * Causal history graph snapshot — milestones + lane forks + promotes.
 * Spec: docs/specs/trellis-admin-causal-graph.md
 */

import type { TrellisVcsEngine } from '../engine.js';
import type { LaneMeta } from '../vcs/lane.js';
import type { MilestoneInfo } from '../vcs/milestone.js';

export type CausalNodeKind = 'milestone' | 'fork' | 'promote' | 'head';

export interface CausalNode {
  id: string;
  hash: string;
  message: string;
  lane: number;
  parents: string[];
  branches?: string[];
  tags?: string[];
  author?: string;
  date?: string;
  kind?: CausalNodeKind;
  /** Agent lane UUID when node represents fork/head/promote on a lane. */
  laneId?: string;
  /** True when `laneId` refers to a lane with status `active`. */
  active?: boolean;
}

export interface CausalGraphSnapshot {
  at: string;
  integrationBranch: string;
  commits: CausalNode[];
  /** Lane ids with status `active` (agent-assigned work in flight). */
  activeLaneIds: string[];
  stats: {
    eventCount: number;
    activeForkCount: number;
  };
}

export interface CausalGraphInputs {
  integrationBranch: string;
  lanes: LaneMeta[];
  milestones: MilestoneInfo[];
  issueTitles?: Record<string, string>;
}

function shortHash(hash?: string): string {
  if (!hash) return '—';
  const hex = hash.match(/[a-f0-9]{7,}/i);
  if (hex) return hex[0].slice(0, 7);
  return hash.slice(0, 7);
}

function laneIssueTitle(lane: LaneMeta, issueTitles?: Record<string, string>): string | undefined {
  const plain = lane.issueId?.replace(/^issue:/, '');
  if (!plain) return undefined;
  return issueTitles?.[plain] ?? issueTitles?.[`issue:${plain}`];
}

/** Assign graph column indices (0 = trunk). Exported for tests. */
export function assignLaneIndices(lanes: LaneMeta[]): Map<string, number> {
  const map = new Map<string, number>();
  const sorted = [...lanes].sort((a, b) => {
    const ac = a.createdAt || '';
    const bc = b.createdAt || '';
    if (ac !== bc) return ac.localeCompare(bc);
    return a.id.localeCompare(b.id);
  });

  let nextRoot = 1;
  for (const lane of sorted) {
    if (lane.parentLaneId && map.has(lane.parentLaneId)) {
      const parentCol = map.get(lane.parentLaneId)!;
      if (lane.forkKind === 'child') {
        map.set(lane.id, Math.min(parentCol + 1, 3));
      } else {
        map.set(lane.id, Math.min(nextRoot, 3));
        nextRoot = Math.min(nextRoot + 1, 3);
      }
    } else {
      map.set(lane.id, Math.min(nextRoot, 3));
      nextRoot = Math.min(nextRoot + 1, 3);
    }
  }
  return map;
}

interface RawEvent {
  id: string;
  kind: CausalNodeKind;
  lane: number;
  laneId?: string;
  forkLaneCol?: number;
  time: string;
  message: string;
  hash: string;
  author?: string;
  branches?: string[];
  tags?: string[];
}

export function buildCausalGraphFromInputs(input: CausalGraphInputs): CausalGraphSnapshot {
  const laneCols = assignLaneIndices(input.lanes);
  const events: RawEvent[] = [];

  for (const m of input.milestones) {
    const mid = m.id.replace(/^milestone:/, '');
    events.push({
      id: `milestone:${mid}`,
      kind: 'milestone',
      lane: 0,
      time: m.createdAt || '',
      message: m.message || mid,
      hash: shortHash(m.toOpHash),
      author: m.createdBy,
      tags: [mid],
    });
  }

  for (const lane of input.lanes) {
    const col = laneCols.get(lane.id) ?? 1;
    const title = laneIssueTitle(lane, input.issueTitles);
    const shortId = lane.id.slice(0, 13) + (lane.id.length > 13 ? '…' : '');

    if (lane.status === 'promoted') {
      events.push({
        id: `fork:${lane.id}`,
        kind: 'fork',
        lane: col,
        laneId: lane.id,
        time: lane.createdAt,
        message: title || lane.name || `Fork ${shortId}`,
        hash: shortHash(lane.baseOpHash),
        author: lane.agentId,
      });
      events.push({
        id: `head:${lane.id}`,
        kind: 'head',
        lane: col,
        laneId: lane.id,
        time: lane.updatedAt || lane.createdAt,
        message: title || lane.name || `Lane ${shortId}`,
        hash: shortHash(lane.headOpHash),
        author: lane.agentId,
        branches: [lane.targetBranch || shortId],
      });
      events.push({
        id: `promote:${lane.id}`,
        kind: 'promote',
        lane: 0,
        laneId: lane.id,
        forkLaneCol: col,
        time: lane.updatedAt || lane.createdAt,
        message: `Promote ${shortId}${title ? ` — ${title}` : ''}`,
        hash: shortHash(lane.headOpHash),
        author: lane.agentId,
        branches: [input.integrationBranch],
      });
    } else if (lane.status === 'active') {
      events.push({
        id: `head:${lane.id}`,
        kind: 'head',
        lane: col,
        laneId: lane.id,
        time: lane.updatedAt || lane.createdAt,
        message: title || lane.name || `Lane ${shortId}`,
        hash: shortHash(lane.headOpHash),
        author: lane.agentId,
        branches: [lane.targetBranch || shortId],
      });
    } else {
      events.push({
        id: `fork:${lane.id}`,
        kind: 'fork',
        lane: col,
        laneId: lane.id,
        time: lane.createdAt,
        message: title || lane.name || `Fork ${shortId}`,
        hash: shortHash(lane.baseOpHash),
        author: lane.agentId,
      });
    }
  }

  events.sort((a, b) => {
    if (a.time !== b.time) return a.time.localeCompare(b.time);
    return a.id.localeCompare(b.id);
  });

  let lastTrunk: string | null = null;
  const lastOnLaneCol = new Map<number, string>();
  const wired: CausalNode[] = [];

  for (const ev of events) {
    const parents: string[] = [];
    if (ev.kind === 'promote') {
      if (lastTrunk) parents.push(lastTrunk);
      const forkCol = ev.forkLaneCol ?? 1;
      const forkHead = lastOnLaneCol.get(forkCol);
      if (forkHead) parents.push(forkHead);
      else if (ev.laneId) {
        const forkId = `head:${ev.laneId}`;
        if (wired.some((n) => n.id === forkId)) parents.push(forkId);
        else {
          const forkEvId = `fork:${ev.laneId}`;
          if (wired.some((n) => n.id === forkEvId)) parents.push(forkEvId);
        }
      }
    } else if (ev.lane === 0) {
      if (lastTrunk) parents.push(lastTrunk);
      lastTrunk = ev.id;
    } else {
      if (lastTrunk) parents.push(lastTrunk);
      const prev = lastOnLaneCol.get(ev.lane);
      if (prev && ev.kind === 'head') {
        parents.length = 0;
        parents.push(prev);
      }
      lastOnLaneCol.set(ev.lane, ev.id);
    }

    const laneMeta = ev.laneId
      ? input.lanes.find((l) => l.id === ev.laneId)
      : undefined;

    wired.push({
      id: ev.id,
      hash: ev.hash,
      message: ev.message,
      lane: ev.lane,
      parents,
      branches: ev.branches,
      tags: ev.tags,
      author: ev.author,
      date: ev.time,
      kind: ev.kind,
      laneId: ev.laneId,
      active: laneMeta?.status === 'active',
    });
  }

  const commits = wired.reverse();
  const activeLanes = input.lanes.filter((l) => l.status === 'active');
  const activeForkCount = activeLanes.length;

  return {
    at: new Date().toISOString(),
    integrationBranch: input.integrationBranch,
    commits,
    activeLaneIds: activeLanes.map((l) => l.id),
    stats: {
      eventCount: commits.length,
      activeForkCount,
    },
  };
}

export function buildCausalGraphSnapshot(engine: TrellisVcsEngine): CausalGraphSnapshot {
  const savedLaneId = engine.getActiveLaneId();
  const savedLaneLog = (engine as any).activeLaneLog;
  (engine as any).activeLaneId = undefined;
  (engine as any).activeLaneLog = null;
  engine.open();

  const lanes = engine.listLanes();
  const milestones = engine.listMilestones();
  const issueTitles: Record<string, string> = {};
  for (const issue of engine.listIssues()) {
    if (issue.title) issueTitles[issue.id] = issue.title;
  }

  if (savedLaneId) {
    (engine as any).activeLaneId = savedLaneId;
    (engine as any).activeLaneLog = savedLaneLog;
    engine.open();
  }

  const integrationBranch = engine.getCurrentBranch?.() ?? 'main';
  return buildCausalGraphFromInputs({
    integrationBranch,
    lanes,
    milestones,
    issueTitles,
  });
}

export function formatViewMeta(
  stats: CausalGraphSnapshot['stats'],
  integrationBranch: string,
): string {
  const forkLabel =
    stats.activeForkCount === 1
      ? '1 active fork'
      : `${stats.activeForkCount} active forks`;
  return `${stats.eventCount} events · ${forkLabel} · integration: ${integrationBranch}`;
}
