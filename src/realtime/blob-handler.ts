/**
 * Content-addressed blob HTTP handler for the realtime relay.
 *
 * Factoring lives here so both {@link createRealtimeRelay} and
 * {@link attachRealtimeRelay} (plus any embedder) can mount the same routes.
 *
 * @module trellis/server
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Readable } from 'node:stream';
import type { BlobStore } from '../vcs/blob-store.js';

const HASH_RE = /^[a-f0-9]{64}$/;
const DEFAULT_MAX_BLOB_BYTES = 64 * 1024 * 1024; // 64 MiB

export const BLOB_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, PUT, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, If-None-Match, X-Trellis-Filename',
} as const;

export interface BlobRequestHandlerOptions {
  /** Reject PUT bodies larger than this. Default 64 MiB → 413. */
  maxBlobBytes?: number;
  /**
   * Gate writes. Return false → 401. Default: allow all (local/dev).
   * Production embedders should pass a real check.
   */
  authorizeBlobWrite?: (
    req: IncomingMessage,
  ) => boolean | Promise<boolean>;
}

/**
 * Build a request handler for `/blob` and `/blob/:sha256`.
 * Returns `true` when the request was claimed (response written or in flight).
 */
export function createBlobRequestHandler(
  store: BlobStore,
  opts: BlobRequestHandlerOptions = {},
): (req: IncomingMessage, res: ServerResponse) => boolean {
  const maxBytes = opts.maxBlobBytes ?? DEFAULT_MAX_BLOB_BYTES;
  const authorize = opts.authorizeBlobWrite ?? (() => true);

  return (req, res): boolean => {
    const reqPath = (req.url ?? '/').split('?')[0];
    const method = req.method ?? 'GET';

    if (reqPath === '/blob' || reqPath.startsWith('/blob/')) {
      if (method === 'OPTIONS') {
        res.writeHead(204, BLOB_CORS);
        res.end();
        return true;
      }
    }

    if (reqPath.startsWith('/blob/')) {
      const rest = reqPath.slice('/blob/'.length);
      const metaMatch = /^([a-f0-9]{64})\/meta$/.exec(rest);
      if (metaMatch) {
        const hash = metaMatch[1]!;
        if (method === 'PUT') {
          void handlePutMeta(req, res, store, hash, authorize);
          return true;
        }
        if (method === 'GET') {
          if (!store.has(hash)) {
            res.writeHead(404, {
              'content-type': 'application/json',
              ...BLOB_CORS,
            });
            res.end(JSON.stringify({ error: 'not_found', hash }));
            return true;
          }
          const meta = store.getMeta(hash) ?? {};
          res.writeHead(200, {
            'content-type': 'application/json',
            ...BLOB_CORS,
          });
          res.end(JSON.stringify({ hash, ...meta }));
          return true;
        }
        res.writeHead(405, { allow: 'GET, PUT, OPTIONS', ...BLOB_CORS });
        res.end();
        return true;
      }

      const hash = rest;
      if (!HASH_RE.test(hash)) {
        res.writeHead(400, {
          'content-type': 'application/json',
          ...BLOB_CORS,
        });
        res.end(JSON.stringify({ error: 'invalid_hash', hash }));
        return true;
      }

      if (method === 'HEAD') {
        const size = store.size(hash);
        if (size == null) {
          res.writeHead(404, BLOB_CORS);
          res.end();
          return true;
        }
        const meta = store.getMeta(hash);
        res.writeHead(200, {
          'content-type': meta?.contentType || 'application/octet-stream',
          'content-length': size,
          etag: `"${hash}"`,
          'accept-ranges': 'bytes',
          'cache-control': 'public, max-age=31536000, immutable',
          ...BLOB_CORS,
        });
        res.end();
        return true;
      }

      if (method === 'GET') {
        const inm = req.headers['if-none-match'];
        if (inm && etagMatches(inm, hash)) {
          res.writeHead(304, {
            etag: `"${hash}"`,
            'cache-control': 'public, max-age=31536000, immutable',
            ...BLOB_CORS,
          });
          res.end();
          return true;
        }

        const size = store.size(hash);
        if (size == null) {
          res.writeHead(404, {
            'content-type': 'application/json',
            ...BLOB_CORS,
          });
          res.end(JSON.stringify({ error: 'not_found', hash }));
          return true;
        }

        const meta = store.getMeta(hash);
        const baseHeaders = {
          'content-type': meta?.contentType || 'application/octet-stream',
          etag: `"${hash}"`,
          'accept-ranges': 'bytes',
          'cache-control': 'public, max-age=31536000, immutable',
          ...BLOB_CORS,
        };

        // Range request → 206 Partial Content, or 416 if unsatisfiable.
        const rangeHeader = req.headers['range'];
        if (typeof rangeHeader === 'string' && rangeHeader.length > 0) {
          const range = parseByteRange(rangeHeader, size);
          if (!range) {
            res.writeHead(416, {
              ...baseHeaders,
              'content-range': `bytes */${size}`,
            });
            res.end();
            return true;
          }
          const stream = store.createReadStream(hash, range);
          if (!stream) {
            res.writeHead(404, { 'content-type': 'application/json', ...BLOB_CORS });
            res.end(JSON.stringify({ error: 'not_found', hash }));
            return true;
          }
          res.writeHead(206, {
            ...baseHeaders,
            'content-range': `bytes ${range.start}-${range.end}/${size}`,
            'content-length': range.end - range.start + 1,
          });
          pipeBlob(stream, res);
          return true;
        }

        // Full-body GET → stream from disk (never buffer the whole blob).
        const stream = store.createReadStream(hash);
        if (!stream) {
          res.writeHead(404, { 'content-type': 'application/json', ...BLOB_CORS });
          res.end(JSON.stringify({ error: 'not_found', hash }));
          return true;
        }
        res.writeHead(200, {
          ...baseHeaders,
          'content-length': size,
        });
        pipeBlob(stream, res);
        return true;
      }

      res.writeHead(405, {
        allow: 'GET, HEAD, OPTIONS',
        ...BLOB_CORS,
      });
      res.end();
      return true;
    }

    if (reqPath === '/blob' && method === 'GET') {
      const blobs = store.listHashes().map((hash) => {
        const meta = store.getMeta(hash);
        return {
          hash,
          size: store.size(hash) ?? 0,
          ...(meta?.name ? { name: meta.name } : {}),
          ...(meta?.contentType ? { contentType: meta.contentType } : {}),
          ...(meta?.uploadedAt ? { uploadedAt: meta.uploadedAt } : {}),
        };
      });
      res.writeHead(200, {
        'content-type': 'application/json',
        ...BLOB_CORS,
      });
      res.end(JSON.stringify({ blobs }));
      return true;
    }

    if (reqPath === '/blob' && method === 'PUT') {
      void handlePut(req, res, store, maxBytes, authorize);
      return true;
    }

    if (reqPath === '/blob') {
      res.writeHead(405, {
        allow: 'GET, PUT, OPTIONS',
        ...BLOB_CORS,
      });
      res.end();
      return true;
    }

    return false;
  };
}

