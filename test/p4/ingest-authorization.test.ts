/**
 * Phase 3 ingest boundary — what it actually stops (ADR 0022).
 *
 * `enforceIngestAuthorization` runs in `integrateOps`, immediately after hash
 * verification: integrity and attribution at one gate. These tests pin what the
 * gate rejects, and — as importantly — what it currently lets through.
 */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, cpSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { TrellisVcsEngine } from '../../src/engine.js';
import { createVcsOp, hashVcsOp, verifyVcsOpHash } from '../../src/vcs/ops.js';
import { createIdentity, saveIdentity } from '../../src/identity/identity.js';
import {
  CapabilityLevel,
  makeZoneId,
  defineZone,
  setGrant,
} from '../../src/identity/capability.js';
import type { VcsOp } from '../../src/vcs/types.js';

const TEST_ROOT = join(tmpdir(), 'trellis-ingest-authz');

const OWNER_DID = 'did:key:zowner';
const OWNER = `identity:${OWNER_DID}`;
const ATTACKER = 'identity:did:key:zattacker';
const ZONE = makeZoneId(OWNER_DID, 'w1');

/** Mint an op as a hostile peer would: no engine, no assertOwner, hash recomputed. */
async function forgeOp(kind: string, vcs: Record<string, unknown>): Promise<VcsOp> {
  const op = await createVcsOp(kind as never, {
    agentId: 'agent:attacker',
    vcs: vcs as never,
  });
  op.hash = await hashVcsOp(op); // a forger recomputes, so hash-check passes
  return op;
}

describe('Phase 3 ingest boundary', () => {
  let engine: TrellisVcsEngine;
  const originalHome = process.env.HOME;
  let home: string;

  beforeEach(async () => {
    // Hermetic HOME: no person identity in the sandbox, so signing falls back
    // to the repo identity (Slice A person-first resolution).
    home = mkdtempSync(join(tmpdir(), 'ingest-authz-home-'));
    process.env.HOME = home;
    rmSync(TEST_ROOT, { recursive: true, force: true });
    mkdirSync(TEST_ROOT, { recursive: true });
    engine = new TrellisVcsEngine({ rootPath: TEST_ROOT });
    await engine.initRepo();
    engine.setCheckpointThreshold(0);
    await defineZone(engine.capabilityContext(), {
      zoneId: ZONE,
      alias: 'Workshop',
      defaultVisibility: CapabilityLevel.None,
    });
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
  });

  test('rejects an UNSIGNED grant op from a peer', async () => {
    const op = await forgeOp('vcs:grantSet', {
      zoneId: ZONE,
      grantPrincipal: ATTACKER,
      grantLevel: CapabilityLevel.Owner,
    });

    const res = await engine.integrateOps([op]);

    expect(res.rejected).toHaveLength(1);
    expect(res.rejected[0]!.reason).toBe('unauthorized');
  });

  test('rejects a signed grant op from a NON-owner', async () => {
    const op = await forgeOp('vcs:grantSet', {
      zoneId: ZONE,
      grantPrincipal: ATTACKER,
      grantLevel: CapabilityLevel.Owner,
      signature: 'sig',
      signedBy: ATTACKER, // truthfully attributed, but not an Owner
    });

    const res = await engine.integrateOps([op]);

    expect(res.rejected).toHaveLength(1);
    // ADR 0036: the resolver is always wired (peerKeyResolver never null), so
    // the gate verifies the claimed signature cryptographically first and
    // fails closed — a garbage 'sig' from an unknown identity is rejected as
    // invalid, not merely as a non-owner envelope claim.
    expect(res.rejected[0]!.message).toMatch(/no valid signature/);
  });

  test('non-auth ops are unaffected by the gate', async () => {
    const op = await forgeOp('vcs:storeAssert', {
      facts: [{ e: 'thing:1', a: 'name', v: 'x' }],
    });

    const res = await engine.integrateOps([op]);

    expect(res.rejected).toHaveLength(0);
    expect(res.applied).toBe(1);
  });
});

/**
 * With a real identity on disk the engine defaults BOTH halves (Phase 3.2):
 * signing material from `identity.json`, resolver from the device registry.
 * That converts the gate from an envelope check into a key check.
 */
