/**
 * Device pairing (ADR 0020 Phase 0)
 *
 * Delegated device keys under an Ed25519 identity. Never copies identity.json
 * private key. OOB string payloads: start → join → approve → accept.
 */

import { randomBytes, createHash } from 'crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  readdirSync,
} from 'fs';
import { join } from 'path';
import { homedir } from 'node:os';
import {
  createIdentity,
  loadIdentity,
  resolveRepoIdentity,
  signMessage,
  verifySignature,
  type IdentityConfig,
} from './identity.js';
import type { IdentityResolver } from './signing-middleware.js';

export const ROOT_DEVICE_ID = 'root';
export const PAIR_TTL_SECONDS = 5 * 60;
export const PAIR_PREFIX = 'trellis:pair:v1:';
export const JOIN_PREFIX = 'trellis:join:v1:';
export const AUTH_PREFIX = 'trellis:auth:v1:';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PairChallenge {
  v: 1;
  challengeId: string;
  did: string;
  identityEntityId: string;
  /** Root public key (base64 SPKI) so B can verify SignedDeviceAuthorization. */
  rootPublicKey: string;
  exp: number;
  nonce: string;
}

export interface JoinResponse {
  v: 1;
  challengeId: string;
  devicePublicKey: string;
  deviceLabel?: string;
  /** Slice C metadata — stamped by the joining device, honored by the registry. */
  kind?: DeviceKind;
  transport?: DeviceTransport;
  /** Signature over canonical challenge bytes. */
  signature: string;
}

/** Slice C — device identity metadata (docs/planning/device-registry-and-sprite-pairing.md). */
export type DeviceKind = 'desktop' | 'cli' | 'cloud-sprite';
export type DeviceTransport = 'ws' | 'http' | 'iroh';
export type DeviceSyncState = 'idle' | 'syncing' | 'behind' | 'diverged' | 'offline';

export interface DeviceAuthorization {
  v: 1;
  deviceId: string;
  identityEntityId: string;
  did: string;
  devicePublicKey: string;
  deviceLabel?: string;
  /** Slice C metadata — passed through from the joining device. */
  kind?: DeviceKind;
  transport?: DeviceTransport;
  issuedAt: string;
  expiresAt?: string;
  issuerDeviceId: string;
  challengeId: string;
}

export interface SignedDeviceAuthorization {
  authorization: DeviceAuthorization;
  signature: string;
}

export interface DeviceRecord {
  deviceId: string;
  devicePublicKey: string;
  deviceLabel?: string;
  authorizedAt: string;
  revokedAt?: string;
  issuerDeviceId: string;
  challengeId: string;
  /** Slice C — metadata + state (fed by pairing stamps, sync daemon, presence). */
  kind?: DeviceKind;
  transport?: DeviceTransport;
  lastSeenAt?: string;
  lastSyncOpHash?: string;
  syncState?: DeviceSyncState;
}

export interface DeviceRegistry {
  identityEntityId: string;
  did: string;
  rootPublicKey: string;
  devices: DeviceRecord[];
}

export interface LocalDeviceKey {
  deviceId: string;
  identityEntityId: string;
  did: string;
  publicKey: string;
  privateKey: string;
  deviceLabel?: string;
  createdAt: string;
  /** Slice C — this device's own metadata + state (self touchpoint). */
  kind?: DeviceKind;
  transport?: DeviceTransport;
  lastSeenAt?: string;
  lastSyncOpHash?: string;
  syncState?: DeviceSyncState;
}

// ---------------------------------------------------------------------------
// Encoding helpers
// ---------------------------------------------------------------------------

export function encodePayload(prefix: string, obj: unknown): string {
  return prefix + Buffer.from(JSON.stringify(obj), 'utf-8').toString('base64url');
}

