/**
 * OPFS blob tier — the **Local** rung of the ADR 0017 ladder.
 *
 * This is what lets a browser page hold bytes without a relay: the editor page
 * in app-builder, the host page in pi-sprite. A WebContainer *guest* has an
 * emulated `node:fs` and can use the disk store; the page around it cannot.
 *
 * ## Persistence is a correctness concern, not a nicety
 *
 * ADR 0017 makes the local copy an *authoritative* tier, under a non-negotiable
 * invariant: the relay copy is never the sole copy. But OPFS is evictable by
 * default — the browser may reclaim it under storage pressure. An unpersisted
 * local tier is therefore only a cache, and treating it as authoritative would
 * break the invariant exactly when it is the last holder.
 *
 * So this class tracks persistence explicitly (`persisted`), exposes
 * `requestPersistence()`, and never silently claims durability it does not have.
 * Callers promoting this tier to authoritative must check.
 *
 * Layout is flat — `blobs/{hash}` — matching `.trellis/blobs/{hash}` on disk so
 * the two tiers stay directly comparable.
 *
 * @module trellis/blobs
 */
import { hashBlob, type BlobHash, type BlobTier, type BlobTierMeta } from './tier.js';

const ROOT_DIR = 'blobs';

export type OpfsBlobTierOptions = {
  /** Subdirectory of the origin private file system. Default `'blobs'`. */
  directory?: string;
  /**
   * Resolve the OPFS root. Injectable for tests and for worker scopes.
   * Default: `navigator.storage.getDirectory()`.
   */
  getRoot?: () => Promise<FileSystemDirectoryHandle>;
  /**
   * Request durable storage. Injectable for tests.
   * Default: `navigator.storage.persist()`.
   */
  requestPersistence?: () => Promise<boolean>;
  /** Report whether storage is already durable. Default: `navigator.storage.persisted()`. */
  isPersisted?: () => Promise<boolean>;
};

export class OpfsBlobTier implements BlobTier {
  readonly name = 'opfs';

  private readonly directory: string;
  private readonly getRoot: () => Promise<FileSystemDirectoryHandle>;
  private readonly requestPersistenceImpl: () => Promise<boolean>;
  private readonly isPersistedImpl: () => Promise<boolean>;

  /**
   * Whether the browser has granted durable storage.
   * `null` until checked — never assume; ask.
   */
  private persistedState: boolean | null = null;

  /** Directory open is cached, not repeated — concurrent puts must not race. */
  private rootPromise: Promise<FileSystemDirectoryHandle> | null = null;

  constructor(options: OpfsBlobTierOptions = {}) {
    this.directory = options.directory ?? ROOT_DIR;

    const storage = (globalThis as { navigator?: { storage?: StorageManager } })
      .navigator?.storage;

    this.getRoot =
      options.getRoot ??
      (() => {
        if (!storage?.getDirectory) {
          return Promise.reject(
            new Error(
              'OPFS unavailable — no navigator.storage.getDirectory(). Pass `getRoot` explicitly outside a browser context.',
            ),
          );
        }
        return storage.getDirectory();
      });

    this.requestPersistenceImpl =
      options.requestPersistence ?? (() => storage?.persist?.() ?? Promise.resolve(false));

    this.isPersistedImpl =
      options.isPersisted ?? (() => storage?.persisted?.() ?? Promise.resolve(false));
  }

  /**
   * Whether this tier may be treated as an authoritative copy under the ADR
   * 0017 never-sole-copy invariant. `null` means not yet determined.
   */
  get persisted(): boolean | null {
    return this.persistedState;
  }

  /**
   * Ask the browser for durable storage and record the answer.
   *
   * Call before relying on this tier as authoritative. A `false` result is not
   * an error — it means the tier is a cache, and something colder must hold the
   * bytes too.
   */
  async requestPersistence(): Promise<boolean> {
    const already = await this.isPersistedImpl().catch(() => false);
    if (already) {
      this.persistedState = true;
      return true;
    }
    const granted = await this.requestPersistenceImpl().catch(() => false);
    this.persistedState = granted;
    return granted;
  }

  private root(): Promise<FileSystemDirectoryHandle> {
    if (!this.rootPromise) {
      this.rootPromise = this.getRoot()
        .then((root) => root.getDirectoryHandle(this.directory, { create: true }))
        .catch((err: unknown) => {
          // A failed open must not be cached, or every later call fails too.
          this.rootPromise = null;
          throw err;
        });
    }
    return this.rootPromise;
  }

  async put(content: Uint8Array, _meta?: BlobTierMeta): Promise<BlobHash> {
    const hash = await hashBlob(content);
    const dir = await this.root();

    // Content-addressed: identical bytes are already the right bytes. Skipping
    // the rewrite avoids pointless disk churn on repeated puts.
    if (await this.hasIn(dir, hash)) return hash;

    const handle = await dir.getFileHandle(hash, { create: true });
    const writable = await handle.createWritable();
    try {
      await writable.write(content as unknown as BufferSource);
    } finally {
      await writable.close();
    }
    return hash;
  }

  async get(hash: BlobHash): Promise<Uint8Array | null> {
    const dir = await this.root();
    try {
      const handle = await dir.getFileHandle(hash);
      const file = await handle.getFile();
      return new Uint8Array(await file.arrayBuffer());
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  async has(hash: BlobHash): Promise<boolean> {
    return this.hasIn(await this.root(), hash);
  }

  /** Remove a blob. Only safe when a colder tier or peer still holds it. */
  async delete(hash: BlobHash): Promise<boolean> {
    const dir = await this.root();
    try {
      await dir.removeEntry(hash);
      return true;
    } catch (err) {
      if (isNotFound(err)) return false;
      throw err;
    }
  }

  private async hasIn(
    dir: FileSystemDirectoryHandle,
    hash: BlobHash,
  ): Promise<boolean> {
    try {
      await dir.getFileHandle(hash);
      return true;
    } catch (err) {
      if (isNotFound(err)) return false;
      throw err;
    }
  }
}

/** OPFS signals a missing entry with `NotFoundError`, not a null return. */
function isNotFound(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { name?: string }).name === 'NotFoundError'
  );
}
