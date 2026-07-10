/**
 * Integration + unit coverage for blob serving on the realtime relay (TRL-46 / ADR 0016).
 */

import { afterEach, describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  attachRealtimeRelay,
  createRealtimeRelay,
  type StandaloneRealtimeRelay,
} from '../../src/realtime/relay-server.js';
import { BlobStore } from '../../src/vcs/blob-store.js';
import { createBlobClient } from '../../src/realtime/blob-client.js';

describe('blob serving on realtime relay', () => {
  let trellisDir: string;
  let blobStore: BlobStore;
  let relay: StandaloneRealtimeRelay | undefined;
  let embedded: Awaited<ReturnType<typeof attachRealtimeRelay>> | undefined;
  let embeddedServer: ReturnType<typeof createServer> | undefined;

  afterEach(async () => {
    await relay?.close();
    relay = undefined;
    await embedded?.close();
    embedded = undefined;
    if (embeddedServer) {
      await new Promise<void>((resolve) =>
        embeddedServer!.close(() => resolve()),
      );
      embeddedServer = undefined;
    }
    if (trellisDir) {
      try {
        rmSync(trellisDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  });

  function freshStore(): BlobStore {
    trellisDir = mkdtempSync(join(tmpdir(), 'trellis-blob-'));
    blobStore = new BlobStore(trellisDir);
    return blobStore;
  }

  it('PUT then GET round-trips bytes with ETag + immutable cache', async () => {
    freshStore();
    relay = await createRealtimeRelay({
      port: 0,
      hostname: '127.0.0.1',
      blobStore: () => blobStore,
    });
    const client = createBlobClient({
      baseUrl: `http://127.0.0.1:${relay.port}`,
    });
    const bytes = new TextEncoder().encode('hello world');
    const hash = await client.put(bytes);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);

    const getRes = await fetch(`http://127.0.0.1:${relay.port}/blob/${hash}`);
    expect(getRes.status).toBe(200);
    expect(getRes.headers.get('etag')).toBe(`"${hash}"`);
    expect(getRes.headers.get('cache-control')).toContain('immutable');
    expect(new TextDecoder().decode(await getRes.arrayBuffer())).toBe(
      'hello world',
    );

    const retrieved = await client.get(hash);
    expect(retrieved).not.toBeNull();
    expect(new TextDecoder().decode(retrieved!)).toBe('hello world');
  });

  it('PUT is idempotent and returns 201', async () => {
    freshStore();
    relay = await createRealtimeRelay({
      port: 0,
      hostname: '127.0.0.1',
      blobStore: () => blobStore,
    });
    const bytes = new TextEncoder().encode('same');
    const res1 = await fetch(`http://127.0.0.1:${relay.port}/blob`, {
      method: 'PUT',
      body: bytes,
    });
    const res2 = await fetch(`http://127.0.0.1:${relay.port}/blob`, {
      method: 'PUT',
      body: bytes,
    });
    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
    const h1 = ((await res1.json()) as { hash: string }).hash;
    const h2 = ((await res2.json()) as { hash: string }).hash;
    expect(h1).toBe(h2);
  });

  it('HEAD reports existence; GET missing → null; invalid hash → 400', async () => {
    freshStore();
    relay = await createRealtimeRelay({
      port: 0,
      hostname: '127.0.0.1',
      blobStore: () => blobStore,
    });
    const client = createBlobClient({
      baseUrl: `http://127.0.0.1:${relay.port}`,
    });
    const missing = 'a'.repeat(64);
    expect(await client.has(missing)).toBe(false);
    expect(await client.get(missing)).toBeNull();

    const bad = await fetch(`http://127.0.0.1:${relay.port}/blob/not-a-hash`);
    expect(bad.status).toBe(400);

    await expect(client.get('not-a-hash')).rejects.toThrow(/Invalid blob hash/);
  });

  it('If-None-Match returns 304', async () => {
    freshStore();
    relay = await createRealtimeRelay({
      port: 0,
      hostname: '127.0.0.1',
      blobStore: () => blobStore,
    });
    const hash = await blobStore.put(Buffer.from('cached'));
    const res = await fetch(`http://127.0.0.1:${relay.port}/blob/${hash}`, {
      headers: { 'If-None-Match': `"${hash}"` },
    });
    expect(res.status).toBe(304);
  });

  it('enforces maxBlobBytes (413) and authorizeBlobWrite (401)', async () => {
    freshStore();
    relay = await createRealtimeRelay({
      port: 0,
      hostname: '127.0.0.1',
      blobStore: () => blobStore,
      maxBlobBytes: 8,
      authorizeBlobWrite: (req) => req.headers['x-token'] === 'ok',
    });

    const tooBig = await fetch(`http://127.0.0.1:${relay.port}/blob`, {
      method: 'PUT',
      headers: { 'x-token': 'ok' },
      body: Buffer.alloc(16),
    });
    expect(tooBig.status).toBe(413);

    const denied = await fetch(`http://127.0.0.1:${relay.port}/blob`, {
      method: 'PUT',
      body: Buffer.from('tiny'),
    });
    expect(denied.status).toBe(401);

    const ok = await fetch(`http://127.0.0.1:${relay.port}/blob`, {
      method: 'PUT',
      headers: { 'x-token': 'ok' },
      body: Buffer.from('tiny'),
    });
    expect(ok.status).toBe(201);
  });

  it('oversize chunked upload (no Content-Length) still 413 via streaming guard (TRL-49)', async () => {
    freshStore();
    relay = await createRealtimeRelay({
      port: 0,
      hostname: '127.0.0.1',
      blobStore: () => blobStore,
      maxBlobBytes: 8,
    });
    // A streamed body omits Content-Length (chunked), bypassing the early
    // fast-fail — the streaming byte counter must still reject it.
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(16));
        controller.close();
      },
    });
    const res = await fetch(`http://127.0.0.1:${relay.port}/blob`, {
      method: 'PUT',
      body,
      // @ts-expect-error Node fetch requires duplex for a stream body.
      duplex: 'half',
    });
    expect(res.status).toBe(413);
  });

  it('blobStore default off → blob routes 404', async () => {
    relay = await createRealtimeRelay({
      port: 0,
      hostname: '127.0.0.1',
    });
    const res = await fetch(
      `http://127.0.0.1:${relay.port}/blob/${'a'.repeat(64)}`,
    );
    expect(res.status).toBe(404);
  });

  it('attachRealtimeRelay mounts blob handler for embedders', async () => {
    freshStore();
    embeddedServer = createServer((_req, res) => {
      // Claimed blob requests must not be answered by the catch-all.
      const claimed = (
        _req as { [key: symbol]: boolean }
      )[Symbol.for('trellis.blobClaimed')];
      if (claimed || res.headersSent || res.writableEnded) return;
      res.writeHead(404).end('app');
    });
    await new Promise<void>((resolve) =>
      embeddedServer!.listen(0, '127.0.0.1', resolve),
    );
    const addr = embeddedServer.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    embedded = await attachRealtimeRelay(embeddedServer, {
      blobStore: () => blobStore,
    });

    const put = await fetch(`http://127.0.0.1:${port}/blob`, {
      method: 'PUT',
      body: Buffer.from('embedded'),
    });
    expect(put.status).toBe(201);
    const { hash } = (await put.json()) as { hash: string };
    const get = await fetch(`http://127.0.0.1:${port}/blob/${hash}`);
    expect(get.status).toBe(200);
    expect(new TextDecoder().decode(await get.arrayBuffer())).toBe('embedded');
  });

  it('Range request returns 206 with Content-Range + Accept-Ranges (TRL-48)', async () => {
    freshStore();
    relay = await createRealtimeRelay({
      port: 0,
      hostname: '127.0.0.1',
      blobStore: () => blobStore,
    });
    // 26 bytes: a..z
    const bytes = Buffer.from('abcdefghijklmnopqrstuvwxyz');
    const hash = await blobStore.put(bytes);
    const base = `http://127.0.0.1:${relay.port}/blob/${hash}`;

    // Mid-range: bytes 5-9 → "fghij"
    const mid = await fetch(base, { headers: { Range: 'bytes=5-9' } });
    expect(mid.status).toBe(206);
    expect(mid.headers.get('accept-ranges')).toBe('bytes');
    expect(mid.headers.get('content-range')).toBe('bytes 5-9/26');
    expect(mid.headers.get('content-length')).toBe('5');
    expect(new TextDecoder().decode(await mid.arrayBuffer())).toBe('fghij');

    // Open-ended: bytes 20- → "uvwxyz"
    const tail = await fetch(base, { headers: { Range: 'bytes=20-' } });
    expect(tail.status).toBe(206);
    expect(tail.headers.get('content-range')).toBe('bytes 20-25/26');
    expect(new TextDecoder().decode(await tail.arrayBuffer())).toBe('uvwxyz');

    // Suffix: last 3 bytes → "xyz"
    const suffix = await fetch(base, { headers: { Range: 'bytes=-3' } });
    expect(suffix.status).toBe(206);
    expect(suffix.headers.get('content-range')).toBe('bytes 23-25/26');
    expect(new TextDecoder().decode(await suffix.arrayBuffer())).toBe('xyz');

    // Full body still 200 with Accept-Ranges advertised.
    const full = await fetch(base);
    expect(full.status).toBe(200);
    expect(full.headers.get('accept-ranges')).toBe('bytes');
    expect(full.headers.get('content-length')).toBe('26');
  });

  it('unsatisfiable Range → 416 with Content-Range: bytes */size (TRL-48)', async () => {
    freshStore();
    relay = await createRealtimeRelay({
      port: 0,
      hostname: '127.0.0.1',
      blobStore: () => blobStore,
    });
    const bytes = Buffer.from('abcdefghijklmnopqrstuvwxyz');
    const hash = await blobStore.put(bytes);
    const res = await fetch(`http://127.0.0.1:${relay.port}/blob/${hash}`, {
      headers: { Range: 'bytes=100-200' },
    });
    expect(res.status).toBe(416);
    expect(res.headers.get('content-range')).toBe('bytes */26');
  });

  it('PUT with filename meta is returned by GET /blob list', async () => {
    freshStore();
    relay = await createRealtimeRelay({
      port: 0,
      hostname: '127.0.0.1',
      blobStore: () => blobStore,
    });
    const put = await fetch(`http://127.0.0.1:${relay.port}/blob`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/gif',
        'X-Trellis-Filename': 'bonsai.gif',
      },
      body: Buffer.from('GIF89a-fake'),
    });
    expect(put.status).toBe(201);
    const { hash } = (await put.json()) as { hash: string };

    const list = await fetch(`http://127.0.0.1:${relay.port}/blob`);
    const json = (await list.json()) as {
      blobs: Array<{ hash: string; name?: string; contentType?: string }>;
    };
    const row = json.blobs.find((b) => b.hash === hash);
    expect(row?.name).toBe('bonsai.gif');
    expect(row?.contentType).toBe('image/gif');
  });

  it('GET /blob lists stored hashes and sizes', async () => {
    freshStore();
    const a = await blobStore.put(Buffer.from('alpha'));
    const b = await blobStore.put(Buffer.from('bravo'));
    relay = await createRealtimeRelay({
      port: 0,
      hostname: '127.0.0.1',
      blobStore: () => blobStore,
    });
    const res = await fetch(`http://127.0.0.1:${relay.port}/blob`);
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      blobs: Array<{ hash: string; size: number }>;
    };
    const hashes = json.blobs.map((x) => x.hash).sort();
    expect(hashes).toEqual([a, b].sort());
    expect(json.blobs.find((x) => x.hash === a)?.size).toBe(5);
  });

  it('createBlobClient verify-on-read accepts matching bytes', async () => {
    freshStore();
    relay = await createRealtimeRelay({
      port: 0,
      hostname: '127.0.0.1',
      blobStore: () => blobStore,
    });
    const client = createBlobClient({
      baseUrl: `http://127.0.0.1:${relay.port}`,
      verify: true,
    });
    const hash = await client.put(new TextEncoder().encode('verify-me'));
    const buf = await client.get(hash);
    expect(buf).not.toBeNull();
  });
});
