import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, test } from 'vitest';

let testDir: string;
const originalHome = process.env.HOME;

function shellQuote(arg: string): string {
  if (/^[a-zA-Z0-9_./:-]+$/.test(arg)) return arg;
  return `'${arg.replace(/'/g, `'\\''`)}'`;
}

function runCli(args: string[]): { stdout: string; stderr: string; code: number } {
  const cliPath = join(process.cwd(), 'src/cli/index.ts');
  try {
    const stdout = execSync(`bun ${cliPath} ${args.map(shellQuote).join(' ')}`, {
      cwd: testDir,
      env: { ...process.env, HOME: testDir, NO_COLOR: '1' },
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

beforeEach(() => {
  testDir = join(
    tmpdir(),
    `trellis-profile-cli-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(testDir, { recursive: true });
  process.env.HOME = testDir;
});

afterEach(() => {
  if (originalHome === undefined) delete process.env.HOME;
  else process.env.HOME = originalHome;
  if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
});

test('profile learn + show round-trip', () => {
  runCli(['init', '--no-interactive', '--path', '.']);
  const learn = runCli([
    'profile',
    'learn',
    'Prefers minimal diffs',
    '--category',
    'style',
  ]);
  expect(learn.code).toBe(0);
  expect(learn.stdout).toContain('Learning saved');

  const show = runCli(['profile', 'show']);
  expect(show.code).toBe(0);
  expect(show.stdout).toContain('Prefers minimal diffs');
  expect(show.stdout).toContain('[style]');
});

test('profile seed refreshes AGENTS.md with learnings', () => {
  runCli(['init', '--no-interactive', '--path', '.']);
  runCli(['profile', 'learn', 'Use bun for scripts']);
  const seed = runCli(['profile', 'seed', '-p', '.']);
  expect(seed.code).toBe(0);
  expect(seed.stdout).toContain('Refreshed agent scaffold');

  const agentsMd = readFileSync(
    join(testDir, '.trellis', 'agents', 'AGENTS.md'),
    'utf-8',
  );
  expect(agentsMd).toContain('## Learned Context');
  expect(agentsMd).toContain('Use bun for scripts');
});

test('profile set updates core fields', () => {
  runCli(['init', '--no-interactive', '--path', '.']);
  const set = runCli(['profile', 'set', '--bio', 'Creative technologist']);
  expect(set.code).toBe(0);
  const show = runCli(['profile', 'show']);
  expect(show.stdout).toContain('Creative technologist');
});
