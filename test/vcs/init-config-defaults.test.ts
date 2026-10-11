import { describe, test, expect, afterEach } from 'vitest';
import { readFileSync, rmSync, mkdirSync, writeFileSync, renameSync } from 'fs';
import { join } from 'path';
import { TrellisVcsEngine } from '../../src/engine.js';
import { DERIVED_ROOT_PATH } from '../../src/core/persist/derived-refs.js';

// Unique per process — a fixed path raced when two test runs overlapped (flaky release gate).
const TEST_ROOT = `/tmp/trellis-init-config-defaults-${process.pid}-${Date.now().toString(36)}`;

describe('initRepo coordination defaults', () => {
  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
    rmSync(`${TEST_ROOT}-renamed`, { recursive: true, force: true });
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

  test('persists the derived rootPath and survives a repo rename', async () => {
    mkdirSync(TEST_ROOT, { recursive: true });
    const engine = new TrellisVcsEngine({ rootPath: TEST_ROOT });
    await engine.initRepo({ indexWorkspace: false });

    const before = JSON.parse(
      readFileSync(join(TEST_ROOT, '.trellis', 'config.json'), 'utf-8'),
    );
    expect(before.rootPath).toBe(DERIVED_ROOT_PATH);
    expect(before.createdAt).toBeDefined();

    const renamed = `${TEST_ROOT}-renamed`;
    renameSync(TEST_ROOT, renamed);

    const reopened = new TrellisVcsEngine({ rootPath: renamed });
    reopened.open();

    const after = JSON.parse(
      readFileSync(join(renamed, '.trellis', 'config.json'), 'utf-8'),
    );
    // Derived at read time — a rename needs no config edit, and the file keeps
    // the marker rather than a re-bound literal.
    expect(after.rootPath).toBe(DERIVED_ROOT_PATH);
    expect(after.createdAt).toBe(before.createdAt);
    expect(after.ignorePatterns).toEqual(before.ignorePatterns);
  });

  test('open() migrates a legacy literal rootPath to the derived form', async () => {
    mkdirSync(TEST_ROOT, { recursive: true });
    const engine = new TrellisVcsEngine({ rootPath: TEST_ROOT });
    await engine.initRepo({ indexWorkspace: false });

    // Simulate a pre-ADR-0013 config that persisted a literal absolute path.
    const configPath = join(TEST_ROOT, '.trellis', 'config.json');
    const legacy = JSON.parse(readFileSync(configPath, 'utf-8'));
    legacy.rootPath = '/some/old/absolute/path';
    writeFileSync(configPath, JSON.stringify(legacy, null, 2));

    const reopened = new TrellisVcsEngine({ rootPath: TEST_ROOT });
    reopened.open();

    const migrated = JSON.parse(readFileSync(configPath, 'utf-8'));
    expect(migrated.rootPath).toBe(DERIVED_ROOT_PATH);
    expect(migrated.createdAt).toBe(legacy.createdAt);
    expect(migrated.ignorePatterns).toEqual(legacy.ignorePatterns);
  });
});
