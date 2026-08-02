/**
 * Sprite device provisioning (Slice D — docs/planning/device-registry-and-
 * sprite-pairing.md).
 *
 * A sprite is a first-class paired device: it holds a device key scoped to
 * the user's identity (never the root `identity.json` key), and the user's
 * person-scoped registry records it as a `cloud-sprite` device (ws transport)
 * so it appears in `trellis pair list` and resolves through the resolver.
 */

import {
  createIdentity,
  ensurePersonIdentity,
} from './identity.js';
import {
  registerDevice,
  type DeviceRecord,
  type LocalDeviceKey,
} from './pairing.js';

export interface ProvisionedSpriteDevice {
  /** LocalDeviceKey installed on the sprite (device key only). */
  local: LocalDeviceKey;
  /** Registry record on the user's machine. */
  record: DeviceRecord;
}

/**
 * Mint a cloud-sprite device key under the person identity and register the
 * sprite in the person-scoped device registry. The keypair is generated
 * locally; the returned `local` is what gets installed on the sprite.
 */
export function provisionSpriteDeviceKey(
  trellisDir: string,
  opts: { name: string },
): ProvisionedSpriteDevice {
  const identity = ensurePersonIdentity();

  // Never touch identity.json — a fresh keypair for the sprite.
  const deviceIdentity = createIdentity({
    displayName: `sprite:${opts.name}`,
  });
  const local: LocalDeviceKey = {
    deviceId: `dev_sprite_${opts.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
    identityEntityId: identity.entityId,
    did: identity.did,
    publicKey: deviceIdentity.publicKey,
    privateKey: deviceIdentity.privateKey,
    deviceLabel: `sprite:${opts.name}`,
    kind: 'cloud-sprite',
    transport: 'ws',
    createdAt: new Date().toISOString(),
  };

  const record = registerDevice(trellisDir, {
    deviceId: local.deviceId,
    devicePublicKey: local.publicKey,
    deviceLabel: local.deviceLabel,
    kind: 'cloud-sprite',
    transport: 'ws',
  });

  return { local, record };
}
