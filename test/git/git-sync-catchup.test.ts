import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { TrellisVcsEngine } from '../../src/engine.js';
import { buildFileStateAtOp } from '../../src/vcs/diff.js';

const TEST_ROOT = '/tmp/trellis-git-sync-catchup';

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

describe('syncGitIntegration working-tree catch-up (Phase C)', () => {
  let engine: TrellisVcsEngine;

  beforeEach(async () => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
    initGitRepo(TEST_ROOT);
    engine = new TrellisVcsEngine({
      rootPath: TEST_ROOT,
      git: { syncOnPromote: true },
    });
    await engine.initRepo({ indexWorkspace: false });
    engine.open();
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  test('journalWorkingTreeToOps journals un-journaled edits before sync', async () => {
    // 1. Journal a baseline file state via the engine (op-log knows v1).
    mkdirSync(join(TEST_ROOT, 'src'), { recursive: true });
    writeFileSync(join(TEST_ROOT, 'src/app.ts'), 'v1');
    await engine.indexWorkspace();

    const stateBefore = buildFileStateAtOp(engine.getOps());
    expect(stateBefore.get('src/app.ts')?.contentHash).toBeDefined();

    // 2. Simulate the journaling gap: edit the file DIRECTLY on disk.
    //    No watcher runs; the op-log still holds v1.
    writeFileSync(join(TEST_ROOT, 'src/app.ts'), 'v2-dirty');

    // 3. Catch-up reconciles disk → op-log.
    const result = await engine.journalWorkingTreeToOps();
    expect(result.unreconciled).toEqual([]);
    expect(result.journaled).toBeGreaterThanOrEqual(1);

    const stateAfter = buildFileStateAtOp(engine.getOps());
    expect(stateAfter.get('src/app.ts')?.contentHash).not.toBe(
      stateBefore.get('src/app.ts')?.contentHash,
    );
  });

  test('git sync does NOT revert a dirty working tree (9801056 class)', async () => {
    mkdirSync(join(TEST_ROOT, 'src'), { recursive: true });
    writeFileSync(join(TEST_ROOT, 'src/app.ts'), 'v1');
    await engine.indexWorkspace();

    // Commit the journaled state to git first (as a shipped baseline).
    await engine.syncGitIntegration({ force: true, message: 'baseline' });
    const gitLogBefore = git(TEST_ROOT, 'log --oneline').split('\n').length;

    // Dirty the working tree WITHOUT journaling (the trap scenario).
    writeFileSync(join(TEST_ROOT, 'src/app.ts'), 'v2-shipped-later');

    const result = await engine.syncGitIntegration({ force: true, message: 'sync after dirty' });

    // No refusal — the tree reconciled.
    expect(result.refused).toBeUndefined();
    expect(result.refused ?? false).toBe(false);

    // The shipped content survived: git HEAD has v2, not a revert to v1.
    expect(readFileSync(join(TEST_ROOT, 'src/app.ts'), 'utf-8')).toBe(
      'v2-shipped-later',
    );
    expect(git(TEST_ROOT, 'show HEAD:src/app.ts')).toBe('v2-shipped-later');

    // The op-log now agrees with disk.
    const state = buildFileStateAtOp(engine.getOps());
    expect(state.get('src/app.ts')).toBeDefined();

    // At most one new commit was minted by the sync (the catch-up, not a revert).
    const gitLogAfter = git(TEST_ROOT, 'log --oneline').split('\n').length;
    expect(gitLogAfter).toBeLessThanOrEqual(gitLogBefore + 1);
  });

  test('git sync refuses when the working tree cannot be reconciled', async () => {
    // Simulate an unreconcilable tree: the catch-up reports a path it could
    // not journal (e.g. blob-store failure). Sync must refuse, not materialize.
    const spy = vi
      .spyOn(engine, 'journalWorkingTreeToOps')
      .mockResolvedValue({ journaled: 0, unreconciled: ['src/app.ts'] });

    const result = await engine.syncGitIntegration({ force: true, message: 'dirty' });

    expect(result.refused).toBe(true);
    expect(result.committed).toBe(false);
    expect(result.reason).toContain('could not be reconciled');
    spy.mockRestore();
  });

  test('journalWorkingTreeToOps journals deletions too', async () => {
    mkdirSync(join(TEST_ROOT, 'src'), { recursive: true });
    writeFileSync(join(TEST_ROOT, 'src/gone.ts'), 'bye');
    await engine.indexWorkspace();

    expect(existsSync(join(TEST_ROOT, 'src/gone.ts'))).toBe(true);

    // Delete on disk without journaling.
    rmSync(join(TEST_ROOT, 'src/gone.ts'));

    const result = await engine.journalWorkingTreeToOps();
    expect(result.unreconciled).toEqual([]);

    const state = buildFileStateAtOp(engine.getOps());
    expect(state.get('src/gone.ts')?.deleted).toBe(true);
  });
});
