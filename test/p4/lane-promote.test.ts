import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { TrellisVcsEngine } from '../../src/engine.js';
import { createVcsOp } from '../../src/vcs/ops.js';
import { loadLaneMeta } from '../../src/vcs/lane.js';
import {
  planLanePromote,
  resolveBranchHeadFromOps,
  PROMOTE_LIFECYCLE_KINDS,
} from '../../src/vcs/lane-promote.js';
import { BlobStore } from '../../src/vcs/blob-store.js';
import { BlobResolver } from '../../src/vcs/blob-resolver.js';

const TEST_ROOT = '/tmp/trellis-p4-lane-promote';

describe('Lane promote', () => {
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

  test('disjoint lane ops on different issues promote cleanly', async () => {
    const opA = await engine.createIssue('Issue A');
    const opB = await engine.createIssue('Issue B');
    const idA = opA.vcs!.issueId!;
    const idB = opB.vcs!.issueId!;

    const laneA = await engine.createLane();
    await engine.enterLane(laneA.id);
    await engine.updateIssue(idA, { description: 'lane A work' });
    await engine.leaveLane();

    const laneB = await engine.createLane();
    await engine.enterLane(laneB.id);
    await engine.updateIssue(idB, { description: 'lane B work' });
    await engine.leaveLane();

    const resultA = await engine.promoteLane(laneA.id);
    expect(resultA.promoted).toBe(true);
    expect(resultA.blockingConflicts).toHaveLength(0);
    expect(resultA.milestoneMessage).toBeTruthy();
    expect(resultA.milestoneId).toBeTruthy();

    const resultB = await engine.promoteLane(laneB.id, {
      message: 'Lane B narrative',
    });
    expect(resultB.promoted).toBe(true);
    expect(resultB.milestoneMessage).toBe('Lane B narrative');

    expect(engine.getIssue(idA)?.description).toBe('lane A work');
    expect(engine.getIssue(idB)?.description).toBe('lane B work');
    expect(loadLaneMeta(join(TEST_ROOT, '.trellis'), laneA.id)?.status).toBe(
      'promoted',
    );
    expect(loadLaneMeta(join(TEST_ROOT, '.trellis'), laneB.id)?.status).toBe(
      'promoted',
    );

    const milestones = engine.listMilestones();
    expect(milestones.some((m) => m.message === 'Lane B narrative')).toBe(true);
  });

  test('promote --no-milestone skips milestone creation', async () => {
    const lane = await engine.createLane({ name: 'skip-ms' });
    await engine.enterLane(lane.id);
    await engine.createStoreEntity('thing:1', 'Thing', { name: 'x' });
    await engine.leaveLane();

    const before = engine.listMilestones().length;
    const result = await engine.promoteLane(lane.id, { milestone: false });
    expect(result.promoted).toBe(true);
    expect(result.milestoneId).toBeUndefined();
    expect(engine.listMilestones()).toHaveLength(before);
  });

  test('draftLanePromoteMilestoneMessage prefers name then issue then files', async () => {
    const { draftLanePromoteMilestoneMessage } =
      await import('../../src/vcs/lane-promote.js');
    const meta = {
      id: 'lane-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      status: 'active' as const,
      baseBranch: 'main',
      baseOpHash: 'h',
      targetBranch: 'main',
      agentId: 'agent:t',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(
      draftLanePromoteMilestoneMessage({
        message: '  Explicit  ',
        meta,
        opsToReplay: [],
      }),
    ).toBe('Explicit');
    expect(
      draftLanePromoteMilestoneMessage({
        meta: { ...meta, name: 'tql-docs' },
        opsToReplay: [],
      }),
    ).toBe('Promote tql-docs');
    expect(
      draftLanePromoteMilestoneMessage({
        meta: { ...meta, issueId: 'issue:TRL-9' },
        opsToReplay: [],
        issueTitle: 'Do the thing',
      }),
    ).toBe('TRL-9: Do the thing');
  });

  test('stale lane status skipped when integration head is queue', async () => {
    const issueId = 'TRL-STATUS';
    const createOp = await createVcsOp('vcs:issueCreate', {
      agentId: 'agent:test',
      vcs: { issueId, issueTitle: 'Status wins', issueStatus: 'backlog' },
    });
    const startOp = await createVcsOp('vcs:issueStart', {
      agentId: 'agent:test',
      previousHash: createOp.hash,
      vcs: { issueId, oldIssueStatus: 'backlog' },
    });
    const queueOp = await createVcsOp('vcs:issueUpdate', {
      agentId: 'agent:test',
      previousHash: startOp.hash,
      vcs: { issueId, issueStatus: 'queue', oldIssueStatus: 'in_progress' },
    });
    const laneStatusOp = await createVcsOp('vcs:issueUpdate', {
      agentId: 'agent:lane',
      vcs: {
        issueId,
        issueStatus: 'in_progress',
        oldIssueStatus: 'in_progress',
      },
    });

    const integrationOps = [createOp, startOp, queueOp];
    const plan = await planLanePromote({
      laneId: 'lane-status',
      meta: {
        id: 'lane-status',
        status: 'active',
        baseBranch: 'main',
        baseOpHash: startOp.hash,
        targetBranch: 'main',
        agentId: 'agent:lane',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      targetBranch: 'main',
      snapshotHead: queueOp.hash,
      integrationOps,
      laneOps: [laneStatusOp],
    });

    expect(plan.blockingConflicts).toHaveLength(0);
    expect(plan.opsToReplay).toHaveLength(0);
    expect(plan.canPromote).toBe(false);
  });

  test('non-coordination title still hard-conflicts when integration diverged', async () => {
    const created = await engine.createIssue('Title conflict issue', {
      description: 'base',
    });
    const issueId = created.vcs!.issueId!;

    const lane = await engine.createLane();
    await engine.enterLane(lane.id);
    await engine.updateIssue(issueId, { title: 'lane title' });
    await engine.leaveLane();

    await engine.updateIssue(issueId, { title: 'integration title' });

    const plan = await engine.promoteLane(lane.id, { dryRun: true });
    expect(
      plan.blockingConflicts.some(
        (c) => c.class === 'hard' && c.attribute === 'title',
      ),
    ).toBe(true);
    expect(plan.canPromote).toBe(false);
  });

  test('integration description wins over stale lane describe', async () => {
    const created = await engine.createIssue('Conflict issue');
    const issueId = created.vcs!.issueId!;

    const lane = await engine.createLane();
    await engine.updateIssue(issueId, { description: 'integration version' });

    await engine.enterLane(lane.id);
    await engine.updateIssue(issueId, { description: 'lane version' });
    await engine.leaveLane();

    const dryRun = await engine.promoteLane(lane.id, { dryRun: true });
    expect(dryRun.blockingConflicts).toHaveLength(0);
    expect(dryRun.opsToReplay).toHaveLength(0);
    expect(engine.getIssue(issueId)?.description).toBe('integration version');
  });

  test('claim metadata does not soft-block when lane edits title', async () => {
    const created = await engine.createIssue('Claim metadata issue', {
      description: 'base description',
    });
    const issueId = created.vcs!.issueId!;

    await engine.startIssue(issueId, { branch: false });
    const laneId = engine.getActiveLaneId()!;
    await engine.leaveLane();

    await engine.enterLane(laneId);
    await engine.updateIssue(issueId, { title: 'lane changed title' });
    await engine.leaveLane();

    const plan = await engine.promoteLane(laneId, { dryRun: true });
    expect(plan.blockingConflicts).toHaveLength(0);
    expect(plan.canPromote).toBe(true);

    const result = await engine.promoteLane(laneId);
    expect(result.promoted).toBe(true);
    expect(engine.getIssue(issueId)?.title).toBe('lane changed title');
    expect(engine.getIssue(issueId)?.description).toBe('base description');
  });

  test('stale lane describe yields integration description', async () => {
    const created = await engine.createIssue('Describe wins issue', {
      description: 'base description',
    });
    const issueId = created.vcs!.issueId!;

    const lane = await engine.createLane();
    await engine.updateIssue(issueId, {
      description: 'integration description',
    });

    await engine.enterLane(lane.id);
    await engine.updateIssue(issueId, {
      description: 'lane stale description',
    });
    await engine.leaveLane();

    const plan = await engine.promoteLane(lane.id, { dryRun: true });
    expect(plan.blockingConflicts).toHaveLength(0);
    expect(plan.opsToReplay).toHaveLength(0);
    expect(engine.getIssue(issueId)?.description).toBe(
      'integration description',
    );
  });

  test('integration labels win over stale lane label replay', async () => {
    const created = await engine.createIssue('Labels wins issue', {
      labels: ['parser'],
    });
    const issueId = created.vcs!.issueId!;

    const lane = await engine.createLane();
    await engine.updateIssue(issueId, { labels: ['needs-e2e'] });

    await engine.enterLane(lane.id);
    await engine.updateIssue(issueId, { labels: ['parser', 'cli'] });
    await engine.leaveLane();

    const plan = await engine.promoteLane(lane.id, { dryRun: true });
    expect(plan.blockingConflicts).toHaveLength(0);
    expect(plan.opsToReplay).toHaveLength(0);
    expect(engine.getIssue(issueId)?.labels).toEqual(['needs-e2e']);
  });

  test('criterion added inside a lane routes to integration (no promote needed)', async () => {
    // Issue lifecycle + acceptance criteria are integration-direct kinds
    // (ISSUE_INTEGRATION_KINDS): they bypass the lane journal so issue state
    // is shared across lanes immediately.
    const created = await engine.createIssue('Parallel issue');
    const issueId = created.vcs!.issueId!;

    const lane = await engine.createLane();
    await engine.enterLane(lane.id);
    await engine.addCriterion(issueId, 'test:bun test');
    await engine.leaveLane();

    // Criterion is visible on integration without any promote.
    const issue = engine.getIssue(issueId);
    expect(issue?.criteria.some((c) => c.description === 'test:bun test')).toBe(
      true,
    );

    // The lane journal stays empty: nothing to replay, no conflicts.
    const plan = await engine.promoteLane(lane.id, { dryRun: true });
    expect(plan.blockingConflicts).toHaveLength(0);
    expect(plan.opsToReplay).toHaveLength(0);
    expect(plan.canPromote).toBe(false);
  });

  test('parallel title edit promotes when integration owns description', async () => {
    const created = await engine.createIssue('Soft conflict issue', {
      description: 'base description',
    });
    const issueId = created.vcs!.issueId!;

    const lane = await engine.createLane();
    await engine.updateIssue(issueId, {
      description: 'integration changed description',
    });

    await engine.enterLane(lane.id);
    await engine.updateIssue(issueId, { title: 'lane changed title' });
    await engine.leaveLane();

    const plan = await engine.promoteLane(lane.id, { dryRun: true });
    expect(plan.blockingConflicts).toHaveLength(0);
    expect(plan.canPromote).toBe(true);

    const result = await engine.promoteLane(lane.id);
    expect(result.promoted).toBe(true);
    expect(engine.getIssue(issueId)?.title).toBe('lane changed title');
    expect(engine.getIssue(issueId)?.description).toBe(
      'integration changed description',
    );
  });

  test('dry-run reports ready when lane ops are safe', async () => {
    const lane = await engine.createLane();
    await engine.enterLane(lane.id);
    await engine.recordDecision({
      toolName: 'test.lane',
      context: 'safe promote',
    });
    await engine.leaveLane();

    const plan = await engine.promoteLane(lane.id, { dryRun: true });
    expect(plan.canPromote).toBe(true);
    expect(plan.promoted).toBe(false);
    expect(plan.opsToReplay.length).toBe(1);
  });

  test('promote replays lane decision onto integration', async () => {
    const lane = await engine.createLane();
    await engine.enterLane(lane.id);
    await engine.recordDecision({
      toolName: 'test.lane',
      context: 'promoted decision',
    });
    await engine.leaveLane();

    const before = engine.getIntegrationOpCount();
    const result = await engine.promoteLane(lane.id);
    expect(result.promoted).toBe(true);
    expect(engine.getIntegrationOpCount()).toBeGreaterThan(before);
    expect(engine.queryDecisions()).toHaveLength(1);
  });

  test('file modify with non-overlapping edits plans a clean three-way merge', async () => {
    const blobStore = new BlobStore(join(TEST_ROOT, '.trellis'));
    const baseHash = blobStore.putSync(Buffer.from('alpha\nbeta\n', 'utf-8'));
    const integrationHash = blobStore.putSync(
      Buffer.from('alpha\nBETA\n', 'utf-8'),
    );
    const laneHash = blobStore.putSync(
      Buffer.from('alpha\nbeta\nomega\n', 'utf-8'),
    );

    const filePath = 'notes.txt';
    const integrationOps = [
      await createVcsOp('vcs:fileAdd', {
        agentId: 'agent:test',
        vcs: { filePath, contentHash: baseHash },
      }),
      await createVcsOp('vcs:fileModify', {
        agentId: 'agent:test',
        previousHash: undefined,
        vcs: { filePath, contentHash: integrationHash },
      }),
    ];
    integrationOps[1] = await createVcsOp('vcs:fileModify', {
      agentId: 'agent:test',
      previousHash: integrationOps[0]!.hash,
      vcs: { filePath, contentHash: integrationHash },
    });

    const baseOpHash = integrationOps[0]!.hash;
    const snapshotHead = integrationOps[1]!.hash;

    const laneOps = [
      await createVcsOp('vcs:fileModify', {
        agentId: 'agent:lane',
        previousHash: baseOpHash,
        vcs: { filePath, contentHash: laneHash },
      }),
    ];

    const blobResolver = new BlobResolver(blobStore, TEST_ROOT);
    const plan = await planLanePromote({
      laneId: 'lane-test',
      meta: {
        id: 'lane-test',
        status: 'active',
        baseBranch: 'main',
        baseOpHash,
        targetBranch: 'main',
        agentId: 'agent:lane',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      targetBranch: 'main',
      snapshotHead,
      integrationOps,
      laneOps,
      blobResolver,
    });

    expect(plan.blockingConflicts).toHaveLength(0);
    expect(plan.canPromote).toBe(true);
    expect(plan.opsToReplay[0]?.mergedContent).toContain('omega');
    expect(plan.opsToReplay[0]?.mergedContent).toContain('BETA');
  });

  test('file modify-modify conflict blocks promote', async () => {
    const blobStore = new BlobStore(join(TEST_ROOT, '.trellis'));
    const baseHash = blobStore.putSync(Buffer.from('same line\n', 'utf-8'));
    const integrationHash = blobStore.putSync(
      Buffer.from('integration edit\n', 'utf-8'),
    );
    const laneHash = blobStore.putSync(Buffer.from('lane edit\n', 'utf-8'));

    const filePath = 'conflict.txt';
    const addOp = await createVcsOp('vcs:fileAdd', {
      agentId: 'agent:test',
      vcs: { filePath, contentHash: baseHash },
    });
    const modOp = await createVcsOp('vcs:fileModify', {
      agentId: 'agent:test',
      previousHash: addOp.hash,
      vcs: { filePath, contentHash: integrationHash },
    });

    const laneOps = [
      await createVcsOp('vcs:fileModify', {
        agentId: 'agent:lane',
        vcs: { filePath, contentHash: laneHash },
      }),
    ];

    const plan = await planLanePromote({
      laneId: 'lane-file-conflict',
      meta: {
        id: 'lane-file-conflict',
        status: 'active',
        baseBranch: 'main',
        baseOpHash: addOp.hash,
        targetBranch: 'main',
        agentId: 'agent:lane',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      targetBranch: 'main',
      snapshotHead: modOp.hash,
      integrationOps: [addOp, modOp],
      laneOps,
      blobResolver: new BlobResolver(blobStore, TEST_ROOT),
    });

    expect(plan.canPromote).toBe(false);
    expect(plan.blockingConflicts.some((c) => c.class === 'file')).toBe(true);
  });

  test('resolveBranchHeadFromOps skips promote lifecycle at tail', async () => {
    const content = await createVcsOp('vcs:issueCreate', {
      agentId: 'agent:test',
      vcs: { issueId: 'TRL-snapshot', issueTitle: 'Snapshot head test' },
    });
    const start = await createVcsOp('vcs:lanePromoteStart', {
      agentId: 'agent:test',
      previousHash: content.hash,
      vcs: {
        laneId: 'lane-snapshot',
        targetBranch: 'issue/TRL-snapshot-spec',
        baseOpHash: content.hash,
      },
    });

    expect(PROMOTE_LIFECYCLE_KINDS.has('vcs:lanePromoteStart')).toBe(true);
    expect(
      resolveBranchHeadFromOps([content, start], 'issue/TRL-snapshot-spec'),
    ).toBe(content.hash);
  });

  test('resolveBranchHeadFromOps returns foreign integration op after lifecycle skip', async () => {
    const content = await createVcsOp('vcs:issueCreate', {
      agentId: 'agent:test',
      vcs: { issueId: 'TRL-foreign', issueTitle: 'Foreign op test' },
    });
    const foreign = await createVcsOp('vcs:issueUpdate', {
      agentId: 'agent:other',
      previousHash: content.hash,
      vcs: { issueId: 'TRL-foreign', issueTitle: 'concurrent write' },
    });
    const start = await createVcsOp('vcs:lanePromoteStart', {
      agentId: 'agent:test',
      previousHash: foreign.hash,
      vcs: {
        laneId: 'lane-foreign',
        targetBranch: 'issue/TRL-foreign-spec',
        baseOpHash: content.hash,
      },
    });

    expect(
      resolveBranchHeadFromOps(
        [content, foreign, start],
        'issue/TRL-foreign-spec',
      ),
    ).toBe(foreign.hash);
  });

  test('issue-branch lane promote succeeds end-to-end', async () => {
    const created = await engine.createIssue('Issue branch promote');
    const issueId = created.vcs!.issueId!;

    await engine.startIssue(issueId);
    const laneId = engine.getActiveLaneId()!;
    await engine.updateIssue(issueId, {
      description: 'lane work on issue branch',
    });
    await engine.leaveLane();

    const dry = await engine.promoteLane(laneId, { dryRun: true });
    expect(dry.blockingConflicts).toHaveLength(0);
    expect(dry.canPromote).toBe(true);

    const result = await engine.promoteLane(laneId);
    expect(result.promoted).toBe(true);
    expect(engine.getIssue(issueId)?.description).toBe(
      'lane work on issue branch',
    );
  });
});
