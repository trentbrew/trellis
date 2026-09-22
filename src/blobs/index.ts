/**
 * Trellis Blobs — content-addressed storage tiers.
 *
 * The graph stores hashes; these tiers resolve hashes to bytes. Compose them
 * with `createBlobLadder` so a miss walks up the ladder and re-warms on the way
 * back — the read path ADR 0017 describes.
 *
 * Browser-safe. The Node/disk tier lives in `trellis/blobs/node` so importing
 * this module never pulls in `node:fs`.
 *
 * ```ts
 * const blobs = createBlobLadder([
 *   new OpfsBlobTier(),
 *   relayTier(createBlobClient({ baseUrl: 'http://localhost:8231' })),
 * ]);
 * const hash = await blobs.put(bytes);
 * ```
 *
 * @module trellis/blobs
 */
export type { BlobHash, BlobTier, BlobTierMeta } from './tier.js';
export { hashBlob, toBytes } from './tier.js';
export { MemoryBlobTier } from './memory.js';
export { OpfsBlobTier, type OpfsBlobTierOptions } from './opfs.js';
export { relayTier } from './relay.js';
export { createBlobLadder, type BlobLadderOptions } from './ladder.js';
