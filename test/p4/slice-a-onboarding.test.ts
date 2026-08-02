import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  pairStart,
  pairJoin,
  pairApprove,
  pairAccept,
  getSigningMaterial,
  pairingResolver,
  listDevices,
  ROOT_DEVICE_ID,
} from '../../src/identity/pairing.js';
import {
  ensurePersonIdentity,
  hasPersonIdentity,
  createIdentity,
  saveIdentity,
} from '../../src/identity/identity.js';
import { verifyOpBatch } from '../../src/identity/signing-middleware.js';
import { signOp } from '../../src/identity/signing-middleware.js';
import { peerKeyResolver } from '../../src/identity/peer-key-resolver.js';
import { createVcsOp } from '../../src/vcs/ops.js';
import { onboardFirstRun } from '../../src/cli/onboarding.js';
import { hasProfile, loadProfile } from '../../src/scaffold/profile.js';

function fullPair(trellisDir: string, identity: ReturnType<typeof createIdentity>) {
  const { payload: challengePayload } = pairStart(trellisDir);
  const joinResult = pairJoin(trellisDir, challengePayload, {
    deviceLabel: 'test-device',
  });
  const approved = pairApprove(trellisDir, joinResult.payload, { yes: true });
  const accepted = pairAccept(trellisDir, approved.payload);
  return { joinResult, approved, accepted };
}

describe('Slice A — person-first pairing + device-signed ops', () => {
  const originalHome = process.env.HOME;
  let home: string;
  let trellisDir: string;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'slicea-'));
    trellisDir = mkdtempSync(join(tmpdir(), 'slicea-repo-'));
    process.env.HOME = home;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
  });

  it('pairStart uses the person identity when no repo identity exists', () => {
    ensurePersonIdentity({ displayName: 'Trent' });
    expect(() => pairStart(trellisDir)).not.toThrow();
    const { challenge } = pairStart(trellisDir);
    expect(challenge.did).toBe(
      ensurePersonIdentity({ displayName: 'Trent' }).did,
    );
  });

  it('pairStart fails with the onboarding-correct message when nothing exists', () => {
    expect(() => pairStart(trellisDir)).toThrow(/onboard first/);
  });

  it('pairStart still works with a legacy repo-scope identity', () => {
    const identity = createIdentity({ displayName: 'Legacy' });
    saveIdentity(trellisDir, identity);
    expect(() => pairStart(trellisDir)).not.toThrow();
  });

  it('full pairing round-trip under a person identity, then device key resolves', async () => {
    const person = ensurePersonIdentity({ displayName: 'Trent' });
    const { accepted } = fullPair(trellisDir, person);

    expect(accepted.authorization.identityEntityId).toBe(person.entityId);
    expect(listDevices(trellisDir)).toHaveLength(1);

    const deviceKey = accepted.local.publicKey;

    const resolver = pairingResolver(trellisDir)!;
    expect(resolver.resolveDevicePublicKey!(person.entityId, accepted.local.deviceId)).toBe(deviceKey);
    expect(resolver.resolvePublicKeys!(person.entityId)).toContain(deviceKey);
    expect(resolver.resolvePublicKey(person.entityId)).toBe(person.publicKey);

    const composed = peerKeyResolver(trellisDir);
    expect(composed.resolveDevicePublicKey!(person.entityId, accepted.local.deviceId)).toBe(deviceKey);
  });

  it('a device-signed op verifies through pairingResolver and peerKeyResolver', async () => {
    const person = ensurePersonIdentity({ displayName: 'Trent' });
    const { accepted } = fullPair(trellisDir, person);

    const op = await createVcsOp('vcs:fileAdd', {
      agentId: person.entityId,
      vcs: { filePath: 'x.ts', contentHash: 'abc' },
    });
    await signOp(op, accepted.local.privateKey, person.entityId, accepted.local.deviceId);

    expect(op.vcs!.signedWith).toBe(accepted.local.deviceId);
    const pairingResults = await verifyOpBatch([op], pairingResolver(trellisDir)!);
    expect(pairingResults[0]).toMatchObject({ valid: true });
    const composedResults = await verifyOpBatch([op], peerKeyResolver(trellisDir));
    expect(composedResults[0]).toMatchObject({ valid: true });
  });

  it('getSigningMaterial is device-first, then person root, then repo fallback', () => {
    const person = ensurePersonIdentity({ displayName: 'Trent' });
    expect(getSigningMaterial(trellisDir)).toMatchObject({
      identityEntityId: person.entityId,
      signedWith: ROOT_DEVICE_ID,
    });

    const { accepted } = fullPair(trellisDir, person);
    const material = getSigningMaterial(trellisDir)!;
    expect(material.signedWith).toBe(accepted.local.deviceId);
    expect(material.privateKey).toBe(accepted.local.privateKey);
  });

  it('pairingResolver binds to the person identity (not repo-only)', () => {
    ensurePersonIdentity({ displayName: 'Trent' });
    expect(pairingResolver(trellisDir)).not.toBeNull();
  });
});

describe('Slice A — onboarding gate', () => {
  const originalHome = process.env.HOME;
  let home: string;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'onboard-'));
    process.env.HOME = home;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
  });

  it('new-user non-interactive default creates person identity + profile', async () => {
    const result = await onboardFirstRun({ interactive: false });
    expect(result.mode).toBe('new');
    expect(hasPersonIdentity()).toBe(true);
    expect(hasProfile()).toBe(true);
    expect(loadProfile()?.name).toBe(process.env.USER);
  });

  it('--identity skip stays anonymous with a profile (no re-trigger)', async () => {
    const result = await onboardFirstRun({ interactive: false, identityFlag: 'skip' });
    expect(result.mode).toBe('skip');
    expect(hasPersonIdentity()).toBe(false);
    expect(hasProfile()).toBe(true);
  });

  it('already-onboarded machines are no-ops', async () => {
    await onboardFirstRun({ interactive: false });
    const again = await onboardFirstRun({ interactive: false, identityFlag: 'skip' });
    expect(again.mode).toBe('skip');
    expect(hasPersonIdentity()).toBe(true);
  });

  it('existing non-interactive prints pairing instructions and does not create identity', async () => {
    const result = await onboardFirstRun({ interactive: false, identityFlag: 'existing' });
    expect(result.mode).toBe('existing');
    expect(hasPersonIdentity()).toBe(false);
    expect(hasProfile()).toBe(true);
  });
});
