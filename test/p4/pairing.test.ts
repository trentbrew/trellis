import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  createIdentity,
  saveIdentity,
  loadIdentity,
  signOp,
  verifyOp,
  verifyOpBatch,
  type IdentityResolver,
} from '../../src/identity/index.js';
import {
  pairStart,
  pairJoin,
  pairApprove,
  pairAccept,
  listDevices,
  revokeDevice,
  loadRegistry,
  loadLocalDevice,
  resolveDevicePublicKey,
  resolvePublicKeys,
  getSigningMaterial,
  ROOT_DEVICE_ID,
} from '../../src/identity/pairing.js';
import { createVcsOp } from '../../src/vcs/ops.js';

function tempTrellis(): { root: string; trellisDir: string } {
  const root = mkdtempSync(join(tmpdir(), 'trellis-pair-'));
  const trellisDir = join(root, '.trellis');
  return { root, trellisDir };
}

describe('pairing registry', () => {
  let a: { root: string; trellisDir: string };
  let b: { root: string; trellisDir: string };

  beforeEach(() => {
    a = tempTrellis();
    b = tempTrellis();
    const id = createIdentity({ displayName: 'Alice' });
    saveIdentity(a.trellisDir, id);
  });

  afterEach(() => {
    rmSync(a.root, { recursive: true, force: true });
    rmSync(b.root, { recursive: true, force: true });
  });

  test('registry persists authorized device under .trellis/devices/', () => {
    const { payload: challengePayload } = pairStart(a.trellisDir);
    const { payload: joinPayload } = pairJoin(b.trellisDir, challengePayload, {
      deviceLabel: 'phone',
    });
    const { signed, payload: authPayload } = pairApprove(
      a.trellisDir,
      joinPayload,
      { yes: true },
    );
    pairAccept(b.trellisDir, authPayload);

    expect(existsSync(join(a.trellisDir, 'devices', 'registry.json'))).toBe(
      true,
    );
    expect(existsSync(join(b.trellisDir, 'devices', 'local.json'))).toBe(true);
    expect(existsSync(join(b.trellisDir, 'identity.json'))).toBe(false);

    const regA = loadRegistry(a.trellisDir)!;
    expect(regA.devices).toHaveLength(1);
    expect(regA.devices[0].devicePublicKey).toBe(
      signed.authorization.devicePublicKey,
    );
    expect(listDevices(a.trellisDir)).toHaveLength(1);

    // Root identity.json untouched on A
    const root = loadIdentity(a.trellisDir)!;
    expect(root.privateKey).toBeTruthy();
    const identityRaw = readFileSync(
      join(a.trellisDir, 'identity.json'),
      'utf-8',
    );
    expect(identityRaw).toContain(root.did);
  });
});

describe('pairing challenge', () => {
  let a: { root: string; trellisDir: string };
  let b: { root: string; trellisDir: string };

  beforeEach(() => {
    a = tempTrellis();
    b = tempTrellis();
    saveIdentity(a.trellisDir, createIdentity({ displayName: 'Alice' }));
  });

  afterEach(() => {
    rmSync(a.root, { recursive: true, force: true });
    rmSync(b.root, { recursive: true, force: true });
  });

  test('rejects expired challenges', () => {
    const { payload } = pairStart(a.trellisDir, { ttlSeconds: -1 });
    expect(() => pairJoin(b.trellisDir, payload)).toThrow(/expired/i);
  });

  test('rejects replay after approve', () => {
    const { payload: challengePayload } = pairStart(a.trellisDir);
    const { payload: joinPayload } = pairJoin(b.trellisDir, challengePayload);
    pairApprove(a.trellisDir, joinPayload, { yes: true });
    expect(() =>
      pairApprove(a.trellisDir, joinPayload, { yes: true }),
    ).toThrow(/already-consumed|Unknown/i);
  });
});

describe('pairing authorize', () => {
  let a: { root: string; trellisDir: string };
  let b: { root: string; trellisDir: string };

  beforeEach(() => {
    a = tempTrellis();
    b = tempTrellis();
    saveIdentity(a.trellisDir, createIdentity({ displayName: 'Alice' }));
  });

  afterEach(() => {
    rmSync(a.root, { recursive: true, force: true });
    rmSync(b.root, { recursive: true, force: true });
  });

  test('approve emits SignedDeviceAuthorization; accept persists on B', () => {
    const { payload: challengePayload } = pairStart(a.trellisDir);
    const { payload: joinPayload, local: pendingLocal } = pairJoin(
      b.trellisDir,
      challengePayload,
    );
    const { signed, payload: authPayload } = pairApprove(
      a.trellisDir,
      joinPayload,
      { yes: true },
    );
    expect(signed.authorization.devicePublicKey).toBe(pendingLocal.publicKey);
    expect(signed.signature.length).toBeGreaterThan(0);

    const { local, authorization } = pairAccept(b.trellisDir, authPayload);
    expect(local.deviceId).toBe(authorization.deviceId);
    expect(loadLocalDevice(b.trellisDir)?.deviceId).toBe(authorization.deviceId);
    expect(loadRegistry(b.trellisDir)?.devices[0].deviceId).toBe(
      authorization.deviceId,
    );
  });
});

