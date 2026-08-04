import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { TrellisVcsEngine } from '../../src/engine.js';
import { loadLaneMeta } from '../../src/vcs/lane.js';
import {
  buildPromoteCommitMessage,
  syncIntegrationToGit,
} from '../../src/git/git-sync.js';

const TEST_ROOT = '/tmp/trellis-git-sync-test';

function git(root: string, cmd: string): string {
  return execSync(`git -C "${root}" ${cmd}`, { encoding: 'utf-8' }).trim();
}

function initGitRepo(root: string): void {
  mkdirSync(root, { recursive: true });
  git(root, 'init');
  git(root, 'config user.email "test@trellis.dev"');
  git(root, 'config user.name "Test"');
  writeFileSync(join(root, '.gitignore'), '.trellis/\n');
  writeFileSync(join(root, 'README.md'), '# test\n');
  git(root, 'add -A');
  git(root, 'commit -m "init"');
  git(root, 'branch -M main');
}

describe('git-sync', () => {
  beforeEach(async () => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
    initGitRepo(TEST_ROOT);
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  test('buildPromoteCommitMessage includes issue and files', () => {
    const msg = buildPromoteCommitMessage({
      lane: {
        id: 'lane-abc',
        issueId: 'issue:TRL-42',
        agentId: 'agent:executor',
        targetBranch: 'main',
      } as any,
      laneOps: [
        {
          kind: 'vcs:fileModify',
          vcs: { filePath: 'src/foo.ts' },
        } as any,
      ],
      issueTitle: 'Sync tiers phase 1',
    });
    expect(msg).toContain('TRL-42');
    expect(msg).toContain('Sync tiers phase 1');
    expect(msg).toContain('src/foo.ts');
  });

  test('syncIntegrationToGit commits the working tree as-is (ADR 0038)', async () => {
    const engine = new TrellisVcsEngine({
      rootPath: TEST_ROOT,
      git: { syncOnPromote: true },
    });
    await engine.initRepo({ indexWorkspace: false });
    engine.open();

    mkdirSync(join(TEST_ROOT, 'src'), { recursive: true });
    writeFileSync(join(TEST_ROOT, 'src/synced.ts'), 'hello sync');
    await engine.indexWorkspace();

    const result = syncIntegrationToGit({
      rootPath: TEST_ROOT,
      message: 'TRL-1: test sync',
    });

    expect(result.committed).toBe(true);
    expect(result.filesMaterialized).toBe(1);
    expect(existsSync(join(TEST_ROOT, 'src/synced.ts'))).toBe(true);
    expect(readFileSync(join(TEST_ROOT, 'src/synced.ts'), 'utf-8')).toBe(
      'hello sync',
    );
    expect(git(TEST_ROOT, 'log -1 --oneline')).toContain('TRL-1');
    expect(git(TEST_ROOT, 'show HEAD:src/synced.ts')).toBe('hello sync');
  });

  test('syncIntegrationToGit never overwrites disk with op-log state', async () => {
    const engine = new TrellisVcsEngine({
      rootPath: TEST_ROOT,
      git: { syncOnPromote: true },
    });
    await engine.initRepo({ indexWorkspace: false });
    engine.open();

    // Op-log knows v1.
    mkdirSync(join(TEST_ROOT, 'src'), { recursive: true });
    writeFileSync(join(TEST_ROOT, 'src/app.ts'), 'v1');
    await engine.indexWorkspace();
    await engine.syncGitIntegration({ force: true, message: 'baseline' });
    expect(git(TEST_ROOT, 'show HEAD:src/app.ts')).toBe('v1');

    // Disk drifts to v2 WITHOUT journaling (the 9801056 trap scenario).
    writeFileSync(join(TEST_ROOT, 'src/app.ts'), 'v2-dirty');

    const result = await engine.syncGitIntegration({
      force: true,
      message: 'sync after dirty',
    });

    // Disk truth survives: git HEAD has v2, not a revert to the stale v1 op.
    expect(result.committed).toBe(true);
    expect(readFileSync(join(TEST_ROOT, 'src/app.ts'), 'utf-8')).toBe(
      'v2-dirty',
    );
    expect(git(TEST_ROOT, 'show HEAD:src/app.ts')).toBe('v2-dirty');

    // The sync recorded a vcs:gitSync annotation linking the op-log to git.
    const ops = engine.getOps();
    const gitSyncs = ops.filter((op) => op.kind === 'vcs:gitSync');
    expect(gitSyncs.length).toBeGreaterThanOrEqual(1);
    expect(gitSyncs.at(-1)?.vcs?.gitBranch).toBe('main');
    expect(gitSyncs.at(-1)?.vcs?.gitCommitHash).toMatch(/^[0-9a-f]{40}$/);
  });
});

describe('ensureSessionLane', () => {
  let engine: TrellisVcsEngine;

  beforeEach(async () => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
    initGitRepo(TEST_ROOT);
    engine = new TrellisVcsEngine({
      rootPath: TEST_ROOT,
      lanes: { worktreeBind: true },
    });
    await engine.initRepo({ indexWorkspace: false });
    engine.open();
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  test('returns existing active lane for session', async () => {
    const first = await engine.ensureSessionLane({
      sessionId: 'cursor-tab-1',
    });
    const second = await engine.ensureSessionLane({
      sessionId: 'cursor-tab-1',
    });
    expect(second.id).toBe(first.id);
  });

  test('creates distinct lanes per session', async () => {
    const a = await engine.ensureSessionLane({ sessionId: 'tab-a' });
    const b = await engine.ensureSessionLane({ sessionId: 'tab-b' });
    expect(a.id).not.toBe(b.id);
    expect(loadLaneMeta(join(TEST_ROOT, '.trellis'), a.id)?.sessionId).toBe(
      'tab-a',
    );
  });
});
