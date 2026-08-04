import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { TrellisVcsEngine } from '../../src/engine.js';
import { loadLaneMeta } from '../../src/vcs/lane.js';

const TEST_ROOT = '/tmp/trellis-p4-lane-worktree-bind';

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

describe('Lane worktree bind (W5-MVP)', () => {
  let engine: TrellisVcsEngine;

  beforeEach(async () => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
    initGitRepo(TEST_ROOT);
    engine = new TrellisVcsEngine({
      rootPath: TEST_ROOT,
      lanes: { worktreeBind: true },
    });
    await engine.initRepo({ indexWorkspace: false });
    engine.setCheckpointThreshold(0);
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  test('createLane provisions worktree when bind enabled', async () => {
    const lane = await engine.createLane();
    const meta = loadLaneMeta(join(TEST_ROOT, '.trellis'), lane.id)!;

    expect(meta.worktreePath).toBeTruthy();
    expect(existsSync(meta.worktreePath!)).toBe(true);
    expect(git(TEST_ROOT, 'worktree list')).toContain(meta.worktreePath!);
  });

  test('enterLane keeps lane worktree bytes as the source of truth (ADR 0038)', async () => {
    const lane = await engine.createLane();
    const meta = loadLaneMeta(join(TEST_ROOT, '.trellis'), lane.id)!;

    mkdirSync(join(meta.worktreePath!, 'src'), { recursive: true });
    writeFileSync(join(meta.worktreePath!, 'src/lane.txt'), 'lane content');

    await engine.enterLane(lane.id);

    const diskPath = join(meta.worktreePath!, 'src/lane.txt');
    expect(readFileSync(diskPath, 'utf-8')).toBe('lane content');
    await engine.leaveLane();
  });

  test('two lane worktrees isolate file content on disk', async () => {
    const laneA = await engine.createLane();
    const laneB = await engine.createLane();

    const metaA = loadLaneMeta(join(TEST_ROOT, '.trellis'), laneA.id)!;
    const metaB = loadLaneMeta(join(TEST_ROOT, '.trellis'), laneB.id)!;

    writeFileSync(join(metaA.worktreePath!, 'shared.txt'), 'content A');
    await engine.enterLane(laneA.id);
    expect(readFileSync(join(metaA.worktreePath!, 'shared.txt'), 'utf-8')).toBe(
      'content A',
    );
    await engine.leaveLane();

    expect(existsSync(join(metaB.worktreePath!, 'shared.txt'))).toBe(false);

    writeFileSync(join(metaB.worktreePath!, 'shared.txt'), 'content B');
    await engine.enterLane(laneB.id);
    expect(readFileSync(join(metaB.worktreePath!, 'shared.txt'), 'utf-8')).toBe(
      'content B',
    );
    await engine.leaveLane();
  });

  test('dropLane removes worktree', async () => {
    const lane = await engine.createLane();
    const meta = loadLaneMeta(join(TEST_ROOT, '.trellis'), lane.id)!;
    const path = meta.worktreePath!;

    await engine.dropLane(lane.id);
    expect(existsSync(path)).toBe(false);
    expect(git(TEST_ROOT, 'worktree list')).not.toContain(path);
  });
});

describe('Lane routing without worktree bind', () => {
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

  test('createLane does not set worktreePath by default', async () => {
    const lane = await engine.createLane();
    const meta = loadLaneMeta(join(TEST_ROOT, '.trellis'), lane.id)!;
    expect(meta.worktreePath).toBeUndefined();
  });
});