export function decodePayload<T>(prefix: string, payload: string): T {
  if (!payload.startsWith(prefix)) {
    throw new Error(`Invalid payload prefix (expected ${prefix})`);
  }
  const raw = Buffer.from(payload.slice(prefix.length), 'base64url').toString(
    'utf-8',
  );
  return JSON.parse(raw) as T;
}

/** Crockford base32 short code from challengeId (first 8 chars of hash). */
export function challengeShortCode(challengeId: string): string {
  const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const hash = createHash('sha256').update(challengeId).digest();
  let n = BigInt('0x' + hash.subarray(0, 5).toString('hex'));
  let out = '';
  for (let i = 0; i < 8; i++) {
    out = CROCKFORD[Number(n % 32n)] + out;
    n = n / 32n;
  }
  return out;
}

export function deviceFingerprint(publicKeyBase64: string): string {
  return createHash('sha256')
    .update(Buffer.from(publicKeyBase64, 'base64'))
    .digest('hex')
    .slice(0, 16);
}

function canonicalJson(obj: unknown): string {
  return JSON.stringify(obj);
}

function newId(prefix: string): string {
  return `${prefix}${randomBytes(16).toString('hex')}`;
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

/**
 * Person-scoped device store (Slice B, docs/planning/device-registry-and-
 * sprite-pairing.md): a paired device follows the person, so every clone of
 * the identity recognizes it. `~/.trellis/devices` mirrors the person
 * identity dir (ADR 0032 §3). The legacy repo-scoped store
 * (`.trellis/devices`) is still read as a fallback and migrated up once.
 */
export function personDevicesDir(): string {
  return join(homedir(), '.trellis', 'devices');
}

function devicesDir(trellisDir: string): string {
  return join(trellisDir, 'devices');
}

function registryPaths(trellisDir: string): {
  person: string;
  repo: string;
} {
  return {
    person: join(personDevicesDir(), 'registry.json'),
    repo: join(devicesDir(trellisDir), 'registry.json'),
  };
}

function localPaths(trellisDir: string): { person: string; repo: string } {
  return {
    person: join(personDevicesDir(), 'local.json'),
    repo: join(devicesDir(trellisDir), 'local.json'),
  };
}

function challengesDir(trellisDir: string): string {
  return join(devicesDir(trellisDir), 'challenges');
}

function ensureDevicesDir(trellisDir: string): void {
  const d = devicesDir(trellisDir);
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
  const c = challengesDir(trellisDir);
  if (!existsSync(c)) mkdirSync(c, { recursive: true });
}

function ensurePersonDevicesDir(): string {
  const d = personDevicesDir();
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
  return d;
}

function readJson<T>(p: string): T | null {
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as T;
  } catch {
    return null;
  }
}

/**
 * One-way copy-up migration (Slice B ratchet): when the person-scoped store
 * is empty but a legacy repo-scoped file exists, copy it up once. The repo
 * copy stays as a stale snapshot; nothing writes back down.
 */
function migrateUp(from: string, to: string): void {
  if (existsSync(to)) return;
  let raw: string;
  try {
    raw = readFileSync(from, 'utf-8');
  } catch {
    return;
  }
  try {
    ensurePersonDevicesDir();
    writeFileSync(to, raw);
  } catch {
    /* best-effort */
  }
}

// ---------------------------------------------------------------------------
// Registry / local persistence
// ---------------------------------------------------------------------------

export function loadRegistry(trellisDir: string): DeviceRegistry | null {
  const { person, repo } = registryPaths(trellisDir);
  const personReg = readJson<DeviceRegistry>(person);
  if (personReg) return personReg;
  migrateUp(repo, person);
  return readJson<DeviceRegistry>(person) ?? readJson<DeviceRegistry>(repo);
}

