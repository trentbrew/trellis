import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { TrellisVcsEngine } from '../../src/engine.js';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const cli = join(repoRoot, 'bin/trellis.mjs');

function run(args: string[], cwd: string) {
  // Don't inherit the parent session's TRELLIS_LANE_ID; it points at a lane
  // that doesn't exist in this temp repo and would make lane commands fail.
  const env = { ...process.env };
  delete env.TRELLIS_LANE_ID;
  return spawnSync(process.execPath, [cli, ...args], {
    cwd,
    encoding: 'utf8',
    env,
  });
}

describe('trellis issue CLI', () => {
  let root: string;

  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), 'trellis-issue-cli-'));
    root = realpathSync(root);
    const eng = new TrellisVcsEngine({ rootPath: root });
    await eng.initRepo();
  });

  afterAll(() => {
    try {
      rmSync(root, { recursive: true, force: true });
    } catch {}
  });

  it('lists issues without error', () => {
    const r = run(['issue', 'list'], root);
    expect(r.status).toBe(0);
    expect(r.stderr).toBe('');
  });

  it('creates, updates, describes, and adds acceptance criteria', () => {
    const created = run(
      [
        'issue',
        'create',
        '-t',
        'CLI smoke',
        '--ac',
        'criterion one',
        '--ac',
        'criterion two'
      ],
      root
    );
    expect(created.status).toBe(0);
    expect(created.stdout).toMatch(/TRL-1/);

    const updated = run(['issue', 'update', 'TRL-1', '--title', 'CLI smoke updated'], root);
    expect(updated.status).toBe(0);
    expect(updated.stdout).toContain('Updated TRL-1');

    const described = run(['issue', 'describe', 'TRL-1', 'short desc'], root);
    expect(described.status).toBe(0);

    const ac = run(['issue', 'ac', 'TRL-1', 'criterion three'], root);
    expect(ac.status).toBe(0);

    const shown = run(['issue', 'show', 'TRL-1'], root);
    expect(shown.status).toBe(0);
    expect(shown.stdout).toContain('CLI smoke updated');
    expect(shown.stdout).toContain('short desc');
  });

  it('surfaces errors for missing parent and empty update', () => {
    const badParent = run(['issue', 'create', '-t', 'orphan', '--parent', 'TRL-999'], root);
    expect(badParent.status).toBe(1);
    expect(badParent.stderr + badParent.stdout).toMatch(/not found/i);

    const emptyUpdate = run(['issue', 'update', 'TRL-1'], root);
    expect(emptyUpdate.status).toBe(1);
    expect(emptyUpdate.stderr + emptyUpdate.stdout).toMatch(/No updates specified/i);
  });

  it('lane list and bare lane both list a created lane', () => {
    const created = run(['issue', 'create', '-t', 'Lane list test'], root);
    expect(created.status).toBe(0);
    const issueId = created.stdout.match(/Issue created: (TRL-\d+)/i)![1];

    const made = run(['lane', 'create', '--issue', issueId], root);
    expect(made.status).toBe(0);
    const laneId = made.stdout.match(/Lane created: (\S+)/)![1];

    const listed = run(['lane', 'list'], root);
    expect(listed.status).toBe(0);
    expect(listed.stdout).toContain(laneId);

    const bare = run(['lane'], root);
    expect(bare.status).toBe(0);
    expect(bare.stdout).toContain(laneId);
  });

  it('issue list shows the claimed lane after issue start', () => {
    const created = run(['issue', 'create', '-t', 'Claim lane test'], root);
    expect(created.status).toBe(0);
    const issueId = created.stdout.match(/Issue created: (TRL-\d+)/i)![1];

    const started = run(['issue', 'start', issueId], root);
    expect(started.status).toBe(0);

    const shown = run(['issue', 'show', issueId], root);
    const laneId = shown.stdout.match(/Claim:\s*(\S+)/)![1];

    const listed = run(['issue', 'list'], root);
    expect(listed.status).toBe(0);
    expect(listed.stdout).toContain(laneId);
  });
});

describe('trellis list-command consistency (TRL-116)', () => {
  let root: string;

  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), 'trellis-list-cli-'));
    root = realpathSync(root);
    const eng = new TrellisVcsEngine({ rootPath: root });
    await eng.initRepo();
  });

  afterAll(() => {
    try {
      rmSync(root, { recursive: true, force: true });
    } catch {}
  });

  it('bare `trellis issue` lists issues', () => {
    const r = run(['issue'], root);
    expect(r.status).toBe(0);
    expect(r.stderr).toBe('');
  });

  it('bare `trellis decision` lists decisions', () => {
    const r = run(['decision'], root);
    expect(r.status).toBe(0);
    expect(r.stderr).toBe('');
  });

  it('`branch --json` emits valid JSON', () => {
    const r = run(['branch', '--json'], root);
    expect(r.status).toBe(0);
    const parsed = JSON.parse(r.stdout);
    expect(parsed).toHaveProperty('branches');
    expect(Array.isArray(parsed.branches)).toBe(true);
  });

  it('`milestone --json` emits valid JSON', () => {
    const r = run(['milestone', '--json'], root);
    expect(r.status).toBe(0);
    const parsed = JSON.parse(r.stdout);
    expect(parsed).toHaveProperty('milestones');
    expect(Array.isArray(parsed.milestones)).toBe(true);
  });

  it('`garden --json` emits valid JSON', () => {
    const r = run(['garden', '--json'], root);
    expect(r.status).toBe(0);
    const parsed = JSON.parse(r.stdout);
    expect(parsed).toHaveProperty('clusters');
    expect(Array.isArray(parsed.clusters)).toBe(true);
  });

  it('`decision list --json` emits valid JSON', () => {
    const r = run(['decision', 'list', '--json'], root);
    expect(r.status).toBe(0);
    const parsed = JSON.parse(r.stdout);
    expect(parsed).toHaveProperty('decisions');
    expect(Array.isArray(parsed.decisions)).toBe(true);
  });
});
