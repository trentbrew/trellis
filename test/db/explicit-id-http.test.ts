/**
 * ADR 0018 — HTTP create with explicit id (409 conflict + round-trip).
 */
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { TrellisDb, FetchError } from '../../src/client/sdk.js';
import { startServer } from '../../src/server/server.js';
import { TenantPool } from '../../src/server/tenancy.js';
import { defaultLocalConfig } from '../../src/client/config.js';
import type { TrellisHttpServer } from '../../src/server/server-shared.js';

const TMP = join(dirname(fileURLToPath(import.meta.url)), '__tmp_explicit_id');
const DB_PATH = join(TMP, 'data');

let server: TrellisHttpServer;
let baseUrl: string;

beforeAll(async () => {
  if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });
  const config = defaultLocalConfig(DB_PATH);
  const pool = new TenantPool(DB_PATH, { backend: { backend: 'sqljs' } });
  await pool.preload();
  server = await startServer({ port: 0, config, pool });
  baseUrl = `http://127.0.0.1:${server.port}`;
});

afterAll(async () => {
  if (server) await Promise.resolve(server.stop(true));
  if (existsSync(TMP)) rmSync(TMP, { recursive: true });
});

describe('POST /entities explicit id (ADR 0018)', () => {
  it('round-trips entity:fixture-1 over HTTP', async () => {
    const client = new TrellisDb({ url: baseUrl });
    const id = await client.create(
      'GameEntity',
      { label: 'Hero' },
      undefined,
      { id: 'entity:fixture-http-1' },
    );
    expect(id).toBe('entity:fixture-http-1');
    const entity = await client.read('entity:fixture-http-1');
    expect(entity?.label).toBe('Hero');
    client.disconnect();
  });

  it('returns 409 on duplicate id', async () => {
    const client = new TrellisDb({ url: baseUrl });
    await client.create('GameEntity', { label: 'A' }, undefined, {
      id: 'entity:dup-http',
    });
    await expect(
      client.create('GameEntity', { label: 'B' }, undefined, {
        id: 'entity:dup-http',
      }),
    ).rejects.toBeInstanceOf(FetchError);
    try {
      await client.create('GameEntity', { label: 'B' }, undefined, {
        id: 'entity:dup-http',
      });
    } catch (err) {
      expect(err).toBeInstanceOf(FetchError);
      expect((err as FetchError).status).toBe(409);
    }
    client.disconnect();
  });

  it('rejects whitespace-only id with 400', async () => {
    const res = await fetch(`${baseUrl}/entities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'GameEntity', id: '   ', attributes: {} }),
    });
    expect(res.status).toBe(400);
  });
});
