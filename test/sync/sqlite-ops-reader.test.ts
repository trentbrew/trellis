import { describe, test, expect } from 'vitest';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

import { SqliteKernelBackend } from '../../src/core/persist/sqlite-backend.js';
import type { KernelOp } from '../../src/core/persist/backend.js';
import { createSqliteLocalOpsReader } from '../../src/sync/sqlite-ops-reader.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mkOp(i: number): KernelOp {
  return {
    hash: `h${String(i).padStart(8, '0')}`,
    kind: 'bench',
    timestamp: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(),
    agentId: 'bench',
    previousHash: i > 0 ? `h${String(i - 1).padStart(8, '0')}` : undefined,
  } as unknown as KernelOp;
}

function buildDb(rows: KernelOp[], file: string): SqliteKernelBackend {
  const db = new SqliteKernelBackend(file);
  db.init();
  db.appendBatch(rows);
  return db;
}

// ---------------------------------------------------------------------------
// TRL-20 spike: bounded local-ops reader over SQLite tail reads
// ---------------------------------------------------------------------------

describe('TRL-20 spike: sqlite local ops reader', () => {
  test('reader.opsAfter matches full-log slice for a mid-log cursor', () => {
    const n = 10_000;
    const ops = Array.from({ length: n }, (_, i) => mkOp(i));
    const dir = join(tmpdir(), `trl20-${randomUUID()}.sqlite`);
    const db = buildDb(ops, dir);
    const reader = createSqliteLocalOpsReader(db);

    // Cursor at op #9999 (the op just before the last one).
    const cursor = ops[9998].hash;
    const tail = reader.opsAfter(cursor);

    expect(tail.length).toBe(1);
    expect(tail[0].hash).toBe(ops[9999].hash);
    db.close();
    rmSync(dir, { force: true });
  });

  test('reader.opsAfter after the final op returns empty', () => {
    const ops = Array.from({ length: 1000 }, (_, i) => mkOp(i));
    const dir = join(tmpdir(), `trl20-spike-${randomUUID()}.sqlite`);
    const db = buildDb(ops, dir);
    const reader = createSqliteLocalOpsReader(db);

    expect(reader.opsAfter(ops[999].hash)).toEqual([]);
    db.close();
    rmSync(dir, { force: true });
  });

  test('reader.getOpAtIndex is bounded (LIMIT 1) and correct', () => {
    const ops = Array.from({ length: 5000 }, (_, i) => mkOp(i));
    const dir = join(tmpdir(), `trl20-idx-${randomUUID()}.sqlite`);
    const db = buildDb(ops, dir);
    const reader = createSqliteLocalOpsReader(db);

    expect(reader.getOpAtIndex(0)?.hash).toBe(ops[0].hash);
    expect(reader.getOpAtIndex(4999)?.hash).toBe(ops[4999].hash);
    expect(reader.getOpAtIndex(5000)).toBeUndefined();
    db.close();
    rmSync(dir, { force: true });
  });

  test('reader.has / count / lastOp agree with the log', () => {
    const ops = Array.from({ length: 3000 }, (_, i) => mkOp(i));
    const dir = join(tmpdir(), `trl20-has-${randomUUID()}.sqlite`);
    const db = buildDb(ops, dir);
    const reader = createSqliteLocalOpsReader(db);

    expect(reader.count()).toBe(3000);
    expect(reader.lastOp()?.hash).toBe(ops[2999].hash);
    expect(reader.has(ops[1500].hash)).toBe(true);
    expect(reader.has('nope')).toBe(false);
    db.close();
    rmSync(dir, { force: true });
  });
});