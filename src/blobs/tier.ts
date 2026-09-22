/**
 * Trellis Blobs — tier seam.
 *
 * [ADR 0017](../../docs/adr/0017-blob-gc-thermal-decay.md) defines blob storage
 * as a ladder — hot (relay NVMe) / cold (object storage) / local (client OPFS) /
 * peer (iroh-blobs) — where a `GET` miss walks *up* the ladder and decay pushes
 * *down*. Walking a ladder requires the rungs to share a type; this is it.
 *
 * The existing implementations predate this seam and deliberately keep their own
 * shapes: `vcs/blob-store.ts` is synchronous and `Buffer`-based because VCS
 * diff/merge are synchronous, and `realtime/blob-client.ts` is `ArrayBuffer`-based
 * because it is `fetch`. Neither is changed — adapters in `./node.js` and
 * `./relay.js` present them as tiers.
 *
 * Everything here is browser-safe: no Node built-ins, addressing via Web Crypto.
 *
 * @module trellis/blobs
 */

/** Lowercase hex SHA-256 of the content — the blob's address. */
export type BlobHash = string;

/** Optional display metadata. Never part of the address. */
export type BlobTierMeta = {
  name?: string;
  contentType?: string;
};

/**
 * One rung of the ladder.
 *
 * Async even where a backend could answer synchronously: only a local
 * filesystem can, and a synchronous signature would exclude OPFS, IndexedDB,
 * and every network tier permanently.
 */
export interface BlobTier {
  /** Stable identifier for diagnostics — `'opfs'`, `'relay'`, `'disk'`. */
  readonly name: string;

  /** Bytes for this address, or null when this tier does not hold them. */
  get(hash: BlobHash): Promise<Uint8Array | null>;

  /** Whether this tier holds the address. Cheaper than `get` where possible. */
  has(hash: BlobHash): Promise<boolean>;

  /**
   * Store bytes and return their address. Idempotent by construction — the
   * same bytes always produce the same hash, so re-putting is a no-op.
   */
  put(content: Uint8Array, meta?: BlobTierMeta): Promise<BlobHash>;
}

/**
 * SHA-256 address of content.
 *
 * Must stay byte-identical to `BlobStore.hashSync` and the relay's server-side
 * hashing — if two tiers disagree on the address, the same bytes land under two
 * hashes and dedup silently stops working.
 *
 * ADR 0017 flags an eventual move to BLAKE3 for the iroh-blobs peer tier; that
 * migration lands here, in one place, by design.
 */
export async function hashBlob(content: Uint8Array): Promise<BlobHash> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    content as unknown as ArrayBuffer,
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/** Normalize the byte shapes the tiers hand back to a single view type. */
export function toBytes(input: ArrayBuffer | Uint8Array): Uint8Array {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}
