import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { TrellisVcsEngine } from '../../src/engine.js';
import { classifyLane, gcLanes } from '../../src/vcs/lane-gc.js';
import {
  laneDir,
  loadLaneMeta,
  saveLaneMeta,
} from '../../src/vcs/lane.js';
import { LaneOpLog } from '../../src/vcs/op-log.js';
import { createVcsOp } from '../../src/vcs/ops.js';

const TEST_ROOT = '/tmp/trellis-lane-gc';

function git(root: string, cmd: string): string {
  return execSync(`git -C "${root}" ${cmd}`, { encoding: 'utf-8' }).trim();
}

function initGitRepo(root: string): void {
  mkdirSync(root, { recursive: true });
  git(root, 'init');
  git(root, 'config user.email "test@trellis.dev"');
  git(root, 'config user.name "Test"');
  writeFileSync(join(root, 'README.md'), '# test\n');
  git(root, 'add -A');
  git(root, 'commit -m "init"');
  git(root, 'branch -M main');
}

async function appendLaneFileOp(
  rootPath: string,
  laneId: string,
  filePath: string,
  content: string,
): Promise<void> {
  const trellisDir = join(rootPath, '.trellis');
  const meta = loadLaneMeta(trellisDir, laneId)!;
  const laneLog = new LaneOpLog(laneDir(trellisDir, laneId));
  laneLog.load();
  const op = await createVcsOp('vcs:fileModify', {
    agentId: 'agent:test',
    previousHash: laneLog.getLastOp()?.hash ?? meta.baseOpHash,
    vcs: { filePath, contentHash: 'abc', laneId },
  });
  laneLog.append(op);
}

describe('lane-gc classifier (TRL-407)', () => {
  const lane = (overrides: Record<string, unknown> = {}) => ({
    id: 'lane-1',
    status: 'active',
    baseBranch: 'main',
    baseOpHash: 'h',
    targetBranch: 'main',
    agentId: 'agent:test',
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  });

  const issue = (status: string) => ({
    id: 'TRL-1',
    status,
    labels: [],
  });

  test('promote: active lane, closed issue, ops', () => {
    const row = classifyLane({ lane: lane(), issue: issue('closed') as any, opCount: 5 });
    expect(row.disposition).toBe('promote');
  });

  test('drop: closed issue, zero ops', () => {
    const row = classifyLane({ lane: lane(), issue: issue('closed') as any, opCount: 0 });
    expect(row.disposition).toBe('drop');
  });

  test('drop: abandoned issue + stale lane', () => {
    for (const s of ['cancelled', 'backlog']) {
      const row = classifyLane({ lane: lane(), issue: issue(s) as any, opCount: 0 });
      expect(row.disposition).toBe('drop');
    }
  });

  test('leave: abandoned issue but lane not stale', () => {
    const fresh = lane({
      createdAt: new Date(Date.now() - 60 * 1000).toISOString(),
    });
    const row = classifyLane({ lane: fresh, issue: issue('backlog') as any, opCount: 0 });
    expect(row.disposition).toBe('leave');
  });

  test('garden: no bound issue, no ops, stale', () => {
    const row = classifyLane({ lane: lane(), issue: null, opCount: 0 });
    expect(row.disposition).toBe('garden');
  });

  test('leave: no bound issue but has ops (retained)', () => {
    const row = classifyLane({ lane: lane(), issue: null, opCount: 3 });
    expect(row.disposition).toBe('leave');
  });

  test('leave: non-active lane status', () => {
    const row = classifyLane({
      lane: lane({ status: 'dropped' }),
      issue: issue('closed') as any,
      opCount: 5,
    });
    expect(row.disposition).toBe('leave');
  });
});

