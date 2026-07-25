import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync,
  mkdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const cliPath = join(__dirname, '../../src/cli/index.ts');

function shellQuote(arg: string): string {
  if (/^[a-zA-Z0-9_./:-]+$/.test(arg)) return arg;
  return `'${arg.replace(/'/g, `'\\''`)}'`;
}

function run(args: string[], cwd: string) {
  const env = { ...process.env, TRELLIS_NO_SNAPSHOT: '1' };
  delete env.TRELLIS_LANE_ID;
  try {
    const stdout = execSync(
      `npx tsx ${shellQuote(cliPath)} ${args.map(shellQuote).join(' ')}`,
      { cwd, encoding: 'utf8', env, stdio: 'pipe' },
    );
    return { status: 0, stdout, stderr: '' };
  } catch (error: any) {
    return {
      status: error?.status ?? 1,
      stdout: error?.stdout?.toString?.() ?? '',
      stderr: error?.stderr?.toString?.() ?? '',
    };
  }
}

describe('trellis init storage guardrails', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'trellis-init-storage-'));
    root = realpathSync(root);
    writeFileSync(join(root, 'package.json'), '{"name":"tiny"}\n');
    writeFileSync(join(root, 'alpha.txt'), 'a\n');
    writeFileSync(join(root, 'beta.txt'), 'b\n');
  });

  afterEach(() => {
    try {
      rmSync(root, { recursive: true, force: true });
    } catch { }
  });

  it('init defaults to minimal metadata without indexing files', () => {
    const out = run(['init', '-p', root, '--no-interactive'], root);
    expect(out.status).toBe(0);
    expect(out.stdout).toContain('Minimal workspace initialized');

    const config = JSON.parse(
      readFileSync(join(root, '.trellis', 'config.json'), 'utf8'),
    );
    expect(config.indexWorkspace).toBe(false);
  });

  it('init --index-workspace indexes existing files on small trees', () => {
    const out = run(
      ['init', '-p', root, '--no-interactive', '--index-workspace'],
      root,
    );
    expect(out.status).toBe(0);
    expect(out.stdout).toContain('Files indexed:');
    expect(out.stdout).not.toContain('Minimal workspace initialized');

    const config = JSON.parse(
      readFileSync(join(root, '.trellis', 'config.json'), 'utf8'),
    );
    expect(config.indexWorkspace).toBe(true);
  });

  it('init on large tree defaults to minimal without indexing', () => {
    for (let i = 0; i < 520; i++) {
      writeFileSync(join(root, `file-${i}.txt`), 'x\n');
    }

    const out = run(['init', '-p', root, '--no-interactive'], root);
    expect(out.status).toBe(0);
    expect(out.stdout).toContain('Minimal workspace initialized');
    expect(out.stdout).toMatch(/Files indexed:\s+0/);
  });
});
