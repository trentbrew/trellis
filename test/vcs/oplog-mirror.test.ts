import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { JsonOpLog } from '../../src/vcs/op-log.js';
import {
  findMirrorForOpsPath,
  gcOplogMirror,
  mirrorOpLine,
} from '../../src/vcs/oplog-mirror.js';
import type { VcsOp } from '../../src/vcs/types.js';

describe('oplog mirror', () => {
  const prevSkip = process.env.TRELLIS_SKIP_OPLOG_MIRROR;
  const prevMirrorDir = process.env.TRELLIS_OPLOG_MIRROR_DIR;
  let mirrorRoot: string;

  beforeEach(() => {
    delete process.env.TRELLIS_SKIP_OPLOG_MIRROR;
    mirrorRoot = mkdtempSync(join(tmpdir(), 'oplog-mirror-'));
    process.env.TRELLIS_OPLOG_MIRROR_DIR = mirrorRoot;
  });

  afterEach(() => {
    rmSync(mirrorRoot, { recursive: true, force: true });
    if (prevSkip === undefined) delete process.env.TRELLIS_SKIP_OPLOG_MIRROR;
    else process.env.TRELLIS_SKIP_OPLOG_MIRROR = prevSkip;
    if (prevMirrorDir === undefined) delete process.env.TRELLIS_OPLOG_MIRROR_DIR;
    else process.env.TRELLIS_OPLOG_MIRROR_DIR = prevMirrorDir;
  });

  function seedRepo(name: string): string {
    const repo = mkdtempSync(join(tmpdir(), `${name}-`));
    mkdirSync(join(repo, '.trellis'), { recursive: true });
    const opsPath = join(repo, '.trellis', 'ops.json');
    const log = new JsonOpLog(opsPath);
    const op: VcsOp = {
      kind: 'vcs:test',
      hash: 'trellis:op:' + 'd'.repeat(64),
      timestamp: 't',
      agentId: 'a',
    };
    log.append(op);
    return repo;
  }

  it('mirrors integration journal appends under the mirror root', () => {
    const repo = seedRepo('repo');
    const opsPath = join(repo, '.trellis', 'ops.json');

    const hit = findMirrorForOpsPath(opsPath);
    expect(hit).not.toBeNull();
    expect(hit!.lineCount).toBeGreaterThanOrEqual(1);
    expect(readFileSync(hit!.path, 'utf8')).toContain('vcs:test');
  });

  it('does not mirror lane journals', () => {
    const lane = mkdtempSync(join(tmpdir(), 'lane-'));
    const laneOps = join(lane, 'ops.json');
    mirrorOpLine(laneOps, '{"kind":"vcs:test"}\n', 'trellis:op:x');
    expect(findMirrorForOpsPath(laneOps)).toBeNull();
  });

  it('keeps mirrors whose source repo still exists', () => {
    const repo = seedRepo('live');
    const hit = findMirrorForOpsPath(join(repo, '.trellis', 'ops.json'));
    expect(hit).not.toBeNull();

    const res = gcOplogMirror();
    expect(res.kept).toBeGreaterThanOrEqual(1);
    expect(findMirrorForOpsPath(join(repo, '.trellis', 'ops.json'))).not.toBeNull();
  });

  it('prunes mirrors whose source repo is gone, dryRun leaves them', () => {
    const deadRepo = seedRepo('dead');
    const deadOpsPath = join(deadRepo, '.trellis', 'ops.json');
    expect(findMirrorForOpsPath(deadOpsPath)).not.toBeNull();

    rmSync(deadRepo, { recursive: true, force: true });

    const dry = gcOplogMirror(true);
    expect(dry.removed).toBeGreaterThanOrEqual(1);
    expect(findMirrorForOpsPath(deadOpsPath)).not.toBeNull();

    const real = gcOplogMirror(false);
    expect(real.removed).toBeGreaterThanOrEqual(1);
    expect(findMirrorForOpsPath(deadOpsPath)).toBeNull();
  });
});
