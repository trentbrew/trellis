/**
 * Regression test for the stateless StreamableMcpGateway.
 *
 * The previous stateful implementation kept MCP sessions in an in-memory Map.
 * On a deployed room (cold starts / replicas), the session created at
 * `initialize` was gone by the time a tool was called, so every tool call
 * failed with a bodyless "Invalid or expired MCP session" while discovery
 * still worked. Stateless mode makes each request self-contained; these tests
 * assert a cold tool call succeeds with no session continuity.
 */

import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableMcpGateway } from '../../src/server/streamable-mcp-gateway.js';

function makeServer(): McpServer {
  const server = new McpServer({ name: 'test-room', version: '0.0.0' });
  server.registerTool(
    'ping',
    { description: 'returns pong', inputSchema: {} },
    async () => ({ content: [{ type: 'text' as const, text: 'pong' }] }),
  );
  return server;
}

function toolCall(id: number, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...headers,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id,
      method: 'tools/call',
      params: { name: 'ping', arguments: {} },
    }),
  });
}

/** Extract the JSON-RPC payload whether the transport replied JSON or SSE. */
async function readJsonRpc(res: Response): Promise<any> {
  const text = await res.text();
  if (res.headers.get('content-type')?.includes('text/event-stream')) {
    const dataLine = text.split('\n').find((l) => l.startsWith('data:'));
    return dataLine ? JSON.parse(dataLine.slice('data:'.length).trim()) : null;
  }
  return JSON.parse(text);
}

describe('StreamableMcpGateway (stateless)', () => {
  it('serves a tools/call with no prior initialize and no session id', async () => {
    const gateway = new StreamableMcpGateway();
    const res = await gateway.handle(toolCall(1), makeServer);
    expect(res.status).toBe(200);
    const rpc = await readJsonRpc(res);
    expect(rpc?.result?.content?.[0]?.text).toBe('pong');
  });

  it('requires no session continuity across independent requests', async () => {
    // Simulates two requests landing on different replicas / after a cold
    // start: neither carries an mcp-session-id; both must succeed alone.
    const gateway = new StreamableMcpGateway();
    for (const id of [1, 2]) {
      const res = await gateway.handle(toolCall(id), makeServer);
      expect(res.status).toBe(200);
      const rpc = await readJsonRpc(res);
      expect(rpc?.result?.content?.[0]?.text).toBe('pong');
    }
  });

  it('returns a well-formed JSON-RPC error when server creation throws', async () => {
    const gateway = new StreamableMcpGateway();
    const res = await gateway.handle(toolCall(1), () => {
      throw new Error('boom');
    });
    expect(res.status).toBe(500);
    const rpc = await readJsonRpc(res);
    expect(rpc?.error?.message).toContain('boom');
  });
});
