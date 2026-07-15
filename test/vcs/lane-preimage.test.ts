/**
 * Lane is envelope, not identity (TRL-102).
 *
 * The bug: `createVcsOp` hashes over `{kind, timestamp, agentId, previousHash,
 * vcs}`, and `stampLaneId` then mutated `op.vcs` — after the hash was computed.
 * Every op in every lane journal failed `verifyVcsOpHash` (1334/1334 in this
 * repo), and would be rejected as `hash-mismatch` at any ingest boundary,
 * i.e. lane ops could never sync to a peer.
 *
 * The fix is not "drop laneId from the preimage" — `vcs.laneId` has two roles:
 *
 *   SUBJECT — `vcs:laneCreate` / `vcs:laneDrop` / `vcs:testRun` are ABOUT a
 *     lane. They pass laneId at mint and it MUST stay hashed, or
 *     `laneCreate lane-A` and `laneCreate lane-B` collapse to one identity.
 *
 *   STAMP — every other op in a lane gets laneId as ambient context. That one
 *     belongs on the envelope: the same semantic op in two lanes must hash
 *     identically, or peers lose dedup and cherry-pick rewrites identity.
 */
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { TrellisVcsEngine } from '../../src/engine.js';
import { createVcsOp, hashVcsOp, verifyVcsOpHash } from '../../src/vcs/ops.js';
import type { VcsOp } from '../../src/vcs/types.js';

const TEST_ROOT = join(tmpdir(), 'trellis-lane-preimage');

/** Read a lane's own journal off disk — the ops that carry the stamp. */
function readLaneJournal(laneId: string): VcsOp[] {
  const p = join(TEST_ROOT, '.trellis', 'lanes', laneId, 'ops.json');
  const raw = JSON.parse(readFileSync(p, 'utf8'));
  return Array.isArray(raw) ? raw : (raw.ops ?? []);
}

describe('lane is envelope, not identity (TRL-102)', () => {
  let engine: TrellisVcsEngine;

  beforeEach(async () => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
    mkdirSync(TEST_ROOT, { recursive: true });
    engine = new TrellisVcsEngine({ rootPath: TEST_ROOT });
    await engine.initRepo();
    engine.setCheckpointThreshold(0);
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  // The headline regression: this failed for every lane op before the fix.
  test('an op minted inside a lane verifies', async () => {
    const lane = await engine.createLane();
    await engine.enterLane(lane.id);

    const op = await engine.createStoreEntity('person:ada', 'Person', {
      name: 'Ada',
    });

    expect(op.laneId).toBe(lane.id); // stamped on the envelope
    expect(op.vcs?.laneId).toBeUndefined(); // NOT in the payload
    expect(await verifyVcsOpHash(op)).toBe(true);
  });

  test('every op in a lane journal verifies', async () => {
    const lane = await engine.createLane();
    await engine.enterLane(lane.id);

    await engine.createStoreEntity('e:1', 'Thing', { n: 'one' });
    await engine.addStoreFact('e:1', 'extra', 'x');
    await engine.createStoreEntity('e:2', 'Thing', { n: 'two' });

    // Read the LANE journal off disk. `engine.getOps()` returns
    // `this.opLog.readAll()` — always integration — so asserting on it here
    // would pass while testing nothing.
    const ops = readLaneJournal(lane.id);

    expect(ops.length).toBeGreaterThan(0);
    expect(ops.every((o) => o.laneId === lane.id)).toBe(true);
    for (const op of ops) {
      expect(await verifyVcsOpHash(op), `${op.kind} failed`).toBe(true);
    }
  });

  test('the stamped lane is excluded from the preimage', async () => {
    const base = {
      kind: 'vcs:storeAssert' as const,
      timestamp: '2026-07-14T00:00:00.000Z',
      agentId: 'agent:test',
      previousHash: undefined,
      vcs: { facts: [{ e: 'e:1', a: 'n', v: 1 }] },
    };

    // hashVcsOp only picks {kind, timestamp, agentId, previousHash, vcs}, so a
    // top-level laneId cannot reach the digest. Same semantics -> same id, which
    // is what keeps cross-peer dedup and cherry-pick identity intact.
    const inLaneA = await hashVcsOp({ ...base, laneId: 'lane:a' } as never);
    const inLaneB = await hashVcsOp({ ...base, laneId: 'lane:b' } as never);
    const noLane = await hashVcsOp(base);

    expect(inLaneA).toBe(inLaneB);
    expect(inLaneA).toBe(noLane);
  });

  // The case that makes a blanket "exclude laneId" wrong.
  test('subject laneId stays hashed — laneCreate identity must not collapse', async () => {
    const a = await createVcsOp('vcs:laneCreate', {
      agentId: 'agent:test',
      vcs: { laneId: 'lane:a', baseBranch: 'main' },
    });
    const b = await createVcsOp('vcs:laneCreate', {
      agentId: 'agent:test',
      previousHash: a.previousHash,
      vcs: { laneId: 'lane:b', baseBranch: 'main' },
    });

    expect(a.hash).not.toBe(b.hash);
    expect(await verifyVcsOpHash(a)).toBe(true);
    expect(await verifyVcsOpHash(b)).toBe(true);
  });

  test('the envelope survives the journal round-trip', async () => {
    const lane = await engine.createLane();
    await engine.enterLane(lane.id);
    const minted = await engine.createStoreEntity('e:9', 'Thing', { n: 'x' });

    // Parsed back out of ops.json, not the in-memory object — a field the
    // serializer dropped would still pass an in-memory assertion.
    const readBack = readLaneJournal(lane.id).find(
      (o) => o.hash === minted.hash,
    );

    expect(readBack).toBeDefined();
    expect(readBack!.laneId).toBe(lane.id);
    expect(readBack!.vcs?.laneId).toBeUndefined();
    expect(await verifyVcsOpHash(readBack!)).toBe(true);
  });

  test('integration ops are unaffected — no lane, still verify', async () => {
    const op = await engine.createStoreEntity('e:int', 'Thing', { n: 'i' });

    expect(op.laneId).toBeUndefined();
    expect(await verifyVcsOpHash(op)).toBe(true);
  });
});
