import { mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  pairStart,
  pairJoin,
  pairApprove,
  pairAccept,
  loadRegistry,
  loadLocalDevice,
  getSigningMaterial,
  pairingResolver,
  listDevices,
  personDevicesDir,
} from '../../src/identity/pairing.js';
import {
  createIdentity,
  saveIdentity,
  savePersonIdentity,
} from '../../src/identity/identity.js';

function tempTrellis(): string {
  const root = mkdtempSync(join(tmpdir(), 'sliceb-'));
  return join(root, '.trellis');
}

describe('Slice B — person-scoped device registry', () => {
  const originalHome = process.env.HOME;
  let home: string;
  let repoA: string;
  let repoB: string;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'sliceb-home-'));
    process.env.HOME = home;
    repoA = tempTrellis();
    repoB = tempTrellis();
    const identity = createIdentity({ displayName: 'Owner' });
    // Apple-ID model: the person identity is machine-wide; the repo clone has
    // its own copy for legacy compat. Both scopes resolve to the same keys.
    savePersonIdentity(identity);
    saveIdentity(repoA, identity);
  });

  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
    rmSync(dirname(repoA), { recursive: true, force: true });
    rmSync(dirname(repoB), { recursive: true, force: true });
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
  });

  it('a device paired under one repo is recognized by a second clone (devices follow the person)', () => {
    const { payload: challengePayload } = pairStart(repoA);
    const joinResult = pairJoin(repoA, challengePayload, { deviceLabel: 'laptop2' });
    const approved = pairApprove(repoA, joinResult.payload, { yes: true });
    const accepted = pairAccept(repoA, approved.payload);

    // Different repo dir, same HOME — the device is still here.
    expect(listDevices(repoB)).toHaveLength(1);
    expect(listDevices(repoB)[0].deviceId).toBe(accepted.local.deviceId);

    const material = getSigningMaterial(repoB)!;
    expect(material.signedWith).toBe(accepted.local.deviceId);
    expect(material.privateKey).toBe(accepted.local.privateKey);
  });

  it('a second clone resolves the device key through the resolver', async () => {
    const { payload: challengePayload } = pairStart(repoA);
    const joinResult = pairJoin(repoA, challengePayload, { deviceLabel: 'laptop2' });
    const approved = pairApprove(repoA, joinResult.payload, { yes: true });
    const accepted = pairAccept(repoA, approved.payload);

    const resolver = pairingResolver(repoB)!;
    const keys = resolver.resolvePublicKeys!(
      accepted.local.identityEntityId,
    );
    expect(keys).toContain(accepted.local.publicKey);
    expect(
      resolver.resolveDevicePublicKey!(
        accepted.local.identityEntityId,
        accepted.local.deviceId,
      ),
    ).toBe(accepted.local.publicKey);
  });

  it('legacy repo-scoped registry migrates up on first read (one-way)', () => {
    const legacy = createIdentity({ displayName: 'Legacy' });
    saveIdentity(repoA, legacy);
    const repoRegistryDir = join(repoA, 'devices');
    mkdirSync(repoRegistryDir, { recursive: true });
    const registry = {
      identityEntityId: legacy.entityId,
      did: legacy.did,
      rootPublicKey: legacy.publicKey,
      devices: [
        {
          deviceId: 'dev_legacy1',
          identityEntityId: legacy.entityId,
          did: legacy.did,
          devicePublicKey: 'legacy-pub',
          deviceLabel: 'old-phone',
          createdAt: new Date().toISOString(),
        },
      ],
    };
    writeFileSync(
      join(repoRegistryDir, 'registry.json'),
      JSON.stringify(registry, null, 2),
    );

    const loaded = loadRegistry(repoA)!;
    expect(loaded.devices).toHaveLength(1);
    // Copied up to person scope — now visible to every clone.
    expect(existsSync(join(personDevicesDir(), 'registry.json'))).toBe(true);
    expect(listDevices(repoB)).toHaveLength(1);
    expect(listDevices(repoB)[0].deviceId).toBe('dev_legacy1');
  });

  it('legacy repo-scoped local.json migrates up for signing material', () => {
    const legacy = createIdentity({ displayName: 'Legacy' });
    saveIdentity(repoA, legacy);
    const local = {
      deviceId: 'dev_legacy2',
      identityEntityId: legacy.entityId,
      did: legacy.did,
      publicKey: 'local-pub',
      privateKey: 'local-priv',
      deviceLabel: 'old-cli',
      createdAt: new Date().toISOString(),
    };
    const repoDevices = join(repoA, 'devices');
    mkdirSync(repoDevices, { recursive: true });
    writeFileSync(join(repoDevices, 'local.json'), JSON.stringify(local));

    // First read from the legacy repo triggers the copy-up…
    const materialA = getSigningMaterial(repoA)!;
    expect(materialA.signedWith).toBe('dev_legacy2');
    expect(materialA.privateKey).toBe('local-priv');
    expect(existsSync(join(personDevicesDir(), 'local.json'))).toBe(true);

    // …and the person copy is then visible to every other clone.
    const materialB = getSigningMaterial(repoB)!;
    expect(materialB.signedWith).toBe('dev_legacy2');
    expect(materialB.privateKey).toBe('local-priv');
  });

  it('person-scope wins over a stale repo-scope registry', () => {
    const identity = createIdentity({ displayName: 'Owner' });
    saveIdentity(repoA, identity);
    const repoDevices = join(repoA, 'devices');
    mkdirSync(repoDevices, { recursive: true });
    writeFileSync(
      join(repoDevices, 'registry.json'),
      JSON.stringify({
        identityEntityId: 'identity:did:key:zstale',
        did: 'did:key:zstale',
        rootPublicKey: 'stale',
        devices: [],
      }),
    );

    // Person-scope registry for the real identity shadows the stale repo one.
    const { payload: challengePayload } = pairStart(repoA);
    const joinResult = pairJoin(repoA, challengePayload, { deviceLabel: 'x' });
    const approved = pairApprove(repoA, joinResult.payload, { yes: true });
    pairAccept(repoA, approved.payload);

    const reg = loadRegistry(repoA)!;
    expect(reg.identityEntityId).toBe(identity.entityId);
  });

  it('legacy repo-scope registry stays readable after person-scope takes over', () => {
    const identity = createIdentity({ displayName: 'Owner' });
    saveIdentity(repoA, identity);
    const repoDevices = join(repoA, 'devices');
    mkdirSync(repoDevices, { recursive: true });
    writeFileSync(
      join(repoDevices, 'registry.json'),
      JSON.stringify({
        identityEntityId: identity.entityId,
        did: identity.did,
        rootPublicKey: identity.publicKey,
        devices: [],
      }),
    );

    const before = loadRegistry(repoA)!;
    expect(before.identityEntityId).toBe(identity.entityId);

    pairStart(repoA); // ensureRegistryFromIdentity → saveRegistry (person + repo sync)
    const after = loadRegistry(repoA)!;
    expect(after.identityEntityId).toBe(identity.entityId);
  });
});
