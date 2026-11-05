/**
 * Attribute shapes over HTTP — GET /attributes and TrellisDb.describeAttributes (KRN-516).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defaultLocalConfig } from '../../src/client/config.js';
import { TrellisDb } from '../../src/client/sdk.js';
import { startServer } from '../../src/server/server.js';
import { TenantPool } from '../../src/server/tenancy.js';
import type { TrellisHttpServer } from '../../src/server/server-shared.js';
import type { AttributeShape } from '../../src/core/store/eav-store.js';

describe('attribute shapes HTTP surface', () => {
  let tmpDir: string;
  let server: TrellisHttpServer | undefined;
  let pool: TenantPool | undefined;
  let base: string;

  beforeEach(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), `trellis-attributes-http--${process.pid}-${Date.now().toString(36)}`));
    const dbPath = join(tmpDir, 'data');
    const config = defaultLocalConfig(dbPath);
    pool = new TenantPool(dbPath, { backend: { backend: 'sqljs' } });
    const kernel = await pool.preload();
    // Written through the kernel, so arrays are stored the way real clients store them.
    await kernel.createEntity('task:1', 'Task', { title: 'Ship', tags: ['a', 'b'] as any });
    await kernel.createEntity('task:2', 'Task', { title: 'Test' });
    await kernel.createEntity('process:1', 'Process', { tags: 'single' });

    server = await startServer({ port: 0, config, pool, cron: false });
    base = `http://127.0.0.1:${server.port}`;
  });

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

  const find = (shapes: AttributeShape[], attribute: string) =>
    shapes.find((shape) => shape.attribute === attribute);

  it('GET /attributes?type= reports kernel-stored arrays as one array atom', async () => {
    const res = await fetch(`${base}/attributes?type=Task`);
    expect(res.status).toBe(200);
    const shapes = (await res.json()) as AttributeShape[];

    expect(find(shapes, 'title')).toMatchObject({ type: 'string', scalar: true, entityCount: 2 });
    expect(find(shapes, 'tags')).toMatchObject({
      type: 'array',
      cardinality: 'one',
      entityCount: 1,
      scalar: false,
    });
    expect(find(shapes, 'type')).toBeUndefined();
  });

  it('scopes by type, and covers every entity without one', async () => {
    const processes = (await (await fetch(`${base}/attributes?type=Process`)).json()) as AttributeShape[];
    expect(find(processes, 'tags')).toMatchObject({ type: 'string', scalar: true });

    const all = (await (await fetch(`${base}/attributes`)).json()) as AttributeShape[];
    expect(find(all, 'tags')).toMatchObject({ type: 'mixed', entityCount: 2, scalar: false });
  });

  it('returns an empty list for a type with no entities', async () => {
    const res = await fetch(`${base}/attributes?type=Nope`);
    expect(await res.json()).toEqual([]);
  });

  it('TrellisDb.describeAttributes round-trips in remote mode', async () => {
    const db = new TrellisDb({ url: base });
    const shapes = await db.describeAttributes('Task');
    expect(find(shapes, 'tags')?.scalar).toBe(false);
    expect(find(shapes, 'title')?.scalar).toBe(true);
  });

  it('TrellisDb.describeAttributes reads the store in local mode', async () => {
    // Other local-mode methods use pool.get(), which throws on Node before a
    // preload, so this reads an empty store rather than seeding through db.create.
    const db = new TrellisDb({ path: join(tmpDir, 'local') });
    expect(await db.describeAttributes('Note')).toEqual([]);
    db.close();
  });
});
