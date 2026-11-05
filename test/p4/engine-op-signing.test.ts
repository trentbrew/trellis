/**
 * Local op signing (ADR 0020 / 0032): with an identity on disk, every op the
 * engine mints is signed by that identity; ops ingested from peers keep their
 * own envelope.
 */
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { TrellisVcsEngine } from '../../src/engine.js';
import { createVcsOp, verifyVcsOpHash } from '../../src/vcs/ops.js';
import { createIdentity, saveIdentity } from '../../src/identity/identity.js';
import { signOp, verifyOp } from '../../src/identity/signing-middleware.js';
import { addPeer } from '../../src/vcs/peer-resolver.js';
import type { VcsOp } from '../../src/vcs/types.js';

/** Make a peer identity's key known to the local resolver (`~/.trellis/peers.json`). */
function trustPeer(name: string, peer: ReturnType<typeof createIdentity>): void {
  addPeer(name, { did: peer.did, entityId: peer.entityId, publicKey: peer.publicKey, spriteUrls: [] });
}

const TEST_ROOT = join(tmpdir(), `trellis-engine-op-signing-${process.pid}-${Date.now().toString(36)}`);

function journal(): VcsOp[] {
  return readFileSync(join(TEST_ROOT, '.trellis', 'ops.json'), 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as VcsOp);
}