describe('lane-gc sweep (TRL-407)', () => {
  let engine: TrellisVcsEngine;

  beforeEach(async () => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
    initGitRepo(TEST_ROOT);
    engine = new TrellisVcsEngine({ rootPath: TEST_ROOT });
    await engine.initRepo({ indexWorkspace: false });
    engine.setCheckpointThreshold(0);
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  test('dry-run classifies but mutates nothing', async () => {
    const lane = await engine.createLane({ sessionId: 'ses-1' });
    await appendLaneFileOp(TEST_ROOT, lane.id, 'a.txt', 'a');
    await engine.dropLane(lane.id);
    await engine.createLane({ sessionId: 'ses-1' });

    const before = engine.getOps().map((o) => o.hash).length;
    const beforeMeta = loadLaneMeta(join(TEST_ROOT, '.trellis'), lane.id)!;

    const rows = await gcLanes(engine);
    const after = engine.getOps().length;

    expect(rows.length).toBeGreaterThan(0);
    expect(after).toBe(before); // no journal op appended on dry-run
    expect(loadLaneMeta(join(TEST_ROOT, '.trellis'), lane.id)?.updatedAt).toBe(
      beforeMeta.updatedAt,
    );
  });

  test('session filter restricts sweep', async () => {
    await engine.createLane({ sessionId: 'ses-keep' });
    const dropLane = await engine.createLane({ sessionId: 'ses-drop' });
    // stale: backdate the second lane's meta so it gardens
    const meta = loadLaneMeta(join(TEST_ROOT, '.trellis'), dropLane.id)!;
    meta.createdAt = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    meta.updatedAt = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    saveLaneMeta(join(TEST_ROOT, '.trellis'), meta);

    const rows = await gcLanes(engine, { sessionId: 'ses-drop' });
    expect(rows.every((r) => r.laneId === dropLane.id)).toBe(true);
    expect(rows.some((r) => r.disposition === 'garden')).toBe(true);
  });

  test('apply: closed-issue-with-ops lane is promoted and journaled', async () => {
    const lane = await engine.createLane();
    await appendLaneFileOp(TEST_ROOT, lane.id, 'b.txt', 'b');
    const issueOp = await engine.createIssue('Closed issue');
    const issueId = issueOp.vcs.issueId!;
    await engine.updateIssue(issueId, { status: 'closed' });
    // bind the lane to the issue
    const meta = loadLaneMeta(join(TEST_ROOT, '.trellis'), lane.id)!;
    meta.issueId = issueId;
    writeFileSync(
      join(TEST_ROOT, '.trellis', 'lanes', lane.id, 'meta.json'),
      JSON.stringify(meta, null, 2),
    );

    const before = engine.getOps().length;
    const rows = await gcLanes(engine, { apply: true });
    const after = engine.getOps().length;

    const row = rows.find((r) => r.laneId === lane.id)!;
    expect(row.disposition).toBe('promote');
    expect(row.action).toBe('promoted');
    // journal op appended (vcs:laneGc) — getOps includes it
    expect(after).toBeGreaterThan(before);
  });

  test('dirty-guard: lane with ops never dropped without --force', async () => {
    // abandoned issue (backlog) + stale lane + ops → drop classification,
    // but gcLanes guards: dirty lane is left alone without --force
    const lane = await engine.createLane();
    await appendLaneFileOp(TEST_ROOT, lane.id, 'c.txt', 'c');
    const issueOp = await engine.createIssue('Abandoned issue');
    const issueId = issueOp.vcs.issueId!;
    await engine.updateIssue(issueId, { status: 'backlog' });
    const meta = loadLaneMeta(join(TEST_ROOT, '.trellis'), lane.id)!;
    meta.issueId = issueId;
    meta.createdAt = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    meta.updatedAt = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    saveLaneMeta(join(TEST_ROOT, '.trellis'), meta);

    // classification sees drop (abandoned) but gcLanes guards dirty
    const guarded = await gcLanes(engine);
    const guardedRow = guarded.find((r) => r.laneId === lane.id)!;
    expect(guardedRow.disposition).toBe('leave');
    expect(guardedRow.reason).toContain('--force');

    // with force, drop executes
    const forced = await gcLanes(engine, { apply: true, force: true });
    const forcedRow = forced.find((r) => r.laneId === lane.id)!;
    expect(forcedRow.action).toBe('dropped');
  });

  test('gc journal op is vcs:laneGc', async () => {
    const lane = await engine.createLane();
    const issueOp = await engine.createIssue('Closed no ops');
    const issueId = issueOp.vcs.issueId!;
    await engine.updateIssue(issueId, { status: 'closed' });
    const meta = loadLaneMeta(join(TEST_ROOT, '.trellis'), lane.id)!;
    meta.issueId = issueId;
    writeFileSync(
      join(TEST_ROOT, '.trellis', 'lanes', lane.id, 'meta.json'),
      JSON.stringify(meta, null, 2),
    );

    await gcLanes(engine, { apply: true });
    const ops = engine.getOps();
    const gcOp = ops.find((o) => o.kind === 'vcs:laneGc');
    expect(gcOp).toBeTruthy();
    expect((gcOp!.vcs as any).gcDisposition).toBe('drop');
  });
});
