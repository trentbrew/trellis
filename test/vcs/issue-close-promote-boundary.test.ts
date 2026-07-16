/**
 * TRL-117 AC2 — promote boundary == issue boundary.
 *
 * `issue start` creates+enters a lane by default.
 * `issue close --confirm` enforces lane promote replay (auto-promote, or
 * refuse under `--no-promote` when unpromoted ops remain).
 */
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { TrellisVcsEngine } from '../../src/engine.js';

const TEST_ROOT = join(tmpdir(), 'trellis-issue-close-promote-boundary');

describe('issue close — promote boundary == issue boundary', () => {
  let engine: TrellisVcsEngine;
  let issueId: string;

  beforeEach(async () => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
    mkdirSync(TEST_ROOT, { recursive: true });
    engine = new TrellisVcsEngine({ rootPath: TEST_ROOT });
    await engine.initRepo();
    engine.setCheckpointThreshold(0);
    const op = await engine.createIssue('Promote boundary', {
      criteria: [{ description: 'OK', command: 'echo ok' }],
    });
    issueId = op.vcs!.issueId!;
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  test('issue start creates and enters a lane by default', async () => {
    await engine.startIssue(issueId);
    const laneId = engine.getActiveLaneId();
    expect(laneId).toBeDefined();
    const meta = engine.getLaneMeta(laneId!);
    expect(meta?.issueId).toMatch(new RegExp(issueId.replace(/^issue:/, '')));
    expect(meta?.status).toBe('active');
  });

  test('close auto-promotes unpromoted lane ops before closing', async () => {
    await engine.startIssue(issueId, { branch: false });
    const laneId = engine.getActiveLaneId()!;
    const integrationBefore = engine.getIntegrationOpCount();

    await engine.createStoreEntity('thing:boundary', 'Thing', { name: 'lane-work' });
    expect(engine.getLaneOpCount(laneId)).toBeGreaterThan(0);

    await engine.runCriteria(issueId);
    const result = await engine.closeIssue(issueId, { confirm: true });

    expect(result.op?.kind).toBe('vcs:issueClose');
    expect(result.promoteResult?.promoted).toBe(true);
    expect(engine.getIssue(issueId)?.status).toBe('closed');
    expect(engine.getIntegrationOpCount()).toBeGreaterThan(integrationBefore);

    const meta = engine.getLaneMeta(laneId);
    expect(meta?.status).toBe('promoted');
  });

  test('--no-promote refuses close when lane has unpromoted ops', async () => {
    await engine.startIssue(issueId, { branch: false });
    const laneId = engine.getActiveLaneId()!;
    await engine.createStoreEntity('thing:blocked', 'Thing', { name: 'still-in-lane' });
    expect(engine.getLaneOpCount(laneId)).toBeGreaterThan(0);

    await engine.runCriteria(issueId);
    await expect(
      engine.closeIssue(issueId, { confirm: true, noPromote: true }),
    ).rejects.toThrow(/unpromoted ops/i);

    expect(engine.getIssue(issueId)?.status).not.toBe('closed');
    expect(engine.getLaneMeta(laneId)?.status).toBe('active');
  });

  test('close succeeds when lane has no replayable integration ops', async () => {
    await engine.startIssue(issueId, { branch: false });
    await engine.runCriteria(issueId);
    const result = await engine.closeIssue(issueId, { confirm: true });
    expect(result.op?.kind).toBe('vcs:issueClose');
    expect(engine.getIssue(issueId)?.status).toBe('closed');
  });
});
