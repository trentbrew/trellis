/**
 * Headless forms HTTP surface — GET /forms and GET /forms/:type.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defaultLocalConfig } from '../../src/client/config.js';
import { startServer } from '../../src/server/server.js';
import { TenantPool } from '../../src/server/tenancy.js';
import type { TrellisHttpServer } from '../../src/server/server-shared.js';
import type { SchemaDefinition } from '../../src/core/ontology/types.js';

describe('headless forms HTTP surface', () => {
  let tmpDir: string;
  let server: TrellisHttpServer | undefined;
  let pool: TenantPool | undefined;
  let base: string;

  beforeEach(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'trellis-forms-http-'));
    const dbPath = join(tmpDir, 'data');
    const config = defaultLocalConfig(dbPath);
    pool = new TenantPool(dbPath, { backend: { backend: 'sqljs' } });
    const kernel = await pool.preload();
    kernel.createOntology({
      '@id': 'trellis:Task',
      '@type': 'trellis:Schema',
      version: '1.0.0',
      label: 'Task',
      fields: [
        { name: 'title', valueType: 'title', required: true },
        { name: 'priority', valueType: 'select', selectOptions: ['low', 'high'] },
        { name: 'body', valueType: 'rich_text' },
      ],
    } satisfies SchemaDefinition);

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

  it('GET /forms lists derivable types', async () => {
    const res = await fetch(`${base}/forms`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ entityType: string }>;
    expect(body.some((t) => t.entityType === 'Task')).toBe(true);
  });

  it('GET /forms/:type returns the derived descriptor', async () => {
    const res = await fetch(`${base}/forms/Task?mode=create`);
    expect(res.status).toBe(200);
    const form = (await res.json()) as {
      formId: string;
      entityType: string;
      mode: string;
      fields: Array<{ name: string; control: string }>;
    };
    expect(form.formId).toBe('trellis:Task:create');
    expect(form.entityType).toBe('Task');
    expect(form.mode).toBe('create');
    const title = form.fields.find((f) => f.name === 'title')!;
    expect(title.control).toBe('text');
  });

  it('GET /forms/:type?mode=view includes readonly computed fields', async () => {
    const kernel = pool!.get(null);
    kernel.updateOntology('trellis:Task', {
      fields: [
        { name: 'title', valueType: 'title', required: true },
        {
          name: 'count',
          valueType: 'rollup',
          computed: true,
          required: false,
          rollup: { relationProperty: 'items', targetProperty: 'id', aggregation: 'count' },
        },
      ],
    });
    const res = await fetch(`${base}/forms/Task?mode=view`);
    expect(res.status).toBe(200);
    const form = (await res.json()) as { fields: Array<{ name: string; control: string }> };
    const count = form.fields.find((f) => f.name === 'count')!;
    expect(count.control).toBe('readonly');
  });

  it('unknown type → 404; bad mode → 400', async () => {
    const missing = await fetch(`${base}/forms/Nope`);
    expect(missing.status).toBe(404);

    const badMode = await fetch(`${base}/forms/Task?mode=destroy`);
    expect(badMode.status).toBe(400);
  });
});
