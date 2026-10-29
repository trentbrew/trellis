/**
 * KRN-508 — two peers that minted the same issue ids offline recover: the
 * later create by (timestamp, hash) is renumbered on its own machine, and
 * both sides converge (ADR 0064 interim).
 */
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { TrellisVcsEngine } from '../../src/engine.js';
import { verifyVcsOpHash } from '../../src/vcs/ops.js';
import { descendantHashes, rewriteOps } from '../../src/vcs/issue-renumber.js';
import { listMirrors } from '../../src/vcs/oplog-mirror.js';
import { writeRemoteConfig } from '../../src/vcs/oplog-remote.js';
import type { VcsOp } from '../../src/vcs/types.js';

const tick = () => new Promise((r) => setTimeout(r, 5));

describe('issue renumber after an id conflict', () => {
  const originalHome = process.env.HOME;
  let home: string;
  let roots: string[];

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'issue-renumber-home-'));
    process.env.HOME = home;
    roots = [];
  });

  afterEach(() => {
    for (const root of roots) rmSync(root, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
  });

  async function peer(name: string): Promise<{ engine: TrellisVcsEngine; root: string }> {
    const root = mkdtempSync(join(tmpdir(), `issue-renumber-${name}-`));
    roots.push(root);
    const engine = new TrellisVcsEngine({ rootPath: root, agentId: `agent:${name}` });
    await engine.initRepo();
    engine.setCheckpointThreshold(0);
    return { engine, root };
  }

  const issueTitles = (e: TrellisVcsEngine) =>
    Object.fromEntries(e.listIssues().map((i) => [i.id, i.title]));
  const rejectedOps = (r: { rejected: { op: VcsOp }[] }) => r.rejected.map((x) => x.op);
  const journal = (root: string) => readFileSync(join(root, '.trellis', 'ops.json'), 'utf-8');

  /**
   * Shared TRL-1, then both mint TRL-2 and TRL-3 offline. `first` creates
   * before `second` each time, so `second` loses both numbers.
   */
  async function collide(first: TrellisVcsEngine, second: TrellisVcsEngine) {
    await first.createIssue('shared');
    await second.integrateOps(first.getOps());

    await first.createIssue('first two');
    await tick();
    await second.createIssue('second two', { criteria: [{ description: 'second ac' }] });
    await second.updateIssue('TRL-2', { priority: 'high' });
    await tick();
    await first.createIssue('first three');
    await tick();
    await second.createIssue('second three');
  }

  test('the losing machine renumbers its tail and both sides converge', async () => {
    const { engine: w } = await peer('w');
    const { engine: l, root: lRoot } = await peer('l');
    await collide(w, l);

    // l pulls w: TRL-2 rejects as a conflict, TRL-3 hides behind it.
    const pulled = await l.integrateOps(w.getOps());
    expect(pulled.rejected.map((r) => r.reason)).toContain('issue-id-conflict');

    const resolved = await l.resolveIssueIdConflicts(rejectedOps(pulled), {
      confirmDestructive: true,
    });
    expect(resolved.renumbered).toEqual([
      { from: 'TRL-2', to: 'TRL-4' },
      { from: 'TRL-3', to: 'TRL-5' },
    ]);
    expect(resolved.peerMustRenumber).toEqual([]);
    expect(resolved.integrated.rejected).toEqual([]);

    expect(l.getIssue('TRL-4')?.criteria).toHaveLength(1);
    expect(l.getIssue('TRL-4')?.priority).toBe('high');

    // w pulls the rewritten l: nothing conflicts any more.
    const back = await w.integrateOps(l.getOps());
    expect(back.rejected).toEqual([]);

    const expected = {
      'TRL-1': 'shared',
      'TRL-2': 'first two',
      'TRL-3': 'first three',
      'TRL-4': 'second two',
      'TRL-5': 'second three',
    };
    expect(issueTitles(l)).toEqual(expected);
    expect(issueTitles(w)).toEqual(expected);
    expect((await l.createIssue('next')).vcs?.issueId).toBe('TRL-6');

    for (const op of l.getOps()) expect(await verifyVcsOpHash(op)).toBe(true);

    // Pre-rewrite journal kept; mirror reset to the rewritten journal.
    expect(readdirSync(join(lRoot, '.trellis')).some((f) => f.startsWith('ops.json.pre-rewrite.'))).toBe(true);
    const opsPath = resolve(join(lRoot, '.trellis', 'ops.json'));
    const meta = listMirrors().find((m) => m.sourceOpsPath === opsPath)!;
    expect(readFileSync(meta.journalPath, 'utf-8')).toBe(journal(lRoot));
  });

  test('the machine that kept the number rewrites nothing; the peer resolves', async () => {
    const { engine: w, root: wRoot } = await peer('w');
    const { engine: l } = await peer('l');
    await collide(w, l);

    const wPull = await w.integrateOps(l.getOps());
    const before = journal(wRoot);
    const kept = await w.resolveIssueIdConflicts(rejectedOps(wPull), { confirmDestructive: true });
    expect(kept.renumbered).toEqual([]);
    // TRL-3 is reported too, though its foreign create rejected only as a
    // missing-dependency behind TRL-2.
    expect(kept.peerMustRenumber).toEqual(['TRL-2', 'TRL-3']);
    expect(journal(wRoot)).toBe(before);

    const lPull = await l.integrateOps(w.getOps());
    await l.resolveIssueIdConflicts(rejectedOps(lPull), { confirmDestructive: true });
    expect((await w.integrateOps(l.getOps())).rejected).toEqual([]);
    expect(issueTitles(w)).toEqual(issueTitles(l));
  });

  test('refuses without destructive confirmation and leaves the journal alone', async () => {
    const { engine: w } = await peer('w');
    const { engine: l, root: lRoot } = await peer('l');
    await collide(w, l);
    const pulled = await l.integrateOps(w.getOps());
    const before = journal(lRoot);

    await expect(l.resolveIssueIdConflicts(rejectedOps(pulled))).rejects.toThrow(/Refusing destructive action/);
    expect(journal(lRoot)).toBe(before);
  });

  test('refuses when a remote has acked an op in the rewrite range', async () => {
    const { engine: w } = await peer('w');
    const { engine: l, root: lRoot } = await peer('l');
    await collide(w, l);
    const pulled = await l.integrateOps(w.getOps());
    const losingCreate = l.getOps().find((op) => op.vcs?.issueTitle === 'second two')!;
    writeRemoteConfig(lRoot, {
      default: { url: 'https://ledger.invalid', repoId: 'r', lastAckHash: losingCreate.hash },
    });
    const before = journal(lRoot);

    await expect(
      l.resolveIssueIdConflicts(rejectedOps(pulled), { confirmDestructive: true }),
    ).rejects.toThrow(/remote "default" has acked ops in the rewrite range/);
    expect(journal(lRoot)).toBe(before);
  });

  test('a stale copy of the replaced ops is rejected as superseded', async () => {
    const { engine: w } = await peer('w');
    const { engine: l } = await peer('l');
    await collide(w, l);
    const stale = l.getOps();

    const pulled = await l.integrateOps(w.getOps());
    await l.resolveIssueIdConflicts(rejectedOps(pulled), { confirmDestructive: true });
    await w.integrateOps(l.getOps());

    const again = await w.integrateOps(stale);
    expect(again.applied).toBe(0);
    expect(again.rejected.length).toBeGreaterThan(0);
    expect(new Set(again.rejected.map((r) => r.reason))).toEqual(new Set(['superseded']));
    expect(w.getIssue('TRL-2')?.title).toBe('first two');
  });

  test('rewriting with no renames reproduces every hash', async () => {
    const { engine } = await peer('solo');
    await engine.createIssue('one', { criteria: [{ description: 'ac' }] });
    const ops = engine.getOps();
    const all = descendantHashes(ops, [ops[0]!.hash]);
    const { ops: same } = await rewriteOps(ops, all, new Map());
    expect(same.map((o) => o.hash)).toEqual(ops.map((o) => o.hash));
    expect(existsSync(join(roots[0]!, '.trellis', 'ops.json'))).toBe(true);
  });
});
