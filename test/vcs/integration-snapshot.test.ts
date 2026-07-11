import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { TrellisVcsEngine } from '../../src/engine.js';
import { materializeIntegrationOps } from '../../src/vcs/lane-materialize.js';
import {
  integrationSnapshotPath,
  loadPersistedSnapshot,
} from '../../src/vcs/integration-snapshot.js';
import { createVcsOp } from '../../src/vcs/ops.js';

const TEST_ROOT = '/tmp/trellis-integration-snapshot';

describe('integration snapshot persistence', () => {
  beforeEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
    mkdirSync(TEST_ROOT, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  test('materializeIntegrationOps writes snapshot on full replay', async () => {
    const op = await createVcsOp('vcs:decisionRecord', {
      agentId: 'agent:test',
      vcs: { decisionId: 'decision:1', decisionContext: 'snap' },
    });
    const snapshotPath = join(TEST_ROOT, 'integration-snapshot.json');

    materializeIntegrationOps([op], null, op.hash, { snapshotPath });

    expect(existsSync(snapshotPath)).toBe(true);
    const persisted = loadPersistedSnapshot(snapshotPath);
    expect(persisted?.tailHash).toBe(op.hash);
    expect(persisted?.store.facts.length).toBeGreaterThan(0);
  });

  test('cold start restores from snapshot without replaying full journal', async () => {
    const engine = new TrellisVcsEngine({ rootPath: TEST_ROOT });
    await engine.initRepo();
    engine.setCheckpointThreshold(0);

    for (let i = 0; i < 30; i++) {
      await engine.recordDecision({
        toolName: 'test.integration',
        context: `integration op ${i}`,
      });
    }

    const snapshotPath = integrationSnapshotPath(join(TEST_ROOT, '.trellis'));
    expect(existsSync(snapshotPath)).toBe(true);

    const engine2 = new TrellisVcsEngine({ rootPath: TEST_ROOT });
    const opened = engine2.open();
    const stats = engine2.getMaterializationStats();

    expect(stats.integrationSnapshotHit).toBe(true);
    expect(stats.integrationOpsReplayed).toBe(0);
    expect(opened.opsReplayed).toBe(0);
    expect(engine2.queryDecisions()).toHaveLength(30);
  });

  test('incremental replay applies only ops after snapshot tail', async () => {
    const engine = new TrellisVcsEngine({ rootPath: TEST_ROOT });
    await engine.initRepo();
    engine.setCheckpointThreshold(0);

    for (let i = 0; i < 20; i++) {
      await engine.recordDecision({
        toolName: 'test.integration',
        context: `integration op ${i}`,
      });
    }

    const baselineOps = engine.getOps().length;

    const engine2 = new TrellisVcsEngine({ rootPath: TEST_ROOT });
    engine2.open();

    process.env.TRELLIS_NO_SNAPSHOT = '1';
    for (let i = 20; i < 25; i++) {
      await engine2.recordDecision({
        toolName: 'test.integration',
        context: `integration op ${i}`,
      });
    }
    delete process.env.TRELLIS_NO_SNAPSHOT;

    const engine3 = new TrellisVcsEngine({ rootPath: TEST_ROOT });
    engine3.open();
    const stats = engine3.getMaterializationStats();

    expect(stats.integrationSnapshotHit).toBe(false);
    expect(stats.integrationOpsReplayed).toBeGreaterThan(0);
    expect(stats.integrationOpsReplayed).toBeLessThan(baselineOps);
    expect(engine3.queryDecisions()).toHaveLength(25);
  });

  test('stale snapshot tail triggers full replay', async () => {
    const engine = new TrellisVcsEngine({ rootPath: TEST_ROOT });
    await engine.initRepo();
    engine.setCheckpointThreshold(0);
    await engine.recordDecision({
      toolName: 'test.integration',
      context: 'one op',
    });

    const snapshotPath = integrationSnapshotPath(join(TEST_ROOT, '.trellis'));
    const persisted = loadPersistedSnapshot(snapshotPath);
    expect(persisted).not.toBeNull();

    const corrupted = { ...persisted!, tailHash: 'trellis:op:missing' };
    writeFileSync(snapshotPath, JSON.stringify(corrupted));

    const engine2 = new TrellisVcsEngine({ rootPath: TEST_ROOT });
    engine2.open();
    const stats = engine2.getMaterializationStats();

    expect(stats.integrationSnapshotHit).toBe(false);
    expect(stats.integrationOpsReplayed).toBeGreaterThan(0);
    expect(engine2.queryDecisions()).toHaveLength(1);
  });
});
