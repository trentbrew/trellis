/**
 * Cross-process advisory file locks with stale-owner reclaim.
 *
 * Trellis mints several short-lived critical sections guarded by an
 * `openSync(path, 'wx')` lockfile (op-log appends, issue-counter increments).
 * The naive version only unlinks the lock in a `finally` block, so a holder
 * killed via SIGKILL / a detached child reaped at its timeout leaves an
 * orphaned 0-byte lock that makes every later run spin until its deadline and
 * fail with "Timed out waiting for … lock".
 *
 * This module stamps the lock with owner metadata (`pid`, `hostname`,
 * `acquiredAt`) so a later waiter can prove the owner is gone and reclaim it,
 * and falls back to a max age for cross-host locks and metadata-less
 * (crash-between-open-and-write) locks.
 */

import {
  existsSync,
  mkdirSync,
  openSync,
  closeSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
  statSync,
} from 'fs';
import { dirname } from 'path';

export interface FileLockOptions {
  /** Max time to wait for the lock before throwing. Default 5000ms. */
  timeoutMs?: number;
  /** Age after which a lock is considered abandoned. Default 60000ms. */
  staleMs?: number;
}

export interface LockRecord {
  pid: number;
  hostname?: string;
  acquiredAt?: string;
}

function envMs(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function defaultTimeoutMs(): number {
  return envMs('TRELLIS_OPLOG_LOCK_MS', 5000);
}

function defaultStaleMs(): number {
  return envMs('TRELLIS_OPLOG_LOCK_STALE_MS', 60_000);
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err: unknown) {
    // EPERM means the pid exists but is owned by another user — still alive.
    return (err as NodeJS.ErrnoException)?.code === 'EPERM';
  }
}

export function readLockRecord(lockPath: string): LockRecord | null {
  try {
    const parsed = JSON.parse(readFileSync(lockPath, 'utf-8')) as LockRecord;
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    // Empty or malformed (crash between open and write) — let age decide.
    return null;
  }
}

/** True when the lock's owner is provably gone or the lock is too old. */
export function isLockStale(lockPath: string, staleMs = defaultStaleMs()): boolean {
  const record = readLockRecord(lockPath);
  const hostname = process.env.HOSTNAME ?? process.env.USER;
  if (record) {
    if (record.hostname && hostname && record.hostname !== hostname) {
      const age = record.acquiredAt ? Date.now() - new Date(record.acquiredAt).getTime() : 0;
      return age > staleMs;
    }
    if (typeof record.pid === 'number' && !isProcessAlive(record.pid)) {
      return true;
    }
    if (record.acquiredAt) {
      return Date.now() - new Date(record.acquiredAt).getTime() > staleMs;
    }
    return false;
  }
  try {
    return Date.now() - statSync(lockPath).mtimeMs > staleMs;
  } catch {
    return false;
  }
}

/**
 * Run `fn` while holding an exclusive lockfile. Reclaims orphaned locks
 * (dead owner / past max age) instead of deadlocking. Throws `label`-tagged
 * error if the lock cannot be acquired before the timeout.
 */
export function withFileLock<T>(
  lockPath: string,
  label: string,
  fn: () => T,
  opts: FileLockOptions = {},
): T {
  const dir = dirname(lockPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const timeoutMs = opts.timeoutMs ?? defaultTimeoutMs();
  const staleMs = opts.staleMs ?? defaultStaleMs();
  const deadline = Date.now() + timeoutMs;
  let lockFd: number | undefined;

  while (Date.now() < deadline) {
    try {
      lockFd = openSync(lockPath, 'wx');
      // Stamp owner metadata so a crashed/killed holder can be reclaimed.
      try {
        writeFileSync(
          lockFd,
          JSON.stringify({
            pid: process.pid,
            hostname: process.env.HOSTNAME ?? process.env.USER,
            acquiredAt: new Date().toISOString(),
          }),
        );
      } catch {
        // Best-effort; age-based reclaim still covers it.
      }
      break;
    } catch (err: any) {
      if (err?.code !== 'EEXIST') throw err;
      if (isLockStale(lockPath, staleMs)) {
        try {
          unlinkSync(lockPath);
        } catch {
          // another waiter may have reclaimed it first
        }
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 15);
    }
  }

  if (lockFd === undefined) {
    throw new Error(
      `Timed out waiting for ${label}: ${lockPath}. Another Trellis process may be stalled.`,
    );
  }

  try {
    return fn();
  } finally {
    closeSync(lockFd);
    try {
      unlinkSync(lockPath);
    } catch {
      // best-effort
    }
  }
}
