/**
 * `withFileLock` must be crash-safe: a holder killed before its finally-block
 * unlink (SIGKILL, or a detached child reaped at its timeout) leaves an
 * orphaned lock. Later waiters must reclaim it rather than deadlock.
 */
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, existsSync, utimesSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { withFileLock, isLockStale } from '../../src/vcs/file-lock.js';

describe('withFileLock', () => {
  let root: string;
  let lockPath: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), `trellis-file-lock--${process.pid}-${Date.now().toString(36)}`));
    lockPath = join(root, 'counter.lock');
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test('runs the critical section and releases the lock', () => {
    const result = withFileLock(lockPath, 'test lock', () => {
      expect(existsSync(lockPath)).toBe(true);
      return 42;
    });
    expect(result).toBe(42);
    expect(existsSync(lockPath)).toBe(false);
  });

  test('reclaims a lock held by a dead pid', () => {
    writeFileSync(
      lockPath,
      JSON.stringify({
        pid: 2147483647,
        hostname: process.env.HOSTNAME ?? process.env.USER,
        acquiredAt: new Date().toISOString(),
      }),
    );
    const result = withFileLock(lockPath, 'test lock', () => 'ok', { timeoutMs: 2000 });
    expect(result).toBe('ok');
    expect(existsSync(lockPath)).toBe(false);
  });

  test('reclaims an orphaned 0-byte lock older than the stale window', () => {
    writeFileSync(lockPath, '');
    const old = new Date(Date.now() - 5 * 60_000);
    utimesSync(lockPath, old, old);
    expect(isLockStale(lockPath)).toBe(true);
    const result = withFileLock(lockPath, 'test lock', () => 'ok', { timeoutMs: 2000 });
    expect(result).toBe('ok');
  });

  test('does not reclaim a fresh lock owned by a live pid (times out)', () => {
    writeFileSync(
      lockPath,
      JSON.stringify({
        pid: process.pid,
        hostname: process.env.HOSTNAME ?? process.env.USER,
        acquiredAt: new Date().toISOString(),
      }),
    );
    expect(isLockStale(lockPath)).toBe(false);
    expect(() =>
      withFileLock(lockPath, 'test lock', () => 'never', { timeoutMs: 200, staleMs: 60_000 }),
    ).toThrow(/Timed out waiting for test lock/);
  });
});