describe('Phase 3.2 — resolver wired from the local identity', () => {
  let engine: TrellisVcsEngine;
  let realOwner: string;
  let realZone: string;
  const originalHome = process.env.HOME;
  let home: string;

  beforeEach(async () => {
    home = mkdtempSync(join(tmpdir(), 'ingest-authz-home-'));
    process.env.HOME = home;
    rmSync(TEST_ROOT, { recursive: true, force: true });
    mkdirSync(TEST_ROOT, { recursive: true });
    engine = new TrellisVcsEngine({ rootPath: TEST_ROOT });
    await engine.initRepo();
    engine.setCheckpointThreshold(0);

    // Give the repo an identity, then re-open so the engine picks it up.
    const identity = createIdentity({ displayName: 'Owner' });
    saveIdentity(join(TEST_ROOT, '.trellis'), identity);
    engine = new TrellisVcsEngine({ rootPath: TEST_ROOT });
    engine.open();
    engine.setCheckpointThreshold(0);

    realOwner = identity.entityId;
    realZone = makeZoneId(identity.did, 'w1');
    await defineZone(engine.capabilityContext(), {
      zoneId: realZone,
      alias: 'Workshop',
      defaultVisibility: CapabilityLevel.None,
    });
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
  });

  test('local auth ops are signed, and still pass the integrity hash', async () => {
    const authOps = engine.getOps().filter((o) => o.kind === 'vcs:zoneDefine');
    expect(authOps.length).toBeGreaterThan(0);

    for (const op of authOps) {
      expect(op.vcs?.signature).toBeDefined();
      expect(op.vcs?.signedBy).toBe(realOwner);
      // Signing re-hashes, so a signed op must still verify — the signature is
      // inside the hashed payload, not an out-of-band annotation.
      expect(await verifyVcsOpHash(op)).toBe(true);
    }
  });

  test('legitimate local grants now REPLICATE to a peer', async () => {
    await setGrant(
      engine.capabilityContext(),
      { principal: 'identity:did:key:zfriend', zoneId: realZone, level: CapabilityLevel.Member },
      realOwner,
    );
    // Send the whole journal: auth ops sit in a causal chain, so shipping only
    // the two of them would break `previousHash` and reject for an unrelated
    // reason. `[zoneDefine, grantSet]` arriving together is the point — the
    // grant's authority depends on its own zone landing first.
    const allOps = engine.getOps();
    const authOps = allOps.filter(
      (o) => o.kind === 'vcs:zoneDefine' || o.kind === 'vcs:grantSet',
    );
    expect(authOps).toHaveLength(2);

    const peerRoot = join(tmpdir(), 'trellis-ingest-authz-peer');
    rmSync(peerRoot, { recursive: true, force: true });
    mkdirSync(peerRoot, { recursive: true });
    cpSync(join(TEST_ROOT, '.trellis'), join(peerRoot, '.trellis'), { recursive: true });
    rmSync(join(peerRoot, '.trellis', 'ops.json'), { force: true });
    const peer = new TrellisVcsEngine({ rootPath: peerRoot });
    await peer.initRepo();
    peer.setCheckpointThreshold(0);

    const res = await peer.integrateOps(allOps);

    const authRejects = res.rejected.filter(
      (r) => r.op.kind === 'vcs:zoneDefine' || r.op.kind === 'vcs:grantSet',
    );
    expect(authRejects).toHaveLength(0);
    rmSync(peerRoot, { recursive: true, force: true });
  });

  test('THE FIX: a forged signedBy is now REJECTED — the key is checked', async () => {
    const op = await forgeOp('vcs:grantSet', {
      zoneId: realZone,
      grantPrincipal: ATTACKER,
      grantLevel: CapabilityLevel.Owner,
      signature: 'not-a-real-signature', // now actually verified
      signedBy: realOwner, // claiming the owner no longer suffices
    });

    const res = await engine.integrateOps([op]);

    expect(res.rejected).toHaveLength(1);
    expect(res.rejected[0]!.reason).toBe('unauthorized');
    expect(res.rejected[0]!.message).toMatch(/no valid signature/);
  });
});