export function saveRegistry(trellisDir: string, registry: DeviceRegistry): void {
  const { person, repo } = registryPaths(trellisDir);
  ensurePersonDevicesDir();
  writeFileSync(person, JSON.stringify(registry, null, 2));
  // Keep a legacy repo-scope copy in sync (same identity) so old readers see
  // revocations; never write a repo copy for a different identity.
  const repoReg = readJson<DeviceRegistry>(repo);
  if (repoReg && repoReg.identityEntityId === registry.identityEntityId) {
    writeFileSync(repo, JSON.stringify(registry, null, 2));
  }
}

export function loadLocalDevice(trellisDir: string): LocalDeviceKey | null {
  const { person, repo } = localPaths(trellisDir);
  const personLocal = readJson<LocalDeviceKey>(person);
  if (personLocal) return personLocal;
  migrateUp(repo, person);
  return readJson<LocalDeviceKey>(person) ?? readJson<LocalDeviceKey>(repo);
}

export function saveLocalDevice(trellisDir: string, local: LocalDeviceKey): void {
  // Never write into identity.json
  const { person, repo } = localPaths(trellisDir);
  ensurePersonDevicesDir();
  writeFileSync(person, JSON.stringify(local, null, 2));
  if (existsSync(repo)) {
    writeFileSync(repo, JSON.stringify(local, null, 2));
  }
}

function ensureRegistryFromIdentity(
  trellisDir: string,
  identity: IdentityConfig,
): DeviceRegistry {
  const existing = loadRegistry(trellisDir);
  if (existing && existing.identityEntityId === identity.entityId) {
    return existing;
  }
  const registry: DeviceRegistry = {
    identityEntityId: identity.entityId,
    did: identity.did,
    rootPublicKey: identity.publicKey,
    devices: [],
  };
  saveRegistry(trellisDir, registry);
  return registry;
}

export function listDevices(trellisDir: string): DeviceRecord[] {
  const reg = loadRegistry(trellisDir);
  if (!reg) return [];
  return reg.devices.filter((d) => !d.revokedAt);
}

export function revokeDevice(trellisDir: string, deviceId: string): boolean {
  const reg = loadRegistry(trellisDir);
  if (!reg) return false;
  const rec = reg.devices.find((d) => d.deviceId === deviceId);
  if (!rec || rec.revokedAt) return false;
  rec.revokedAt = new Date().toISOString();
  saveRegistry(trellisDir, reg);
  return true;
}

/**
 * Register a device record without the QR handshake (Slice D — sprite
 * provisioning). The device key is minted out-of-band (never the root
 * identity key) and installed on the sprite; this records it in the
 * person-scoped registry so it appears in `pair list` and resolves through
 * the resolver like any paired device.
 */
export function registerDevice(
  trellisDir: string,
  record: Omit<
    DeviceRecord,
    'authorizedAt' | 'issuerDeviceId' | 'challengeId' | 'deviceId'
  > & { deviceId: string },
): DeviceRecord {
  const identity = resolveRepoIdentity(trellisDir);
  if (!identity) {
    throw new Error(
      'No identity — onboard first (`trellis init` first-run) or run `trellis identity init`',
    );
  }
  const registry = ensureRegistryFromIdentity(trellisDir, identity);
  const full: DeviceRecord = {
    ...record,
    authorizedAt: new Date().toISOString(),
    issuerDeviceId: ROOT_DEVICE_ID,
    challengeId: `provision:${newId('pr_')}`,
  };
  registry.devices = registry.devices.filter(
    (d) => d.deviceId !== full.deviceId,
  );
  registry.devices.push(full);
  saveRegistry(trellisDir, registry);
  return full;
}

export function resolveDevicePublicKey(
  trellisDir: string,
  identityEntityId: string,
  deviceId: string,
): string | null {
  const identity = resolveRepoIdentity(trellisDir);
  if (deviceId === ROOT_DEVICE_ID) {
    if (identity && identity.entityId === identityEntityId) {
      return identity.publicKey;
    }
    const reg = loadRegistry(trellisDir);
    if (reg && reg.identityEntityId === identityEntityId) {
      return reg.rootPublicKey;
    }
    return null;
  }
  const reg = loadRegistry(trellisDir);
  if (!reg || reg.identityEntityId !== identityEntityId) return null;
  const rec = reg.devices.find((d) => d.deviceId === deviceId && !d.revokedAt);
  return rec?.devicePublicKey ?? null;
}

