/**
 * trellis agent CLI — list, ensure-default, run argument parsing.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { TrellisVcsEngine } from '../../src/engine.js';
import { parseAgentRunArgs } from '../../src/cli/agent-cli.js';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const cliSrc = join(repoRoot, 'src/cli/index.ts');

function run(args: string[], repoPath: string) {
  const env = { ...process.env };
  delete env.TRELLIS_LANE_ID;
  // Source CLI (same as `just trellis`) — dist/ may lag until `just build`.
  const bun = process.env.BUN_INSTALL_BIN || 'bun';
  return spawnSync(bun, ['run', cliSrc, ...args, '-p', repoPath], {
    cwd: repoRoot,
    encoding: 'utf8',
    env,
  });
}

describe('parseAgentRunArgs', () => {
  it('joins prompt words with --default', () => {
    expect(parseAgentRunArgs(['who', 'are', 'you'], true)).toEqual({
      prompt: 'who are you',
    });
  });

  it('parses agentId + multi-word prompt', () => {
    expect(parseAgentRunArgs(['agent:reader', 'list', 'active', 'projects'], false)).toEqual({
      agentId: 'agent:reader',
      prompt: 'list active projects',
    });
  });

  it('throws when --default with empty prompt', () => {
    expect(() => parseAgentRunArgs([], true)).toThrow(/Prompt required/);
  });

  it('throws when agent id missing without --default', () => {
    expect(() => parseAgentRunArgs(['only-one-word'], false)).toThrow(/Agent id and prompt required/);
  });
});

describe('trellis agent CLI', () => {
  let root: string;

  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), 'trellis-agent-cli-'));
    root = realpathSync(root);
    const eng = new TrellisVcsEngine({ rootPath: root });
    await eng.initRepo();
  });

  afterAll(() => {
    try {
      rmSync(root, { recursive: true, force: true });
    } catch {}
  });

  it('lists agents without error', () => {
    const r = run(['agent', 'list'], root);
    expect(r.status).toBe(0);
    expect(r.stderr).toBe('');
  });

  it('ensure-default creates agent:reader', () => {
    const r = run(['agent', 'ensure-default', '--json'], root);
    expect(r.status).toBe(0);
    const body = JSON.parse(r.stdout.trim());
    expect(body.id).toBe('agent:reader');

    const list = run(['agent', 'list', '--json'], root);
    expect(list.status).toBe(0);
    const agents = JSON.parse(list.stdout.trim());
    expect(agents.some((a: { id: string }) => a.id === 'agent:reader')).toBe(true);
  });

  it('run --default parses multi-word prompt via --dry-run', () => {
    run(['agent', 'ensure-default'], root);
    const r = run(
      ['agent', 'run', '--default', 'hello', 'world', '--dry-run', '--json'],
      root,
    );
    expect(r.status).toBe(0);
    const body = JSON.parse(r.stdout.trim());
    expect(body.agentId).toBe('agent:reader');
    expect(body.prompt).toBe('hello world');
  });

  it('run with explicit agent id parses multi-word prompt via --dry-run', () => {
    const r = run(
      ['agent', 'run', 'agent:reader', 'list', 'active', 'projects', '--dry-run', '--json'],
      root,
    );
    expect(r.status).toBe(0);
    const body = JSON.parse(r.stdout.trim());
    expect(body.agentId).toBe('agent:reader');
    expect(body.prompt).toBe('list active projects');
  });
});
