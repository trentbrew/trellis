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
  writeFileSync(join(root, '.gitignore'), '.trellis/\n');
  writeFileSync(join(root, 'README.md'), '# test\n');
  git(root, 'add -A');
  git(root, 'commit -m "init"');
  git(root, 'branch -M main');
}

describe('syncGitIntegration git-authoritative working tree (ADR 0038)', () => {
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

  test('journalWorkingTreeToOps remains available as a diagnostic', async () => {
    // 1. Journal a baseline file state via the engine (op-log knows v1).
    mkdirSync(join(TEST_ROOT, 'src'), { recursive: true });
    writeFileSync(join(TEST_ROOT, 'src/app.ts'), 'v1');
    await engine.indexWorkspace();

    const stateBefore = buildFileStateAtOp(engine.getOps());
    expect(stateBefore.get('src/app.ts')?.contentHash).toBeDefined();

    // 2. Simulate the journaling gap: edit the file DIRECTLY on disk.
    writeFileSync(join(TEST_ROOT, 'src/app.ts'), 'v2-dirty');

    // 3. Catch-up still works as a standalone diagnostic tool.
    const result = await engine.journalWorkingTreeToOps();
    expect(result.unreconciled).toEqual([]);
    expect(result.journaled).toBeGreaterThanOrEqual(1);

    const stateAfter = buildFileStateAtOp(engine.getOps());
    expect(stateAfter.get('src/app.ts')?.contentHash).not.toBe(
      stateBefore.get('src/app.ts')?.contentHash,
    );
  });

  test('git sync commits disk truth without journaling or clobbering (9801056 class)', async () => {
    mkdirSync(join(TEST_ROOT, 'src'), { recursive: true });
    writeFileSync(join(TEST_ROOT, 'src/app.ts'), 'v1');
    await engine.indexWorkspace();

    const fileOpsBefore = engine
      .getOps()
      .filter((op) => /^vcs:file(Add|Modify|Delete)/.test(op.kind)).length;

    // Commit the journaled state to git first (as a shipped baseline).
    await engine.syncGitIntegration({ force: true, message: 'baseline' });
    const gitLogBefore = git(TEST_ROOT, 'log --oneline').split('\n').length;

    // Dirty the working tree WITHOUT journaling (the trap scenario).
    writeFileSync(join(TEST_ROOT, 'src/app.ts'), 'v2-shipped-later');

    const journalSpy = vi.spyOn(engine, 'journalWorkingTreeToOps');
    const result = await engine.syncGitIntegration({
      force: true,
      message: 'sync after dirty',
    });

    // Sync never journals: the op-log is not on the write path anymore.
    expect(journalSpy).not.toHaveBeenCalled();
    journalSpy.mockRestore();

    // The shipped content survived: git HEAD has v2, not a revert to v1.
    expect(result.committed).toBe(true);
    expect(readFileSync(join(TEST_ROOT, 'src/app.ts'), 'utf-8')).toBe(
      'v2-shipped-later',
    );
    expect(git(TEST_ROOT, 'show HEAD:src/app.ts')).toBe('v2-shipped-later');

    // At most one new commit was minted by the sync.
    const gitLogAfter = git(TEST_ROOT, 'log --oneline').split('\n').length;
    expect(gitLogAfter).toBeLessThanOrEqual(gitLogBefore + 1);

    // Sync minted no file ops — only vcs:gitSync annotations.
    const fileOpsAfter = engine
      .getOps()
      .filter((op) => /^vcs:file(Add|Modify|Delete)/.test(op.kind)).length;
    expect(fileOpsAfter).toBe(fileOpsBefore);
    const syncOps = engine.getOps().filter((op) => op.kind === 'vcs:gitSync');
    expect(syncOps.length).toBeGreaterThanOrEqual(2);
  });

  test('git sync succeeds even when the working tree is unreconcilable', async () => {
    // Even if a diagnostic catch-up would fail, sync must NOT refuse or
    // materialize: git commits whatever is on disk.
    mkdirSync(join(TEST_ROOT, 'src'), { recursive: true });
    writeFileSync(join(TEST_ROOT, 'src/app.ts'), 'v1');
    await engine.indexWorkspace();

    const spy = vi
      .spyOn(engine, 'journalWorkingTreeToOps')
      .mockResolvedValue({ journaled: 0, unreconciled: ['src/app.ts'] });

    const result = await engine.syncGitIntegration({
      force: true,
      message: 'dirty',
    });

    expect(result.committed).toBe(true);
    expect(git(TEST_ROOT, 'show HEAD:src/app.ts')).toBe('v1');
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