/**
 * Parse a single-range `Range: bytes=…` header against a known blob size.
 * Supports `bytes=start-end`, `bytes=start-`, and `bytes=-suffix`. Returns
 * inclusive `{ start, end }` offsets, or null when unsatisfiable / malformed
 * (caller answers 416). Multi-range requests are treated as unsupported.
 */
function parseByteRange(
  header: string,
  size: number,
): { start: number; end: number } | null {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m) return null;
  const [, startStr, endStr] = m;
  if (startStr === '' && endStr === '') return null;

  let start: number;
  let end: number;
  if (startStr === '') {
    // Suffix range: final N bytes.
    const suffix = Number(endStr);
    if (suffix <= 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(startStr);
    end = endStr === '' ? size - 1 : Math.min(Number(endStr), size - 1);
  }
  if (start < 0 || start > end || start >= size) return null;
  return { start, end };
}

/** Pipe a blob read stream to the response, cleaning up on stream error. */
function pipeBlob(stream: Readable, res: ServerResponse): void {
  stream.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(500, { 'content-type': 'application/json', ...BLOB_CORS });
      res.end(JSON.stringify({ error: 'read_failed' }));
    } else {
      res.destroy();
    }
  });
  stream.pipe(res);
}

function etagMatches(ifNoneMatch: string, hash: string): boolean {
  const expected = `"${hash}"`;
  // Allow weak validators and bare hash for convenience.
  return ifNoneMatch
    .split(',')
    .map((s) => s.trim())
    .some((tag) => tag === '*' || tag === expected || tag === `W/${expected}` || tag === hash);
}

