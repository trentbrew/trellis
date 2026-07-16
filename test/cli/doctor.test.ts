import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { inspectOpsFile } from '../../src/cli/doctor.js';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const isBun = !!(process as any).isBun;
const bunTest = isBun ? test : test.skip;
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const cliPath = join(__dirname, '../../src/cli/index.ts');

function shellQuote(arg: string): string {
  if (/^[a-zA-Z0-9_./:-]+$/.test(arg)) return arg;
  return `'${arg.replace(/'/g, `'\\''`)}'`;
}

describe('inspectOpsFile', () => {
  test('classifies legacy arrays', () => {
    const report = inspectOpsFile('[{"hash":"a"},{"hash":"b"}]');
    expect(report.format).toBe('legacy-array');
    expect(report.validLines).toBe(2);
  });

  test('classifies clean jsonl', () => {
    const report = inspectOpsFile('{"hash":"a"}\n{"hash":"b"}\n');
    expect(report.format).toBe('jsonl');
    expect(report.validLines).toBe(2);
  });

  test('classifies mixed array and jsonl content', () => {
    const report = inspectOpsFile('[{"hash":"a"}]\n{"hash":"b"}\n');
    expect(report.format).toBe('mixed');
  });
});

describe('trellis doctor cli', () => {
  let testDir = '';

  beforeEach(() => {
    if (!isBun) return;
    testDir = join(
      tmpdir(),
      `trellis-doctor-cli-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(testDir, { recursive: true });
    execSync(`npx tsx ${cliPath} init --no-interactive -p ${shellQuote(testDir)}`, {
      cwd: join(__dirname, '../..'),
      env: { ...process.env, HOME: testDir, NO_COLOR: '1' },
      stdio: 'pipe',
      encoding: 'utf-8',
    });
  });

  afterEach(() => {
    if (testDir) rmSync(testDir, { recursive: true, force: true });
  });

  bunTest('prints mutation-safety summary', () => {
    const out = execSync(`npx tsx ${cliPath} doctor -p ${shellQuote(testDir)}`, {
      cwd: join(__dirname, '../..'),
      env: { ...process.env, HOME: testDir, NO_COLOR: '1' },
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    expect(out).toContain('Trellis Doctor');
    expect(out).toContain('Safe to mutate:');
    expect(out).toContain('Ops format:');
  });
});
