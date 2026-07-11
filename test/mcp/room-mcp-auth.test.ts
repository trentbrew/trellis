/**
 * Room MCP — anonymous read, authenticated write when apiKey is configured.
 */
import { mkdirSync, rmSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { defaultLocalConfig } from '../../src/client/config.js';
import {
  assertMcpWriteAuthorized,
  McpAuthError,
} from '../../src/mcp/mcp-auth.js';
import { oauthAuthorizationServerMetadata } from '../../src/server/mcp-oauth-metadata.js';
import { requestPublicOrigin } from '../../src/server/public-origin.js';
import { startServer } from '../../src/server/server.js';
import type { TrellisHttpServer } from '../../src/server/server-shared.js';
import { TenantPool } from '../../src/server/tenancy.js';

const TMP = join(dirname(fileURLToPath(import.meta.url)), '__tmp_mcp_auth');
const DB_PATH = join(TMP, 'data');
const API_KEY = 'spk_mcp_auth_test';

let server: TrellisHttpServer;
let mcpUrl: string;

beforeAll(async () => {
  if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });
  const config = { ...defaultLocalConfig(DB_PATH), apiKey: API_KEY };
  const pool = new TenantPool(DB_PATH, {
    backend: { backend: 'sqljs' },
  });
  await pool.preload();
  server = await startServer({ port: 0, config, pool });
  mcpUrl = `http://127.0.0.1:${server.port}/mcp`;
});

afterAll(async () => {
  if (server) {
    await Promise.race([
      Promise.resolve(server.stop(true)),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
  }
  if (existsSync(TMP)) rmSync(TMP, { recursive: true });
});

async function withMcpClient<T>(
  headers: Record<string, string> | undefined,
  fn: (client: Client) => Promise<T>,
): Promise<T> {
  const client = new Client({ name: 'mcp-auth-test', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
    requestInit: headers ? { headers } : undefined,
  });
  await client.connect(transport);
  try {
    return await fn(client);
  } finally {
    await transport.close();
  }
}

describe('mcp-auth helpers', () => {
  it('allows anonymous writes when requireAuthForWrites is false', () => {
    expect(() =>
      assertMcpWriteAuthorized({
        requireAuthForWrites: false,
        auth: { authenticated: false, userId: null, tenantId: null, roles: [], claims: {} },
      }),
    ).not.toThrow();
  });

  it('blocks anonymous writes when requireAuthForWrites is true', () => {
    expect(() =>
      assertMcpWriteAuthorized({
        requireAuthForWrites: true,
        auth: { authenticated: false, userId: null, tenantId: null, roles: [], claims: {} },
      }),
    ).toThrow(McpAuthError);
  });
});

describe('public origin + oauth metadata', () => {
  it('uses X-Forwarded-Proto for HTTPS behind Sprites', () => {
    const req = new Request('http://internal/trellis/mcp', {
      headers: {
        'x-forwarded-proto': 'https',
        'x-forwarded-host': 'campus-commons-bnsoz.sprites.app',
      },
    });
    const origin = requestPublicOrigin(req, new URL(req.url));
    expect(origin).toBe('https://campus-commons-bnsoz.sprites.app');

    const meta = oauthAuthorizationServerMetadata(origin, ['google'], '/trellis/mcp');
    expect(meta.issuer).toBe('https://campus-commons-bnsoz.sprites.app');
    expect(meta.mcp_resource).toBe(
      'https://campus-commons-bnsoz.sprites.app/trellis/mcp',
    );
  });

  it('infers https for *.sprites.app without X-Forwarded-Proto', () => {
    const req = new Request('http://internal/trellis/mcp', {
      headers: { host: 'campus-commons-bnsoz.sprites.app' },
    });
    const origin = requestPublicOrigin(req, new URL(req.url));
    expect(origin).toBe('https://campus-commons-bnsoz.sprites.app');
  });
});

describe('room MCP write auth gate', () => {
  it('allows anonymous graph_health', async () => {
    await withMcpClient(undefined, async (client) => {
      const result = await client.callTool({
        name: 'graph_health',
        arguments: {},
      });
      const text = (result.content as { text: string }[])[0].text;
      expect(JSON.parse(text).status).toBe('ok');
    });
  });

  it('rejects anonymous create_node when apiKey is configured', async () => {
    await withMcpClient(undefined, async (client) => {
      const result = await client.callTool({
        name: 'create_node',
        arguments: {
          type: 'Note',
          id: 'note:anon-should-fail',
          attributes: { title: 'blocked' },
        },
      });
      const text = (result.content as { text: string }[])[0].text;
      expect(text).toContain('Authentication required');
    });
  });

  it('allows bearer create_node', async () => {
    await withMcpClient(
      { Authorization: `Bearer ${API_KEY}` },
      async (client) => {
        const result = await client.callTool({
          name: 'create_node',
          arguments: {
            type: 'Note',
            id: 'note:auth-should-pass',
            attributes: { title: 'allowed' },
            lane: 'agent:mcp-auth-test',
          },
        });
        const text = (result.content as { text: string }[])[0].text;
        const data = JSON.parse(text);
        expect(data.id).toBe('note:auth-should-pass');
        expect(data.lane).toBe('agent:mcp-auth-test');
      },
    );
  });

  it('rejects anonymous link_nodes', async () => {
    await withMcpClient(undefined, async (client) => {
      const result = await client.callTool({
        name: 'link_nodes',
        arguments: {
          e1: 'note:a',
          relation: 'references',
          e2: 'note:b',
        },
      });
      const text = (result.content as { text: string }[])[0].text;
      expect(text).toContain('Authentication required');
    });
  });
});
