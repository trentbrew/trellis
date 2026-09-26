import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { TrellisVcsEngine } from '../../src/engine.js';

let testDir: string;

function runCli(args: string[]): { stdout: string; stderr: string; code: number } {
  const cliPath = join(process.cwd(), 'src/cli/index.ts');
  try {
    const stdout = execSync(`bun ${cliPath} ${args.join(' ')}`, {
      cwd: testDir,
      env: { ...process.env, NO_COLOR: '1' },
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    return { stdout, stderr: '', code: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: Buffer; stderr?: Buffer; status?: number };
    return {
      stdout: e.stdout?.toString() ?? '',
      stderr: e.stderr?.toString() ?? '',
      code: e.status ?? 1,
    };
  }
}

beforeEach(async () => {
  testDir = join(
    tmpdir(),
    `trellis-plan-cli-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(testDir, { recursive: true });
  const engine = new TrellisVcsEngine({ rootPath: testDir });
  await engine.initRepo({ indexWorkspace: false });
  await engine.createIssue('CLI plan test', { forceIssueId: 'TRL-42' });
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

test('plan origins prints cursor row', () => {
  const { stdout, code } = runCli(['plan', 'origins']);
  expect(code).toBe(0);
  expect(stdout).toContain('cursor');
  expect(stdout).toContain('~/.cursor/plans');
});

test('plan capture from path writes docs/plans', () => {
  const src = join(testDir, 'scratch-plan.md');
  writeFileSync(src, '# My plan\n\n## Context\n\nTest.\n', 'utf-8');

  const { stdout, code } = runCli([
    'plan',
    'capture',
    '--issue',
    'TRL-42',
    '--from',
    'path',
    '--path',
    src,
  ]);
  expect(code).toBe(0);
  expect(stdout).toContain('Captured plan');

  const dest = join(testDir, 'docs/plans/TRL-42-plan.md');
  expect(existsSync(dest)).toBe(true);
  const body = readFileSync(dest, 'utf-8');
  expect(body).toContain('status: proposed');
  expect(body).toContain('issue: TRL-42');
  expect(body).toContain('# My plan');
});

test('plan scaffold creates empty ADR-shaped doc', () => {
  const { code } = runCli(['plan', 'scaffold', 'TRL-42']);
  expect(code).toBe(0);
  const dest = join(testDir, 'docs/plans/TRL-42-plan.md');
  expect(existsSync(dest)).toBe(true);
  expect(readFileSync(dest, 'utf-8')).toContain('## Decision');
});
