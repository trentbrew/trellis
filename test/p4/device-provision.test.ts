/**
 * Device provisioning without the QR handshake: a device (e.g. a sandbox VM)
 * generates its own key pair, the host holding the identity root registers the
 * public key and issues a root-signed DeviceAuthorization, and ops minted on
 * the device are signed as the identity with the device key.
 */
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createIdentity, saveIdentity, verifyOp } from '../../src/identity/index.js';
import {
  provisionDevice,
  verifyDeviceAuthorization,
  resolveDevicePublicKey,
  revokeDevice,
  saveLocalDevice,
  pairingResolver,
  type SignedDeviceAuthorization,
} from '../../src/identity/pairing.js';
import { provisionSpriteDeviceKey } from '../../src/identity/sprite-device.js';
import { TrellisVcsEngine } from '../../src/engine.js';
import { verifyVcsOpHash } from '../../src/vcs/ops.js';
import type { VcsOp } from '../../src/vcs/types.js';

const originalHome = process.env.HOME;
let home: string;
let root: string;
let trellisDir: string;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'device-provision-home-'));
  process.env.HOME = home;
  root = mkdtempSync(join(tmpdir(), 'device-provision-'));
  trellisDir = join(root, '.trellis');
  mkdirSync(trellisDir, { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  rmSync(home, { recursive: true, force: true });
  if (originalHome === undefined) delete process.env.HOME;
  else process.env.HOME = originalHome;
});

function hostIdentity() {
  const identity = createIdentity({ displayName: 'Owner' });
  saveIdentity(trellisDir, identity);
  return identity;
}

describe('provisionDevice', () => {
  test('issues a root-signed authorization and registers the device key', () => {
    const owner = hostIdentity();
    const device = createIdentity({ displayName: 'sandbox:dev' });

    const { signed, record, fingerprint } = provisionDevice(trellisDir, {
      devicePublicKey: device.publicKey,
      deviceId: 'dev_sandbox_abc123',
      deviceLabel: 'sandbox:dev',
      kind: 'sandbox',
    });

    expect(record.deviceId).toBe('dev_sandbox_abc123');
    expect(record.kind).toBe('sandbox');
    expect(fingerprint).toMatch(/^[0-9a-f]{16}$/);
    expect(signed.authorization.identityEntityId).toBe(owner.entityId);
    expect(signed.authorization.devicePublicKey).toBe(device.publicKey);
    expect(signed.authorization.challengeId).toMatch(/^provision:pr_/);
    expect(verifyDeviceAuthorization(signed, owner.publicKey, { identityEntityId: owner.entityId })).toEqual({ ok: true });
    expect(resolveDevicePublicKey(trellisDir, owner.entityId, 'dev_sandbox_abc123')).toBe(device.publicKey);
  });

  test('never receives or stores a device private key', () => {
    hostIdentity();
    const device = createIdentity({ displayName: 'sandbox:dev' });
    provisionDevice(trellisDir, { devicePublicKey: device.publicKey, kind: 'sandbox' });
    const registry = readFileSync(join(home, '.trellis', 'devices', 'registry.json'), 'utf-8');
    expect(registry).not.toContain(device.privateKey);
  });

  test('rejects the root key, malformed keys, and bad device ids', () => {
    const owner = hostIdentity();
    const device = createIdentity({ displayName: 'd' });
    expect(() => provisionDevice(trellisDir, { devicePublicKey: owner.publicKey })).toThrow(/root key/);
    expect(() => provisionDevice(trellisDir, { devicePublicKey: 'not-a-key' })).toThrow(/Ed25519/);
    expect(() =>
      provisionDevice(trellisDir, { devicePublicKey: device.publicKey, deviceId: 'root' }),
    ).toThrow(/Invalid device id/);
  });

  test('requires an identity on the host', () => {
    const device = createIdentity({ displayName: 'd' });
    expect(() => provisionDevice(trellisDir, { devicePublicKey: device.publicKey })).toThrow(/No identity/);
  });

  test('revocation removes the device from resolution; the signature stays valid', () => {
    const owner = hostIdentity();
    const device = createIdentity({ displayName: 'd' });
    const { signed } = provisionDevice(trellisDir, { devicePublicKey: device.publicKey, deviceId: 'dev_x' });

    expect(revokeDevice(trellisDir, 'dev_x')).toBe(true);
    expect(resolveDevicePublicKey(trellisDir, owner.entityId, 'dev_x')).toBeNull();
    // Revocation is a registry fact, not a property of the signed artifact.
    expect(verifyDeviceAuthorization(signed, owner.publicKey).ok).toBe(true);
  });
});

