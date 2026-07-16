/**
 * Cross-agent file ownership (TRL-117 AC4).
 *
 * A file touched by another agent's *live* active lane is owned by that lane.
 * Writes from a different agentId are rejected with an ADR 0015 handoff prompt.
 */

import { LaneOpLog } from './op-log.js';
import {
  laneDir,
  listLaneMetas,
  type LaneMeta,
} from './lane.js';
import type { VcsOp, VcsOpKind } from './types.js';

const FILE_WRITE_KINDS = new Set<VcsOpKind>([
  'vcs:fileAdd',
  'vcs:fileModify',
  'vcs:fileDelete',
  'vcs:fileRename',
]);

export interface FileOwner {
  laneId: string;
  agentId: string;
  issueId?: string;
  name?: string;
}

export function isFileWriteOp(kind: string): boolean {
  return FILE_WRITE_KINDS.has(kind as VcsOpKind);
}

export function extractOpFilePaths(op: VcsOp): string[] {
  const paths: string[] = [];
  if (op.vcs?.filePath) paths.push(op.vcs.filePath);
  if (op.vcs?.oldFilePath) paths.push(op.vcs.oldFilePath);
  return paths;
}

export function isLiveActiveLane(meta: LaneMeta, now = Date.now()): boolean {
  if (meta.status !== 'active') return false;
  if (meta.leaseExpiresAt) {
    const expires = Date.parse(meta.leaseExpiresAt);
    if (!Number.isNaN(expires) && expires < now) return false;
  }
  return true;
}

/** Map relative file path → owning live active lane (first writer wins). */
export function buildActiveLaneFileOwners(
  trellisDir: string,
  opts?: { excludeLaneId?: string; now?: number },
): Map<string, FileOwner> {
  const owners = new Map<string, FileOwner>();
  const now = opts?.now ?? Date.now();

  for (const meta of listLaneMetas(trellisDir)) {
    if (opts?.excludeLaneId && meta.id === opts.excludeLaneId) continue;
    if (!isLiveActiveLane(meta, now)) continue;

    const log = new LaneOpLog(laneDir(trellisDir, meta.id));
    log.load();
    const owner: FileOwner = {
      laneId: meta.id,
      agentId: meta.agentId,
      issueId: meta.issueId,
      name: meta.name,
    };

    for (const op of log.readAll()) {
      if (!isFileWriteOp(op.kind)) continue;
      for (const path of extractOpFilePaths(op)) {
        if (!owners.has(path)) {
          owners.set(path, owner);
        }
      }
    }
  }

  return owners;
}

export function formatCrossAgentOwnershipMessage(
  path: string,
  owner: FileOwner,
  writerAgentId: string,
): string {
  const issuePlain = owner.issueId?.replace(/^issue:/, '');
  const where = [
    owner.name ? `name=${owner.name}` : null,
    issuePlain ? `issue=${issuePlain}` : null,
  ]
    .filter(Boolean)
    .join(' ');
  const whereSuffix = where ? ` (${where})` : '';
  const re = issuePlain ?? owner.laneId;

  return [
    `File '${path}' is owned by ${owner.agentId} in ${owner.laneId}${whereSuffix}.`,
    `Writer ${writerAgentId} must hand off instead of writing:`,
    `  trellis protocol send --parent ${re} --from <you> --to <peer> --re ${re} --status HANDOFF`,
    `  (ADR 0015 — do not silently edit another agent's active-lane files)`,
  ].join('\n');
}

export class CrossAgentFileOwnershipError extends Error {
  readonly path: string;
  readonly owner: FileOwner;
  readonly writerAgentId: string;

  constructor(path: string, owner: FileOwner, writerAgentId: string) {
    super(formatCrossAgentOwnershipMessage(path, owner, writerAgentId));
    this.name = 'CrossAgentFileOwnershipError';
    this.path = path;
    this.owner = owner;
    this.writerAgentId = writerAgentId;
  }
}

/**
 * Reject file writes that target paths owned by a different agent's live lane.
 */
export function assertCrossAgentFileWriteAllowed(
  trellisDir: string,
  op: VcsOp,
  opts?: { excludeLaneId?: string; now?: number },
): void {
  if (!isFileWriteOp(op.kind)) return;

  const owners = buildActiveLaneFileOwners(trellisDir, opts);
  for (const path of extractOpFilePaths(op)) {
    const owner = owners.get(path);
    if (!owner) continue;
    if (owner.agentId === op.agentId) continue;
    throw new CrossAgentFileOwnershipError(path, owner, op.agentId);
  }
}