export function resolvePublicKeys(
  trellisDir: string,
  identityEntityId: string,
): string[] {
  const keys: string[] = [];
  const root = resolveDevicePublicKey(
    trellisDir,
    identityEntityId,
    ROOT_DEVICE_ID,
  );
  if (root) keys.push(root);
  const reg = loadRegistry(trellisDir);
  if (reg && reg.identityEntityId === identityEntityId) {
    for (const d of reg.devices) {
      if (!d.revokedAt) keys.push(d.devicePublicKey);
    }
  }
  return keys;
}

// ---------------------------------------------------------------------------
// Challenge lifecycle
// ---------------------------------------------------------------------------

function saveChallenge(trellisDir: string, challenge: PairChallenge): void {
  ensureDevicesDir(trellisDir);
  writeFileSync(
    join(challengesDir(trellisDir), `${challenge.challengeId}.json`),
    JSON.stringify(challenge, null, 2),
  );
}

function loadChallenge(
  trellisDir: string,
  challengeId: string,
): PairChallenge | null {
  const p = join(challengesDir(trellisDir), `${challengeId}.json`);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as PairChallenge;
  } catch {
    return null;
  }
}

function consumeChallenge(trellisDir: string, challengeId: string): void {
  const p = join(challengesDir(trellisDir), `${challengeId}.json`);
  if (existsSync(p)) unlinkSync(p);
}

function findChallengeByShortCode(
  trellisDir: string,
  code: string,
): PairChallenge | null {
  const dir = challengesDir(trellisDir);
  if (!existsSync(dir)) return null;
  const normalized = code.trim().toUpperCase();
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.json')) continue;
    const c = loadChallenge(trellisDir, name.replace(/\.json$/, ''));
    if (c && challengeShortCode(c.challengeId) === normalized) return c;
  }
  return null;
}

export function assertChallengeValid(challenge: PairChallenge): void {
  if (challenge.v !== 1) throw new Error('Unsupported challenge version');
  if (Math.floor(Date.now() / 1000) > challenge.exp) {
    throw new Error('Pairing challenge expired');
  }
}

// ---------------------------------------------------------------------------
// Protocol steps
// ---------------------------------------------------------------------------

export function pairStart(
  trellisDir: string,
  opts?: { ttlSeconds?: number },
): { challenge: PairChallenge; payload: string; shortCode: string } {
  const identity = resolveRepoIdentity(trellisDir);
  if (!identity) {
    throw new Error(
      'No identity — onboard first (`trellis init` first-run) or run `trellis identity init` (person scope default)',
    );
  }
  ensureRegistryFromIdentity(trellisDir, identity);

  const ttl = opts?.ttlSeconds ?? PAIR_TTL_SECONDS;
  const challenge: PairChallenge = {
    v: 1,
    challengeId: newId('ch_'),
    did: identity.did,
    identityEntityId: identity.entityId,
    rootPublicKey: identity.publicKey,
    exp: Math.floor(Date.now() / 1000) + ttl,
    nonce: randomBytes(16).toString('hex'),
  };
  saveChallenge(trellisDir, challenge);
  return {
    challenge,
    payload: encodePayload(PAIR_PREFIX, challenge),
    shortCode: challengeShortCode(challenge.challengeId),
  };
}

