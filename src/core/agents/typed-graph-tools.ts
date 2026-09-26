/**
 * Typed graph tools for AgentHarness — agent surface without freeform EQL-S.
 *
 * Models fill JSON Schema enums; the server compiles filters to kernel reads.
 * EQL-S remains the kernel IR for Studio/SDK — not exposed as graph_query here.
 */

import type { TrellisKernel, EntityRecord } from '../kernel/trellis-kernel.js';
import type { AgentHarness } from './harness.js';

export const LIST_ENTITIES_SCHEMA = {
  type: 'object',
  properties: {
    type: { type: 'string', description: 'Entity type name (e.g. Process, Agent)' },
    filter: {
      type: 'object',
      additionalProperties: true,
      description: 'Attribute equality filters applied server-side',
    },
    orderBy: {
      type: 'object',
      properties: {
        field: { type: 'string' },
        direction: { type: 'string', enum: ['asc', 'desc'] },
      },
    },
    limit: { type: 'integer' },
  },
  required: ['type'],
} as const;

export const GET_ENTITY_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' },
  },
  required: ['id'],
} as const;

export type ListEntitiesInput = {
  type: string;
  filter?: Record<string, unknown>;
  orderBy?: { field: string; direction?: 'asc' | 'desc' };
  limit?: number;
};

export type GetEntityInput = {
  id: string;
};

/** Flatten kernel entity record to a JSON-friendly object for tool results. */
export function entityView(rec: EntityRecord): Record<string, unknown> {
  const out: Record<string, unknown> = { id: rec.id, type: rec.type };
  for (const f of rec.facts) {
    if (f.a !== 'type') out[f.a] = f.v;
  }
  if (rec.links?.length) {
    out.links = rec.links.map((l) => ({ [l.a]: l.e2 }));
  }
  return out;
}

/** List entities with optional attribute filters, sort, and limit (no query strings). */
export function listEntitiesFiltered(
  kernel: TrellisKernel,
  input: ListEntitiesInput,
): Record<string, unknown>[] {
  const filters: Record<string, string | number | boolean> = {};
  if (input.filter) {
    for (const [k, v] of Object.entries(input.filter)) {
      if (v === undefined || v === null) continue;
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        filters[k] = v;
      }
    }
  }

  let rows = kernel
    .listEntities(input.type, Object.keys(filters).length ? filters : undefined)
    .map((e) => entityView(e));

  if (input.orderBy?.field) {
    const dir = input.orderBy.direction === 'asc' ? 1 : -1;
    const field = input.orderBy.field;
    rows.sort((a, b) => {
      const av = a[field];
      const bv = b[field];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
    });
  }

  if (input.limit != null) rows = rows.slice(0, input.limit);
  return rows;
}

export type TypedGraphToolIds = {
  getEntity: string;
  listEntities: string;
};

/**
 * Register default typed graph tools on a harness instance.
 * Returns tool ids for linking to agent definitions.
 */
export async function registerTypedGraphTools(
  harness: AgentHarness,
  kernel: TrellisKernel,
): Promise<TypedGraphToolIds> {
  const getEntity = await harness.registerTool(
    {
      id: 'get_entity',
      name: 'get_entity',
      description: 'Fetch one graph entity by id. Returns flattened attributes and links.',
      schema: JSON.stringify(GET_ENTITY_SCHEMA),
    },
    async (input) => {
      const { id } = input as GetEntityInput;
      const rec = kernel.getEntity(id);
      if (!rec) return { success: false, output: null, error: `unknown entity: ${id}` };
      return { success: true, output: entityView(rec) };
    },
  );

  const listEntities = await harness.registerTool(
    {
      id: 'list_entities',
      name: 'list_entities',
      description:
        'List entities of a type with optional attribute filters, sort, and limit. Do not write query languages.',
      schema: JSON.stringify(LIST_ENTITIES_SCHEMA),
    },
    async (input) => {
      const rows = listEntitiesFiltered(kernel, input as ListEntitiesInput);
      return { success: true, output: rows };
    },
  );

  return { getEntity, listEntities };
}
