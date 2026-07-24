import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { TrellisVcsEngine } from '../../src/engine.js';
import { buildLanesSnapshot } from '../../src/ui/lanes-snapshot.js';

describe('buildLanesSnapshot', () => {
  let root: string;
  let engine: TrellisVcsEngine;

  beforeEach(async () => {
    root = mkdtempSync(join(tmpdir(), 'lanes-snap-'));
    engine = new TrellisVcsEngine({ rootPath: root });
    await engine.initRepo({ indexWorkspace: false });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('returns empty lanes for fresh repo', () => {
    const snap = buildLanesSnapshot(engine, root);
    expect(snap.rootPath).toBe(root);
    expect(snap.lanes).toEqual([]);
    expect(snap.milestones).toEqual([]);
    expect(snap.promoteLock.locked).toBe(false);
    expect(snap.viewers).toBe(0);
    expect(snap.activeAgents).toBe(0);
    expect(snap.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('includes port and viewers from extras', () => {
    const snap = buildLanesSnapshot(engine, root, { port: 3939, viewers: 2 });
    expect(snap.port).toBe(3939);
    expect(snap.viewers).toBe(2);
  });

  it('orders issues newest-first by createdAt', async () => {
    await engine.createIssue('Older', { status: 'backlog' });
    await new Promise((r) => setTimeout(r, 10));
    await engine.createIssue('Newer', { status: 'backlog' });
    const snap = buildLanesSnapshot(engine, root);
    const ours = snap.issues.filter((i) => i.title === 'Older' || i.title === 'Newer');
    expect(ours.length).toBe(2);
    expect(ours[0].title).toBe('Newer');
    expect(ours[1].title).toBe('Older');
  });

  it('includes milestones newest-first', async () => {
    await engine.createMilestone('older checkpoint');
    await new Promise((r) => setTimeout(r, 10));
    await engine.createMilestone('newer checkpoint');
    const snap = buildLanesSnapshot(engine, root);
    expect(snap.milestones).toHaveLength(2);
    expect(snap.milestones[0].message).toBe('newer checkpoint');
    expect(snap.milestones[1].message).toBe('older checkpoint');
    expect(snap.milestones[0].id).not.toContain('milestone:');
  });

  it('lists milestones from integration store while a lane is active', async () => {
    await engine.createMilestone('integration milestone');
    const lane = await engine.createLane({ agentId: 'agent:test' });
    await engine.enterLane(lane.id);
    const snap = buildLanesSnapshot(engine, root);
    expect(snap.milestones).toHaveLength(1);
    expect(snap.milestones[0].message).toBe('integration milestone');
  });
});