export function pairJoin(
  trellisDir: string,
  challengePayloadOrCode: string,
  opts?: { deviceLabel?: string; kind?: DeviceKind; transport?: DeviceTransport },
): {
  join: JoinResponse;
  payload: string;
  local: LocalDeviceKey;
  challenge: PairChallenge;
} {
  let challenge: PairChallenge;
  if (challengePayloadOrCode.startsWith(PAIR_PREFIX)) {
    challenge = decodePayload<PairChallenge>(PAIR_PREFIX, challengePayloadOrCode);
  } else {
    // Short code only works on the same machine that started — for OOB, use full payload.
    // On Device B, short code alone cannot resolve; require full payload.
    throw new Error(
      'Device B must use the full challenge payload (trellis:pair:v1:…). Short codes are for display only in Phase 0.',
    );
  }
  assertChallengeValid(challenge);

  // Device key — never touch identity.json
  const deviceIdentity = createIdentity({
    displayName: opts?.deviceLabel ?? 'paired-device',
  });
  const deviceId = newId('dev_');
  const local: LocalDeviceKey = {
    deviceId,
    identityEntityId: challenge.identityEntityId,
    did: challenge.did,
    publicKey: deviceIdentity.publicKey,
    privateKey: deviceIdentity.privateKey,
    deviceLabel: opts?.deviceLabel,
    kind: opts?.kind,
    transport: opts?.transport,
    createdAt: new Date().toISOString(),
  };
  // Persist pending local key before approve (B holds key; auth comes later)
  saveLocalDevice(trellisDir, local);

  // Also stash challenge root key for accept verification
  ensureDevicesDir(trellisDir);
  writeFileSync(
    join(devicesDir(trellisDir), 'pending-challenge.json'),
    JSON.stringify(challenge, null, 2),
  );

  const challengeBytes = canonicalJson({
    v: challenge.v,
    challengeId: challenge.challengeId,
    did: challenge.did,
    identityEntityId: challenge.identityEntityId,
    exp: challenge.exp,
    nonce: challenge.nonce,
  });
  const joinResponse: JoinResponse = {
    v: 1,
    challengeId: challenge.challengeId,
    devicePublicKey: deviceIdentity.publicKey,
    deviceLabel: opts?.deviceLabel,
    kind: opts?.kind,
    transport: opts?.transport,
    signature: signMessage(challengeBytes, deviceIdentity.privateKey),
  };
  return {
    join: joinResponse,
    payload: encodePayload(JOIN_PREFIX, joinResponse),
    local,
    challenge,
  };
}

export function pairApprove(
  trellisDir: string,
  joinPayload: string,
  opts?: { yes?: boolean },
): {
  signed: SignedDeviceAuthorization;
  payload: string;
  fingerprint: string;
} {
  if (!opts?.yes) {
    throw new Error(
      'Refusing to approve without confirmation — pass { yes: true } or CLI --yes after verifying fingerprint',
    );
  }
  const identity = resolveRepoIdentity(trellisDir);
  if (!identity) throw new Error('No identity on approving device');

  const join = decodePayload<JoinResponse>(JOIN_PREFIX, joinPayload);
  const challenge = loadChallenge(trellisDir, join.challengeId);
  if (!challenge) {
    throw new Error('Unknown or already-consumed pairing challenge');
  }
  assertChallengeValid(challenge);

  const challengeBytes = canonicalJson({
    v: challenge.v,
    challengeId: challenge.challengeId,
    did: challenge.did,
    identityEntityId: challenge.identityEntityId,
    exp: challenge.exp,
    nonce: challenge.nonce,
  });
  if (
    !verifySignature(challengeBytes, join.signature, join.devicePublicKey)
  ) {
    throw new Error('Invalid join response signature');
  }

  const fingerprint = deviceFingerprint(join.devicePublicKey);
  const deviceId = newId('dev_');
  const authorization: DeviceAuthorization = {
    v: 1,
    deviceId,
    identityEntityId: identity.entityId,
    did: identity.did,
    devicePublicKey: join.devicePublicKey,
    deviceLabel: join.deviceLabel,
    kind: join.kind,
    transport: join.transport,
    issuedAt: new Date().toISOString(),
    issuerDeviceId: ROOT_DEVICE_ID,
    challengeId: challenge.challengeId,
  };
  const signature = signMessage(
    canonicalJson(authorization),
    identity.privateKey,
  );
  const signed: SignedDeviceAuthorization = { authorization, signature };

  const registry = ensureRegistryFromIdentity(trellisDir, identity);
  registry.devices.push({
    deviceId,
    devicePublicKey: join.devicePublicKey,
    deviceLabel: join.deviceLabel,
    authorizedAt: authorization.issuedAt,
    issuerDeviceId: ROOT_DEVICE_ID,
    challengeId: challenge.challengeId,
    kind: join.kind,
    transport: join.transport,
  });
  saveRegistry(trellisDir, registry);
  consumeChallenge(trellisDir, challenge.challengeId);

  return {
    signed,
    payload: encodePayload(AUTH_PREFIX, signed),
    fingerprint,
  };
}

