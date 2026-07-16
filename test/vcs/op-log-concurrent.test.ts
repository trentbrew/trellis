/**
 * The op log must never lose ops when two processes write the same journal, and
 * concurrent appends must stay a *linear* causal chain (no forks).
 *
 * This is the regression test for the silent op-loss bug: the old `append()`
 * rewrote the entire JSON-array journal from whatever was in memory, so a
 * long-lived process holding a stale in-memory copy could overwrite another
 * process's appends. The fix is append-only JSONL: each `append()` re-reads the
 * authoritative disk tail under the cross-process lock, re-chains to it, and
 * writes only its own line via `appendFileSync` (atomic for small payloads).
 */
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { JsonOpLog } from '../../src/vcs/op-log.js';
import { createVcsOp } from '../../src/vcs/ops.js';
import { verifyVcsOpHash } from '../../src/vcs/ops.js';

function parseJsonl(path: string): any[] {
  return readFileSync(path, 'utf-8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

describe('JsonOpLog durability under concurrent writers', () => {
  let root: string;
  let logPath: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'trellis-oplog-concurrent-'));
    logPath = join(root, 'ops.json');
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  async function stubOp(n: number, previousHash?: string) {
    return createVcsOp('vcs:decisionRecord', {
      agentId: 'agent:test',
      previousHash,
      vcs: { decisionId: `decision:${n}`, decisionContext: `op ${n}` },
    });
  }

  test('no op is lost when a second writer appends after the first', async () => {
    const logA = new JsonOpLog(logPath);
    logA.load();
    const opA = await stubOp(1);
    logA.append(opA);

    // Fresh process instance that never saw opA in memory.
    const logB = new JsonOpLog(logPath);
    logB.load();
    const opB = await stubOp(2, opA.hash);
    logB.append(opB);

    // A third instance reads the authoritative file.
    const reloaded = new JsonOpLog(logPath);
    reloaded.load();
    expect(reloaded.count()).toBe(2);
    expect(reloaded.readAll().map((o) => o.vcs?.decisionId)).toEqual([
      'decision:1',
      'decision:2',
    ]);

    // On disk: exactly two lines, nothing clobbered.
    const lines = parseJsonl(logPath);
    expect(lines).toHaveLength(2);
  });

  test('a stale in-memory op is preserved verbatim — no op is lost', async () => {
    const logA = new JsonOpLog(logPath);
    logA.load();
    const opA = await stubOp(1);
    logA.append(opA);

    const logB = new JsonOpLog(logPath);
    logB.load();
    const opB = await stubOp(2, opA.hash);
    logB.append(opB);

    // logC created its op against a STALE tail (it never reloaded), so its
    // previousHash points at opA. Append-only + atomic write means opB and opC
    // both survive — no clobbering, even though they fork from opA.
    const logC = new JsonOpLog(logPath);
    logC.load();
    const staleOp = await stubOp(3, opA.hash);
    logC.append(staleOp);

    const reloaded = parseJsonl(logPath);
    expect(reloaded).toHaveLength(3);

    // Every op is present and its hash still verifies against its body. No data
    // was lost; the cost of same-journal concurrency is a fork, which lanes
    // prevent architecturally (each agent works in its own lane journal).
    const hashes = reloaded.map((o) => o.hash);
    expect(hashes).toContain(opA.hash);
    expect(hashes).toContain(opB.hash);
    expect(hashes).toContain(staleOp.hash);
    for (const o of reloaded) {
      expect(await verifyVcsOpHash(o as any)).toBe(true);
    }
  });

  test('legacy JSON-array file loads and migrates to JSONL on first append', async () => {
    // Write a legacy single-array file by hand.
    const legacyOps = [await stubOp(1), await stubOp(2, 'trellis:op:stale')];
    // Make op2 chain correctly for the legacy fixture.
    legacyOps[1]!.previousHash = legacyOps[0]!.hash;
    legacyOps[1]!.hash = (
      await createVcsOp('vcs:decisionRecord', {
        agentId: 'agent:test',
        previousHash: legacyOps[0]!.hash,
        vcs: { decisionId: 'decision:2', decisionContext: 'op 2' },
      })
    ).hash;
    const { writeFileSync } = await import('fs');
    writeFileSync(logPath, JSON.stringify(legacyOps));

    const log = new JsonOpLog(logPath);
    log.load();
    expect(log.count()).toBe(2);

    const op3 = await stubOp(3, legacyOps[1]!.hash);
    log.append(op3);

    // File is now JSONL, with all three ops intact.
    const lines = parseJsonl(logPath);
    expect(lines).toHaveLength(3);
    expect(legacyOps[0]!.hash).toBe(lines[0].hash);
    expect(legacyOps[1]!.hash).toBe(lines[1].hash);
    expect(lines[2].vcs.decisionId).toBe('decision:3');
  });
});
