import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import { runLaneShell } from '../../src/vcs/lane-sandbox.js';

const TEST_ROOT = '/tmp/trellis-lane-sandbox';
const ROOT_REPO = join(TEST_ROOT, 'root');
const CLONE = join(TEST_ROOT, 'clone');

function hasBwrap(): boolean {
  try {
    execSync('which bwrap', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

const BWRAP = hasBwrap();

/** Writes a one-shot script and points runLaneShell's `shell` override at it,
 *  so results are asserted via disk side effects rather than captured stdout
 *  (runLaneShell intentionally uses stdio: 'inherit' for real interactive use). */
function scriptedShell(cloneDir: string, script: string): string {
  const path = join(cloneDir, '.sandbox-test-script.sh');
  writeFileSync(path, `#!/bin/sh\n${script}\n`, { mode: 0o755 });
  return path;
}

describe('lane-sandbox (bwrap isolation)', () => {
  beforeEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
    mkdirSync(ROOT_REPO, { recursive: true });
    writeFileSync(join(ROOT_REPO, 'root-marker.txt'), 'root');
    mkdirSync(CLONE, { recursive: true });
    writeFileSync(join(CLONE, 'clone-marker.txt'), 'clone');
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  test.skipIf(!BWRAP)('runs a command isolated inside the clone', () => {
    const script = scriptedShell(
      CLONE,
      `pwd > pwd.out; echo "$TRELLIS_LANE_ID" > lane-id.out; echo written > sandboxed.txt`,
    );

    const code = runLaneShell({
      worktreePath: CLONE,
      laneId: 'lane-test123',
      shell: script,
    });

    expect(code).toBe(0);
    expect(readFileSync(join(CLONE, 'pwd.out'), 'utf-8').trim()).toBe(CLONE);
    expect(readFileSync(join(CLONE, 'lane-id.out'), 'utf-8').trim()).toBe(
      'lane-test123',
    );
    expect(existsSync(join(CLONE, 'sandboxed.txt'))).toBe(true);
  });

  test.skipIf(!BWRAP)('does not leak writes to the real root', () => {
    const script = scriptedShell(CLONE, `echo leaked > leaked.txt`);

    runLaneShell({ worktreePath: CLONE, laneId: 'lane-test123', shell: script });

    expect(existsSync(join(CLONE, 'leaked.txt'))).toBe(true);
    expect(existsSync(join(ROOT_REPO, 'leaked.txt'))).toBe(false);
    expect(existsSync(join(TEST_ROOT, 'leaked.txt'))).toBe(false);
  });

  test.skipIf(!BWRAP)('blocks network by default', () => {
    const script = scriptedShell(
      CLONE,
      `curl -s -m 2 https://example.com >/dev/null 2>&1 && echo reachable > net.out || echo blocked > net.out`,
    );

    const code = runLaneShell({
      worktreePath: CLONE,
      laneId: 'lane-test123',
      shell: script,
    });

    expect(code).toBe(0);
    expect(readFileSync(join(CLONE, 'net.out'), 'utf-8').trim()).toBe(
      'blocked',
    );
  });
});
