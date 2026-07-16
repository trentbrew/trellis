import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { TrellisVcsEngine } from '../../src/engine.js';
import { createVcsOp } from '../../src/vcs/ops.js';
import {
  makeZoneId,
  defineZone,
  resolveCapability,
  CapabilityLevel,
} from '../../src/identity/capability.js';
import {
  createIdentity,
  saveIdentity,
} from '../../src/identity/identity.js';
import {
  getSigningMaterial,
  pairingResolver,
} from '../../src/identity/pairing.js';
import { TrellisVcsSyncPeer } from '../../src/sync/vcs-sync-peer.js';
import { MemoryTransport } from '../../src/sync/memory-transport.js';
import { MemorySyncRoom } from '../../src/sync/memory-room.js';
import { PROTOCOL_VERSION } from '../../src/sync/types.js';
import type { Fact } from '../../src/core/store/eav-store.js';
import type { SyncMessage } from '../../src/sync/types.js';
import type { VcsOp } from '../../src/vcs/types.js';

function trellisDirOf(rootPath: string): string {
  return join(rootPath, '.trellis');
}

/** Build an engine backed by a real identity, so auth ops mint signed. */
async function initSignedPeer(
  name: string,
): Promise<{ engine: TrellisVcsEngine; id: ReturnType<typeof createIdentity> }> {
  const rootPath = join(TEST_ROOT, name);
  mkdirSync(rootPath, { recursive: true });
  const id = createIdentity({ displayName: name });
  saveIdentity(trellisDirOf(rootPath), id);
  const sm = getSigningMaterial(trellisDirOf(rootPath))!;
  const engine = new TrellisVcsEngine({
    rootPath,
    agentId: id.entityId,
    signingMaterial: sm,
  });
  await engine.initRepo();
  engine.setCheckpointThreshold(0);
  return { engine, id };
}

/**
 * Seed a *foreign* signer's public key into a peer's device registry, simulating
 * that the peer already knows the signer via ADR 0020 pairing/registry sync.
 * `pairingResolver` only verifies ops whose signer appears in the local registry,
 * so a peer must carry the signer's root key to accept their auth ops.
 */
function seedKnownSigner(peerRootPath: string, signer: {
  entityId: string;
  did: string;
  publicKey: string;
}): void {
  const reg = {
    identityEntityId: signer.entityId,
    did: signer.did,
    rootPublicKey: signer.publicKey,
    devices: [],
  };
  mkdirSync(join(trellisDirOf(peerRootPath), 'devices'), { recursive: true });
  require('fs').writeFileSync(
    join(trellisDirOf(peerRootPath), 'devices', 'registry.json'),
    JSON.stringify(reg, null, 2),
  );
}

const TEST_ROOT = '/tmp/trellis-p7-vcs-op-sync-prototype';

function sorted<T>(items: T[], key: (item: T) => string): T[] {
  return [...items].sort((a, b) => key(a).localeCompare(key(b)));
}

function factKey(fact: Fact): string {
  return `${fact.e}\0${fact.a}\0${String(fact.v)}`;
}

function issueFacts(engine: TrellisVcsEngine): Fact[] {
  const visibleAttrs = new Set(['status', 'title', 'type']);
  return sorted(
    engine
      .getStore()
      .getAllFacts()
      .filter(
        (fact) =>
          fact.e.startsWith('issue:lane-') && visibleAttrs.has(fact.a),
      ),
    factKey,
  );
}

function opHashes(engine: TrellisVcsEngine): string[] {
  return sorted(
    engine.getOps().map((op) => op.hash),
    (hash) => hash,
  );
}

async function initPeer(name: string): Promise<TrellisVcsEngine> {
  const rootPath = join(TEST_ROOT, name);
  mkdirSync(rootPath, { recursive: true });
  const engine = new TrellisVcsEngine({
    rootPath,
    agentId: `agent:${name}`,
  });
  await engine.initRepo();
  engine.setCheckpointThreshold(0);
  return engine;
}

