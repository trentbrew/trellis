import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { TrellisVcsEngine } from '../../src/engine.js';
import { loadLaneMeta } from '../../src/vcs/lane.js';
import { verifyVcsOpHash } from '../../src/vcs/ops.js';

const TEST_ROOT = '/tmp/trellis-p4-lane-routing';

describe('Lane journal routing', () => {
  let engine: TrellisVcsEngine;

  beforeEach(async () => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
    mkdirSync(TEST_ROOT, { recursive: true });
    engine = new TrellisVcsEngine({ rootPath: TEST_ROOT });
    await engine.initRepo();
    engine.setCheckpointThreshold(0);
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  test('createLane writes laneCreate to integration journal only', async () => {
    const integrationBefore = engine.getIntegrationOpCount();
    const meta = await engine.createLane();
    expect(engine.getIntegrationOpCount()).toBeGreaterThan(integrationBefore);
    expect(engine.getLaneOpCount(meta.id)).toBe(0);
    expect(loadLaneMeta(join(TEST_ROOT, '.trellis'), meta.id)?.id).toBe(meta.id);
  });

  test('lane ops do not append to integration journal', async () => {
    const meta = await engine.createLane();
    const integrationAfterCreate = engine.getIntegrationOpCount();
    await engine.enterLane(meta.id);

    for (let i = 0; i < 100; i++) {
      await engine.recordDecision({
        toolName: 'test.lane',
        context: `lane op ${i}`,
      });
    }

    expect(engine.getIntegrationOpCount()).toBe(integrationAfterCreate);
    expect(engine.getLaneOpCount(meta.id)).toBe(100);
    expect(engine.getActiveLaneId()).toBe(meta.id);
  });

  test('cannot create a lane while inside an active lane', async () => {
    const meta = await engine.createLane();
    await engine.enterLane(meta.id);
    await expect(engine.createLane()).rejects.toThrow('inside lane');
  });

  test('leaveLane restores integration-only materialized state', async () => {
    const meta = await engine.createLane();
    await engine.enterLane(meta.id);
    await engine.recordDecision({ toolName: 'test.lane', context: 'ephemeral' });

    await engine.leaveLane();

    expect(engine.getActiveLaneId()).toBeUndefined();
    expect(engine.queryDecisions()).toHaveLength(0);
    expect(engine.getLaneOpCount(meta.id)).toBe(1);
  });

  test('enterLane after leave restores lane materialized state', async () => {
    const meta = await engine.createLane();
    await engine.enterLane(meta.id);
    await engine.recordDecision({ toolName: 'test.lane', context: 'persist in lane' });
    await engine.leaveLane();

    await engine.enterLane(meta.id);
    expect(engine.queryDecisions()).toHaveLength(1);
  });

  test('activeLaneId persists across open()', async () => {
    const meta = await engine.createLane();
    await engine.enterLane(meta.id);
    await engine.recordDecision({ toolName: 'test.lane', context: 'survive reopen' });

    const engine2 = new TrellisVcsEngine({ rootPath: TEST_ROOT });
    engine2.open();

    expect(engine2.getActiveLaneId()).toBe(meta.id);
    expect(engine2.queryDecisions()).toHaveLength(1);
  });

  test('dropLane marks meta dropped and leaves active session', async () => {
    const meta = await engine.createLane();
    await engine.enterLane(meta.id);
    await engine.dropLane(meta.id);

    expect(engine.getActiveLaneId()).toBeUndefined();
    expect(loadLaneMeta(join(TEST_ROOT, '.trellis'), meta.id)?.status).toBe('dropped');
  });

  test('lane ops stamp laneId on the envelope, not the payload (TRL-102)', async () => {
    const meta = await engine.createLane();
    await engine.enterLane(meta.id);
    const op = await engine.recordDecision({
      toolName: 'test.lane',
      context: 'stamped',
    });

    // Previously this asserted `op.vcs?.laneId` — i.e. the stamp landed in the
    // hashed payload. But `createVcsOp` hashes `vcs` before the stamp is
    // applied, so that mutation silently invalidated the hash: every lane op
    // failed verification and would be rejected as `hash-mismatch` on ingest.
    // The stamp is ambient context, so it belongs on the envelope, outside the
    // preimage — which also keeps the same semantic op hash-identical across
    // lanes (dedup, cherry-pick).
    expect(op.laneId).toBe(meta.id);
    expect(op.vcs?.laneId).toBeUndefined();
    expect(await verifyVcsOpHash(op)).toBe(true);
  });
});
