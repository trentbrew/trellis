/**
 * TRL-5 — idempotent registerType (no surfaced 409 on re-register).
 * Also syncs field valueTypes when the schema already exists (TRL-76).
 */
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { TrellisDb } from '../../src/client/sdk.js';
import { startServer } from '../../src/server/server.js';
import { TenantPool } from '../../src/server/tenancy.js';
import { defaultLocalConfig } from '../../src/client/config.js';
import { defineType } from '../../src/schema/define.js';
import type { TrellisHttpServer } from '../../src/server/server-shared.js';

const Note = defineType('Note', { title: z.string() });

const CronJobV1 = defineType('CronJobSync', {
  name: z.string(),
  // Intentionally wrong first pass — string instead of boolean
  enabled: z.string(),
  intervalMs: z.number(),
  handler: z.string(),
});

const CronJobV2 = defineType('CronJobSync', {
  name: z.string(),
  enabled: z.boolean().default(true),
  intervalMs: z.number(),
  handler: z.string(),
});

const TMP = join(dirname(fileURLToPath(import.meta.url)), '__tmp_register_type');
const DB_PATH = join(TMP, 'data');

let server: TrellisHttpServer;
let baseUrl: string;
let pool: TenantPool;

beforeAll(async () => {
  if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });
  const config = defaultLocalConfig(DB_PATH);
  pool = new TenantPool(DB_PATH, { backend: { backend: 'sqljs' } });
  await pool.preload();
  server = await startServer({ port: 0, config, pool });
  baseUrl = `http://127.0.0.1:${server.port}`;
});

afterAll(async () => {
  if (server) await Promise.resolve(server.stop(true));
  if (existsSync(TMP)) rmSync(TMP, { recursive: true });
});

describe('registerType idempotent', () => {
  it('second register resolves without throw (TRL-5)', async () => {
    const client = new TrellisDb({ url: baseUrl });
    await client.registerType(Note);
    await expect(client.registerType(Note)).resolves.toBeUndefined();
    client.disconnect();
  });

  it('re-register syncs field valueTypes (TRL-76 enabled checkbox)', async () => {
    const client = new TrellisDb({ url: baseUrl });
    await client.registerType(CronJobV1);
    const before = pool
      .get(null)
      .listOntologies()
      .find((o) => o['@id'] === CronJobV1.definition['@id']);
    expect(before?.fields.find((f) => f.name === 'enabled')?.valueType).toBe(
      'rich_text',
    );

    await client.registerType(CronJobV2);
    const after = pool
      .get(null)
      .listOntologies()
      .find((o) => o['@id'] === CronJobV2.definition['@id']);
    expect(after?.fields.find((f) => f.name === 'enabled')?.valueType).toBe(
      'checkbox',
    );

    // Boolean create must succeed after sync
    const id = await client.create('CronJobSync', {
      name: 'sync-ping',
      enabled: true,
      intervalMs: 5000,
      handler: 'builtin:ping',
    });
    expect(id).toMatch(/^cronjobsync:/);
    client.disconnect();
  });
});
