import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { TrellisVcsEngine } from '../../src/engine.js';
import { BlobResolver } from '../../src/vcs/blob-resolver.js';
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

  test('syncIntegrationToGit commits materialized integration state', async () => {
    const engine = new TrellisVcsEngine({
      rootPath: TEST_ROOT,
      git: { syncOnPromote: true },
    });
    await engine.initRepo({ indexWorkspace: false });
    engine.open();

    mkdirSync(join(TEST_ROOT, 'src'), { recursive: true });
    writeFileSync(join(TEST_ROOT, 'src/synced.ts'), 'hello sync');
    await engine.indexWorkspace();

    const head = engine.getBranchHeadOpHash('main')!;
    const blobStore = engine.getBlobStore()!;
    const blobResolver = new BlobResolver(blobStore, TEST_ROOT);
    const result = syncIntegrationToGit({
      rootPath: TEST_ROOT,
      blobResolver,
      integrationOps: engine.getOps(),
      headOpHash: head,
      message: 'TRL-1: test sync',
    });

    expect(result.committed).toBe(true);
    expect(existsSync(join(TEST_ROOT, 'src/synced.ts'))).toBe(true);
    expect(readFileSync(join(TEST_ROOT, 'src/synced.ts'), 'utf-8')).toBe(
      'hello sync',
    );
    expect(git(TEST_ROOT, 'log -1 --oneline')).toContain('TRL-1');
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