describe('verifyDeviceAuthorization', () => {
  function provisioned() {
    const owner = hostIdentity();
    const device = createIdentity({ displayName: 'd' });
    const { signed } = provisionDevice(trellisDir, { devicePublicKey: device.publicKey, deviceId: 'dev_v' });
    return { owner, device, signed };
  }

  test('rejects a tampered authorization', () => {
    const { owner, signed } = provisioned();
    const attacker = createIdentity({ displayName: 'attacker' });
    const tampered: SignedDeviceAuthorization = {
      ...signed,
      authorization: { ...signed.authorization, devicePublicKey: attacker.publicKey },
    };
    expect(verifyDeviceAuthorization(tampered, owner.publicKey)).toEqual({
      ok: false,
      reason: 'invalid authorization signature',
    });
  });

  test('rejects a signature from a different root', () => {
    const { signed } = provisioned();
    const other = createIdentity({ displayName: 'other' });
    expect(verifyDeviceAuthorization(signed, other.publicKey).ok).toBe(false);
  });

  test('rejects an authorization for a different identity', () => {
    const { owner, signed } = provisioned();
    expect(
      verifyDeviceAuthorization(signed, owner.publicKey, { identityEntityId: 'identity:did:key:zsomeoneelse' }),
    ).toEqual({ ok: false, reason: 'authorization is for a different identity' });
  });

  test('rejects an expired authorization', () => {
    const owner = hostIdentity();
    const device = createIdentity({ displayName: 'd' });
    const { signed } = provisionDevice(trellisDir, {
      devicePublicKey: device.publicKey,
      expiresAt: '2026-01-01T00:00:00.000Z',
    });
    expect(
      verifyDeviceAuthorization(signed, owner.publicKey, { now: new Date('2026-06-01T00:00:00.000Z') }),
    ).toEqual({ ok: false, reason: 'authorization expired' });
  });

  test('rejects malformed input without throwing', () => {
    const owner = hostIdentity();
    expect(verifyDeviceAuthorization({} as SignedDeviceAuthorization, owner.publicKey).ok).toBe(false);
  });
});

describe('sprite provisioning', () => {
  test('returns a root-signed authorization', () => {
    const { local, signed } = provisionSpriteDeviceKey(trellisDir, { name: 'prod-room' });
    const person = JSON.parse(readFileSync(join(home, '.trellis', 'identity.json'), 'utf-8'));
    expect(signed.authorization.deviceId).toBe(local.deviceId);
    expect(verifyDeviceAuthorization(signed, person.publicKey, { identityEntityId: person.entityId }).ok).toBe(true);
  });
});

describe('engine signs with a provisioned device key', () => {
  test('ops carry signedBy = identity, signedWith = device id, and verify through the resolver', async () => {
    // Host: identity root + provision a device key generated elsewhere.
    const owner = hostIdentity();
    const deviceKeys = createIdentity({ displayName: 'sandbox:dev' });
    provisionDevice(trellisDir, { devicePublicKey: deviceKeys.publicKey, deviceId: 'dev_sandbox_e2e', kind: 'sandbox' });

    // Device: a separate repo that holds only the device key, not the root.
    const deviceRoot = mkdtempSync(join(tmpdir(), 'device-provision-device-'));
    const deviceHome = mkdtempSync(join(tmpdir(), 'device-provision-device-home-'));
    const hostHome = process.env.HOME;
    process.env.HOME = deviceHome;
    try {
      saveLocalDevice(join(deviceRoot, '.trellis'), {
        deviceId: 'dev_sandbox_e2e',
        identityEntityId: owner.entityId,
        did: owner.did,
        publicKey: deviceKeys.publicKey,
        privateKey: deviceKeys.privateKey,
        deviceLabel: 'sandbox:dev',
        kind: 'sandbox',
        createdAt: new Date().toISOString(),
      });
      const engine = new TrellisVcsEngine({ rootPath: deviceRoot });
      await engine.initRepo();
      engine.setCheckpointThreshold(0);
      await engine.createStoreEntity('note:1', 'Note', { text: 'from the device' });

      const ops = readFileSync(join(deviceRoot, '.trellis', 'ops.json'), 'utf-8')
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as VcsOp);
      expect(ops.length).toBeGreaterThan(1);
      for (const op of ops) {
        expect(op.vcs?.signedBy).toBe(owner.entityId);
        expect(op.vcs?.signedWith).toBe('dev_sandbox_e2e');
        expect(await verifyOp(op, deviceKeys.publicKey)).toBe(true);
        expect(await verifyOp(op, owner.publicKey)).toBe(false);
        expect(await verifyVcsOpHash(op)).toBe(true);
      }

      // Host side: its registry resolves the device key for (identity, device).
      process.env.HOME = hostHome;
      const resolver = pairingResolver(trellisDir);
      expect(resolver.resolveDevicePublicKey?.(owner.entityId, 'dev_sandbox_e2e')).toBe(deviceKeys.publicKey);
    } finally {
      process.env.HOME = hostHome;
      rmSync(deviceRoot, { recursive: true, force: true });
      rmSync(deviceHome, { recursive: true, force: true });
    }
  });
});
