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
    expect(snap.promoteLock.locked).toBe(false);
    expect(snap.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('includes lane after ensureSessionLane', async () => {
    const meta = await engine.ensureSessionLane({ sessionId: 'sess-test-1' });
    const snap = buildLanesSnapshot(engine, root);
    expect(snap.lanes).toHaveLength(1);
    expect(snap.lanes[0].id).toBe(meta.id);
    expect(snap.lanes[0].sessionId).toBe('sess-test-1');
    expect(snap.lanes[0].agentId).toBeTruthy();
  });
});
