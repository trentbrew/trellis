/**
 * Identity Module
 *
 * Ed25519 key pair generation, DID derivation, and local identity storage.
 * DESIGN.md §6.1 — Every actor is an Identity entity with a cryptographic key pair.
 *
 * Private keys are stored locally in `.trellis/identity.json` (never synced).
 * Public keys and DIDs are graph entities that get replicated to peers.
 */

import {
  generateKeyPairSync,
  sign,
  verify,
  createPrivateKey,
  createPublicKey,
  type KeyObject,
} from 'crypto';
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  chmodSync,
} from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IdentityConfig {
  displayName: string;
  email?: string;
  /** Ed25519 public key, base64-encoded. */
  publicKey: string;
  /** Ed25519 private key, base64-encoded (local only, never synced). */
  privateKey: string;
  /** did:key identifier derived from public key. */
  did: string;
  /** Entity ID for use in the EAV store. */
  entityId: string;
  /** ISO timestamp of creation. */
  createdAt: string;
}

export interface PublicIdentity {
  displayName: string;
  email?: string;
  publicKey: string;
  did: string;
  entityId: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Key generation
// ---------------------------------------------------------------------------

/**
 * Generate a new Ed25519 identity.
 */
export function createIdentity(opts: {
  displayName: string;
  email?: string;
}): IdentityConfig {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');

  const pubDer = publicKey.export({ type: 'spki', format: 'der' });
  const privDer = privateKey.export({ type: 'pkcs8', format: 'der' });

  // Extract raw 32-byte public key from SPKI DER (last 32 bytes)
  const rawPub = pubDer.subarray(pubDer.length - 32);

  const did = deriveDid(rawPub);
  const entityId = `identity:${did}`;

  return {
    displayName: opts.displayName,
    email: opts.email,
    publicKey: pubDer.toString('base64'),
    privateKey: privDer.toString('base64'),
    did,
    entityId,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Derive a did:key identifier from a raw Ed25519 public key.
 * Format: did:key:z6Mk... (multicodec 0xed01 prefix + base58btc)
 */
function deriveDid(rawPublicKey: Buffer | Uint8Array): string {
  // Multicodec prefix for Ed25519 public key: 0xed 0x01
  const multicodec = Buffer.concat([
    Buffer.from([0xed, 0x01]),
    Buffer.from(rawPublicKey),
  ]);
  // Base58btc encoding
  const encoded = base58btcEncode(multicodec);
  return `did:key:z${encoded}`;
}

// ---------------------------------------------------------------------------
// Op signing / verification
// ---------------------------------------------------------------------------

/**
 * Sign a message (typically an op hash) with a private key.
 */
export function signMessage(
  message: string,
  privateKeyBase64: string,
): string {
  const privDer = Buffer.from(privateKeyBase64, 'base64');
  const privateKey = createPrivateKeyFromDer(privDer);
  const sig = sign(null, Buffer.from(message, 'utf-8'), privateKey);
  return sig.toString('base64');
}

/**
 * Verify a signature against a message and public key.
 */
export function verifySignature(
  message: string,
  signatureBase64: string,
  publicKeyBase64: string,
): boolean {
  const pubDer = Buffer.from(publicKeyBase64, 'base64');
  const publicKey = createPublicKey({
    key: pubDer,
    format: 'der',
    type: 'spki',
  });
  const sig = Buffer.from(signatureBase64, 'base64');
  return verify(null, Buffer.from(message, 'utf-8'), publicKey, sig);
}

// ---------------------------------------------------------------------------
// Local identity storage
// ---------------------------------------------------------------------------

const IDENTITY_FILE = 'identity.json';

/** Owner-only mode for directories that hold key material. */
const SECRET_DIR_MODE = 0o700;
/** Owner-only mode for files that hold key material. */
const SECRET_FILE_MODE = 0o600;

/** Create (or tighten) a directory for key material to owner-only. */
export function ensureSecretDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: SECRET_DIR_MODE });
  }
  tightenSecret(dir, SECRET_DIR_MODE);
}

/** Tighten an existing path to `mode`. Best-effort where POSIX modes don't apply. */
export function tightenSecret(p: string, mode = SECRET_FILE_MODE): void {
  try {
    chmodSync(p, mode);
  } catch {
    /* not a POSIX platform, or not writable */
  }
}

