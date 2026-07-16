/**
 * `issue start` must be able to give you a lane WITHOUT a branch.
 *
 * Branch creation used to be unconditional while the lane was opt-out
 * (`--no-lane`). So a repo that treats branches as an antipattern — staying on
 * one branch permanently — had to avoid `issue start` entirely. But it is the
 * only thing that creates a lane, so opting out of branches silently opted every
 * agent out of LANES, leaving them all editing one shared tree and sweeping each
 * other's in-flight work into each other's commits.
 *
 * The lane is the isolation that matters. The branch is a naming convenience.
 */
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { TrellisVcsEngine } from '../../src/engine.js';

const TEST_ROOT = join(tmpdir(), 'trellis-issue-start-lane-branch');

describe('issue start — lane and branch are separable', () => {
  let engine: TrellisVcsEngine;
  let issueId: string;

  beforeEach(async () => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
    mkdirSync(TEST_ROOT, { recursive: true });
    engine = new TrellisVcsEngine({ rootPath: TEST_ROOT });
    await engine.initRepo();
    engine.setCheckpointThreshold(0);
    const op = await engine.createIssue('Do a thing');
    issueId = op.vcs!.issueId!;
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  test('default: creates both a lane and a branch', async () => {
    const before = engine.getCurrentBranch();
    await engine.startIssue(issueId);

    expect(engine.getActiveLaneId()).toBeDefined();
    expect(engine.getCurrentBranch()).not.toBe(before);
    expect(engine.getIssue(issueId)?.branchName).toBeDefined();
  });

  test('--no-branch: lane WITHOUT a branch, staying put', async () => {
    const before = engine.getCurrentBranch();

    await engine.startIssue(issueId, { branch: false });

    // The lane — the thing that actually isolates concurrent agents — is there.
    expect(engine.getActiveLaneId()).toBeDefined();
    // ...and we never left the branch we were on.
    expect(engine.getCurrentBranch()).toBe(before);
    expect(engine.getIssue(issueId)?.branchName).toBeUndefined();
    expect(engine.getIssue(issueId)?.status).toBe('in_progress');
  });

  test('--no-lane still works, and is now independent of --no-branch', async () => {
    await engine.startIssue(issueId, { lane: false, branch: false });

    expect(engine.getActiveLaneId()).toBeUndefined();
    expect(engine.getIssue(issueId)?.status).toBe('in_progress');
  });

  test('a lane taken without a branch still isolates ops', async () => {
    await engine.startIssue(issueId, { branch: false });
    const laneId = engine.getActiveLaneId();
    expect(laneId).toBeDefined();

    const laneBefore = engine.getLaneOpCount(laneId!);
    const integrationBefore = engine.getIntegrationOpCount();

    await engine.createStoreEntity('thing:1', 'Thing', { name: 'in-lane' });

    // The op landed in the lane journal, not integration — which is the whole
    // point of holding a lane while sharing a branch. Two agents on `main` in
    // separate lanes do not write to the same journal.
    expect(engine.getLaneOpCount(laneId!)).toBeGreaterThan(laneBefore);
    expect(engine.getIntegrationOpCount()).toBe(integrationBefore);
  });
});
