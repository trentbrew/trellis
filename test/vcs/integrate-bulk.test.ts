/**
 * KRN-509 — `integrateOps` amortizes per-append work (integration snapshot,
 * backup ring, mirror) across the batch. These pin that the deferred writes
 * land in the same on-disk state the per-op path produced.
 */
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { TrellisVcsEngine } from '../../src/engine.js';
import { JsonOpLog } from '../../src/vcs/op-log.js';
import { listMirrors } from '../../src/vcs/oplog-mirror.js';
import {
  integrationSnapshotPath,
  loadPersistedSnapshot,
} from '../../src/vcs/integration-snapshot.js';
import type { VcsOp } from '../../src/vcs/types.js';

describe('integrateOps bulk window', () => {
  const originalHome = process.env.HOME;
  const originalSkipMirror = process.env.TRELLIS_SKIP_OPLOG_MIRROR;
  let home: string;
  let roots: string[];

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'integrate-bulk-home-'));
    process.env.HOME = home;
    delete process.env.TRELLIS_SKIP_OPLOG_MIRROR;
    roots = [];
  });

  afterEach(() => {
    for (const root of roots) rmSync(root, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
    if (originalSkipMirror === undefined) delete process.env.TRELLIS_SKIP_OPLOG_MIRROR;
    else process.env.TRELLIS_SKIP_OPLOG_MIRROR = originalSkipMirror;
  });

  async function peer(name: string): Promise<{ engine: TrellisVcsEngine; root: string }> {
    const root = mkdtempSync(join(tmpdir(), `integrate-bulk-${name}-`));
    roots.push(root);
    const engine = new TrellisVcsEngine({ rootPath: root, agentId: `agent:${name}` });
    await engine.initRepo();
    engine.setCheckpointThreshold(0);
    return { engine, root };
  }

  async function sourceWithIssues(count: number): Promise<TrellisVcsEngine> {
    const { engine } = await peer('source');
    for (let i = 1; i <= count; i++) {
      await engine.createIssue(`issue ${i}`, {
        criteria: [{ description: `ac ${i}.1` }, { description: `ac ${i}.2` }],
      });
    }
    return engine;
  }

  function journalLines(root: string): string[] {
    return readFileSync(join(root, '.trellis', 'ops.json'), 'utf-8')
      .split('\n')
      .filter(Boolean);
  }

  test('a batch survives reopen and the snapshot points at the journal tail', async () => {
    const source = await sourceWithIssues(20);
    const { engine: sink, root } = await peer('sink');

    const result = await sink.integrateOps(source.getOps());
    expect(result.rejected).toEqual([]);

    const tail = sink.getOps().at(-1)!.hash;
    const snapshot = loadPersistedSnapshot(integrationSnapshotPath(join(root, '.trellis')));
    expect(snapshot?.tailHash).toBe(tail);

    const reopened = new TrellisVcsEngine({ rootPath: root, agentId: 'agent:sink' });
    reopened.open();
    expect(reopened.listIssues().map((i) => i.title).sort()).toEqual(
      source.listIssues().map((i) => i.title).sort(),
    );
    expect(reopened.getIssue('TRL-20')?.criteria).toHaveLength(2);
  });

  test('the mirror after a batch matches the journal, including lastHash', async () => {
    const source = await sourceWithIssues(20);
    const { engine: sink, root } = await peer('sink');
    await sink.integrateOps(source.getOps());

    const opsPath = resolve(join(root, '.trellis', 'ops.json'));
    const meta = listMirrors().find((m) => m.sourceOpsPath === opsPath);
    expect(meta).toBeDefined();
    expect(meta!.lineCount).toBe(journalLines(root).length);
    expect(meta!.lastHash).toBe(sink.getOps().at(-1)!.hash);
    expect(readFileSync(meta!.journalPath, 'utf-8').split('\n').filter(Boolean)).toEqual(
      journalLines(root),
    );
  });

  test('the backup ring rotates once per batch and holds the pre-batch journal', async () => {
    const source = await sourceWithIssues(5);
    const { engine: sink, root } = await peer('sink');
    const opsPath = join(root, '.trellis', 'ops.json');
    const before = readFileSync(opsPath, 'utf-8');

    await sink.integrateOps(source.getOps());

    expect(readFileSync(`${opsPath}.bak`, 'utf-8')).toBe(before);
  });

  test('an append from another process is still adopted when the size changes', () => {
    const root = mkdtempSync(join(tmpdir(), 'integrate-bulk-oplog-'));
    roots.push(root);
    const opsPath = join(root, '.trellis', 'ops.json');
    const op = (n: number): VcsOp => ({
      kind: 'vcs:test',
      hash: `trellis:op:${String(n).padStart(64, '0')}`,
      timestamp: '2026-10-29T00:00:00.000Z',
      agentId: 'agent:test',
    });

    const mine = new JsonOpLog(opsPath);
    const theirs = new JsonOpLog(opsPath);
    mine.append(op(1));
    theirs.load();
    theirs.append(op(2));

    mine.beginBulk();
    mine.append(op(3));
    mine.endBulk();

    expect(mine.readAll().map((o) => o.hash)).toEqual([op(1), op(2), op(3)].map((o) => o.hash));
  });
});