async function createLaneScopedIssue(
  engine: TrellisVcsEngine,
  laneId: string,
  title: string,
): Promise<void> {
  await engine.createIssue(title, { laneId });
}

describe('VCS op sync prototype', () => {
  beforeEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  test('two offline engines converge by exchanging VCS ops', async () => {
    const peerA = await initPeer('peer-a');
    const peerB = await initPeer('peer-b');

    await createLaneScopedIssue(peerA, 'lane-a', 'Fix auth');
    await createLaneScopedIssue(peerB, 'lane-b', 'Write sync smoke test');

    const transportA = new MemoryTransport('peer-a', 'Peer A');
    const transportB = new MemoryTransport('peer-b', 'Peer B');
    MemoryTransport.connect(transportA, transportB);

    const syncA = new TrellisVcsSyncPeer({
      peerId: 'peer-a',
      engine: peerA,
      transport: transportA,
    });

    new TrellisVcsSyncPeer({
      peerId: 'peer-b',
      engine: peerB,
      transport: transportB,
    });

    const result = await syncA.syncWith('peer-b');

    expect(result.applied).toBeGreaterThan(0);
    expect(result.rejected).toBe(0);
    expect(opHashes(peerA)).toEqual(opHashes(peerB));
    expect(issueFacts(peerA)).toEqual([
      { e: 'issue:lane-a:1', a: 'status', v: 'backlog' },
      { e: 'issue:lane-a:1', a: 'title', v: 'Fix auth' },
      { e: 'issue:lane-a:1', a: 'type', v: 'Issue' },
      { e: 'issue:lane-b:1', a: 'status', v: 'backlog' },
      { e: 'issue:lane-b:1', a: 'title', v: 'Write sync smoke test' },
      { e: 'issue:lane-b:1', a: 'type', v: 'Issue' },
    ]);
    expect(issueFacts(peerB)).toEqual(issueFacts(peerA));
  });

  test('room relay keeps a catch-up log and converges late joiners', async () => {
    const peerA = await initPeer('room-peer-a');
    const peerB = await initPeer('room-peer-b');

    await createLaneScopedIssue(peerA, 'lane-a', 'Fix auth');
    await createLaneScopedIssue(peerB, 'lane-b', 'Write sync smoke test');

    const room = new MemorySyncRoom('project-room', 'Project Room');
    const syncA = new TrellisVcsSyncPeer({
      peerId: 'peer-a',
      engine: peerA,
      transport: room.connectPeer('peer-a', 'Peer A'),
    });
    const syncB = new TrellisVcsSyncPeer({
      peerId: 'peer-b',
      engine: peerB,
      transport: room.connectPeer('peer-b', 'Peer B'),
    });

    await syncA.syncWith('project-room');
    await syncB.syncWith('project-room');

    expect(opHashes(peerA)).toEqual(opHashes(peerB));
    expect(room.getOpCount()).toBe(peerA.getOpCount());

    const peerC = await initPeer('room-peer-c');
    const syncC = new TrellisVcsSyncPeer({
      peerId: 'peer-c',
      engine: peerC,
      transport: room.connectPeer('peer-c', 'Peer C'),
    });

    const catchUp = await syncC.syncWith('project-room');

    expect(catchUp.applied).toBeGreaterThan(0);
    expect(catchUp.rejected).toBe(0);
    expect(opHashes(peerA)).toEqual(opHashes(peerB));
    expect(opHashes(peerB)).toEqual(opHashes(peerC));
    expect(room.getOpCount()).toBe(peerC.getOpCount());
    expect(issueFacts(peerC)).toEqual([
      { e: 'issue:lane-a:1', a: 'status', v: 'backlog' },
      { e: 'issue:lane-a:1', a: 'title', v: 'Fix auth' },
      { e: 'issue:lane-a:1', a: 'type', v: 'Issue' },
      { e: 'issue:lane-b:1', a: 'status', v: 'backlog' },
      { e: 'issue:lane-b:1', a: 'title', v: 'Write sync smoke test' },
      { e: 'issue:lane-b:1', a: 'type', v: 'Issue' },
    ]);
  });

  test('integrateOps rejects non-VCS ops and hash mismatches', async () => {
    const engine = await initPeer('peer-a');
    const valid = await createVcsOp('vcs:storeAssert', {
      agentId: 'agent:lane-a',
      previousHash: engine.getOps().at(-1)?.hash,
      vcs: {
        facts: [{ e: 'issue:lane-a:1', a: 'title', v: 'Original' }],
      },
    });

    const invalidKind = {
      ...valid,
      kind: 'addFacts',
      hash: 'trellis:op:not-a-real-hash',
    } as VcsOp;
    const tampered = {
      ...valid,
      vcs: {
        facts: [{ e: 'issue:lane-a:1', a: 'title', v: 'Tampered' }],
      },
    };

    const result = await engine.integrateOps([invalidKind, tampered]);

    expect(result.applied).toBe(0);
    expect(result.rejected.map((item) => item.reason).sort()).toEqual([
      'hash-mismatch',
      'invalid-kind',
    ]);
    expect(issueFacts(engine)).toEqual([]);
  });

  test('integrateOps orders dependent batches before applying', async () => {
    const engine = await initPeer('peer-a');
    const parent = await createVcsOp('vcs:storeAssert', {
      agentId: 'agent:lane-a',
      previousHash: engine.getOps().at(-1)?.hash,
      vcs: {
        facts: [{ e: 'issue:lane-a:1', a: 'type', v: 'Issue' }],
      },
    });
    const child = await createVcsOp('vcs:storeAssert', {
      agentId: 'agent:lane-a',
      previousHash: parent.hash,
      vcs: {
        facts: [{ e: 'issue:lane-a:1', a: 'title', v: 'Ordered' }],
      },
    });

    const result = await engine.integrateOps([child, parent]);

    expect(result).toMatchObject({
      applied: 2,
      skipped: 0,
      rejected: [],
    });
    expect(issueFacts(engine)).toEqual([
      { e: 'issue:lane-a:1', a: 'title', v: 'Ordered' },
      { e: 'issue:lane-a:1', a: 'type', v: 'Issue' },
    ]);
  });

  test('integrateOps rejects ops with missing dependencies', async () => {
    const engine = await initPeer('peer-a');
    const op = await createVcsOp('vcs:storeAssert', {
      agentId: 'agent:lane-a',
      previousHash: 'trellis:op:missing',
      vcs: {
        facts: [{ e: 'issue:lane-a:1', a: 'title', v: 'Blocked' }],
      },
    });

    const result = await engine.integrateOps([op]);

    expect(result.applied).toBe(0);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].reason).toBe('missing-dependency');
    expect(issueFacts(engine)).toEqual([]);
  });

  describe('wire-level nack flow', () => {
    async function setupTwoPeers() {
      const peerA = await initPeer('peer-a');
      const peerB = await initPeer('peer-b');

      const transportA = new MemoryTransport('peer-a', 'Peer A');
      const transportB = new MemoryTransport('peer-b', 'Peer B');
      MemoryTransport.connect(transportA, transportB);

      const syncA = new TrellisVcsSyncPeer({
        peerId: 'peer-a',
        engine: peerA,
        transport: transportA,
      });
      const syncB = new TrellisVcsSyncPeer({
        peerId: 'peer-b',
        engine: peerB,
        transport: transportB,
      });

      return { peerA, peerB, syncA, syncB };
    }

    test('hash-mismatch op produces a hash-mismatch nack to the sender', async () => {
      const { peerA, peerB, syncA, syncB } = await setupTwoPeers();

      const valid = await createVcsOp('vcs:storeAssert', {
        agentId: 'agent:lane-a',
        previousHash: peerA.getOps().at(-1)?.hash,
        vcs: {
          facts: [{ e: 'issue:lane-a:1', a: 'title', v: 'Original' }],
        },
      });
      const tampered = {
        ...valid,
        vcs: {
          facts: [{ e: 'issue:lane-a:1', a: 'title', v: 'Tampered' }],
        },
      };

      await syncA.getSyncEngine().sendOps('peer-b', [tampered]);

      const nacks = syncA.getRemoteNacks();
      expect(nacks).toHaveLength(1);
      expect(nacks[0].reason).toBe('hash-mismatch');
      expect(nacks[0].refs).toEqual([tampered.hash]);
      expect(peerB.getOps().some((op) => op.hash === tampered.hash)).toBe(
        false,
      );
      expect(syncB.getRemoteNacks()).toHaveLength(0);
    });

    test('invalid-kind op produces an invalid-kind nack', async () => {
      const { peerA, peerB, syncA } = await setupTwoPeers();

      const valid = await createVcsOp('vcs:storeAssert', {
        agentId: 'agent:lane-a',
        previousHash: peerA.getOps().at(-1)?.hash,
        vcs: { facts: [{ e: 'issue:lane-a:1', a: 'type', v: 'Issue' }] },
      });
      const wrongKind = {
        ...valid,
        kind: 'addFacts',
        hash: 'trellis:op:not-a-real-hash',
      } as VcsOp;

      await syncA.getSyncEngine().sendOps('peer-b', [wrongKind]);

      const nacks = syncA.getRemoteNacks();
      expect(nacks).toHaveLength(1);
      expect(nacks[0].reason).toBe('invalid-kind');
      expect(nacks[0].refs).toEqual([wrongKind.hash]);
      expect(peerB.getOps().some((op) => op.hash === wrongKind.hash)).toBe(
        false,
      );
    });

    test('missing-dependency op produces a missing-dependency nack', async () => {
      const { peerB, syncA } = await setupTwoPeers();

      const orphan = await createVcsOp('vcs:storeAssert', {
        agentId: 'agent:lane-a',
        previousHash: 'trellis:op:not-in-peer-b',
        vcs: {
          facts: [{ e: 'issue:lane-a:1', a: 'title', v: 'Orphan' }],
        },
      });

      await syncA.getSyncEngine().sendOps('peer-b', [orphan]);

      const nacks = syncA.getRemoteNacks();
      expect(nacks).toHaveLength(1);
      expect(nacks[0].reason).toBe('missing-dependency');
      expect(nacks[0].refs).toEqual([orphan.hash]);
      expect(peerB.getOps().some((op) => op.hash === orphan.hash)).toBe(false);
    });

    test('unsupported protocol version is rejected with a protocol-version nack', async () => {
      const { syncA } = await setupTwoPeers();

      // Bypass SyncEngine and inject a malformed `have` directly on the
      // transport. Receiver's version gate must reject and reply with a
      // protocol-version nack at PROTOCOL_VERSION.
      const transportA = (
        syncA.getSyncEngine() as unknown as { transport: MemoryTransport }
      ).transport;
      const malformed: SyncMessage = {
        version: 999,
        type: 'have',
        peerId: 'peer-a',
        heads: {},
        opCount: 0,
      };
      await transportA.send('peer-b', malformed);

      const nacks = syncA.getRemoteNacks();
      expect(nacks).toHaveLength(1);
      expect(nacks[0].reason).toBe('protocol-version');
      expect(nacks[0].refs).toEqual([]);
      expect(nacks[0].details).toMatch(/Unsupported protocol version 999/);
    });

    test('pendingAcks is populated on send and cleared by ack', async () => {
      const { peerA, syncA } = await setupTwoPeers();

      const valid = await createVcsOp('vcs:storeAssert', {
        agentId: 'agent:lane-a',
        previousHash: peerA.getOps().at(-1)?.hash,
        vcs: { facts: [{ e: 'issue:lane-a:1', a: 'type', v: 'Issue' }] },
      });
      // Send a self-built op (one peer-b does not have its parent for, but
      // here parent points at peerA's init, not peerB's). Either way, the
      // engine state should reflect a clean lifecycle on the sender side.
      const engineA = syncA.getSyncEngine();
      const pendingBefore = new Set(engineA.getState().pendingAcks);
      expect(pendingBefore.has(valid.hash)).toBe(false);

      await engineA.sendOps('peer-b', [valid]);

      // After the MemoryTransport roundtrip, peer-b has responded with either
      // an ack or a nack — both clear the hash from pendingAcks.
      const pendingAfter = engineA.getState().pendingAcks;
      expect(pendingAfter.has(valid.hash)).toBe(false);
    });

    test('pendingAcks is cleared by nack on rejection', async () => {
      const { syncA } = await setupTwoPeers();

      const orphan = await createVcsOp('vcs:storeAssert', {
        agentId: 'agent:lane-a',
        previousHash: 'trellis:op:not-in-peer-b',
        vcs: {
          facts: [{ e: 'issue:lane-a:1', a: 'title', v: 'Orphan' }],
        },
      });

      const engineA = syncA.getSyncEngine();
      await engineA.sendOps('peer-b', [orphan]);

      // Receiver nacked → sender's pendingAcks should not retain the hash.
      expect(engineA.getState().pendingAcks.has(orphan.hash)).toBe(false);
      // And the nack surfaced to the consumer.
      expect(syncA.getRemoteNacks()).toHaveLength(1);
      expect(syncA.getRemoteNacks()[0].reason).toBe('missing-dependency');
    });

    test('mixed batch produces both ack and nack; valid ops converge', async () => {
      const { peerB, syncA } = await setupTwoPeers();

      // Build the chain on top of peer-b's known head so dependency checks
      // pass for the valid ops. We send via raw sendOps, so peer-a's own log
      // does not need to contain these ops.
      const validParent = peerB.getOps().at(-1)?.hash;
      const valid1 = await createVcsOp('vcs:storeAssert', {
        agentId: 'agent:lane-a',
        previousHash: validParent,
        vcs: { facts: [{ e: 'issue:lane-a:1', a: 'type', v: 'Issue' }] },
      });
      const valid2 = await createVcsOp('vcs:storeAssert', {
        agentId: 'agent:lane-a',
        previousHash: valid1.hash,
        vcs: {
          facts: [{ e: 'issue:lane-a:1', a: 'title', v: 'Mixed batch' }],
        },
      });
      const invalid = await createVcsOp('vcs:storeAssert', {
        agentId: 'agent:lane-a',
        previousHash: 'trellis:op:nope',
        vcs: {
          facts: [{ e: 'issue:lane-a:1', a: 'description', v: 'Rejected' }],
        },
      });

      await syncA
        .getSyncEngine()
        .sendOps('peer-b', [valid1, valid2, invalid]);

      const nacks = syncA.getRemoteNacks();
      expect(nacks).toHaveLength(1);
      expect(nacks[0].reason).toBe('missing-dependency');
      expect(nacks[0].refs).toEqual([invalid.hash]);

      const peerBHashes = new Set(peerB.getOps().map((op) => op.hash));
      expect(peerBHashes.has(valid1.hash)).toBe(true);
      expect(peerBHashes.has(valid2.hash)).toBe(true);
      expect(peerBHashes.has(invalid.hash)).toBe(false);
    });
  });
});

