/**
 * KRN-507 — issue ids stay unique when two writers share a store via peer sync
 * (ADR 0060). Ops pulled through `integrateOps` never advance the local
 * counter file, and two peers allocating offline mint the same next `TRL-N`.
 */
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { TrellisVcsEngine } from '../../src/engine.js';

describe('issue ids under multi-writer sync', () => {
  const originalHome = process.env.HOME;
  let home: string;
  let roots: string[];

  beforeEach(() => {
    // Hermetic HOME: no person identity leaks in from the developer machine.
    home = mkdtempSync(join(tmpdir(), 'issue-id-multiwriter-home-'));
    process.env.HOME = home;
    roots = [];
  });

  afterEach(() => {
    for (const root of roots) rmSync(root, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
  });

  async function peer(name: string): Promise<TrellisVcsEngine> {
    const root = mkdtempSync(join(tmpdir(), `issue-id-multiwriter-${name}-`));
    roots.push(root);
    const engine = new TrellisVcsEngine({ rootPath: root, agentId: `agent:${name}` });
    await engine.initRepo();
    engine.setCheckpointThreshold(0);
    return engine;
  }

  test('a store filled by pulling allocates above the pulled ids', async () => {
    const a = await peer('a');
    await a.createIssue('one');
    await a.createIssue('two');
    await a.createIssue('three');

    const b = await peer('b');
    const pulled = await b.integrateOps(a.getOps());
    expect(pulled.rejected).toEqual([]);
    expect(b.getIssue('TRL-3')?.title).toBe('three');

    const op = await b.createIssue('four');
    expect(op.vcs?.issueId).toBe('TRL-4');
    expect(b.getIssue('TRL-1')?.title).toBe('one');
  });

  test('a peer issueCreate reusing a local id is rejected, not merged', async () => {
    const a = await peer('a');
    await a.createIssue('shared');
    const b = await peer('b');
    await b.integrateOps(a.getOps());

    // Both allocate offline from the same base → both mint TRL-2. b's id is
    // pinned so this test exercises the integrate guard on its own, not the
    // allocator floor above.
    await a.createIssue('from a');
    await b.createIssue('from b', {
      forceIssueId: 'TRL-2',
      criteria: [{ description: 'criterion on b-side TRL-2' }],
    });
    expect(b.getIssue('TRL-2')?.title).toBe('from b');

    const result = await a.integrateOps(b.getOps());
    const reasons = result.rejected.map((r) => r.reason);

    expect(reasons).toContain('issue-id-conflict');
    const conflict = result.rejected.find((r) => r.reason === 'issue-id-conflict')!;
    expect(conflict.op.vcs?.issueId).toBe('TRL-2');
    // b's later ops chain off the rejected create and stop there.
    expect(reasons.filter((r) => r !== 'issue-id-conflict').every((r) => r === 'missing-dependency')).toBe(true);

    expect(a.getIssue('TRL-2')?.title).toBe('from a');
    expect(a.getIssue('TRL-2')?.criteria ?? []).toHaveLength(0);
  });
});