/**
 * Write key material with owner-only permissions. `mode` on `writeFileSync`
 * applies only when the file is created, so an existing file is tightened
 * explicitly too.
 */
export function writeSecretFile(filePath: string, data: string): void {
  ensureSecretDir(dirname(filePath));
  writeFileSync(filePath, data, { encoding: 'utf-8', mode: SECRET_FILE_MODE });
  tightenSecret(filePath);
}

/**
 * Save an identity to the local .trellis directory.
 */
export function saveIdentity(trellisDir: string, identity: IdentityConfig): void {
  writeSecretFile(join(trellisDir, IDENTITY_FILE), JSON.stringify(identity, null, 2));
}

/**
 * Load the local identity from .trellis/identity.json.
 */
export function loadIdentity(trellisDir: string): IdentityConfig | null {
  const filePath = join(trellisDir, IDENTITY_FILE);
  if (!existsSync(filePath)) return null;
  // Self-heal key files written before permissions were enforced.
  tightenSecret(filePath);
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8')) as IdentityConfig;
  } catch {
    return null;
  }
}

/**
 * Check if a local identity exists.
 */
export function hasIdentity(trellisDir: string): boolean {
  return existsSync(join(trellisDir, IDENTITY_FILE));
}

/**
 * Extract the public (safe-to-share) portion of an identity.
 */
export function toPublicIdentity(identity: IdentityConfig): PublicIdentity {
  return {
    displayName: identity.displayName,
    email: identity.email,
    publicKey: identity.publicKey,
    did: identity.did,
    entityId: identity.entityId,
    createdAt: identity.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Person-scoped identity (ADR 0032 §3)
//
// Identity belongs to a *person*, not a repo. The person key lives at
// ~/.trellis/identity.json and is shared by every repo on the machine, so a
// person is the same person on every VM that holds (or was paired into) the
// key. Per-repo .trellis/identity.json remains as the legacy location.
// ---------------------------------------------------------------------------

/** `~/.trellis` — honors `HOME` override (tests, containers). */
export function trellisUserDir(): string {
  return join(process.env.HOME ?? homedir(), '.trellis');
}

export function personIdentityDir(): string {
  return trellisUserDir();
}

export function personIdentityPath(): string {
  return join(personIdentityDir(), IDENTITY_FILE);
}

/** Save an identity to the person-scoped ~/.trellis/identity.json. */
export function savePersonIdentity(identity: IdentityConfig): void {
  saveIdentity(personIdentityDir(), identity);
}

/** Load the person-scoped identity (null when unset). */
export function loadPersonIdentity(): IdentityConfig | null {
  return loadIdentity(personIdentityDir());
}

export function hasPersonIdentity(): boolean {
  return existsSync(personIdentityPath());
}

/** Load or create the person identity, persisting it on creation. */
export function ensurePersonIdentity(opts?: {
  displayName?: string;
  email?: string;
}): IdentityConfig {
  const existing = loadPersonIdentity();
  if (existing) return existing;
  const identity = createIdentity({
    displayName: opts?.displayName ?? 'Anonymous',
    email: opts?.email,
  });
  savePersonIdentity(identity);
  return identity;
}

/**
 * Resolve the signing identity for a repo: the person key is authoritative
 * (ADR 0032 §3); a legacy per-repo key is the fallback.
 */
export function resolveRepoIdentity(trellisDir: string): IdentityConfig | null {
  return loadIdentity(trellisDir) ?? loadPersonIdentity();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// A static import: `require` is undefined when this module runs as native ESM
// (tsx, vitest-spawned CLIs); only the esbuild bundle injected a shim for it.
function createPrivateKeyFromDer(der: Buffer): KeyObject {
  return createPrivateKey({
    key: der,
    format: 'der',
    type: 'pkcs8',
  });
}

/**
 * Base58btc encoding (Bitcoin alphabet).
 */
function base58btcEncode(buf: Buffer | Uint8Array): string {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

  let num = BigInt(0);
  for (const byte of buf) {
    num = num * 256n + BigInt(byte);
  }

  let encoded = '';
  while (num > 0n) {
    const rem = Number(num % 58n);
    num = num / 58n;
    encoded = ALPHABET[rem] + encoded;
  }

  // Preserve leading zeros
  for (const byte of buf) {
    if (byte === 0) {
      encoded = '1' + encoded;
    } else {
      break;
    }
  }

  return encoded || '1';
}
