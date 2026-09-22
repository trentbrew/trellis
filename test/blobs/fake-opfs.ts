/**
 * Minimal in-memory OPFS stand-in.
 *
 * Enough of `FileSystemDirectoryHandle` for `OpfsBlobTier`: nested directories,
 * `getFileHandle` with and without `create`, `createWritable`, `getFile`, and
 * `removeEntry`. Crucially it reproduces the behaviour the tier actually
 * depends on — a missing entry raises `NotFoundError` rather than returning
 * null — so the not-found path is genuinely exercised.
 */

class FakeFile {
  constructor(private readonly bytes: Uint8Array) {}
  async arrayBuffer(): Promise<ArrayBuffer> {
    return this.bytes.slice().buffer as ArrayBuffer;
  }
}

function notFound(name: string): Error {
  const err = new Error(`${name} not found`);
  err.name = 'NotFoundError';
  return err;
}

class FakeFileHandle {
  constructor(
    private readonly store: Map<string, Uint8Array>,
    private readonly key: string,
  ) {}

  async getFile(): Promise<FakeFile> {
    const bytes = this.store.get(this.key);
    if (!bytes) throw notFound(this.key);
    return new FakeFile(bytes);
  }

  async createWritable() {
    const chunks: Uint8Array[] = [];
    const store = this.store;
    const key = this.key;
    return {
      async write(chunk: BufferSource) {
        chunks.push(
          chunk instanceof Uint8Array
            ? new Uint8Array(chunk)
            : new Uint8Array(chunk as ArrayBuffer),
        );
      },
      async close() {
        const total = chunks.reduce((sum, part) => sum + part.byteLength, 0);
        const merged = new Uint8Array(total);
        let offset = 0;
        for (const part of chunks) {
          merged.set(part, offset);
          offset += part.byteLength;
        }
        store.set(key, merged);
      },
    };
  }
}

class FakeDirectoryHandle {
  private files = new Map<string, Uint8Array>();
  private dirs = new Map<string, FakeDirectoryHandle>();

  async getDirectoryHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<FakeDirectoryHandle> {
    let dir = this.dirs.get(name);
    if (!dir) {
      if (!options?.create) throw notFound(name);
      dir = new FakeDirectoryHandle();
      this.dirs.set(name, dir);
    }
    return dir;
  }

  async getFileHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<FakeFileHandle> {
    if (!this.files.has(name)) {
      if (!options?.create) throw notFound(name);
      this.files.set(name, new Uint8Array());
    }
    return new FakeFileHandle(this.files, name);
  }

  async removeEntry(name: string): Promise<void> {
    if (!this.files.delete(name)) throw notFound(name);
  }
}

/** A fresh, empty fake OPFS root. */
export function createFakeOpfsRoot(): FileSystemDirectoryHandle {
  return new FakeDirectoryHandle() as unknown as FileSystemDirectoryHandle;
}
