/**
 * Kernel causal op summaries — shared by HTTP GET /ops and TrellisDb.listKernelOps.
 */
import type { KernelOp } from '../core/persist/backend.js';

/** Max entity ids returned per op summary (full count still in entityCount). */
export const KERNEL_OP_SUMMARY_ENTITY_ID_CAP = 32;

export interface KernelOpSummary {
  index: number;
  hash: string;
  kind: string;
  timestamp: string;
  agentId?: string;
  previousHash?: string;
  factCount: number;
  linkCount: number;
  deleteFactCount: number;
  deleteLinkCount: number;
  entityCount: number;
  entityIds: string[];
}

export interface ListKernelOpsOptions {
  kind?: string;
  /** Return ops that touch this entity id (facts or links). */
  entity?: string;
  /** Return ops written under this command id (`provenance.commandId`, ADR 0058). */
  commandId?: string;
  /** Return whole ops (facts, links, deletions, provenance) instead of summaries (ADR 0065). */
  full?: boolean;
  limit?: number;
  offset?: number;
}

export interface KernelOpsPage {
  data: (KernelOpSummary | (KernelOp & { index: number }))[];
  total: number;
  limit: number;
  offset: number;
}

export function collectEntityIdsFromOp(op: KernelOp): string[] {
  const entityIds = new Set<string>();
  for (const fact of op.facts ?? []) entityIds.add(fact.e);
  for (const fact of op.deleteFacts ?? []) entityIds.add(fact.e);
  for (const link of op.links ?? []) {
    entityIds.add(link.e1);
    entityIds.add(link.e2);
  }
  for (const link of op.deleteLinks ?? []) {
    entityIds.add(link.e1);
    entityIds.add(link.e2);
  }
  return [...entityIds];
}

export function opTouchesEntity(op: KernelOp, entityId: string): boolean {
  for (const fact of op.facts ?? []) {
    if (fact.e === entityId) return true;
  }
  for (const fact of op.deleteFacts ?? []) {
    if (fact.e === entityId) return true;
  }
  for (const link of op.links ?? []) {
    if (link.e1 === entityId || link.e2 === entityId) return true;
  }
  for (const link of op.deleteLinks ?? []) {
    if (link.e1 === entityId || link.e2 === entityId) return true;
  }
  return false;
}

export function summarizeKernelOp(op: KernelOp, index: number): KernelOpSummary {
  const allIds = collectEntityIdsFromOp(op);
  const sorted = allIds.sort();
  return {
    index,
    hash: op.hash,
    kind: op.kind,
    timestamp: op.timestamp,
    agentId: op.agentId,
    previousHash: op.previousHash,
    factCount: op.facts?.length ?? 0,
    linkCount: op.links?.length ?? 0,
    deleteFactCount: op.deleteFacts?.length ?? 0,
    deleteLinkCount: op.deleteLinks?.length ?? 0,
    entityCount: sorted.length,
    entityIds: sorted.slice(0, KERNEL_OP_SUMMARY_ENTITY_ID_CAP),
  };
}

export function listKernelOpsFromJournal(
  ops: KernelOp[],
  opts: ListKernelOpsOptions = {},
): KernelOpsPage {
  const limit = Math.min(opts.limit ?? 100, 500);
  const offset = opts.offset ?? 0;
  let filtered = ops;
  if (opts.kind) {
    filtered = filtered.filter((op) => op.kind === opts.kind);
  }
  if (opts.entity) {
    const entityId = opts.entity;
    filtered = filtered.filter((op) => opTouchesEntity(op, entityId));
  }
  if (opts.commandId) {
    const id = opts.commandId;
    filtered = filtered.filter((op) => op.provenance?.commandId === id);
  }
  const total = filtered.length;
  const page = filtered.slice(offset, offset + limit);
  return {
    data: page.map((op, index) =>
      opts.full ? { ...op, index: offset + index } : summarizeKernelOp(op, offset + index),
    ),
    total,
    limit,
    offset,
  };
}
