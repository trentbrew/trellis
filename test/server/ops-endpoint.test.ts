/**
 * Kernel op journal HTTP surface — GET /ops
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defaultLocalConfig } from '../../src/client/config.js';
import { startServer } from '../../src/server/server.js';
import { TenantPool } from '../../src/server/tenancy.js';
import type { TrellisHttpServer } from '../../src/server/server-shared.js';

describe('kernel ops HTTP surface', () => {
  let tmpDir: string;
  let server: TrellisHttpServer | undefined;
  let pool: TenantPool | undefined;
  let base: string;

  beforeEach(async () => {
    tmpDir = mkdtempSync(
      join(tmpdir(), `trellis-ops-http--${process.pid}-${Date.now().toString(36)}`),
    );
    const dbPath = join(tmpDir, 'data');
    const config = defaultLocalConfig(dbPath);
    pool = new TenantPool(dbPath, { backend: { backend: 'sqljs' } });
    const kernel = await pool.preload();
    await kernel.createEntity('note:alpha', 'Note', { title: 'Alpha' });
    await kernel.updateEntity('note:alpha', { title: 'Alpha edited' });
    await kernel.createEntity('note:beta', 'Note', { title: 'Beta' });

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

  it('GET /ops returns summaries with entityIds', async () => {
    const res = await fetch(`${base}/ops?limit=50`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: Array<{ kind: string; entityIds: string[]; entityCount: number }>;
      total: number;
    };
    expect(body.total).toBeGreaterThanOrEqual(3);
    const touchingAlpha = body.data.filter((row) => row.entityIds.includes('note:alpha'));
    expect(touchingAlpha.length).toBeGreaterThanOrEqual(2);
    for (const row of body.data) {
      expect(row.entityIds.length).toBeLessThanOrEqual(row.entityCount);
    }
  });

  it('GET /ops?entity= filters to ops touching that record', async () => {
    const res = await fetch(`${base}/ops?entity=note%3Aalpha&limit=100`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: Array<{ entityIds: string[] }>;
      total: number;
    };
    expect(body.total).toBeGreaterThanOrEqual(2);
    expect(body.data.every((row) => row.entityIds.includes('note:alpha'))).toBe(true);
    const betaOnly = body.data.some((row) => row.entityIds.includes('note:beta'));
    expect(betaOnly).toBe(false);
  });
});
