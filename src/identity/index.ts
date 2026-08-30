/**
 * Identity Module — Public Surface
 */

export {
  createIdentity,
  signMessage,
  verifySignature,
  saveIdentity,
  loadIdentity,
  hasIdentity,
  toPublicIdentity,
  trellisUserDir,
  personIdentityDir,
  personIdentityPath,
  savePersonIdentity,
  loadPersonIdentity,
  hasPersonIdentity,
  ensurePersonIdentity,
  resolveRepoIdentity,
} from './identity.js';

export type { IdentityConfig, PublicIdentity } from './identity.js';

export { signOp, verifyOp, verifyOpBatch } from './signing-middleware.js';

export type {
  IdentityResolver,
  SignatureVerificationResult,
} from './signing-middleware.js';

export {
  pairStart,
  pairJoin,
  pairApprove,
  pairAccept,
  listDevices,
  revokeDevice,
  registerDevice,
  loadRegistry,
  loadLocalDevice,
  resolveDevicePublicKey,
  resolvePublicKeys,
  getSigningMaterial,
  pairingResolver,
  personDevicesDir,
  markDeviceSeen,
  updateDeviceState,
  deviceFingerprint,
  decodePayload,
  encodePayload,
  ROOT_DEVICE_ID,
  PAIR_PREFIX,
  JOIN_PREFIX,
  AUTH_PREFIX,
} from './pairing.js';

export type {
  PairChallenge,
  JoinResponse,
  DeviceAuthorization,
  SignedDeviceAuthorization,
  DeviceRecord,
  DeviceRegistry,
  LocalDeviceKey,
  DeviceKind,
  DeviceTransport,
  DeviceSyncState,
} from './pairing.js';

export { renderPairingQr, encodePairingQr } from './qr.js';

export type { PairQrOptions, PairQrEcc } from './qr.js';

export { peerKeyResolver } from './peer-key-resolver.js';

export {
  provisionSpriteDeviceKey,
} from './sprite-device.js';

export type { ProvisionedSpriteDevice } from './sprite-device.js';

export { evaluatePolicy, createPolicy } from './governance.js';

export type {
  PolicyRule,
  PolicyViolation,
  GovernanceResult,
} from './governance.js';

export {
  CapabilityLevel,
  makeZoneId,
  zoneOwnerDid,
  defineZone,
  renameZone,
  getZone,
  setGrant,
  retractGrant,
  resolveCapability,
  enforceIngestAuthorization,
  AUTH_OP_KINDS,
} from './capability.js';

export type { ZoneId, Zone, Grant } from './capability.js';
