/**
 * Sync apply checkpoint + rollback (TRL-334 Slice 3).
 *
 * dry-run → validate (policy) → apply, with a checkpoint of the op log before apply.
 */

import {
  appendFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import type { VcsOp } from '../vcs/types.js';
import { getSyncPolicy, shouldBlockMessage } from '../vcs/sync-policy.js';

export const SYNC_CHECKPOINT_FILE = 'sync-checkpoint.json';

export interface SyncCheckpointRecord {
  version: 1;
  createdAt: string;
  opsPath: string;
  opsContent: string;
}

export type SyncIntegrateMode = 'dry-run' | 'validate' | 'apply';

export function syncCheckpointPath(rootPath: string): string {
  return join(rootPath, '.trellis', SYNC_CHECKPOINT_FILE);
}

export function computeNewOps(existing: VcsOp[], incoming: VcsOp[]): VcsOp[] {
  const existingHashes = new Set(existing.map((op) => op.hash));
  return incoming.filter((op) => !existingHashes.has(op.hash));
}

export function dryRunIntegrate(
  existing: VcsOp[],
  incoming: VcsOp[],
): { newOps: VcsOp[] } {
  return { newOps: computeNewOps(existing, incoming) };
}

export function validateIntegrate(newOps: VcsOp[]): {
  ok: boolean;
  reason?: string;
} {
  if (newOps.length === 0) {
    return { ok: true };
  }
  const policy = getSyncPolicy();
  const block = shouldBlockMessage({ type: 'ops', ops: newOps }, policy);
  if (block.blocked) {
    return {
      ok: false,
      reason: block.details ?? block.reason ?? 'blocked by sync policy',
    };
  }
  return { ok: true };
}

export function writeCheckpoint(
  rootPath: string,
  opsPath: string,
  opsContent: string,
): SyncCheckpointRecord {
  const trellisDir = join(rootPath, '.trellis');
  mkdirSync(trellisDir, { recursive: true });
  const record: SyncCheckpointRecord = {
    version: 1,
    createdAt: new Date().toISOString(),
    opsPath,
    opsContent,
  };
  writeFileSync(
    syncCheckpointPath(rootPath),
    JSON.stringify(record, null, 2),
    'utf-8',
  );
  return record;
}

export function readCheckpoint(
  rootPath: string,
): SyncCheckpointRecord | undefined {
  const path = syncCheckpointPath(rootPath);
  if (!existsSync(path)) {
    return undefined;
  }
  return JSON.parse(readFileSync(path, 'utf-8')) as SyncCheckpointRecord;
}

export function rollbackFromCheckpoint(
  rootPath: string,
  opsPath: string,
): SyncCheckpointRecord {
  const record = readCheckpoint(rootPath);
  if (!record) {
    throw new Error(
      'No sync checkpoint in .trellis/sync-checkpoint.json — nothing to rollback',
    );
  }
  mkdirSync(dirname(opsPath), { recursive: true });
  writeFileSync(opsPath, record.opsContent, 'utf-8');
  return record;
}

/**
 * Integrate remote ops: dry-run (preview), validate (policy only), or apply (checkpoint + append).
 */
export function integrateOpsWithPipeline(
  rootPath: string,
  opsPath: string,
  existing: VcsOp[],
  incoming: VcsOp[],
  mode: SyncIntegrateMode,
): { newOps: VcsOp[]; applied: boolean } {
  const { newOps } = dryRunIntegrate(existing, incoming);

  if (mode === 'dry-run') {
    return { newOps, applied: false };
  }

  const validation = validateIntegrate(newOps);
  if (!validation.ok) {
    throw new Error(`Sync validate failed: ${validation.reason}`);
  }

  if (mode === 'validate') {
    return { newOps, applied: false };
  }

  if (newOps.length === 0) {
    return { newOps, applied: false };
  }

  const priorContent = existsSync(opsPath)
    ? readFileSync(opsPath, 'utf-8')
    : '';
  writeCheckpoint(rootPath, opsPath, priorContent);

  const lines = newOps.map((op) => JSON.stringify(op));
  appendFileSync(opsPath, lines.join('\n') + '\n', 'utf-8');
  return { newOps, applied: true };
}
