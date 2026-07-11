/**
 * Process-scoped promote mutex — one lane promotion at a time per repo.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';

export interface PromoteLockRecord {
  pid: number;
  laneId: string;
  acquiredAt: string;
  hostname?: string;
}

const DEFAULT_STALE_MS = 5 * 60 * 1000;

function lockPath(trellisDir: string): string {
  return join(trellisDir, 'locks', 'promote.lock');
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err: unknown) {
    return (err as NodeJS.ErrnoException)?.code === 'EPERM';
  }
}

function readLock(trellisDir: string): PromoteLockRecord | null {
  const path = lockPath(trellisDir);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as PromoteLockRecord;
  } catch {
    return null;
  }
}

function isStale(record: PromoteLockRecord, staleMs: number): boolean {
  const age = Date.now() - new Date(record.acquiredAt).getTime();
  if (age > staleMs) return true;
  return !isProcessAlive(record.pid);
}

/**
 * Acquire the repo-wide promote lock. Throws if another live promote holds it.
 */
export function acquirePromoteLock(
  trellisDir: string,
  laneId: string,
  opts?: { staleMs?: number; force?: boolean },
): void {
  const staleMs = opts?.staleMs ?? DEFAULT_STALE_MS;
  mkdirSync(join(trellisDir, 'locks'), { recursive: true });
  const path = lockPath(trellisDir);
  const existing = readLock(trellisDir);

  if (existing && !isStale(existing, staleMs) && !opts?.force) {
    throw new Error(
      `Promote lock held by lane ${existing.laneId} (pid ${existing.pid} since ${existing.acquiredAt}). Retry when the other promote finishes, or use --force-lock if stale.`,
    );
  }

  if (existing && opts?.force && existsSync(path)) {
    unlinkSync(path);
  }

  const record: PromoteLockRecord = {
    pid: process.pid,
    laneId,
    acquiredAt: new Date().toISOString(),
    hostname: process.env.HOSTNAME ?? process.env.USER,
  };
  writeFileSync(path, JSON.stringify(record, null, 2) + '\n');
}

/** Release the promote lock when owned by this process and lane. */
export function releasePromoteLock(trellisDir: string, laneId: string): void {
  const path = lockPath(trellisDir);
  if (!existsSync(path)) return;

  const existing = readLock(trellisDir);
  if (!existing) {
    unlinkSync(path);
    return;
  }
  if (existing.pid === process.pid && existing.laneId === laneId) {
    unlinkSync(path);
  }
}

/** Best-effort lock status for CLI / hooks. */
export function getPromoteLockStatus(
  trellisDir: string,
  staleMs: number = DEFAULT_STALE_MS,
): { locked: boolean; record?: PromoteLockRecord; stale?: boolean } {
  const record = readLock(trellisDir);
  if (!record) return { locked: false };
  if (isStale(record, staleMs)) {
    return { locked: false, record, stale: true };
  }
  return { locked: true, record };
}

/** Remove a stale or abandoned promote lock file. */
export function clearPromoteLock(trellisDir: string): boolean {
  const path = lockPath(trellisDir);
  if (!existsSync(path)) return false;
  unlinkSync(path);
  return true;
}
