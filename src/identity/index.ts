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
  loadRegistry,
  loadLocalDevice,
  resolveDevicePublicKey,
  resolvePublicKeys,
  getSigningMaterial,
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
} from './pairing.js';

export { evaluatePolicy, createPolicy } from './governance.js';

export type {
  PolicyRule,
  PolicyViolation,
  GovernanceResult,
} from './governance.js';
