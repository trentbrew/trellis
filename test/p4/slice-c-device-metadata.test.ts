import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  pairStart,
  pairJoin,
  pairApprove,
  pairAccept,
  loadRegistry,
  loadLocalDevice,
  listDevices,
  markDeviceSeen,
  updateDeviceState,
  revokeDevice,
  personDevicesDir,
  type DeviceRecord,
} from '../../src/identity/pairing.js';
import {
  createIdentity,
  savePersonIdentity,
} from '../../src/identity/identity.js';

function tempTrellis(): string {
  return join(mkdtempSync(join(tmpdir(), 'slicec-')), '.trellis');
}

describe('Slice C — device management metadata', () => {
  const originalHome = process.env.HOME;
  let home: string;
  let repoA: string;
  let repoB: string;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'slicec-home-'));
    process.env.HOME = home;
    repoA = tempTrellis();
    repoB = tempTrellis();
    savePersonIdentity(createIdentity({ displayName: 'Owner' }));
  });

  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
  });

  function pairWithMetadata(kind = 'desktop', transport = 'ws') {
    const { payload: challengePayload } = pairStart(repoA);
    const joinResult = pairJoin(repoA, challengePayload, {
      deviceLabel: 'laptop2',
      kind: kind as any,
      transport: transport as any,
    });
    const approved = pairApprove(repoA, joinResult.payload, { yes: true });
    const accepted = pairAccept(repoA, approved.payload);
    return accepted;
  }

  it('kind/transport stamp through join → approve → accept', () => {
    const accepted = pairWithMetadata('cloud-sprite', 'ws');

    const regRec = listDevices(repoA)[0];
    expect(regRec.kind).toBe('cloud-sprite');
    expect(regRec.transport).toBe('ws');

    const local = loadLocalDevice(repoA)!;
    expect(local.kind).toBe('cloud-sprite');
    expect(local.transport).toBe('ws');
    expect(accepted.local.deviceId).toBe(regRec.deviceId);
  });

  it('legacy pairs without kind/transport decode fine (optional fields)', () => {
    const { payload: challengePayload } = pairStart(repoA);
    const joinResult = pairJoin(repoA, challengePayload, { deviceLabel: 'plain' });
    const approved = pairApprove(repoA, joinResult.payload, { yes: true });
    pairAccept(repoA, approved.payload);

    const rec = listDevices(repoA)[0];
    expect(rec.kind).toBeUndefined();
    expect(rec.transport).toBeUndefined();
    expect(rec.deviceLabel).toBe('plain');
  });

  it('markDeviceSeen stamps self state on local.json and mirrors to the registry record', () => {
    const accepted = pairWithMetadata('desktop', 'http');

    const ok = markDeviceSeen(repoA, {
      syncState: 'idle',
      lastSyncOpHash: 'trellis:op:abc',
    });
    expect(ok).toBe(true);

    const local = loadLocalDevice(repoA)!;
    expect(local.lastSeenAt).toBeDefined();
    expect(local.syncState).toBe('idle');
    expect(local.lastSyncOpHash).toBe('trellis:op:abc');

    const rec = listDevices(repoA).find((d) => d.deviceId === accepted.local.deviceId)!;
    expect(rec.lastSeenAt).toBe(local.lastSeenAt);
    expect(rec.syncState).toBe('idle');
  });

  it('markDeviceSeen is a no-op for machines without a local device key', () => {
    // Isolate a fresh machine (own HOME): no pairing ever happened here, so
    // there is no person-scoped local device key to stamp.
    const otherHome = mkdtempSync(join(tmpdir(), 'slicec-nokey-'));
    process.env.HOME = otherHome;
    try {
      const bareRepo = tempTrellis();
      expect(markDeviceSeen(bareRepo, { syncState: 'idle' })).toBe(false);
      expect(loadLocalDevice(bareRepo)).toBeNull();
    } finally {
      rmSync(otherHome, { recursive: true, force: true });
      process.env.HOME = home;
    }
  });

  it('updateDeviceState patches an arbitrary registry record and skips revoked', () => {
    const accepted = pairWithMetadata('cli', 'http');

    expect(
      updateDeviceState(repoA, accepted.local.deviceId, {
        syncState: 'behind',
        lastSyncOpHash: 'trellis:op:xyz',
        lastSeenAt: '2026-08-02T00:00:00.000Z',
      }),
    ).toBe(true);
    const rec = listDevices(repoA)[0];
    expect(rec.syncState).toBe('behind');
    expect(rec.lastSyncOpHash).toBe('trellis:op:xyz');
    expect(rec.lastSeenAt).toBe('2026-08-02T00:00:00.000Z');

    expect(updateDeviceState(repoA, 'dev_unknown', { syncState: 'offline' })).toBe(false);
  });

  it('revoked devices are excluded from listDevices but keep state updates rejected', () => {
    const accepted = pairWithMetadata('desktop', 'ws');
    revokeDevice(repoA, accepted.local.deviceId);

    expect(listDevices(repoA)).toHaveLength(0);
    expect(
      updateDeviceState(repoA, accepted.local.deviceId, { syncState: 'offline' }),
    ).toBe(false);
  });
});
