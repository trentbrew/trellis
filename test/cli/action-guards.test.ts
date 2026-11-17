import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { TrellisVcsEngine } from '../../src/engine.js';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
// Runs src/ rather than bin/trellis.mjs for the same reason as branch-cli:
// these assert source-level argument dispatch, not whatever dist/ holds.
const cli = join(repoRoot, 'src/cli/index.ts');

function run(args: string[], cwd: string) {
  const env = { ...process.env };
  delete env.TRELLIS_LANE_ID;
  return spawnSync('bun', [cli, ...args], { cwd, encoding: 'utf8', env });
}

// Each command takes a bare `[action]` and used to fall through to its read path
// on an unrecognized verb, so a typo quietly ran something else.
const COMMANDS: Array<{ name: string; valid: string; expected: string[] }> = [
  { name: 'milestone', valid: 'list', expected: ['create', 'list'] },
  { name: 'checkpoint', valid: 'list', expected: ['create', 'list'] },
  { name: 'garden', valid: 'stats', expected: ['list', 'show', 'stats'] },
  { name: 'sync', valid: 'status', expected: ['push', 'pull', 'status'] },
  { name: 'identity', valid: 'show', expected: ['init', 'show', 'export'] },
];

describe('bare [action] guards', () => {
  let root: string;

  beforeAll(async () => {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'trellis-action-guard-')));
    const eng = new TrellisVcsEngine({ rootPath: root });
    await eng.initRepo();
  });

  afterAll(() => {
    try {
      rmSync(root, { recursive: true, force: true });
    } catch {}
  });

  for (const { name, valid, expected } of COMMANDS) {
    describe(name, () => {
      it('rejects an unknown action instead of falling through', () => {
        const r = run([name, 'definitely-not-an-action'], root);
        expect(r.status).toBe(1);
        expect(r.stderr).toContain('Unknown action');
        for (const verb of expected) {
          expect(r.stderr).toContain(verb);
        }
      });

      it('still runs its documented default with no action', () => {
        expect(run([name], root).status).toBe(0);
      });

      it('still accepts a known action', () => {
        expect(run([name, valid], root).status).toBe(0);
      });
    });
  }

  // Documented but unbuilt: these must reach the transport-pending notice
  // rather than being rejected as unknown.
  it('keeps sync push and pull as recognized verbs', () => {
    expect(run(['sync', 'push'], root).status).toBe(0);
    expect(run(['sync', 'pull'], root).status).toBe(0);
  });
});