describe('engine signs locally minted ops', () => {
  const originalHome = process.env.HOME;
  let home: string;

  beforeEach(() => {
    // Hermetic HOME: no person identity leaks in from the developer machine.
    home = mkdtempSync(join(tmpdir(), 'engine-op-signing-home-'));
    process.env.HOME = home;
    rmSync(TEST_ROOT, { recursive: true, force: true });
    mkdirSync(TEST_ROOT, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
  });

  async function engineWithIdentity() {
    const identity = createIdentity({ displayName: 'Sandbox' });
    mkdirSync(join(TEST_ROOT, '.trellis'), { recursive: true });
    saveIdentity(join(TEST_ROOT, '.trellis'), identity);
    const engine = new TrellisVcsEngine({ rootPath: TEST_ROOT });
    await engine.initRepo();
    engine.setCheckpointThreshold(0);
    return { engine, identity };
  }

  test('store writes are signed by the repo identity and keep a valid chain', async () => {
    const { engine, identity } = await engineWithIdentity();

    await engine.createStoreEntity('note:1', 'Note', { text: 'hello' });
    await engine.createStoreEntity('note:2', 'Note', { text: 'world' });

    const ops = journal();
    expect(ops.length).toBeGreaterThan(2);
    for (const op of ops) {
      expect(op.vcs?.signedBy).toBe(identity.entityId);
      expect(await verifyOp(op, identity.publicKey)).toBe(true);
      expect(await verifyVcsOpHash(op)).toBe(true);
    }
    for (let i = 1; i < ops.length; i++) {
      expect(ops[i]!.previousHash).toBe(ops[i - 1]!.hash);
    }
  });

  test('a reopened engine keeps signing and chaining', async () => {
    const { identity } = await engineWithIdentity();
    const reopened = new TrellisVcsEngine({ rootPath: TEST_ROOT });
    reopened.open();
    await reopened.createStoreEntity('note:3', 'Note', { text: 'again' });

    const ops = journal();
    const last = ops.at(-1)!;
    expect(await verifyOp(last, identity.publicKey)).toBe(true);
    expect(ops.at(-2)!.hash).toBe(last.previousHash);
  });

  test('repos without an identity stay unsigned', async () => {
    const engine = new TrellisVcsEngine({ rootPath: TEST_ROOT });
    await engine.initRepo();
    engine.setCheckpointThreshold(0);
    await engine.createStoreEntity('note:1', 'Note', { text: 'plain' });

    for (const op of journal()) {
      expect(op.vcs?.signature).toBeUndefined();
    }
  });

  test('ingested peer ops keep their own signature and hash', async () => {
    const { engine } = await engineWithIdentity();
    const peer = createIdentity({ displayName: 'Peer' });
    trustPeer('peer', peer);
    const last = journal().at(-1)!;
    const op = await createVcsOp('vcs:storeAssert', {
      agentId: 'agent:peer',
      previousHash: last.hash,
      vcs: { facts: [{ e: 'thing:1', a: 'name', v: 'from-peer' }] } as never,
    });
    await signOp(op, peer.privateKey, peer.entityId);
    const originalHash = op.hash;

    const result = await engine.integrateOps([structuredClone(op)]);

    expect(result.rejected).toHaveLength(0);
    const stored = journal().find((o) => o.hash === originalHash);
    expect(stored).toBeDefined();
    expect(stored!.vcs?.signedBy).toBe(peer.entityId);
    expect(await verifyOp(stored!, peer.publicKey)).toBe(true);
  });

  test('promoted lane ops are re-signed for their integration position', async () => {
    const { engine, identity } = await engineWithIdentity();
    const issue = await engine.createIssue('Signed issue');
    const lane = await engine.createLane({ name: 'signed-lane' });
    await engine.enterLane(lane.id);
    await engine.updateIssue(issue.vcs!.issueId!, { description: 'lane work' });
    await engine.createStoreEntity('thing:1', 'Thing', { name: 'x' });
    await engine.leaveLane();

    const result = await engine.promoteLane(lane.id);
    expect(result.promoted).toBe(true);

    const ops = journal();
    expect(ops.some((o) => o.laneId === lane.id)).toBe(true);
    for (const op of ops) {
      expect(await verifyOp(op, identity.publicKey)).toBe(true);
      expect(await verifyVcsOpHash(op)).toBe(true);
    }
    for (let i = 1; i < ops.length; i++) {
      expect(ops[i]!.previousHash).toBe(ops[i - 1]!.hash);
    }
  });

  // TRL-456: minted file ids are stamped on the payload, so they must be in
  // place before signing — not added afterwards by re-minting an unsigned op.
  test('file ops are signed, and the signature covers the minted entity ids', async () => {
    writeFileSync(join(TEST_ROOT, 'a.ts'), 'export const a = 1\n');
    const identity = createIdentity({ displayName: 'Sandbox' });
    mkdirSync(join(TEST_ROOT, '.trellis'), { recursive: true });
    saveIdentity(join(TEST_ROOT, '.trellis'), identity);
    const engine = new TrellisVcsEngine({ rootPath: TEST_ROOT });
    await engine.initRepo({ indexWorkspace: true });

    const ops = journal();
    const fileAdds = ops.filter((o) => o.kind === 'vcs:fileAdd');
    expect(fileAdds).toHaveLength(1);
    const add = fileAdds[0]!;
    expect(add.vcs?.fileEntityId).toMatch(/^file:f_[0-9a-f]{32}$/);
    expect(add.vcs?.dirEntityId).toMatch(/^dir:d_[0-9a-f]{32}$/);
    expect(add.vcs?.signedBy).toBe(identity.entityId);
    expect(await verifyOp(add, identity.publicKey)).toBe(true);
    expect(await verifyVcsOpHash(add)).toBe(true);
    for (let i = 1; i < ops.length; i++) {
      expect(ops[i]!.previousHash).toBe(ops[i - 1]!.hash);
    }
  });

  test('id-less file ops from pre-TRL-456 peers are not rewritten', async () => {
    const { engine } = await engineWithIdentity();
    const peer = createIdentity({ displayName: 'Old peer' });
    trustPeer('old-peer', peer);
    const last = journal().at(-1)!;
    const op = await createVcsOp('vcs:fileAdd', {
      agentId: 'agent:peer',
      previousHash: last.hash,
      vcs: { filePath: 'peer.ts', contentHash: 'sha256:peer' },
    });
    await signOp(op, peer.privateKey, peer.entityId);
    const originalHash = op.hash;

    const result = await engine.integrateOps([structuredClone(op)]);

    expect(result.rejected).toHaveLength(0);
    const stored = journal().find((o) => o.hash === originalHash);
    expect(stored).toBeDefined();
    expect(stored!.vcs?.fileEntityId).toBeUndefined();
    expect(stored!.vcs?.signedBy).toBe(peer.entityId);
    expect(await verifyOp(stored!, peer.publicKey)).toBe(true);
  });
});

describe('ingest verifies signatures on every op kind', () => {
  const originalHome = process.env.HOME;
  let home: string;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'engine-ingest-verify-home-'));
    process.env.HOME = home;
    rmSync(TEST_ROOT, { recursive: true, force: true });
    mkdirSync(TEST_ROOT, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
  });

  async function setup() {
    const engine = new TrellisVcsEngine({ rootPath: TEST_ROOT });
    await engine.initRepo();
    engine.setCheckpointThreshold(0);
    const op = await createVcsOp('vcs:storeAssert', {
      agentId: 'agent:peer',
      previousHash: journal().at(-1)!.hash,
      vcs: { facts: [{ e: 'issue:1', a: 'title', v: 'from-peer' }] } as never,
    });
    return { engine, op };
  }

  test('an op signed by an unknown key is rejected as unknown-signer', async () => {
    const { engine, op } = await setup();
    const stranger = createIdentity({ displayName: 'Stranger' });
    await signOp(op, stranger.privateKey, stranger.entityId);

    const result = await engine.integrateOps([op]);

    expect(result.applied).toBe(0);
    expect(result.rejected.map((r) => r.reason)).toEqual(['unknown-signer']);
    expect(journal().some((o) => o.hash === op.hash)).toBe(false);
  });

  test('an op claiming a known signer but signed by another key is rejected as invalid-signature', async () => {
    const { engine, op } = await setup();
    const peer = createIdentity({ displayName: 'Peer' });
    const forger = createIdentity({ displayName: 'Forger' });
    trustPeer('peer', peer);
    await signOp(op, forger.privateKey, peer.entityId);
    expect(await verifyVcsOpHash(op)).toBe(true);

    const result = await engine.integrateOps([op]);

    expect(result.applied).toBe(0);
    expect(result.rejected.map((r) => r.reason)).toEqual(['invalid-signature']);
  });

  test('unsigned ops apply and are reported as unattributed', async () => {
    const { engine, op } = await setup();

    const result = await engine.integrateOps([op]);

    expect(result.applied).toBe(1);
    expect(result.rejected).toHaveLength(0);
    expect(result.unattributed).toEqual([op.hash]);
  });
});
