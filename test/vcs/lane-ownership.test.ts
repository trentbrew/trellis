/**
 * TRL-117 AC4 — cross-agent file ownership rejection.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { TrellisVcsEngine } from '../../src/engine.js';
import { createVcsOp } from '../../src/vcs/ops.js';
import {
  assertCrossAgentFileWriteAllowed,
  buildActiveLaneFileOwners,
  CrossAgentFileOwnershipError,
  formatCrossAgentOwnershipMessage,
} from '../../src/vcs/lane-ownership.js';
import { laneDir, loadLaneMeta, updateLaneHead } from '../../src/vcs/lane.js';
import { LaneOpLog } from '../../src/vcs/op-log.js';
import { BlobStore } from '../../src/vcs/blob-store.js';

const TEST_ROOT = '/tmp/trellis-trl117-ownership';

async function appendOwnedFile(
  rootPath: string,
  laneId: string,
  agentId: string,
  filePath: string,
  content: string,
): Promise<void> {
  const trellisDir = join(rootPath, '.trellis');
  const blob = new BlobStore(trellisDir);
  const hash = blob.putSync(Buffer.from(content, 'utf-8'));
  const meta = loadLaneMeta(trellisDir, laneId)!;
  const laneLog = new LaneOpLog(laneDir(trellisDir, laneId));
  laneLog.load();
  const op = await createVcsOp('vcs:fileModify', {
    agentId,
    previousHash: laneLog.getLastOp()?.hash ?? meta.baseOpHash,
    vcs: { filePath, contentHash: hash, laneId },
  });
  laneLog.append(op);
  updateLaneHead(trellisDir, laneId, op.hash);
}

describe('TRL-117 AC4 cross-agent file ownership', () => {
  let engineA: TrellisVcsEngine;

  beforeEach(async () => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
    mkdirSync(TEST_ROOT, { recursive: true });
    engineA = new TrellisVcsEngine({
      rootPath: TEST_ROOT,
      agentId: 'agent:alice',
    });
    await engineA.initRepo({ indexWorkspace: false });
    engineA.setCheckpointThreshold(0);
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  test('buildActiveLaneFileOwners indexes live lane journals', async () => {
    const lane = await engineA.createLane({ name: 'docs' });
    await appendOwnedFile(
      TEST_ROOT,
      lane.id,
      'agent:alice',
      'docs/AGENTS.md',
      'alice',
    );

    const owners = buildActiveLaneFileOwners(join(TEST_ROOT, '.trellis'));
    expect(owners.get('docs/AGENTS.md')?.agentId).toBe('agent:alice');
    expect(owners.get('docs/AGENTS.md')?.laneId).toBe(lane.id);
  });

  test('assert allows same agent; rejects other agent with handoff prompt', async () => {
    const lane = await engineA.createLane();
    await appendOwnedFile(
      TEST_ROOT,
      lane.id,
      'agent:alice',
      'src/cli/lane.ts',
      'alice',
    );

    const trellisDir = join(TEST_ROOT, '.trellis');
    const same = await createVcsOp('vcs:fileModify', {
      agentId: 'agent:alice',
      previousHash: undefined,
      vcs: { filePath: 'src/cli/lane.ts', contentHash: 'x' },
    });
    expect(() =>
      assertCrossAgentFileWriteAllowed(trellisDir, same),
    ).not.toThrow();

    const other = await createVcsOp('vcs:fileModify', {
      agentId: 'agent:bob',
      previousHash: undefined,
      vcs: { filePath: 'src/cli/lane.ts', contentHash: 'y' },
    });
    expect(() => assertCrossAgentFileWriteAllowed(trellisDir, other)).toThrow(
      CrossAgentFileOwnershipError,
    );
    try {
      assertCrossAgentFileWriteAllowed(trellisDir, other);
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toContain('protocol send');
      expect(msg).toContain('HANDOFF');
      expect(msg).toContain('agent:alice');
    }
  });

  test('engine applyOp rejects cross-agent write into owned path', async () => {
    const laneA = await engineA.createLane();
    await engineA.enterLane(laneA.id);

    const blob = engineA.getBlobStore()!;
    const hash = await blob.put(Buffer.from('alice', 'utf-8'));
    const prev = engineA.capabilityContext().getLastOp()?.hash;
    const aliceOp = await createVcsOp('vcs:fileModify', {
      agentId: 'agent:alice',
      previousHash: prev,
      vcs: { filePath: 'shared.txt', contentHash: hash },
    });
    await engineA.capabilityContext().applyOp(aliceOp);
    await engineA.leaveLane();

    const engineB = new TrellisVcsEngine({
      rootPath: TEST_ROOT,
      agentId: 'agent:bob',
    });
    engineB.open();
    engineB.setCheckpointThreshold(0);
    const laneB = await engineB.createLane();
    await engineB.enterLane(laneB.id);

    const hashB = await engineB.getBlobStore()!.put(Buffer.from('bob', 'utf-8'));
    const bobOp = await createVcsOp('vcs:fileModify', {
      agentId: 'agent:bob',
      previousHash: engineB.capabilityContext().getLastOp()?.hash,
      vcs: { filePath: 'shared.txt', contentHash: hashB },
    });

    await expect(engineB.capabilityContext().applyOp(bobOp)).rejects.toThrow(
      CrossAgentFileOwnershipError,
    );
    await engineB.leaveLane();
  });

  test('formatCrossAgentOwnershipMessage includes protocol send', () => {
    const msg = formatCrossAgentOwnershipMessage(
      'src/foo.ts',
      {
        laneId: 'lane-1',
        agentId: 'agent:executor',
        issueId: 'issue:TRL-117',
      },
      'agent:strategist',
    );
    expect(msg).toContain('trellis protocol send');
    expect(msg).toContain('--re TRL-117');
    expect(msg).toContain('HANDOFF');
  });
});
