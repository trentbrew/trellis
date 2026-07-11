/**
 * Streamable HTTP MCP gateway — stateless per-request transport for room + discovery.
 *
 * Runs in **stateless mode**: a fresh MCP server + transport is created for
 * every request, so no session state has to survive between requests.
 *
 * This matters for deployed rooms. The previous implementation kept sessions in
 * a per-process in-memory Map keyed by `mcp-session-id`. A deployed room cold-
 * starts, idles out, and scales across replicas, so the session established at
 * `initialize` was routinely gone by the time the model actually called a tool —
 * surfacing as a bodyless "Invalid or expired MCP session" (-32000) on every
 * tool call while tool *discovery* still worked. Stateless mode removes that
 * failure class entirely: every request is self-contained.
 *
 * @module trellis/server
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';

function mcpError(status: number, message: string): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32000, message },
      id: null,
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

export class StreamableMcpGateway {
  async handle(
    req: Request,
    createServer: () => McpServer | Promise<McpServer>,
  ): Promise<Response> {
    // Stateless mode: `sessionIdGenerator` is undefined, so the transport does
    // no session validation and does not gate non-initialize requests on a
    // per-transport `initialize` handshake (see validateSession in the SDK).
    // The SDK requires a fresh transport per request in this mode — reusing one
    // collides on JSON-RPC message ids — so we create one per call.
    //
    // `enableJsonResponse` returns each result as a single JSON payload instead
    // of an SSE stream. The room's tools are all request/response (no server-
    // initiated notifications), and deployed rooms sit behind the Sprites proxy,
    // which buffers/blocks long-lived SSE responses — so a streamed reply never
    // reaches the client and every call times out. JSON responses pass through
    // proxies cleanly.
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    try {
      const server = await createServer();
      await server.connect(transport);
      return await transport.handleRequest(req);
    } catch (err) {
      // Guard the connect/handle path. Without this, a throw here bubbles to the
      // server's generic catch and reaches the client as a bodyless 500 — the
      // exact opaque failure this rewrite is meant to eliminate. Return a
      // well-formed JSON-RPC error the connector can surface instead.
      await transport.close().catch(() => {});
      return mcpError(500, err instanceof Error ? err.message : String(err));
    }
  }

  async close(): Promise<void> {
    // Stateless mode keeps no long-lived sessions; nothing to tear down.
  }
}
