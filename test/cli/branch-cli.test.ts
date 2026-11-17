import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { TrellisVcsEngine } from '../../src/engine.js';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
// Sibling CLI tests spawn bin/trellis.mjs, which imports dist/ — these assert
// source-level argument dispatch, so they run src/ directly rather than passing
// or failing on whether dist happens to be rebuilt.
const cli = join(repoRoot, 'src/cli/index.ts');

function run(args: string[], cwd: string) {
  const env = { ...process.env };
  delete env.TRELLIS_LANE_ID;
  return spawnSync('bun', [cli, ...args], {
    cwd,
    encoding: 'utf8',
    env,
  });
}

function branchNames(cwd: string): string[] {
  const r = run(['branch', 'list', '--json'], cwd);
  expect(r.status).toBe(0);
  return JSON.parse(r.stdout).branches.map((b: { name: string }) => b.name);
}

describe('trellis branch CLI', () => {
  let root: string;

  beforeAll(async () => {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'trellis-branch-cli-')));
    const eng = new TrellisVcsEngine({ rootPath: root });
    await eng.initRepo();
  });

  afterAll(() => {
    try {
      rmSync(root, { recursive: true, force: true });
    } catch {}
  });

  it('treats "list" as a verb rather than a branch name', () => {
    const r = run(['branch', 'list'], root);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('Branches');
    expect(r.stdout).not.toContain('Created and switched');
    expect(branchNames(root)).not.toContain('list');
  });

  it('accepts "ls" as an alias for list', () => {
    const r = run(['branch', 'ls'], root);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('Branches');
  });

  it('still creates and switches on a bare branch name', () => {
    const r = run(['branch', 'feature-x'], root);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('Created and switched');
    expect(branchNames(root)).toContain('feature-x');
  });

  it('switches on a bare name once the branch exists', () => {
    const r = run(['branch', 'feature-x'], root);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('Switched to branch');
  });

  it('creates explicitly with the create verb', () => {
    const r = run(['branch', 'create', 'feature-y'], root);
    expect(r.status).toBe(0);
    expect(branchNames(root)).toContain('feature-y');
  });

  it('rejects create and switch without a name', () => {
    expect(run(['branch', 'create'], root).status).toBe(1);
    expect(run(['branch', 'switch'], root).status).toBe(1);
  });

  it('rejects switching to a branch that does not exist', () => {
    const r = run(['branch', 'switch', 'no-such-branch'], root);
    expect(r.status).toBe(1);
    expect(branchNames(root)).not.toContain('no-such-branch');
  });

  it('rejects an unknown action instead of creating it', () => {
    const r = run(['branch', 'bogus', 'thing'], root);
    expect(r.status).toBe(1);
    expect(branchNames(root)).not.toContain('bogus');
  });

  it('can still name a branch after a verb, explicitly', () => {
    expect(run(['branch', 'create', 'list'], root).status).toBe(0);
    expect(branchNames(root)).toContain('list');

    // The verb must keep winning even though a branch now owns that name.
    const r = run(['branch', 'list'], root);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('Branches');
    expect(r.stdout).not.toContain('Switched to branch');

    expect(run(['branch', 'switch', 'list'], root).status).toBe(0);
  });

  it('refuses delete without destructive confirmation', () => {
    const r = run(['branch', 'delete', 'feature-y'], root);
    expect(r.status).toBe(1);
    expect(branchNames(root)).toContain('feature-y');
  });

  it('deletes with confirmation', () => {
    const r = run(
      ['branch', 'delete', 'feature-y', '--confirm-destructive'],
      root,
    );
    expect(r.status).toBe(0);
    expect(branchNames(root)).not.toContain('feature-y');
  });
});
