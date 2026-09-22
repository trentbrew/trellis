/**
 * Relay blob tier — adapts the ADR 0016 `/blob` HTTP client to the tier seam.
 *
 * This is the **Hot** rung from a client's perspective. The relay computes the
 * address server-side; the adapter does not re-derive it, so a disagreement
 * between client and server hashing surfaces at the ladder rather than being
 * papered over here.
 *
 * Browser-safe — `BlobClient` is `fetch`-based with no Node dependencies.
 *
 * @module trellis/blobs
 */
import type { BlobClient } from '../realtime/blob-client.js';
import { toBytes, type BlobHash, type BlobTier, type BlobTierMeta } from './tier.js';

/** Present a relay blob client as a ladder tier. */
export function relayTier(client: BlobClient, name = 'relay'): BlobTier {
  return {
    name,

    async get(hash: BlobHash): Promise<Uint8Array | null> {
      const buffer = await client.get(hash);
      return buffer ? toBytes(buffer) : null;
    },

    async has(hash: BlobHash): Promise<boolean> {
      return client.has(hash);
    },

    async put(content: Uint8Array, meta?: BlobTierMeta): Promise<BlobHash> {
      return client.put(content, meta);
    },
  };
}
