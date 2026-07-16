import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { TrellisVcsEngine } from '../../src/engine.js';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const cli = join(repoRoot, 'bin/trellis.mjs');

function run(args: string[], cwd: string) {
  // Don't inherit the parent session's TRELLIS_LANE_ID; it would make the
  // auto-commit guard skip (we want to exercise the commit path).
  const env = { ...process.env };
  delete env.TRELLIS_LANE_ID;
  return spawnSync(process.execPath, [cli, ...args], {
    cwd,
    encoding: 'utf8',
    env,
  });
}

function git(args: string[], cwd: string): string {
  return spawnSync('git', args, { cwd, encoding: 'utf8' }).stdout;
}

describe('trellis milestone --commit (auto-milestone-commit)', () => {
  let root: string;

  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), 'trellis-mm-commit-'));
    root = realpathSync(root);
    // Seed a file BEFORE init so it is snapshotted into the op log.
    writeFileSync(join(root, 'README.md'), '# seed\n');
    spawnSync('git', ['init', '-b', 'main'], { cwd: root });
    spawnSync('git', ['config', 'user.email', 'test@trellis.dev'], { cwd: root });
    spawnSync('git', ['config', 'user.name', 'Test'], { cwd: root });
    const eng = new TrellisVcsEngine({ rootPath: root });
    await eng.initRepo();
  });

  afterAll(() => {
    try {
      rmSync(root, { recursive: true, force: true });
    } catch {}
  });

  it('commits to git with the milestone message when --commit is set', () => {
    const created = run(
      ['milestone', 'create', '-m', 'Impl: auto-commit validation (TRL-x)', '--commit'],
      root,
    );
    expect(created.status).toBe(0);
    expect(created.stdout).toContain('Milestone created');
    if (!git(['log', '--oneline'], root).includes('Impl: auto-commit validation (TRL-x)')) {
      console.log('DEBUG milestone create stdout:\n', created.stdout);
      console.log('DEBUG milestone create stderr:\n', created.stderr);
      console.log('DEBUG git status:\n', git(['status', '--porcelain'], root));
    }

    const log = git(['log', '--oneline'], root);
    expect(log).toContain('Impl: auto-commit validation (TRL-x)');
  });

  it('skips auto-commit (with a warning) when a lane is active', () => {
    // Set TRELLIS_LANE_ID so the integration-only guard trips. The lane need
    // not physically exist — the guard checks the env directly.
    const env = { ...process.env, TRELLIS_LANE_ID: 'lane-fake-123' };
    const created = spawnSync(process.execPath, [cli, 'milestone', 'create', '-m', 'Lane-scoped milestone', '--commit'], {
      cwd: root,
      encoding: 'utf8',
      env,
    });
    expect(created.status).toBe(0);
    expect(created.stdout).toContain('Skipped auto-commit');
    // No new commit carrying this message.
    const log = git(['log', '--oneline'], root);
    expect(log).not.toContain('Lane-scoped milestone');
  });
});
