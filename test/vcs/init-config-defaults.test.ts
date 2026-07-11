import { describe, test, expect, afterEach } from 'vitest';
import { readFileSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { TrellisVcsEngine } from '../../src/engine.js';

const TEST_ROOT = '/tmp/trellis-init-config-defaults';

describe('initRepo coordination defaults', () => {
  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  test('persists worktreeBind + git.syncOnPromote without requiring .git', async () => {
    mkdirSync(TEST_ROOT, { recursive: true });
    const engine = new TrellisVcsEngine({ rootPath: TEST_ROOT });
    await engine.initRepo({ indexWorkspace: false });

    const config = JSON.parse(
      readFileSync(join(TEST_ROOT, '.trellis', 'config.json'), 'utf-8'),
    );
    expect(config.lanes?.worktreeBind).toBe(true);
    expect(config.git?.syncOnPromote).toBe(true);
    expect(config.git?.remote).toBe('origin');
  });

  test('persists defaults when initializing inside a git repo', async () => {
    mkdirSync(TEST_ROOT, { recursive: true });
    writeFileSync(join(TEST_ROOT, 'README.md'), '# init\n');
    const { execSync } = await import('child_process');
    execSync(`git -C "${TEST_ROOT}" init`);
    execSync(`git -C "${TEST_ROOT}" config user.email "t@t.dev"`);
    execSync(`git -C "${TEST_ROOT}" config user.name "T"`);
    execSync(`git -C "${TEST_ROOT}" add -A`);
    execSync(`git -C "${TEST_ROOT}" commit -m "init"`);

    const engine = new TrellisVcsEngine({ rootPath: TEST_ROOT });
    await engine.initRepo({ indexWorkspace: false });

    const config = JSON.parse(
      readFileSync(join(TEST_ROOT, '.trellis', 'config.json'), 'utf-8'),
    );
    expect(config.lanes?.worktreeBind).toBe(true);
    expect(config.git?.syncOnPromote).toBe(true);
  });
});
