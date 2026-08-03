import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  canToolRun,
  findTrellisRoot,
  GIT_MUTATION_PATTERN,
} from '../../src/vcs/authority.js';
import type { ToolInvocation } from '../../src/vcs/authority.js';

function makeTrellisRepo(): string {
  const root = mkdtempSync(join(tmpdir(), 'trellis-authority-'));
  mkdirSync(join(root, '.trellis'), { recursive: true });
  writeFileSync(join(root, '.trellis', 'config.json'), JSON.stringify({}));
  return root;
}

function bash(command: string, cwd: string): ToolInvocation {
  return { tool: 'bash', args: { command }, cwd };
}

describe('findTrellisRoot', () => {
  it('walks up to the nearest .trellis/config.json', () => {
    const root = makeTrellisRepo();
    const sub = join(root, 'src', 'deep', 'nested');
    mkdirSync(sub, { recursive: true });
    expect(findTrellisRoot(sub)).toBe(root);
  });

  it('returns null outside a repo', () => {
    const root = mkdtempSync(join(tmpdir(), 'trellis-authority-none-'));
    expect(findTrellisRoot(root)).toBeNull();
  });
});

describe('canToolRun — outside a Trellis tree', () => {
  it('allows anything when no repo root', () => {
    const root = mkdtempSync(join(tmpdir(), 'trellis-authority-out-'));
    expect(canToolRun(bash('git reset --hard', root))).toEqual({ allow: true });
  });
});

describe('canToolRun — git mutation rules', () => {
  it('denies git reset on a Trellis-owned tree, redirecting to lane promote', () => {
    const root = makeTrellisRepo();
    const d = canToolRun(bash('git reset --hard HEAD~1', root));
    expect(d).toMatchObject({
      allow: false,
      deny: true,
      redirect: 'trellis lane promote',
    });
  });

  it('denies checkout, stash, merge, rebase, commit, cherry-pick, pull', () => {
    const root = makeTrellisRepo();
    for (const cmd of [
      'git checkout main',
      'git stash',
      'git merge feature/x',
      'git rebase main',
      'git commit -m "x"',
      'git cherry-pick abc123',
      'git pull origin main',
    ]) {
      const d = canToolRun(bash(cmd, root));
      expect(d.allow, cmd).toBe(false);
    }
  });

  it('denies git fetch --all', () => {
    const root = makeTrellisRepo();
    expect(canToolRun(bash('git fetch --all', root)).allow).toBe(false);
    expect(canToolRun(bash('git fetch -all', root)).allow).toBe(false);
  });

  it('honors git -C target directory resolution', () => {
    const root = makeTrellisRepo();
    const other = mkdtempSync(join(tmpdir(), 'trellis-authority-gitdir-'));
    // -C into a non-Trellis repo from inside a Trellis repo: allowed
    expect(canToolRun(bash(`git -C ${other} reset`, root)).allow).toBe(true);
    // -C into the Trellis repo itself: denied
    expect(canToolRun(bash(`git -C ${root} reset`, other)).allow).toBe(false);
  });

  it('allows read-only git', () => {
    const root = makeTrellisRepo();
    for (const cmd of [
      'git status',
      'git diff HEAD~1',
      'git log --oneline -5',
      'git branch -a',
      'git show HEAD',
      'git push origin main',
    ]) {
      expect(canToolRun(bash(cmd, root)).allow, cmd).toBe(true);
    }
  });

  it('allows the sanctioned trellis git sync', () => {
    const root = makeTrellisRepo();
    expect(canToolRun(bash('trellis git sync', root)).allow).toBe(true);
  });
});

describe('canToolRun — .trellis protection', () => {
  it('denies direct writes into .trellis/', () => {
    const root = makeTrellisRepo();
    const d = canToolRun(bash(`rm -rf ${root}/.trellis/ops.json`, root));
    expect(d).toMatchObject({ allow: false, deny: true });
    expect(canToolRun(bash('sed -i s/x/y/ .trellis/ops.json', root)).allow).toBe(
      false,
    );
  });

  it('does not false-positive on filenames containing ".trellis"', () => {
    const root = makeTrellisRepo();
    expect(
      canToolRun(bash('pnpm vitest run .trellis-config.test.ts', root)).allow,
    ).toBe(true);
  });
});

describe('canToolRun — destructive confirm gate', () => {
  it('prompts for lane drop, repair, branch -d, db writes without confirm', () => {
    const root = makeTrellisRepo();
    for (const cmd of [
      'trellis lane drop lane-abc',
      'trellis repair',
      'trellis branch -d old',
      'trellis db create x',
    ]) {
      const d = canToolRun(bash(cmd, root));
      expect(d, cmd).toMatchObject({
        allow: false,
        prompt: true,
        confirmLabel: 'Confirm destructive',
      });
    }
  });

  it('allows destructive commands carrying the confirm escape', () => {
    const root = makeTrellisRepo();
    expect(
      canToolRun(bash('trellis lane drop lane-abc --confirm-destructive', root))
        .allow,
    ).toBe(true);
    expect(
      canToolRun(bash('TRELLIS_CONFIRM_DESTRUCTIVE=1 trellis repair', root))
        .allow,
    ).toBe(true);
  });

  it('never prompts for sanctioned promote/sync', () => {
    const root = makeTrellisRepo();
    expect(canToolRun(bash('trellis lane promote lane-abc', root)).allow).toBe(
      true,
    );
  });
});

describe('canToolRun — tool shapes', () => {
  it('handles git tools by subcommand arg', () => {
    const root = makeTrellisRepo();
    expect(
      canToolRun(
        { tool: 'git', args: { subcommand: 'reset --hard' }, cwd: root },
        {},
      ).allow,
    ).toBe(false);
    expect(
      canToolRun(
        { tool: 'git', args: { subcommand: 'status' }, cwd: root },
        {},
      ).allow,
    ).toBe(true);
  });

  it('allows non-command tools (write/edit) — policy grows later', () => {
    const root = makeTrellisRepo();
    expect(
      canToolRun({ tool: 'write', args: { filePath: 'a.ts' }, cwd: root }).allow,
    ).toBe(true);
  });

  it('tolerates a missing cwd (falls back to process cwd)', () => {
    // The test process runs inside this Trellis repo, so the fallback must
    // resolve the process cwd and apply the git rules against it — not crash.
    const d = canToolRun({
      tool: 'bash',
      args: { command: 'git reset --hard' },
      cwd: '',
    });
    expect(d.allow).toBe(false);
    if (!d.allow && 'deny' in d) {
      expect(d.reason).toMatch(/git mutations/);
    }
  });
});

describe('GIT_MUTATION_PATTERN', () => {
  it('matches the mutation verbs', () => {
    for (const cmd of [
      'git reset',
      'git checkout main',
      'git -C /x reset',
      'just trellis git sync && git commit',
      'git fetch --all',
    ]) {
      expect(GIT_MUTATION_PATTERN.test(cmd), cmd).toBe(true);
    }
  });

  it('does not match read-only verbs', () => {
    for (const cmd of ['git status', 'git log', 'git diff', 'git branch -a']) {
      expect(GIT_MUTATION_PATTERN.test(cmd), cmd).toBe(false);
    }
  });
});