export function pairAccept(
  trellisDir: string,
  authPayload: string,
): { local: LocalDeviceKey; authorization: DeviceAuthorization } {
  const signed = decodePayload<SignedDeviceAuthorization>(
    AUTH_PREFIX,
    authPayload,
  );
  const { authorization, signature } = signed;

  const pendingPath = join(devicesDir(trellisDir), 'pending-challenge.json');
  let rootPublicKey: string | null = null;
  if (existsSync(pendingPath)) {
    const pending = JSON.parse(
      readFileSync(pendingPath, 'utf-8'),
    ) as PairChallenge;
    rootPublicKey = pending.rootPublicKey;
  }
  const local = loadLocalDevice(trellisDir);
  if (!local) {
    throw new Error('No local device key — run pair join first');
  }
  if (!rootPublicKey) {
    const reg = loadRegistry(trellisDir);
    rootPublicKey = reg?.rootPublicKey ?? null;
  }
  if (!rootPublicKey) {
    throw new Error('Cannot verify authorization — missing root public key');
  }
  if (
    !verifySignature(
      canonicalJson(authorization),
      signature,
      rootPublicKey,
    )
  ) {
    throw new Error('Invalid device authorization signature');
  }
  if (authorization.devicePublicKey !== local.publicKey) {
    throw new Error('Authorization devicePublicKey does not match local device');
  }

  // Align local deviceId with issuer-assigned id
  local.deviceId = authorization.deviceId;
  local.identityEntityId = authorization.identityEntityId;
  local.did = authorization.did;
  local.deviceLabel = authorization.deviceLabel ?? local.deviceLabel;
  local.kind = authorization.kind ?? local.kind;
  local.transport = authorization.transport ?? local.transport;
  saveLocalDevice(trellisDir, local);

  const registry: DeviceRegistry = {
    identityEntityId: authorization.identityEntityId,
    did: authorization.did,
    rootPublicKey,
    devices: [
      {
        deviceId: authorization.deviceId,
        devicePublicKey: authorization.devicePublicKey,
        deviceLabel: authorization.deviceLabel,
        authorizedAt: authorization.issuedAt,
        issuerDeviceId: authorization.issuerDeviceId,
        challengeId: authorization.challengeId,
        kind: authorization.kind,
        transport: authorization.transport,
      },
    ],
  };
  saveRegistry(trellisDir, registry);

  if (existsSync(pendingPath)) unlinkSync(pendingPath);

  return { local, authorization };
}

/**
 * Signing material for this install: prefer paired device key, else root identity.
 */
export function getSigningMaterial(trellisDir: string): {
  privateKey: string;
  identityEntityId: string;
  signedWith: string;
} | null {
  const local = loadLocalDevice(trellisDir);
  if (local) {
    return {
      privateKey: local.privateKey,
      identityEntityId: local.identityEntityId,
      signedWith: local.deviceId,
    };
  }
  const identity = resolveRepoIdentity(trellisDir);
  if (!identity) return null;
  return {
    privateKey: identity.privateKey,
    identityEntityId: identity.entityId,
    signedWith: ROOT_DEVICE_ID,
  };
}

