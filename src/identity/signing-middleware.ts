/**
 * Signing Middleware
 *
 * DESIGN.md §6.2 — Every op can be cryptographically signed by its author.
 *
 * This module provides:
 * - `signOp`: Sign a VcsOp with a local identity's private key.
 * - `verifyOp`: Verify the signature on a VcsOp.
 * - `SignatureVerificationMiddleware`: Middleware that rejects ops with
 *   invalid signatures on remote ops.
 */

import type { VcsOp } from '../vcs/types.js';
import { signMessage, verifySignature } from './identity.js';

// ---------------------------------------------------------------------------
// Op signing
// ---------------------------------------------------------------------------

/**
 * Sign a VcsOp in-place using the given private key.
 * Sets `vcs.signature`, `vcs.signedBy`, and optionally `vcs.signedWith` (ADR 0020).
 */
export function signOp(
  op: VcsOp,
  privateKeyBase64: string,
  identityEntityId: string,
  signedWith: string = 'root',
): VcsOp {
  if (!op.vcs) {
    op.vcs = {};
  }
  op.vcs.signature = signMessage(op.hash, privateKeyBase64);
  op.vcs.signedBy = identityEntityId;
  op.vcs.signedWith = signedWith;
  return op;
}

/**
 * Verify the signature on a VcsOp.
 * Returns true if the op has a valid signature, false if invalid.
 * Returns null if the op has no signature (unsigned).
 */
export function verifyOp(
  op: VcsOp,
  publicKeyBase64: string,
): boolean | null {
  if (!op.vcs?.signature) return null;
  return verifySignature(op.hash, op.vcs.signature, publicKeyBase64);
}

// ---------------------------------------------------------------------------
// Middleware interface
// ---------------------------------------------------------------------------

export interface IdentityResolver {
  /** Resolve an identity entity ID to its root/bootstrap public key (base64). */
  resolvePublicKey(entityId: string): string | null;
  /** ADR 0020 — resolve a specific device key under an identity. */
  resolveDevicePublicKey?(
    identityEntityId: string,
    deviceId: string,
  ): string | null;
  /** ADR 0020 — all authorized keys (root + devices) for try-all legacy verify. */
  resolvePublicKeys?(identityEntityId: string): string[];
}

export interface SignatureVerificationResult {
  valid: boolean;
  op: VcsOp;
  reason?: string;
}

function resolveKeysForOp(
  op: VcsOp,
  resolver: IdentityResolver,
): string[] {
  const identityId = op.vcs!.signedBy!;
  const deviceId = op.vcs!.signedWith;

  if (deviceId && resolver.resolveDevicePublicKey) {
    const key = resolver.resolveDevicePublicKey(identityId, deviceId);
    if (key) return [key];
  }

  if (resolver.resolvePublicKeys) {
    const keys = resolver.resolvePublicKeys(identityId);
    if (keys.length) return keys;
  }

  const root = resolver.resolvePublicKey(identityId);
  return root ? [root] : [];
}

/**
 * Verify all signatures on a batch of ops.
 * Returns results for ops that have signatures.
 * Supports ADR 0020 device keys via signedWith + resolveDevicePublicKey.
 */
export function verifyOpBatch(
  ops: VcsOp[],
  resolver: IdentityResolver,
): SignatureVerificationResult[] {
  const results: SignatureVerificationResult[] = [];

  for (const op of ops) {
    if (!op.vcs?.signature || !op.vcs?.signedBy) continue;

    const keys = resolveKeysForOp(op, resolver);
    if (!keys.length) {
      results.push({
        valid: false,
        op,
        reason: `Unknown identity/device: ${op.vcs.signedBy}${
          op.vcs.signedWith ? ` / ${op.vcs.signedWith}` : ''
        }`,
      });
      continue;
    }

    const valid = keys.some((publicKey) =>
      verifySignature(op.hash, op.vcs!.signature!, publicKey),
    );
    results.push({
      valid,
      op,
      reason: valid ? undefined : `Invalid signature on op ${op.hash}`,
    });
  }

  return results;
}