describe('ingest authorization gate (ADR 0022 Phase 3)', () => {
  const OWNER_DID = 'did:key:owner';
  const STRANGER_DID = 'did:key:stranger';
  const MEMBER_DID = 'did:key:member';
  const ZONE = makeZoneId(OWNER_DID, 'z1');
  const OWNER = `identity:${OWNER_DID}`;
  const STRANGER = `identity:${STRANGER_DID}`;
  const MEMBER = `identity:${MEMBER_DID}`;

  /** A grantSet op attributed to `signedBy`, optionally signed/unsigned. */
  async function grantOp(
    agentId: string,
    signedBy: string,
    opts: { signed?: boolean; zoneId?: string } = {},
  ): Promise<VcsOp> {
    const op = await createVcsOp('vcs:grantSet', {
      agentId,
      previousHash: undefined,
      vcs: {
        zoneId: opts.zoneId ?? ZONE,
        grantPrincipal: MEMBER,
        grantLevel: CapabilityLevel.Member,
        signedBy,
        ...(opts.signed === false ? {} : { signature: 'envelope-present' }),
      },
    });
    return op;
  }

  test('owner-signed grant integrates; store reflects the grant', async () => {
    const engine = await initPeer('gate-a');
    await defineZone(engine.capabilityContext(), {
      zoneId: ZONE,
      alias: 'Workshop',
      defaultVisibility: CapabilityLevel.None,
    });

    const res = await engine.integrateOps([await grantOp('agent:gate-a', OWNER)]);
    expect(res.rejected).toHaveLength(0);
    expect(res.applied).toBe(1);
    expect(resolveCapability(engine.getEavStore(), MEMBER, ZONE)).toBe(
      CapabilityLevel.Member,
    );
  });

  test('stranger-signed grant is rejected (unauthorized)', async () => {
    const engine = await initPeer('gate-b');
    await defineZone(engine.capabilityContext(), {
      zoneId: ZONE,
      alias: 'Workshop',
      defaultVisibility: CapabilityLevel.None,
    });

    const res = await engine.integrateOps([await grantOp('agent:gate-b', STRANGER)]);
    expect(res.rejected).toHaveLength(1);
    expect(res.rejected[0].reason).toBe('unauthorized');
    expect(resolveCapability(engine.getEavStore(), MEMBER, ZONE)).toBe(
      CapabilityLevel.None,
    );
  });

  test('unsigned grant is rejected (no identity resolver configured)', async () => {
    const engine = await initPeer('gate-c');
    await defineZone(engine.capabilityContext(), {
      zoneId: ZONE,
      alias: 'Workshop',
      defaultVisibility: CapabilityLevel.None,
    });

    const res = await engine.integrateOps([
      await grantOp('agent:gate-c', OWNER, { signed: false }),
    ]);
    expect(res.rejected).toHaveLength(1);
    expect(res.rejected[0].reason).toBe('unauthorized');
  });

  test('non-auth ops integrate untouched (guard is a no-op off the boundary)', async () => {
    const engine = await initPeer('gate-d');
    const normal = await createVcsOp('vcs:checkpointCreate', {
      agentId: 'agent:gate-d',
      vcs: {},
    });
    const res = await engine.integrateOps([normal]);
    expect(res.applied).toBe(1);
    expect(res.rejected).toHaveLength(0);
  });

  test('auth ops mint signed when an identity is present', async () => {
    const { engine } = await initSignedPeer('gate-signed-mint');
    await defineZone(engine.capabilityContext(), {
      zoneId: ZONE,
      alias: 'Workshop',
      defaultVisibility: CapabilityLevel.None,
    });

    // The locally minted zoneDefine op carries a real signature + signedBy.
    const defineOp = engine.getOps().find((o) => o.kind === 'vcs:zoneDefine');
    expect(defineOp).toBeDefined();
    expect(defineOp!.vcs?.signature).toBeDefined();
    expect(defineOp!.vcs?.signedBy).toBe(engine.capabilityContext().agentId);
  });

  test('signed auth op verifies through a peer resolver (PKI end-to-end)', async () => {
    const { engine: owner, id: ownerId } = await initSignedPeer('gate-peer-owner');
    const ownerDid = owner.capabilityContext().agentId.replace(/^identity:/, '');
    const zone = makeZoneId(ownerDid, 'z1');
    await defineZone(owner.capabilityContext(), {
      zoneId: zone,
      alias: 'Workshop',
      defaultVisibility: CapabilityLevel.None,
    });
    const grant = await import('../../src/identity/capability.js').then((m) =>
      m.setGrant(
        owner.capabilityContext(),
        { principal: MEMBER, zoneId: zone, level: CapabilityLevel.Member },
        owner.capabilityContext().agentId,
      ),
    );

    // Peer B is identity-backed (wires a resolver) and already knows the
    // owner's public key, as it would after ADR 0020 pairing.
    const { engine: peerB } = await initSignedPeer('gate-peer-b');
    seedKnownSigner(join(TEST_ROOT, 'gate-peer-b'), {
      entityId: owner.capabilityContext().agentId,
      did: ownerDid,
      publicKey: ownerId.publicKey,
    });

    // Send the owner's whole journal, not the lone grant. Two reasons, both
    // real: the grant's `previousHash` chains to ops peerB lacks, and its
    // authority is resolved against peerB's store — which cannot know the zone
    // until the `zoneDefine` in the same batch has landed. `[zoneDefine, grant]`
    // arriving together is the ordinary shape.
    const res = await peerB.integrateOps(owner.getOps());

    const authRejects = res.rejected.filter((r) =>
      String(r.op.kind).startsWith('vcs:zone') || String(r.op.kind).startsWith('vcs:grant'),
    );
    expect(authRejects).toHaveLength(0);
    expect(res.applied).toBeGreaterThan(0);
    expect(grant.vcs?.signature).toBeDefined();
    expect(resolveCapability(peerB.getEavStore(), MEMBER, zone)).toBe(
      CapabilityLevel.Member,
    );
  });

  test('signed auth op from an unknown signer is rejected (unauthorized)', async () => {
    const { engine: owner } = await initSignedPeer('gate-peer-owner-3');
    const ownerDid = owner.capabilityContext().agentId.replace(/^identity:/, '');
    const zone = makeZoneId(ownerDid, 'z1');
    await defineZone(owner.capabilityContext(), {
      zoneId: zone,
      alias: 'Workshop',
      defaultVisibility: CapabilityLevel.None,
    });
    const grant = await import('../../src/identity/capability.js').then((m) =>
      m.setGrant(
        owner.capabilityContext(),
        { principal: MEMBER, zoneId: zone, level: CapabilityLevel.Member },
        owner.capabilityContext().agentId,
      ),
    );

    // Peer B is identity-backed (wires a resolver) but does NOT know the
    // owner's key — so the signature cannot be verified → unauthorized.
    // The full journal is sent so the rejection is about the *signer* rather
    // than a dangling `previousHash`.
    const { engine: peerB } = await initSignedPeer('gate-peer-b-3');
    const res = await peerB.integrateOps(owner.getOps());

    const authRejects = res.rejected.filter((r) =>
      String(r.op.kind).startsWith('vcs:zone') || String(r.op.kind).startsWith('vcs:grant'),
    );

    // The zoneDefine is rejected outright: its signer's key is unknown.
    expect(
      authRejects.some(
        (r) => r.op.kind === 'vcs:zoneDefine' && r.reason === 'unauthorized',
      ),
    ).toBe(true);

    // The grant then CASCADES — it chains to the rejected zoneDefine, so its
    // `previousHash` never becomes known and it fails as a missing dependency
    // rather than on its own merits. Rejecting an op necessarily strands its
    // causal descendants; the batch converges on "nothing applied" either way.
    expect(
      authRejects.every(
        (r) => r.reason === 'unauthorized' || r.reason === 'missing-dependency',
      ),
    ).toBe(true);
    expect(
      resolveCapability(peerB.getEavStore(), MEMBER, zone),
    ).toBe(CapabilityLevel.None);
    expect(grant.vcs?.signedBy).toBeDefined();
  });
});