async function handlePut(
  req: IncomingMessage,
  res: ServerResponse,
  store: BlobStore,
  maxBytes: number,
  authorize: (req: IncomingMessage) => boolean | Promise<boolean>,
): Promise<void> {
  try {
    const allowed = await authorize(req);
    if (!allowed) {
      res.writeHead(401, {
        'content-type': 'application/json',
        ...BLOB_CORS,
      });
      res.end(JSON.stringify({ error: 'unauthorized' }));
      return;
    }

    // Fast-fail on a declared oversize body before reading any bytes. The
    // streaming counter in readBodyLimited remains the real guard (Content-Length
    // is advisory / absent for chunked uploads), this just saves reading the body.
    const declared = Number(req.headers['content-length']);
    if (Number.isFinite(declared) && declared > maxBytes) {
      res.writeHead(413, {
        'content-type': 'application/json',
        ...BLOB_CORS,
      });
      res.end(
        JSON.stringify({ error: 'payload_too_large', maxBlobBytes: maxBytes }),
      );
      return;
    }

    const body = await readBodyLimited(req, maxBytes);
    if (body === 'too_large') {
      res.writeHead(413, {
        'content-type': 'application/json',
        ...BLOB_CORS,
      });
      res.end(JSON.stringify({ error: 'payload_too_large', maxBlobBytes: maxBytes }));
      return;
    }

    const hash = await store.put(body);

    // Optional display metadata so other clients can list the same names.
    const rawName = req.headers['x-trellis-filename'];
    const filename =
      typeof rawName === 'string' ? rawName.trim().slice(0, 255) : '';
    const declaredType = req.headers['content-type'];
    const contentType =
      typeof declaredType === 'string' &&
      declaredType.length > 0 &&
      !/^application\/octet-stream$/i.test(declaredType)
        ? declaredType.split(';')[0]!.trim().slice(0, 128)
        : undefined;
    if (filename || contentType) {
      store.setMeta(hash, {
        name: filename || undefined,
        contentType,
        uploadedAt: Date.now(),
      });
    }

    res.writeHead(201, {
      'content-type': 'application/json',
      etag: `"${hash}"`,
      ...BLOB_CORS,
    });
    res.end(JSON.stringify({ hash }));
  } catch {
    if (!res.headersSent) {
      res.writeHead(500, {
        'content-type': 'application/json',
        ...BLOB_CORS,
      });
      res.end(JSON.stringify({ error: 'upload_failed' }));
    }
  }
}

async function handlePutMeta(
  req: IncomingMessage,
  res: ServerResponse,
  store: BlobStore,
  hash: string,
  authorize: (req: IncomingMessage) => boolean | Promise<boolean>,
): Promise<void> {
  try {
    const allowed = await authorize(req);
    if (!allowed) {
      res.writeHead(401, {
        'content-type': 'application/json',
        ...BLOB_CORS,
      });
      res.end(JSON.stringify({ error: 'unauthorized' }));
      return;
    }
    if (!store.has(hash)) {
      res.writeHead(404, {
        'content-type': 'application/json',
        ...BLOB_CORS,
      });
      res.end(JSON.stringify({ error: 'not_found', hash }));
      return;
    }
    const body = await readBodyLimited(req, 64 * 1024);
    if (body === 'too_large') {
      res.writeHead(413, {
        'content-type': 'application/json',
        ...BLOB_CORS,
      });
      res.end(JSON.stringify({ error: 'payload_too_large' }));
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(body.toString('utf8'));
    } catch {
      res.writeHead(400, {
        'content-type': 'application/json',
        ...BLOB_CORS,
      });
      res.end(JSON.stringify({ error: 'invalid_json' }));
      return;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      res.writeHead(400, {
        'content-type': 'application/json',
        ...BLOB_CORS,
      });
      res.end(JSON.stringify({ error: 'invalid_meta' }));
      return;
    }
    const obj = parsed as Record<string, unknown>;
    const name =
      typeof obj.name === 'string' ? obj.name.trim().slice(0, 255) : undefined;
    const contentType =
      typeof obj.contentType === 'string'
        ? obj.contentType.trim().slice(0, 128)
        : undefined;
    store.setMeta(hash, {
      name,
      contentType,
      uploadedAt:
        typeof obj.uploadedAt === 'number' ? obj.uploadedAt : Date.now(),
    });
    res.writeHead(200, {
      'content-type': 'application/json',
      ...BLOB_CORS,
    });
    res.end(JSON.stringify({ hash, ...(store.getMeta(hash) ?? {}) }));
  } catch {
    if (!res.headersSent) {
      res.writeHead(500, {
        'content-type': 'application/json',
        ...BLOB_CORS,
      });
      res.end(JSON.stringify({ error: 'meta_failed' }));
    }
  }
}

function readBodyLimited(
  req: IncomingMessage,
  maxBytes: number,
): Promise<Buffer | 'too_large'> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let settled = false;
    let tooLarge = false;

    const finish = (value: Buffer | 'too_large') => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    req.on('data', (chunk: Buffer) => {
      if (tooLarge) return;
      total += chunk.length;
      if (total > maxBytes) {
        tooLarge = true;
        chunks.length = 0;
        // Stop buffering; drain remaining so the socket can close cleanly
        // after we respond 413 (do not destroy mid-request — breaks fetch).
        req.resume();
        finish('too_large');
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!settled) finish(Buffer.concat(chunks));
    });
    req.on('error', (err) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    });
  });
}
