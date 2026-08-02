/**
 * Peer-aware identity resolution (ADR 0036).
 *
 * Canonical `IdentityResolver` construction site: local identity/device keys
 * (pairing registry) ∪ the local peer graph (`~/.trellis/peers.json`).
 *
 * - Local path resolves exactly as `pairingResolver` today (device-level
 *   revocation via `revokedAt` unchanged).
 * - Peer path adds a registered peer's `publicKey` when `entityId`/`did`
 *   matches a peer record — unless the key is in the record's `revokedKeys`.
 * - A revoked key never resolves; a record whose own `publicKey` is revoked
 *   resolves to no keys (identity effectively unknown → verify fails closed).
 */

import type { IdentityResolver } from './signing-middleware.js';
import { pairingResolver } from './pairing.js';
import { loadPeers } from '../vcs/peer-resolver.js';

/**
 * Build the composed resolver bound to a trellis directory: device registries
 * (person scope first, repo fallback — via `pairingResolver`) ∪ the local
 * peer graph (`~/.trellis/peers.json`). Always returns a resolver — an
 * identity with no keys anywhere resolves to nothing (fail-closed, ADR 0036).
 */
export function peerKeyResolver(trellisDir: string): IdentityResolver {
  const local = pairingResolver(trellisDir);

  /** Peer records whose entityId/did match, with revoked keys filtered. */
  function peerKeysFor(identityEntityId: string): string[] {
    const revoked = new Set<string>();
    const keys: string[] = [];
    for (const record of Object.values(loadPeers())) {
      const matches =
        record.entityId === identityEntityId ||
        record.did === identityEntityId;
      if (!matches) continue;
      for (const k of record.revokedKeys ?? []) revoked.add(k);
      if (!revoked.has(record.publicKey)) keys.push(record.publicKey);
    }
    return keys;
  }

  function peerRootFor(identityEntityId: string): string | null {
    const keys = peerKeysFor(identityEntityId);
    return keys.length > 0 ? keys[0] : null;
  }

  return {
    resolvePublicKey: (entityId) =>
      local?.resolvePublicKey(entityId) ?? peerRootFor(entityId),

    resolveDevicePublicKey: (entityId, deviceId) =>
      local?.resolveDevicePublicKey?.(entityId, deviceId) ?? null,

    resolvePublicKeys: (identityEntityId) => {
      const keys: string[] = [];
      const seen = new Set<string>();
      const push = (k: string) => {
        if (k && !seen.has(k)) {
          seen.add(k);
          keys.push(k);
        }
      };
      for (const k of local?.resolvePublicKeys?.(identityEntityId) ?? []) {
        push(k);
      }
      for (const k of peerKeysFor(identityEntityId)) {
        push(k);
      }
      return keys;
    },
  };
}
