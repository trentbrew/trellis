import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { createHash } from 'crypto';
import { BlobStore } from './blob-store.js';

function sha256Hex(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

export class BlobResolver {
  private blobStore: BlobStore;
  private rootPath: string;

  constructor(blobStore: BlobStore, rootPath: string) {
    this.blobStore = blobStore;
    this.rootPath = resolve(rootPath);
  }

  /**
   * Ordered lookup: local blob → git worktree → null.
   */
  get(contentHash: string, filePath?: string): Buffer | null {
    const local = this.blobStore.get(contentHash);
    if (local) return local;

    if (filePath && this.isGitRepo()) {
      const absPath = join(this.rootPath, filePath);
      if (existsSync(absPath)) {
        const gitResolved = this.resolveFromGit(contentHash, absPath);
        if (gitResolved) return gitResolved;
      }
    }

    return null;
  }

  /**
   * Check existence across tiers.
   */
  has(contentHash: string, filePath?: string): boolean {
    return this.get(contentHash, filePath) !== null;
  }

  /**
   * Check if hash exists in local .trellis/blobs/ only.
   */
  hasLocal(contentHash: string): boolean {
    return this.blobStore.has(contentHash);
  }

  /**
   * Resolve content from git worktree. Reads the file at filePath,
   * computes SHA-256, and compares to contentHash.
   */
  resolveFromGit(contentHash: string, absPath: string): Buffer | null {
    try {
      const bytes = readFileSync(absPath);
      const fileHash = sha256Hex(bytes);
      if (fileHash === contentHash) return bytes;
    } catch { }
    return null;
  }

  /**
   * Detect whether rootPath is inside a git working tree.
   */
  isGitRepo(): boolean {
    let dir = this.rootPath;
    while (true) {
      if (existsSync(join(dir, '.git'))) return true;
      const parent = join(dir, '..');
      if (parent === dir) break;
      dir = parent;
    }
    return false;
  }

  /**
   * Return whether blobStore.put can be skipped for this content.
   * True when the file exists in the worktree and SHA-256 matches contentHash.
   */
  canSkipPut(filePath: string, contentHash: string): boolean {
    if (!this.isGitRepo()) return false;
    const absPath = join(this.rootPath, filePath);
    if (!existsSync(absPath)) return false;
    try {
      const bytes = readFileSync(absPath);
      return sha256Hex(bytes) === contentHash;
    } catch {
      return false;
    }
  }

  /**
   * Return the underlying blob store (for raw local-only access).
   */
  getBlobStore(): BlobStore {
    return this.blobStore;
  }
}