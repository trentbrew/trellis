/**
 * trellis lane gc — lane lifecycle sweep (TRL-407).
 *
 * Pure classification ({@link classifyLane}) + engine-backed sweep
 * ({@link gcLanes}). No CLI/IO coupling in the classifier — unit-testable.
 */

import type { TrellisVcsEngine } from '../engine.js';
import type { IssueInfo } from './issue.js';
import type { LaneMeta } from './lane.js';

export type LaneGcDisposition =
  | 'promote'
  | 'drop'
  | 'garden'
  | 'leave';

export interface LaneGcRow {
  laneId: string;
  boundIssue?: string;
  opCount: number;
  disposition: LaneGcDisposition;
  reason: string;
  action: 'none' | 'promoted' | 'dropped' | 'gardened';
}

export interface LaneGcOptions {
  /** Execute dispositions (dry-run is the default). */
  apply?: boolean;
  /** Allow destructive drop of lanes that carry ops. */
  force?: boolean;
  /** Restrict the sweep to one session (session-end hook path). */
  sessionId?: string;
  /** Clock injection for tests. */
  now?: number;
}

export interface GcLaneInput {
  lane: LaneMeta;
  issue: IssueInfo | null;
  opCount: number;
  now?: number;
}

/**
 * Stale cutoff: lease expired OR older than 24h. Mirrors `isStaleLane` in the
 * lane CLI (lane.ts).
 */
export function isLaneStale(lane: LaneMeta, now: number): boolean {
  if (lane.status !== 'active') return false;
  if (lane.leaseExpiresAt) {
    return now > new Date(lane.leaseExpiresAt).getTime();
  }
  const ageMs = now - new Date(lane.createdAt).getTime();
  return ageMs > 24 * 60 * 60 * 1000;
}

/**
 * Classify one lane into a disposition. Pure — no engine/IO side effects.
 *
 * 1. **promote** — active, bound issue `closed`, lane has ops.
 * 2. **drop** — active, bound issue `closed` with 0 ops, OR bound issue
 *    abandoned (`cancelled`/`backlog`) and lane stale.
 * 3. **garden** — active, no bound issue, 0 ops, stale.
 * 4. **leave** — everything else (retained).
 *
 * Dirty-guard is enforced by {@link gcLanes} (drop of a lane with ops requires
 * `force`); the classifier reports the ideal disposition and reason.
 */
export function classifyLane(input: GcLaneInput): LaneGcRow {
  const { lane, issue, opCount } = input;
  const now = input.now ?? Date.now();
  const boundIssue = lane.issueId ?? issue?.displayId ?? issue?.id;

  if (lane.status !== 'active') {
    return {
      laneId: lane.id,
      boundIssue,
      opCount,
      disposition: 'leave',
      reason: `lane is ${lane.status}`,
      action: 'none',
    };
  }

  if (boundIssue && issue) {
    if (issue.status === 'closed') {
      if (opCount > 0) {
        return {
          laneId: lane.id,
          boundIssue,
          opCount,
          disposition: 'promote',
          reason: 'bound issue closed with ops',
          action: 'none',
        };
      }
      return {
        laneId: lane.id,
        boundIssue,
        opCount,
        disposition: 'drop',
        reason: 'bound issue closed, no ops',
        action: 'none',
      };
    }
    if (
      (issue.status === 'cancelled' || issue.status === 'backlog') &&
      isLaneStale(lane, now)
    ) {
      return {
        laneId: lane.id,
        boundIssue,
        opCount,
        disposition: 'drop',
        reason: `bound issue ${issue.status}, lane stale`,
        action: 'none',
      };
    }
    return {
      laneId: lane.id,
      boundIssue,
      opCount,
      disposition: 'leave',
      reason: `bound issue ${issue.status ?? 'unknown'}`,
      action: 'none',
    };
  }

  if (!boundIssue && opCount === 0 && isLaneStale(lane, now)) {
    return {
      laneId: lane.id,
      boundIssue,
      opCount,
      disposition: 'garden',
      reason: 'no bound issue, no ops, stale',
      action: 'none',
    };
  }

  return {
    laneId: lane.id,
    boundIssue,
    opCount,
    disposition: 'leave',
    reason: !boundIssue && opCount > 0 ? 'no bound issue, has ops' : 'no bound issue',
    action: 'none',
  };
}

/**
 * Sweep lanes. Default is dry-run: classify everything, mutate nothing.
 * With `apply`, executes dispositions (promote via engine promote path, drop
 * and garden via dropLane — which archives the journal and prunes the
 * worktree).
 *
 * Dirty-guard: a lane whose disposition is destructive is never dropped with
 * ops unless `force` is set — it degrades to `leave`.
 */
export async function gcLanes(
  engine: TrellisVcsEngine,
  opts: LaneGcOptions = {},
): Promise<LaneGcRow[]> {
  const now = opts.now ?? Date.now();
  const rows: LaneGcRow[] = [];

  for (const lane of engine.listLanes()) {
    if (opts.sessionId && lane.sessionId !== opts.sessionId) continue;

    const issue = lane.issueId ? engine.getIssue(lane.issueId) : null;
    const opCount = engine.getLaneOpCount(lane.id);
    const row = classifyLane({ lane, issue, opCount, now });

    const destructive =
      row.disposition === 'drop' || row.disposition === 'garden';
    if (destructive && opCount > 0 && !opts.force) {
      rows.push({
        ...row,
        disposition: 'leave',
        reason: `${row.reason} — dirty (${opCount} ops), needs --force`,
      });
      continue;
    }

    if (!opts.apply || row.disposition === 'leave') {
      rows.push(row);
      continue;
    }

    try {
      switch (row.disposition) {
        case 'promote':
          await engine.promoteLane(lane.id, { milestone: true });
          rows.push({ ...row, action: 'promoted' });
          break;
        case 'drop':
          await engine.dropLane(lane.id);
          rows.push({ ...row, action: 'dropped' });
          break;
        case 'garden':
          await engine.dropLane(lane.id);
          rows.push({ ...row, action: 'gardened' });
          break;
        default:
          rows.push(row);
      }
      await engine.recordLaneGc([
        { laneId: lane.id, disposition: row.disposition, reason: row.reason },
      ]);
    } catch (err: unknown) {
      rows.push({
        ...row,
        disposition: 'leave',
        reason: `error: ${(err as Error).message}`,
      });
    }
  }

  return rows;
}
