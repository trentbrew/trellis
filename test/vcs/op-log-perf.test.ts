import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { JsonOpLog } from '../../src/vcs/op-log.js';
import { createVcsOp } from '../../src/vcs/ops.js';

describe('JsonOpLog incremental append', () => {
  let root: string;
  let logPath: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'trellis-oplog-perf-'));
    logPath = join(root, 'ops.json');
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    delete process.env.TRELLIS_OPLOG_FULL_WRITE;
  });

  async function stubOp(n: number, previousHash?: string) {
    return createVcsOp('vcs:decisionRecord', {
      agentId: 'agent:test',
      previousHash,
      vcs: { decisionId: `decision:${n}`, decisionContext: `op ${n}` },
    });
  }

  test('incremental appends produce valid JSON reloadable from disk', async () => {
    const log = new JsonOpLog(logPath);
    log.load();

    let prev: string | undefined;
    for (let i = 0; i < 25; i++) {
      const op = await stubOp(i, prev);
      log.append(op);
      prev = op.hash;
    }

    expect(log.count()).toBe(25);
    JSON.parse(readFileSync(logPath, 'utf-8'));

    const reloaded = new JsonOpLog(logPath);
    reloaded.load();
    expect(reloaded.count()).toBe(25);
    expect(reloaded.getLastOp()?.hash).toBe(prev);
  });

  test('second instance reconciles ops appended by another instance', async () => {
    const logA = new JsonOpLog(logPath);
    logA.load();
    const opA = await stubOp(1);
    logA.append(opA);

    const logB = new JsonOpLog(logPath);
    logB.load();
    const opB = await stubOp(2, opA.hash);
    logB.append(opB);

    const reloaded = new JsonOpLog(logPath);
    reloaded.load();
    expect(reloaded.count()).toBe(2);
    expect(reloaded.readAll().map((o) => o.vcs?.decisionId)).toEqual([
      'decision:1',
      'decision:2',
    ]);
  });
});
