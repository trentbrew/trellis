/**
 * In-memory blob tier.
 *
 * The reference implementation — the contract suite runs against it, so it
 * defines what correct means for every other rung. Also useful as an ephemeral
 * tier for sandboxes that should leave nothing behind.
 *
 * @module trellis/blobs
 */
import { hashBlob, type BlobHash, type BlobTier, type BlobTierMeta } from './tier.js';

export class MemoryBlobTier implements BlobTier {
  readonly name: string;
  private blobs = new Map<BlobHash, Uint8Array>();
  private meta = new Map<BlobHash, BlobTierMeta>();

  constructor(name = 'memory') {
    this.name = name;
  }

  async put(content: Uint8Array, meta?: BlobTierMeta): Promise<BlobHash> {
    const hash = await hashBlob(content);
    if (!this.blobs.has(hash)) {
      // Copy: the caller may reuse or mutate the buffer after handing it over,
      // which would corrupt content already addressed by its hash.
      this.blobs.set(hash, new Uint8Array(content));
    }
    if (meta) this.meta.set(hash, meta);
    return hash;
  }

  async get(hash: BlobHash): Promise<Uint8Array | null> {
    const found = this.blobs.get(hash);
    return found ? new Uint8Array(found) : null;
  }

  async has(hash: BlobHash): Promise<boolean> {
    return this.blobs.has(hash);
  }

  getMeta(hash: BlobHash): BlobTierMeta | undefined {
    return this.meta.get(hash);
  }

  count(): number {
    return this.blobs.size;
  }

  totalSize(): number {
    let total = 0;
    for (const bytes of this.blobs.values()) total += bytes.byteLength;
    return total;
  }

  clear(): void {
    this.blobs.clear();
    this.meta.clear();
  }
}
