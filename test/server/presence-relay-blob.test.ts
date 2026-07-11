/**
 * Embedded startServer presenceRelay + BlobStore (TRL-97 / ADR 0016).
 *
 * Covers the server/deploy path that standalone relay tests do not:
 * `startServer({ presenceRelay: { blobStore } })` must expose /blob while
 * keeping /rt upgrades separate from /realtime.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import WebSocket from 'ws';
import { defaultLocalConfig } from '../../src/client/config.js';
import { BlobStore } from '../../src/vcs/blob-store.js';
import { startServer } from '../../src/server/server.js';
import { TenantPool } from '../../src/server/tenancy.js';
import type { TrellisHttpServer } from '../../src/server/server-shared.js';
import type { PresenceRelayOptions } from '../../src/server/server.js';

describe('startServer presenceRelay blob surface', () => {
  let tmpDir: string;
  let server: TrellisHttpServer | undefined;
  let pool: TenantPool | undefined;

  afterEach(async () => {
    if (server) {
      await Promise.resolve(server.stop(true));
      server = undefined;
    }
    pool = undefined;
    if (tmpDir) {
      try {
        rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  });

  async function boot(
    presenceRelay: PresenceRelayOptions,
  ): Promise<{ port: number }> {
    tmpDir = mkdtempSync(join(tmpdir(), 'trellis-presence-blob-'));
    const dbPath = join(tmpDir, 'data');
    const config = defaultLocalConfig(dbPath);
    pool = new TenantPool(dbPath, { backend: { backend: 'sqljs' } });
    await pool.preload();

    server = await startServer({
      port: 0,
      config,
      pool,
      presenceRelay,
      cron: false,
    });

    return { port: server.port };
  }

  it('PUT / HEAD / GET /blob round-trip when blobStore is wired', async () => {
    const blobRoot = mkdtempSync(join(tmpdir(), 'trellis-blob-root-'));
    const store = new BlobStore(blobRoot);
    const { port } = await boot({
      path: '/rt',
      blobStore: () => store,
    });
    const base = `http://127.0.0.1:${port}`;
    const bytes = Buffer.from('sprite-mesh-bytes');

    const put = await fetch(`${base}/blob`, { method: 'PUT', body: bytes });
    expect(put.status).toBe(201);
    const { hash } = (await put.json()) as { hash: string };
    expect(hash).toMatch(/^[a-f0-9]{64}$/);

    const head = await fetch(`${base}/blob/${hash}`, { method: 'HEAD' });
    expect(head.status).toBe(200);

    const get = await fetch(`${base}/blob/${hash}`);
    expect(get.status).toBe(200);
    expect(Buffer.from(await get.arrayBuffer()).equals(bytes)).toBe(true);

    rmSync(blobRoot, { recursive: true, force: true });
  });

  it('/rt WebSocket upgrade still works alongside /blob', async () => {
    const blobRoot = mkdtempSync(join(tmpdir(), 'trellis-blob-root-'));
    const store = new BlobStore(blobRoot);
    const { port } = await boot({
      path: '/rt',
      blobStore: () => store,
    });

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/rt`);
      const timer = setTimeout(() => {
        ws.close();
        reject(new Error('/rt upgrade timed out'));
      }, 5000);
      ws.on('open', () => {
        clearTimeout(timer);
        ws.close();
        resolve();
      });
      ws.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    rmSync(blobRoot, { recursive: true, force: true });
  });

  it('presenceRelay: true leaves /blob unavailable (404)', async () => {
    const { port } = await boot(true);
    const res = await fetch(`http://127.0.0.1:${port}/blob`, {
      method: 'PUT',
      body: Buffer.from('nope'),
    });
    expect(res.status).toBe(404);
  });
});