/**
 * Update this machine's device state (Slice C): stamps `lastSeenAt` plus
 * optional sync metadata on the local device key, and mirrors the same onto
 * this device's record in the local registry when present (e.g. the approving
 * machine's own paired devices). Returns false when this machine has no
 * local device key (not paired).
 */
export function markDeviceSeen(
  trellisDir: string,
  patch?: { syncState?: DeviceSyncState; lastSyncOpHash?: string },
): boolean {
  const local = loadLocalDevice(trellisDir);
  if (!local) return false;
  const now = new Date().toISOString();
  local.lastSeenAt = now;
  if (patch?.lastSyncOpHash !== undefined) local.lastSyncOpHash = patch.lastSyncOpHash;
  if (patch?.syncState) local.syncState = patch.syncState;
  saveLocalDevice(trellisDir, local);

  const reg = loadRegistry(trellisDir);
  if (reg) {
    const rec = reg.devices.find((d) => d.deviceId === local.deviceId);
    if (rec && !rec.revokedAt) {
      rec.lastSeenAt = now;
      if (patch?.lastSyncOpHash !== undefined) rec.lastSyncOpHash = patch.lastSyncOpHash;
      if (patch?.syncState) rec.syncState = patch.syncState;
      saveRegistry(trellisDir, reg);
    }
  }
  return true;
}

/**
 * Patch state on an arbitrary device record in the registry (Slice C) —
 * used by the sync daemon and future sprite heartbeats. No-op for unknown or
 * revoked devices.
 */
export function updateDeviceState(
  trellisDir: string,
  deviceId: string,
  patch: { syncState?: DeviceSyncState; lastSyncOpHash?: string; lastSeenAt?: string },
): boolean {
  const reg = loadRegistry(trellisDir);
  if (!reg) return false;
  const rec = reg.devices.find((d) => d.deviceId === deviceId);
  if (!rec || rec.revokedAt) return false;
  if (patch.lastSeenAt) rec.lastSeenAt = patch.lastSeenAt;
  if (patch.lastSyncOpHash !== undefined) rec.lastSyncOpHash = patch.lastSyncOpHash;
  if (patch.syncState) rec.syncState = patch.syncState;
  saveRegistry(trellisDir, reg);
  return true;
}

/**
 * Build an `IdentityResolver` bound to a trellis directory (ADR 0022 Phase 3).
 *
 * The `IdentityResolver` interface takes only an `entityId` (it is injected
 * into the engine, which has no filesystem concept), whereas the registry
 * lookups in this module need the `trellisDir`. This adapter closes that gap:
 * it captures the dir and forwards to the registry/local-device resolution
 * that backs ADR 0020 device keys.
 *
 * Returns `null` when the directory has no identity at all, so callers can
 * keep the resolver opt-in (an identity-less repo gets no PKI enforcement).
 */
/**
 * Build an `IdentityResolver` bound to a trellis directory (ADR 0022 Phase 3,
 * ADR 0036). Resolves keys from the device registries (person scope first,
 * repo scope fallback) plus the local identity root — regardless of whether a
 * local identity exists: a machine with no identity still verifies remote ops
 * signed by identities it knows through pairing. An identity whose key is in
 * neither the registries nor the local store resolves to nothing (fail-closed).
 */
export function pairingResolver(trellisDir: string): IdentityResolver {
  return {
    resolvePublicKey: (entityId) => resolveDevicePublicKey(trellisDir, entityId, ROOT_DEVICE_ID),
    resolveDevicePublicKey: (entityId, deviceId) =>
      resolveDevicePublicKey(trellisDir, entityId, deviceId),
    resolvePublicKeys: (entityId) => resolvePublicKeys(trellisDir, entityId),
  };
}
