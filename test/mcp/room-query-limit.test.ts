/**
 * query_graph caps its rows and says when it did (KRN-513).
 */
import { mkdirSync, rmSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { defaultLocalConfig } from '../../src/client/config.js';
import { startServer } from '../../src/server/server.js';
import type { TrellisHttpServer } from '../../src/server/server-shared.js';
import { TenantPool } from '../../src/server/tenancy.js';

const TMP = join(dirname(fileURLToPath(import.meta.url)), `__tmp_mcp_limit-${process.pid}-${Date.now().toString(36)}`);
const DB_PATH = join(TMP, 'data');
const TASKS = 120;

let server: TrellisHttpServer;
let client: Client;
let transport: StreamableHTTPClientTransport;

beforeAll(async () => {
  if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });
  // better-sqlite: sql.js export() during a burst of writes frees prepared statements.
  const pool = new TenantPool(DB_PATH, { backend: { backend: 'better-sqlite' } });
  const kernel = await pool.preload();
  for (let i = 0; i < TASKS; i++) {
    await kernel.createEntity(`task:${i}`, 'Task', { title: `Task ${i}`, priority: i % 5 });
  }
  server = await startServer({ port: 0, config: defaultLocalConfig(DB_PATH), pool, cron: false });

  client = new Client({ name: 'mcp-limit-test', version: '1.0.0' });
  transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${server.port}/mcp`));
  await client.connect(transport);
});

afterAll(async () => {
  await transport?.close();
  if (server) {
    await Promise.race([Promise.resolve(server.stop(true)), new Promise((r) => setTimeout(r, 1500))]);
  }
  if (existsSync(TMP)) rmSync(TMP, { recursive: true });
});

async function queryGraph(args: Record<string, unknown>) {
  const result = await client.callTool({ name: 'query_graph', arguments: args });
  return JSON.parse((result.content as { text: string }[])[0]!.text) as {
    bindings: unknown[];
    total: number;
    truncated: boolean;
  };
}

describe('query_graph limits', () => {
  it('caps at 100 rows by default and reports the total', async () => {
    const out = await queryGraph({ query: 'find ?e where type = "Task"' });
    expect(out.bindings).toHaveLength(100);
    expect(out).toMatchObject({ total: TASKS, truncated: true });
  });

  it('honors a limit argument', async () => {
    const out = await queryGraph({ query: 'find ?e where type = "Task"', limit: 5 });
    expect(out.bindings).toHaveLength(5);
    expect(out).toMatchObject({ total: TASKS, truncated: true });
  });

  it('honors limit in the short query form', async () => {
    const out = await queryGraph({ query: 'find ?e where type = "Task" limit 3' });
    expect(out.bindings).toHaveLength(3);
    expect(out.truncated).toBe(false);
  });

  it('runs two-character comparisons from the short form', async () => {
    const out = await queryGraph({ query: 'find ?e where type = "Task" and priority >= 4' });
    expect(out.total).toBe(TASKS / 5);
  });
});
