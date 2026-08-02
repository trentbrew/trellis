import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { provisionSpriteDeviceKey } from '../../src/identity/sprite-device.js';
import {
  listDevices,
  revokeDevice,
  loadRegistry,
} from '../../src/identity/pairing.js';
import { ensurePersonIdentity } from '../../src/identity/identity.js';
import { SyncEngine } from '../../src/sync/sync-engine.js';
import { MemoryTransport } from '../../src/sync/memory-transport.js';
import type { SyncDeviceRevokedMessage } from '../../src/sync/types.js';

function tempTrellis(): string {
  return join(mkdtempSync(join(tmpdir(), 'sliced-')), '.trellis');
}

describe('Slice D — sprite device provisioning', () => {
  const originalHome = process.env.HOME;
  let home: string;
  let trellisDir: string;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'sliced-home-'));
    process.env.HOME = home;
    trellisDir = tempTrellis();
  });

  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
  });

  it('provisions a cloud-sprite device key + registry record under the person identity', () => {
    const person = ensurePersonIdentity({ displayName: 'Trent' });
    const { local, record } = provisionSpriteDeviceKey(trellisDir, {
      name: 'prod-room',
    });

    expect(local.kind).toBe('cloud-sprite');
    expect(local.transport).toBe('ws');
    expect(local.identityEntityId).toBe(person.entityId);
    expect(local.deviceId).toBe('dev_sprite_prod-room');

    expect(record.deviceId).toBe(local.deviceId);
    expect(record.kind).toBe('cloud-sprite');
    expect(record.transport).toBe('ws');
    expect(record.devicePublicKey).toBe(local.publicKey);

    const devices = listDevices(trellisDir);
    expect(devices).toHaveLength(1);
    expect(devices[0].deviceId).toBe(local.deviceId);
  });

  it('the sprite device key never touches identity.json (fresh keypair)', () => {
    const person = ensurePersonIdentity({ displayName: 'Trent' });
    const { local } = provisionSpriteDeviceKey(trellisDir, { name: 'prod-room' });

    expect(local.privateKey).toBeTruthy();
    expect(local.publicKey).not.toBe(person.publicKey);
  });

  it('re-provisioning the same sprite replaces the stale record (idempotent)', () => {
    ensurePersonIdentity({ displayName: 'Trent' });
    const first = provisionSpriteDeviceKey(trellisDir, { name: 'prod-room' });
    const second = provisionSpriteDeviceKey(trellisDir, { name: 'prod-room' });

    expect(second.record.deviceId).toBe(first.record.deviceId);
    expect(listDevices(trellisDir)).toHaveLength(1);
  });
});

describe('Slice D — revocation propagation (device-revoked message)', () => {
  const originalHome = process.env.HOME;
  let home: string;
  let trellisDir: string;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'sliced-revoke-'));
    process.env.HOME = home;
    trellisDir = tempTrellis();
    ensurePersonIdentity({ displayName: 'Trent' });
    provisionSpriteDeviceKey(trellisDir, { name: 'prod-room' });
  });

  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
  });

  function buildRevokedMessage(deviceId: string): SyncDeviceRevokedMessage {
    return {
      version: 1,
      type: 'device-revoked',
      peerId: 'peer-x',
      deviceId,
      identityEntityId: 'identity:did:key:whatever',
      revokedBy: 'root',
      timestamp: new Date().toISOString(),
    };
  }

  it('SyncEngine routes device-revoked to the onDeviceRevoked callback', async () => {
    const received: SyncDeviceRevokedMessage[] = [];
    const peerA = new MemoryTransport('peer-a');
    const peerB = new MemoryTransport('peer-b');
    MemoryTransport.connect(peerA, peerB);

    new SyncEngine({
      localPeerId: 'peer-b',
      transport: peerB,
      getLocalOps: () => [],
      onOpsReceived: () => {},
      onDeviceRevoked: (msg) => {
        received.push(msg);
      },
    });

    await peerA.send('peer-b', buildRevokedMessage('dev_sprite_prod_room'));
    await new Promise((r) => setTimeout(r, 10));

    expect(received).toHaveLength(1);
    expect(received[0].deviceId).toBe('dev_sprite_prod_room');
  });

  it('a received device-revoked revokes the device in the registry (fails closed)', async () => {
    const spriteId = listDevices(trellisDir)[0].deviceId;

    // Simulate the daemon-side handler: revoke in the person registry.
    expect(revokeDevice(trellisDir, spriteId)).toBe(true);
    expect(listDevices(trellisDir)).toHaveLength(0);

    // Revocation is durable in the person-scoped registry.
    const reg = loadRegistry(trellisDir)!;
    const rec = reg.devices.find((d) => d.deviceId === spriteId)!;
    expect(rec.revokedAt).toBeDefined();
  });

  it('unknown device revocation is a no-op (no throw)', () => {
    expect(revokeDevice(trellisDir, 'dev_unknown')).toBe(false);
  });
});
