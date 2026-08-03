import { describe, it, expect, beforeEach } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TrellisVcsEngine } from '../../src/engine.js';

describe('writeReentryCheckpoint', () => {
  let root: string;
  let engine: TrellisVcsEngine;

  beforeEach(async () => {
    root = mkdtempSync(join(tmpdir(), 'trellis-reentry-'));
    engine = new TrellisVcsEngine({ rootPath: root, agentId: 'agent:test' });
    await engine.initRepo();
  });

  it('writes an empty checkpoint when no lane is active', () => {
    const cp = engine.writeReentryCheckpoint();
    expect(cp.issueIds).toEqual([]);
    const path = join(root, '.trellis', 'reentry-checkpoint.json');
    expect(existsSync(path)).toBe(true);
    expect(JSON.parse(readFileSync(path, 'utf-8')).at).toBe(cp.at);
  });

  it('captures the active lane issue', async () => {
    const issueOp = await engine.createIssue({
      title: 'checkpoint test',
      priority: 'medium',
    });
    const issueId = issueOp.vcs.issueId!;
    const lane = await engine.createLane({ issueId });
    await engine.enterLane(lane.id);

    const cp = engine.writeReentryCheckpoint();
    expect(cp.issueIds).toContain(issueId);
  });

  it('never promotes (checkpoint is side-effect free)', async () => {
    const before = engine.getOps().length;
    engine.writeReentryCheckpoint();
    expect(engine.getOps().length).toBe(before);
  });
});

describe('reentryStatus', () => {
  let root: string;
  let engine: TrellisVcsEngine;

  beforeEach(async () => {
    root = mkdtempSync(join(tmpdir(), 'trellis-reentry-'));
    engine = new TrellisVcsEngine({ rootPath: root, agentId: 'agent:test' });
    await engine.initRepo();
  });

  it('reports no checkpoint when none written', () => {
    expect(engine.reentryStatus().checkpoint).toBeNull();
  });

  it('reports the checkpoint + lane issue after write', async () => {
    const issueOp = await engine.createIssue({ title: 'reentry', priority: 'low' });
    const lane = await engine.createLane({ issueId: issueOp.vcs.issueId });
    await engine.enterLane(lane.id);
    engine.writeReentryCheckpoint();

    const status = engine.reentryStatus();
    expect(status.checkpoint).not.toBeNull();
    expect(status.checkpoint!.issueIds).toContain(issueOp.vcs.issueId);
    expect(status.activeLaneId).toBe(lane.id);
    expect(status.issueIds).toContain(issueOp.vcs.issueId);
  });
});

describe('session usage rollup', () => {
  let root: string;
  let engine: TrellisVcsEngine;

  beforeEach(async () => {
    root = mkdtempSync(join(tmpdir(), 'trellis-usage-'));
    engine = new TrellisVcsEngine({ rootPath: root, agentId: 'agent:test' });
    await engine.initRepo();
  });

  it('records and reads back a usage rollup', () => {
    engine.recordSessionUsage({
      sessionId: 'sess_usage',
      laneId: 'lane-x',
      tokens: 4200,
      inputTokens: 3000,
      outputTokens: 1200,
      cost: 0.42,
      model: 'deepseek',
    });
    const usage = engine.getSessionUsage('sess_usage');
    expect(usage).not.toBeNull();
    expect(usage!.type).toBe('SessionUsage');
    expect(usage!.tokens).toBe(4200);
    expect(usage!.laneId).toBe('lane-x');
    expect(usage!.cost).toBe(0.42);
  });

  it('latest write wins (upsert semantics)', () => {
    engine.recordSessionUsage({ sessionId: 'sess_usage', tokens: 100 });
    engine.recordSessionUsage({ sessionId: 'sess_usage', tokens: 250 });
    const usage = engine.getSessionUsage('sess_usage');
    const tokens = engine.getEavStore().getFactsByEntity('session:sess_usage').filter((f) => f.a === 'tokens');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].v).toBe(250);
    expect(usage!.tokens).toBe(250);
  });

  it('returns null for unknown sessions', () => {
    expect(engine.getSessionUsage('sess_none')).toBeNull();
  });
});
