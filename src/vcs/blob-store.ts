/**
 * Content-Addressable Blob Store
 *
 * Stores file content indexed by SHA-256 hash. Provides the source of truth
 * for file reconstruction at any point in history. The EAV graph stores
 * structural metadata; the blob store stores byte-exact content.
 *
 * Storage format: `.trellis/blobs/{hash}` files on disk.
 * Optional display metadata: `.trellis/blob-meta.json` (name / contentType).
 * Future: migrate to SQLite `blobs(hash TEXT PRIMARY KEY, content BLOB)`.
 */

import {
  createReadStream as fsCreateReadStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
  type ReadStream,
} from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

export type BlobMeta = {
  name?: string;
  contentType?: string;
  uploadedAt?: number;
};

type BlobMetaMap = Record<string, BlobMeta>;

export class BlobStore {
  private blobDir: string;
  private metaPath: string;

  constructor(trellisDir: string) {
    this.blobDir = join(trellisDir, 'blobs');
    this.metaPath = join(trellisDir, 'blob-meta.json');
    if (!existsSync(this.blobDir)) {
      mkdirSync(this.blobDir, { recursive: true });
    }
  }

  /**
   * Store content and return its SHA-256 hash.
   * Idempotent — storing the same content twice is a no-op.
   */
  async put(content: Buffer | Uint8Array): Promise<string> {
    const hash = await this.hash(content);
    const blobPath = join(this.blobDir, hash);
    if (!existsSync(blobPath)) {
      writeFileSync(blobPath, content);
    }
    return hash;
  }

  /**
   * Synchronous put — uses Bun's sync crypto if available.
   */
  putSync(content: Buffer | Uint8Array): string {
    const hash = this.hashSync(content);
    const blobPath = join(this.blobDir, hash);
    if (!existsSync(blobPath)) {
      writeFileSync(blobPath, content);
    }
    return hash;
  }

  /**
   * Retrieve content by hash. Returns null if not found.
   */
  get(hash: string): Buffer | null {
    const blobPath = join(this.blobDir, hash);
    if (!existsSync(blobPath)) {
      return null;
    }
    return readFileSync(blobPath);
  }

  /**
   * Check if a blob exists.
   */
  has(hash: string): boolean {
    return existsSync(join(this.blobDir, hash));
  }

  /**
   * Byte length of a stored blob, or null if not found. Cheap stat — does not
   * read the content. Used to answer Range/Content-Length without loading bytes.
   */
  size(hash: string): number | null {
    const blobPath = join(this.blobDir, hash);
    if (!existsSync(blobPath)) return null;
    return statSync(blobPath).size;
  }

  /**
   * Stream a blob (optionally a single byte range) from disk without buffering
   * the whole file into memory. `start`/`end` are inclusive byte offsets, matching
   * HTTP Range semantics. Returns null if the blob does not exist.
   */
  createReadStream(
    hash: string,
    range?: { start: number; end: number },
  ): ReadStream | null {
    const blobPath = join(this.blobDir, hash);
    if (!existsSync(blobPath)) return null;
    return range
      ? fsCreateReadStream(blobPath, { start: range.start, end: range.end })
      : fsCreateReadStream(blobPath);
  }

  /**
   * Compute SHA-256 hash of content (async).
   */
  async hash(content: Buffer | Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      content as unknown as ArrayBuffer,
    );
    return this.hexFromBuffer(hashBuffer);
  }

  /**
   * Compute SHA-256 hash of content (sync).
   * Uses node:crypto for cross-runtime compatibility.
   */
  hashSync(content: Buffer | Uint8Array): string {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * List stored blob hashes (sha256 hex filenames). Order is filesystem order.
   */
  listHashes(): string[] {
    try {
      const HASH_RE = /^[a-f0-9]{64}$/;
      return (readdirSync(this.blobDir) as string[]).filter((f) =>
        HASH_RE.test(f),
      );
    } catch {
      return [];
    }
  }

  /** Optional display metadata (filename / mime) keyed by content hash. */
  getMeta(hash: string): BlobMeta | undefined {
    return this.readMetaMap()[hash];
  }

  setMeta(hash: string, meta: BlobMeta): void {
    const map = this.readMetaMap();
    const prev = map[hash] ?? {};
    map[hash] = {
      ...prev,
      ...meta,
      // Prefer a real filename over a later empty overwrite.
      name: meta.name?.trim() || prev.name,
      contentType: meta.contentType?.trim() || prev.contentType,
    };
    this.writeMetaMap(map);
  }

  /**
   * Delete a blob by hash. Returns true when a stored blob was removed.
   * Also prunes any display metadata keyed by the same hash.
   */
  delete(hash: string): boolean {
    const blobPath = join(this.blobDir, hash);
    if (!existsSync(blobPath)) return false;
    rmSync(blobPath, { force: true });
    const map = this.readMetaMap();
    if (hash in map) {
      delete map[hash];
      this.writeMetaMap(map);
    }
    return true;
  }

  /**
   * Returns the number of blobs stored.
   */
  count(): number {
    return this.listHashes().length;
  }

  /**
   * Returns the total size of all blobs in bytes.
   */
  totalSize(): number {
    try {
      const files: string[] = readdirSync(this.blobDir);
      return files.reduce((sum: number, f: string) => {
        try {
          return sum + statSync(join(this.blobDir, f)).size;
        } catch {
          return sum;
        }
      }, 0);
    } catch {
      return 0;
    }
  }

  private readMetaMap(): BlobMetaMap {
    try {
      if (!existsSync(this.metaPath)) return {};
      const parsed = JSON.parse(readFileSync(this.metaPath, 'utf8')) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
      return parsed as BlobMetaMap;
    } catch {
      return {};
    }
  }

  private writeMetaMap(map: BlobMetaMap): void {
    writeFileSync(this.metaPath, JSON.stringify(map));
  }

  private hexFromBuffer(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