describe('pairing sign', () => {
  let a: { root: string; trellisDir: string };
  let b: { root: string; trellisDir: string };

  beforeEach(() => {
    a = tempTrellis();
    b = tempTrellis();
    saveIdentity(a.trellisDir, createIdentity({ displayName: 'Alice' }));
  });

  afterEach(() => {
    rmSync(a.root, { recursive: true, force: true });
    rmSync(b.root, { recursive: true, force: true });
  });

  test('Device B signOp with signedWith verifies via registry', async () => {
    const { payload: challengePayload } = pairStart(a.trellisDir);
    const { payload: joinPayload } = pairJoin(b.trellisDir, challengePayload);
    const { signed, payload: authPayload } = pairApprove(
      a.trellisDir,
      joinPayload,
      { yes: true },
    );
    pairAccept(b.trellisDir, authPayload);

    const material = getSigningMaterial(b.trellisDir)!;
    expect(material.signedWith).toBe(signed.authorization.deviceId);

    const op = await createVcsOp('vcs:fileAdd', {
      agentId: material.identityEntityId,
      vcs: { filePath: 'x.ts', contentHash: 'abc' },
    });
    signOp(op, material.privateKey, material.identityEntityId, material.signedWith);
    expect(op.vcs!.signedWith).toBe(material.signedWith);

    const deviceKey = resolveDevicePublicKey(
      a.trellisDir,
      material.identityEntityId,
      material.signedWith,
    )!;
    expect(verifyOp(op, deviceKey)).toBe(true);

    const resolver: IdentityResolver = {
      resolvePublicKey: (id) =>
        resolveDevicePublicKey(a.trellisDir, id, ROOT_DEVICE_ID),
      resolveDevicePublicKey: (id, deviceId) =>
        resolveDevicePublicKey(a.trellisDir, id, deviceId),
      resolvePublicKeys: (id) => resolvePublicKeys(a.trellisDir, id),
    };
    const batch = verifyOpBatch([op], resolver);
    expect(batch[0].valid).toBe(true);
  });
});

describe('pairing revoke', () => {
  let a: { root: string; trellisDir: string };
  let b: { root: string; trellisDir: string };

  beforeEach(() => {
    a = tempTrellis();
    b = tempTrellis();
    saveIdentity(a.trellisDir, createIdentity({ displayName: 'Alice' }));
  });

  afterEach(() => {
    rmSync(a.root, { recursive: true, force: true });
    rmSync(b.root, { recursive: true, force: true });
  });

  test('local revoke makes device signatures fail verify', async () => {
    const { payload: challengePayload } = pairStart(a.trellisDir);
    const { payload: joinPayload } = pairJoin(b.trellisDir, challengePayload);
    const { signed, payload: authPayload } = pairApprove(
      a.trellisDir,
      joinPayload,
      { yes: true },
    );
    pairAccept(b.trellisDir, authPayload);

    const material = getSigningMaterial(b.trellisDir)!;
    const op = await createVcsOp('vcs:fileAdd', {
      agentId: material.identityEntityId,
      vcs: { filePath: 'y.ts', contentHash: 'def' },
    });
    signOp(op, material.privateKey, material.identityEntityId, material.signedWith);

    expect(revokeDevice(a.trellisDir, signed.authorization.deviceId)).toBe(true);
    expect(listDevices(a.trellisDir)).toHaveLength(0);

    const resolver: IdentityResolver = {
      resolvePublicKey: (id) =>
        resolveDevicePublicKey(a.trellisDir, id, ROOT_DEVICE_ID),
      resolveDevicePublicKey: (id, deviceId) =>
        resolveDevicePublicKey(a.trellisDir, id, deviceId),
      resolvePublicKeys: (id) => resolvePublicKeys(a.trellisDir, id),
    };
    const batch = verifyOpBatch([op], resolver);
    expect(batch[0].valid).toBe(false);
  });
});

