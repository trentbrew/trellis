/**
 * Local op signing (ADR 0020 / 0032): with an identity on disk, every op the
 * engine mints is signed by that identity; ops ingested from peers keep their
 * own envelope.
 */
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, mkdtempSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { TrellisVcsEngine } from '../../src/engine.js';
import { createVcsOp, verifyVcsOpHash } from '../../src/vcs/ops.js';
import { createIdentity, saveIdentity } from '../../src/identity/identity.js';
import { signOp, verifyOp } from '../../src/identity/signing-middleware.js';
import type { VcsOp } from '../../src/vcs/types.js';

const TEST_ROOT = join(tmpdir(), 'trellis-engine-op-signing');

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
});
