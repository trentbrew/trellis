import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { TrellisVcsEngine } from '../../src/engine.js';
import { claimIssue } from '../../src/vcs/issue-claim.js';
import {
  acquirePromoteLock,
  releasePromoteLock,
  getPromoteLockStatus,
} from '../../src/vcs/promote-lock.js';
import { LaneOpLog } from '../../src/vcs/op-log.js';
import { laneDir, loadLaneMeta, updateLaneHead } from '../../src/vcs/lane.js';
import { BlobStore } from '../../src/vcs/blob-store.js';
import { createVcsOp } from '../../src/vcs/ops.js';

const TEST_ROOT = '/tmp/trellis-phase2-coordination';

function initRepo(root: string): void {
  mkdirSync(root, { recursive: true });
  execSync(`git -C "${root}" init`);
  execSync(`git -C "${root}" config user.email "test@trellis.dev"`);
  execSync(`git -C "${root}" config user.name "Test"`);
  writeFileSync(join(root, 'README.md'), '# test\n');
  execSync(`git -C "${root}" add -A`);
  execSync(`git -C "${root}" commit -m "init"`);
  execSync(`git -C "${root}" branch -M main`);
}

async function appendLaneFileOp(
  rootPath: string,
  laneId: string,
  filePath: string,
  content: string,
): Promise<void> {
  const trellisDir = join(rootPath, '.trellis');
  const blob = new BlobStore(trellisDir);
  const hash = blob.putSync(Buffer.from(content, 'utf-8'));
  const meta = loadLaneMeta(trellisDir, laneId)!;
  const laneLog = new LaneOpLog(laneDir(trellisDir, laneId));
  laneLog.load();
  const op = await createVcsOp('vcs:fileModify', {
    agentId: 'agent:test',
    previousHash: laneLog.getLastOp()?.hash ?? meta.baseOpHash,
    vcs: { filePath, contentHash: hash, laneId },
  });
  laneLog.append(op);
  updateLaneHead(trellisDir, laneId, op.hash);
}

async function makeReadyEngine(): Promise<TrellisVcsEngine> {
  rmSync(TEST_ROOT, { recursive: true, force: true });
  initRepo(TEST_ROOT);
  const engine = new TrellisVcsEngine({
    rootPath: TEST_ROOT,
    lanes: { worktreeBind: false },
    git: { syncOnPromote: false },
  });
  await engine.initRepo({ indexWorkspace: false });
  engine.open();
  return engine;
}

describe('issue claim lock', () => {
  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  test('second session cannot claim same issue', async () => {
    const engine = await makeReadyEngine();
    const created = await engine.createIssue('Claim test');
    const id = created.vcs!.issueId!;
    await engine.triageIssue(id);

    const laneA = await engine.ensureSessionLane({
      sessionId: 'session-a',
      issueId: id,
    });
    expect(laneA.issueId).toBe(`issue:${id}`);

    await engine.leaveLane();
    const engineB = new TrellisVcsEngine({ rootPath: TEST_ROOT });
    engineB.open();

    await expect(
      engineB.ensureSessionLane({
        sessionId: 'session-b',
        issueId: id,
      }),
    ).rejects.toThrow(/active on lane|claimed by lane/i);

    const issue = engine.getIssue(id);
    expect(issue?.claimedLaneId).toBe(laneA.id);
    expect(issue?.claimedSessionId).toBe('session-a');
  });

  test('claim is idempotent for same lane', async () => {
    const engine = await makeReadyEngine();
    const lane = await engine.createLane({ issueId: 'issue:TRL-1' });
    const ctx = (engine as unknown as { _ctx(): import('../../src/vcs/engine-context.js').EngineContext })._ctx();
    await claimIssue(
      ctx,
      { issueId: 'TRL-1', laneId: lane.id, sessionId: 's1' },
      TEST_ROOT,
    );
    const again = await claimIssue(
      ctx,
      { issueId: 'TRL-1', laneId: lane.id, sessionId: 's1' },
      TEST_ROOT,
    );
    expect(again.alreadyClaimed).toBe(true);
  });
});

describe('promote lock', () => {
  const trellisDir = join(TEST_ROOT, '.trellis');

  beforeEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
    mkdirSync(trellisDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  test('force clears live lock', () => {
    acquirePromoteLock(trellisDir, 'lane-a');
    expect(() => acquirePromoteLock(trellisDir, 'lane-b')).toThrow(
      /Promote lock held/,
    );
    acquirePromoteLock(trellisDir, 'lane-b', { force: true });
    releasePromoteLock(trellisDir, 'lane-b');
    expect(getPromoteLockStatus(trellisDir).locked).toBe(false);
  });
});

describe('auto-promote on close', () => {
  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  test('close with confirm auto-promotes lane ops', async () => {
    const engine = await makeReadyEngine();
    const created = await engine.createIssue('Auto promote', {
      criteria: [{ description: 'OK', command: 'echo ok' }],
    });
    const id = created.vcs!.issueId!;
    await engine.triageIssue(id);
    await engine.startIssue(id, { sessionId: 'session-close' });

    const laneId = engine.getActiveLaneId()!;
    await engine.leaveLane();
    await appendLaneFileOp(TEST_ROOT, laneId, 'src/closed.ts', 'shipped');
    await engine.runCriteria(id);

    const result = await engine.closeIssue(id, { confirm: true });
    expect(result.promoteResult?.promoted).toBe(true);
    expect(result.op).toBeTruthy();

    const meta = loadLaneMeta(join(TEST_ROOT, '.trellis'), laneId)!;
    expect(meta.status).toBe('promoted');
  });
});
