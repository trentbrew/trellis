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
import { hashVcsOp } from '../vcs/ops.js';

// ---------------------------------------------------------------------------
// Op signing
// ---------------------------------------------------------------------------

/**
 * Hash the op body with the signature fields excluded. This is the canonical
 * preimage that signatures cover: the integrity hash (`op.hash`) includes the
 * signature (signature lives inside `vcs`, which is the hashed payload — see
 * types.ts), but a signature cannot cover itself, so it is computed over the
 * body with the signature fields stripped.
 */
function hashVcsOpBody(op: VcsOp): Promise<string> {
  if (!op.vcs) return hashVcsOp(op);
  const { signature: _s, signedBy: _b, signedWith: _w, ...rest } = op.vcs;
  return hashVcsOp({ ...op, vcs: rest as VcsOp['vcs'] });
}

/**
 * Sign a VcsOp in-place using the given private key.
 * Sets `vcs.signature`, `vcs.signedBy`, and optionally `vcs.signedWith` (ADR 0020).
 *
 * The signature is computed over the body with the signature fields excluded
 * (`hashVcsOpBody`), then stamped, and `op.hash` is recomputed to *include* the
 * signature so a signed op still passes `verifyVcsOpHash` (signing is not an
 * out-of-band annotation). `verifyOp`/`verifyOpBatch` reconstruct the same
 * body hash to check the signature.
 */
export async function signOp(
  op: VcsOp,
  privateKeyBase64: string,
  identityEntityId: string,
  signedWith: string = 'root',
): Promise<VcsOp> {
  if (!op.vcs) {
    op.vcs = {};
  }
  const bodyHash = await hashVcsOpBody(op);
  op.vcs.signedBy = identityEntityId;
  op.vcs.signedWith = signedWith;
  op.vcs.signature = signMessage(bodyHash, privateKeyBase64);
  op.hash = await hashVcsOp(op);
  return op;
}

/**
 * Verify the signature on a VcsOp.
 * Returns true if the op has a valid signature, false if invalid.
 * Returns null if the op has no signature (unsigned).
 */
export async function verifyOp(
  op: VcsOp,
  publicKeyBase64: string,
): Promise<boolean | null> {
  if (!op.vcs?.signature) return null;
  const bodyHash = await hashVcsOpBody(op);
  return verifySignature(bodyHash, op.vcs.signature, publicKeyBase64);
}

/**
 * Reconstruct the canonical body hash a signature was computed over: the op
 * with its signature fields stripped (see `hashVcsOpBody`).
 */
export function opBodyHash(op: VcsOp): Promise<string> {
  return hashVcsOpBody(op);
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
export async function verifyOpBatch(
  ops: VcsOp[],
  resolver: IdentityResolver,
): Promise<SignatureVerificationResult[]> {
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

    const bodyHash = await hashVcsOpBody(op);
    const valid = keys.some((publicKey) =>
      verifySignature(bodyHash, op.vcs!.signature!, publicKey),
    );
    results.push({
      valid,
      op,
      reason: valid ? undefined : `Invalid signature on op ${op.hash}`,
    });
  }

  return results;
}
