/**
 * Trellis Realtime — Blob Client (browser-safe)
 *
 * Fetch-based client for the relay's content-addressed blob HTTP surface.
 * No Node deps — safe under the `trellis/realtime` browser export condition.
 *
 * Blobs are dumb bytes keyed by hash: no graph sync, no subscriptions, no
 * permission filtering. "Trellis owns semantics, the relay moves bytes."
 *
 * @module trellis/realtime
 */

export interface BlobClientOptions {
  /**
   * Base URL of the relay HTTP origin (e.g. `http://localhost:8231`).
   * Trailing slash is stripped.
   */
  baseUrl: string;
  /**
   * When true, re-hash GET responses with `crypto.subtle.digest` and reject
   * mismatches (corruption / MITM). Default false.
   */
  verify?: boolean;
  /** Injectable fetch for tests. Default: global `fetch`. */
  fetch?: typeof fetch;
}

export interface BlobClient {
  /** GET /blob/:hash → bytes, or null on 404. */
  get(hash: string): Promise<ArrayBuffer | null>;
  /** HEAD /blob/:hash → existence. */
  has(hash: string): Promise<boolean>;
  /** PUT /blob → server-computed hash. Optional name/type for shared listing. */
  put(
    bytes: ArrayBuffer | Uint8Array | Blob,
    meta?: { name?: string; contentType?: string },
  ): Promise<string>;
  /** GET /blob → list hashes currently on the relay. */
  list(): Promise<
    Array<{
      hash: string;
      size: number;
      name?: string;
      contentType?: string;
      uploadedAt?: number;
    }>
  >;
}

const HASH_RE = /^[a-f0-9]{64}$/;

/**
 * Create a browser-safe content-addressed blob client.
 */
export function createBlobClient(opts: BlobClientOptions): BlobClient {
  const baseUrl = opts.baseUrl.replace(/\/$/, '');
  const doFetch = opts.fetch ?? fetch;
  const verify = opts.verify ?? false;

  return {
    async get(hash: string): Promise<ArrayBuffer | null> {
      assertHash(hash);
      const res = await doFetch(`${baseUrl}/blob/${hash}`);
      if (res.status === 404) return null;
      if (!res.ok) {
        throw new Error(`Blob fetch failed: ${res.status} ${res.statusText}`);
      }
      const buf = await res.arrayBuffer();
      if (verify) {
        const actual = await sha256Hex(buf);
        if (actual !== hash) {
          throw new Error(
            `Blob integrity check failed: expected ${hash}, got ${actual}`,
          );
        }
      }
      return buf;
    },

    async has(hash: string): Promise<boolean> {
      assertHash(hash);
      const res = await doFetch(`${baseUrl}/blob/${hash}`, { method: 'HEAD' });
      if (res.status === 404) return false;
      if (!res.ok) {
        throw new Error(`Blob HEAD failed: ${res.status} ${res.statusText}`);
      }
      return true;
    },

    async put(
      bytes: ArrayBuffer | Uint8Array | Blob,
      meta?: { name?: string; contentType?: string },
    ): Promise<string> {
      const body =
        bytes instanceof Uint8Array
          ? bytes
          : bytes instanceof ArrayBuffer
            ? new Uint8Array(bytes)
            : bytes;
      const headers: Record<string, string> = {
        'Content-Type':
          meta?.contentType?.trim() || 'application/octet-stream',
      };
      if (meta?.name?.trim()) {
        headers['X-Trellis-Filename'] = meta.name.trim().slice(0, 255);
      }
      const res = await doFetch(`${baseUrl}/blob`, {
        method: 'PUT',
        headers,
        body: body as BodyInit,
      });
      if (!res.ok) {
        throw new Error(`Blob upload failed: ${res.status} ${res.statusText}`);
      }
      const json = (await res.json()) as { hash?: string };
      if (!json.hash || !HASH_RE.test(json.hash)) {
        throw new Error('Blob upload response missing valid hash');
      }
      return json.hash;
    },

    async list(): Promise<
      Array<{
        hash: string;
        size: number;
        name?: string;
        contentType?: string;
        uploadedAt?: number;
      }>
    > {
      const res = await doFetch(`${baseUrl}/blob`);
      if (!res.ok) {
        throw new Error(`Blob list failed: ${res.status} ${res.statusText}`);
      }
      const json = (await res.json()) as {
        blobs?: Array<{
          hash?: string;
          size?: number;
          name?: string;
          contentType?: string;
          uploadedAt?: number;
        }>;
      };
      if (!Array.isArray(json.blobs)) {
        throw new Error('Blob list response missing blobs[]');
      }
      return json.blobs
        .filter(
          (
            b,
          ): b is {
            hash: string;
            size: number;
            name?: string;
            contentType?: string;
            uploadedAt?: number;
          } =>
            typeof b.hash === 'string' &&
            HASH_RE.test(b.hash) &&
            typeof b.size === 'number',
        )
        .map((b) => ({
          hash: b.hash,
          size: b.size,
          ...(typeof b.name === 'string' ? { name: b.name } : {}),
          ...(typeof b.contentType === 'string'
            ? { contentType: b.contentType }
            : {}),
          ...(typeof b.uploadedAt === 'number'
            ? { uploadedAt: b.uploadedAt }
            : {}),
        }));
    },
  };
}

function assertHash(hash: string): void {
  if (!HASH_RE.test(hash)) {
    throw new Error(`Invalid blob hash: ${hash}`);
  }
}

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
