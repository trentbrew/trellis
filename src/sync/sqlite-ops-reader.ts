/**
 * sqlite-ops-reader.ts
 *
 * TRL-20 spike: a {@link LocalOpsReader} backed by the SQLite kernel backend.
 * Routes the sync message path through bounded rowid-cursor tail reads
 * (`opsAfter`/`readAfterRowid`, `getOpAtIndex` via `LIMIT 1 OFFSET`) instead of
 * materializing the entire log for every sync message.
 *
 * @module trellis/sync
 */

import type { SqliteKernelBackend } from '../core/persist/sqlite-backend.js';
import type { KernelOp } from '../core/persist/backend.js';
import type { VcsOp } from '../vcs/types.js';
import type { LocalOpsReader } from './sync-engine.js';

/** Adapt a sqlite kernel op to a VcsOp for the sync engine. */
function kernelToVcsOp(op: KernelOp): VcsOp {
  return op as unknown as VcsOp;
}

export function createSqliteLocalOpsReader(
  db: SqliteKernelBackend,
): LocalOpsReader {
  return {
    count: () => db.getOpCount(),
    lastOp: () => {
      const last = db.getLastOp();
      return last ? kernelToVcsOp(last) : undefined;
    },
    has: (hash) => db.getByHash(hash) !== undefined,
    opsAfter: (afterHash) => db.readAfter(afterHash).map(kernelToVcsOp),
    getOpAtIndex: (index) => {
      const op = db.opAtOffset(index);
      return op ? kernelToVcsOp(op) : undefined;
    },
    all: () => db.readAll().map(kernelToVcsOp),
  };
}