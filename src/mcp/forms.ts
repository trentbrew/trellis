/**
 * Forms MCP — headless form descriptor tools for the room graph server.
 *
 * Mounted alongside the room MCP tools. Derives schema-backed form
 * descriptors with graph `Form` overrides applied — the headless contract
 * any client renders.
 *
 * @module trellis/mcp
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { readFormOverrides } from '../forms/kernel.js';
import {
  listFormableTypes,
  resolveFormDescriptor,
} from '../forms/resolve.js';
import type { RoomMcpContext } from './room.js';

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

function text(content: string) {
  return { content: [{ type: 'text' as const, text: content }] };
}

function jsonText(data: unknown) {
  return text(JSON.stringify(data, null, 2));
}

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

export function registerFormsTools(
  server: McpServer,
  ctx: RoomMcpContext,
): void {
  server.registerTool(
    'trellis_form_descriptor',
    {
      description:
        'Resolve the headless form descriptor for an entity type — schema-derived, with graph Form overrides applied. Returns the JSON contract UIs render.',
      inputSchema: {
        type: z.string().describe('Entity type name (e.g. Task, Note, Agent)'),
        mode: z
          .enum(['create', 'edit', 'view'])
          .optional()
          .describe('Form mode (default: create)'),
        tenantId: z.string().optional().describe('Tenant ID'),
      },
    },
    async ({ type, mode, tenantId }) => {
      try {
        const kernel = await ctx.pool.preload(tenantId ?? null);
        const form = resolveFormDescriptor(
          kernel.listOntologies(),
          type,
          {
            mode: mode ?? 'create',
            overrides: readFormOverrides(kernel),
          },
        );
        if (!form) {
          return text(
            `No schema registered for entity type "${type}". Register a schema first (client.registerType or POST /ontologies).`,
          );
        }
        return jsonText(form);
      } catch (err) {
        return text(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.registerTool(
    'trellis_form_list',
    {
      description:
        'List entity types with registered schemas — each derivable into a headless form.',
      inputSchema: {
        tenantId: z.string().optional().describe('Tenant ID'),
      },
    },
    async ({ tenantId }) => {
      try {
        const kernel = await ctx.pool.preload(tenantId ?? null);
        return jsonText(listFormableTypes(kernel.listOntologies()));
      } catch (err) {
        return text(err instanceof Error ? err.message : String(err));
      }
    },
  );
}
