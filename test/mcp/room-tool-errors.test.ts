/**
 * Room MCP tool failures carry `isError: true`, so agents can tell them from data (KRN-512).
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

const TMP = join(dirname(fileURLToPath(import.meta.url)), `__tmp_mcp_errors-${process.pid}-${Date.now().toString(36)}`);
const DB_PATH = join(TMP, 'data');

let server: TrellisHttpServer;
let client: Client;
let transport: StreamableHTTPClientTransport;

beforeAll(async () => {
  if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });
  const pool = new TenantPool(DB_PATH, { backend: { backend: 'sqljs' } });
  const kernel = await pool.preload();
  await kernel.createEntity('task:1', 'Task', { title: 'Present' });
  server = await startServer({ port: 0, config: defaultLocalConfig(DB_PATH), pool, cron: false });

  client = new Client({ name: 'mcp-errors-test', version: '1.0.0' });
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

const call = (name: string, args: Record<string, unknown>) => client.callTool({ name, arguments: args });
const textOf = (result: Awaited<ReturnType<typeof call>>) => (result.content as { text: string }[])[0]!.text;

describe('room MCP tool errors', () => {
  it('flags an unparseable query', async () => {
    const result = await call('query_graph', { query: 'this is not eql' });
    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain('Cannot parse query');
  });

  it('flags a missing entity on read, update, delete and link', async () => {
    for (const [name, args] of [
      ['get_node', { id: 'task:missing' }],
      ['update_node', { id: 'task:missing', attributes: { title: 'x' } }],
      ['delete_node', { id: 'task:missing' }],
      ['link_nodes', { e1: 'task:missing', relation: 'dependsOn', e2: 'task:1' }],
    ] as const) {
      const result = await call(name, args);
      expect(result.isError, name).toBe(true);
      expect(textOf(result), name).toContain('Not found');
    }
  });

  it('flags a form request for a type with no schema', async () => {
    const result = await call('trellis_form_descriptor', { type: 'Unregistered' });
    expect(result.isError).toBe(true);
  });

  it('leaves successful results unflagged', async () => {
    const query = await call('query_graph', { query: 'find ?e where type = "Task"' });
    expect(query.isError).toBeFalsy();
    expect(JSON.parse(textOf(query)).bindings).toHaveLength(1);

    const node = await call('get_node', { id: 'task:1' });
    expect(node.isError).toBeFalsy();
  });
});
