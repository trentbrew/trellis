/**
 * Sync checkpoint + rollback (TRL-334 Slice 3)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import type { VcsOp } from '../../src/vcs/types.js';
import {
  dryRunIntegrate,
  integrateOpsWithPipeline,
  readCheckpoint,
  rollbackFromCheckpoint,
  syncCheckpointPath,
  validateIntegrate,
} from '../../src/sync/sync-checkpoint.js';

function makeOp(hash: string, kind = 'vcs:issueCreate'): VcsOp {
  return {
    hash,
    kind,
    timestamp: new Date().toISOString(),
    agentId: 'test',
  } as VcsOp;
}

describe('sync-checkpoint', () => {
  let root: string;
  let opsPath: string;

  beforeEach(() => {
    root = join(tmpdir(), `trellis-sync-cp-${randomUUID()}`);
    mkdirSync(join(root, '.trellis'), { recursive: true });
    opsPath = join(root, '.trellis', 'ops.jsonl');
    writeFileSync(opsPath, `${JSON.stringify(makeOp('h1'))}\n`, 'utf-8');
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('dry-run reports ops that would append', () => {
    const existing = [makeOp('h1')];
    const incoming = [makeOp('h1'), makeOp('h2')];
    const { newOps } = dryRunIntegrate(existing, incoming);
    expect(newOps.map((o) => o.hash)).toEqual(['h2']);
  });

  it('validate passes for safe ops in development', () => {
    expect(validateIntegrate([makeOp('h2')]).ok).toBe(true);
  });

  it('apply creates checkpoint then appends', () => {
    const existing = [makeOp('h1')];
    const incoming = [makeOp('h2')];
    const result = integrateOpsWithPipeline(
      root,
      opsPath,
      existing,
      incoming,
      'apply',
    );
    expect(result.applied).toBe(true);
    expect(existsSync(syncCheckpointPath(root))).toBe(true);
    const cp = readCheckpoint(root);
    expect(cp?.opsContent.trim()).toContain('h1');
    const onDisk = readFileSync(opsPath, 'utf-8');
    expect(onDisk).toContain('h2');
  });

  it('rollback restores pre-apply op log', () => {
    const existing = [makeOp('h1')];
    integrateOpsWithPipeline(root, opsPath, existing, [makeOp('h2')], 'apply');
    rollbackFromCheckpoint(root, opsPath);
    const onDisk = readFileSync(opsPath, 'utf-8');
    expect(onDisk).toContain('h1');
    expect(onDisk).not.toContain('h2');
  });

  it('validate mode does not write checkpoint or ops', () => {
    integrateOpsWithPipeline(
      root,
      opsPath,
      [makeOp('h1')],
      [makeOp('h2')],
      'validate',
    );
    expect(existsSync(syncCheckpointPath(root))).toBe(false);
    expect(readFileSync(opsPath, 'utf-8')).not.toContain('h2');
  });
});
