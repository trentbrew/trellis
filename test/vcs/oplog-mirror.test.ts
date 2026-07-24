import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { JsonOpLog } from '../../src/vcs/op-log.js';
import {
  findMirrorForOpsPath,
  mirrorOpLine,
} from '../../src/vcs/oplog-mirror.js';
import type { VcsOp } from '../../src/vcs/types.js';

describe('oplog mirror', () => {
  const prevSkip = process.env.TRELLIS_SKIP_OPLOG_MIRROR;

  beforeEach(() => {
    delete process.env.TRELLIS_SKIP_OPLOG_MIRROR;
  });

  afterEach(() => {
    if (prevSkip === undefined) delete process.env.TRELLIS_SKIP_OPLOG_MIRROR;
    else process.env.TRELLIS_SKIP_OPLOG_MIRROR = prevSkip;
  });

  it('mirrors integration journal appends under ~/.trellis/oplog-mirror', () => {
    const repo = mkdtempSync(join(tmpdir(), 'repo-'));
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
});
