/**
 * ADR 0045: `CollectionRecord` rows validate against their collection's schema
 * (`…/collections/<slug>/Record`, resolved from `collectionId`), on create and on
 * update-only ops. The schema is built with a foreign zod copy, as apps do.
 */
import { createRequire } from 'node:module';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { z } from 'zod';
import { TrellisDb } from '../../src/client/sdk.js';
import { defaultLocalConfig } from '../../src/client/config.js';
import { compileCollectionSchema, defineType } from '../../src/schema/index.js';
import { startServer } from '../../src/server/server.js';
import type { TrellisHttpServer } from '../../src/server/server-shared.js';
import { TenantPool } from '../../src/server/tenancy.js';

const foreign = createRequire(import.meta.url)('zod') as typeof z;

const TMP = join(dirname(fileURLToPath(import.meta.url)), '__tmp_collection_validation');
const DB_PATH = join(TMP, 'data');
const SLUG = 'reading-list';
const COLLECTION_ID = `collectionMeta:${SLUG}`;

let server: TrellisHttpServer;
let client: TrellisDb;

beforeAll(async () => {
  if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });
  const pool = new TenantPool(DB_PATH, { backend: { backend: 'sqljs' } });
  await pool.preload();
  server = await startServer({ port: 0, config: defaultLocalConfig(DB_PATH), pool });
  client = new TrellisDb({ url: `http://127.0.0.1:${server.port}` });

  // CollectionMeta/CollectionRecord ship with the kernel (system tier): nothing to
  // register but this collection's own schema, compiled from its field rows.
  await client.registerType(
    compileCollectionSchema({ id: COLLECTION_ID, title: 'Reading list' }, [
      { collection: COLLECTION_ID, key: 'pages', label: 'Pages', valueType: 'number', order: 1 },
    ]),
  );
});

afterAll(async () => {
  client?.disconnect();
  if (server) await Promise.resolve(server.stop(true));
  if (existsSync(TMP)) rmSync(TMP, { recursive: true });
});

describe('CollectionRecord per-collection validation', () => {
  it('accepts a valid row', async () => {
    await expect(
      client.create('CollectionRecord', { collectionId: COLLECTION_ID, title: 'Dune', pages: 412 }),
    ).resolves.toMatch(/^collectionrecord:/);
  });

  it('rejects a wrong-typed field on create', async () => {
    await expect(
      client.create('CollectionRecord', { collectionId: COLLECTION_ID, title: 'Bad', pages: 'many' }),
    ).rejects.toThrow(/pages/);
  });

  it('rejects a wrong-typed field on an update-only op', async () => {
    const id = await client.create('CollectionRecord', {
      collectionId: COLLECTION_ID,
      title: 'Hyperion',
      pages: 482,
    });
    await expect(client.update(id, { pages: 'many' })).rejects.toThrow(/pages/);
    await expect(client.update(id, { pages: 500 })).resolves.toBeUndefined();
  });

  it('lets an update clear a field with an empty string', async () => {
    const id = await client.create('CollectionRecord', {
      collectionId: COLLECTION_ID,
      title: 'Foundation',
      pages: 255,
    });
    await expect(client.update(id, { pages: '' })).resolves.toBeUndefined();
  });

  it('accepts multi-select arrays and checks each element', async () => {
    const Tagged = defineType(
      'TaggedThing',
      {
        title: foreign.string(),
        tags: foreign.array(foreign.enum(['bug', 'feature'])).optional(),
      },
      { title: 'title' },
    );
    await client.registerType(Tagged);
    const id = await client.create('TaggedThing', { title: 'ok', tags: ['bug', 'feature'] });
    await expect(client.update(id, { tags: ['feature'] })).resolves.toBeUndefined();
    await expect(client.update(id, { tags: ['nope'] })).rejects.toThrow(/tags/);
    await expect(client.create('TaggedThing', { title: 'bad', tags: ['bug', 42] })).rejects.toThrow(/tags/);
  });

  it('stays open-world for attributes the schema does not declare', async () => {
    const id = await client.create('CollectionRecord', { collectionId: COLLECTION_ID, title: 'Solaris' });
    await expect(client.update(id, { f_unknown: 'anything' })).resolves.toBeUndefined();
  });
});
