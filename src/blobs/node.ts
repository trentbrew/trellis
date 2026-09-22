/**
 * Disk blob tier — adapts the VCS `BlobStore` to the tier seam.
 *
 * Node-only: `BlobStore` uses `node:fs`. Kept out of `./index.js` so importing
 * the blob seam in a browser never pulls in filesystem code. Inside a
 * WebContainer guest `node:fs` is emulated, so this tier works there too.
 *
 * `BlobStore` stays synchronous and `Buffer`-based — VCS diff/merge depend on
 * that — and this adapter presents it asynchronously without changing it.
 *
 * @module trellis/blobs/node
 */
import type { BlobStore } from '../vcs/blob-store.js';
import type { BlobHash, BlobTier, BlobTierMeta } from './tier.js';

/** Present a disk-backed `BlobStore` as a ladder tier. */
export function diskTier(store: BlobStore, name = 'disk'): BlobTier {
  return {
    name,

    async get(hash: BlobHash): Promise<Uint8Array | null> {
      const found = store.get(hash);
      return found ? new Uint8Array(found) : null;
    },

    async has(hash: BlobHash): Promise<boolean> {
      return store.has(hash);
    },

    async put(content: Uint8Array, meta?: BlobTierMeta): Promise<BlobHash> {
      const hash = store.putSync(content);
      if (meta) store.setMeta(hash, meta);
      return hash;
    },
  };
}
