/**
 * Field sync policy — durable / realtime / derived (ADR 0018 Phase 1).
 *
 * @module trellis/core/ontology/sync-policy
 */

import type {
  FieldSyncTier,
  PropertyValueSpecification,
  SchemaDefinition,
} from './types.js';

/** Thrown when a durable mutate includes a `sync:realtime` field. */
export class RealtimeFieldError extends Error {
  readonly field: string;
  readonly status = 400;

  constructor(field: string) {
    super(
      `Field "${field}" has sync:realtime — use trellis/realtime, not durable mutate`,
    );
    this.name = 'RealtimeFieldError';
    this.field = field;
  }
}

/** Thrown when create is asked for an id that already exists. */
export class EntityConflictError extends Error {
  readonly id: string;
  readonly status = 409;

  constructor(id: string) {
    super(`Entity already exists: ${id}`);
    this.name = 'EntityConflictError';
    this.id = id;
  }
}

/**
 * Resolve the effective sync tier for a property.
 *
 * - explicit `sync` wins
 * - formula / rollup / computed → derived
 * - otherwise durable
 */
export function effectiveFieldSync(
  field: PropertyValueSpecification,
): FieldSyncTier {
  if (field.sync) return field.sync;
  if (
    field.valueType === 'formula' ||
    field.valueType === 'rollup' ||
    field.computed === true
  ) {
    return 'derived';
  }
  return 'durable';
}

/** Find a registered schema for an entity type name (open-world tolerant). */
export function findSchemaForType(
  ontologies: Iterable<SchemaDefinition>,
  type: string,
): SchemaDefinition | undefined {
  const list = Array.from(ontologies);
  const byId = list.find((s) => s['@id'] === type);
  if (byId) return byId;
  const trellisId = `trellis:${type}`;
  const byTrellis = list.find((s) => s['@id'] === trellisId);
  if (byTrellis) return byTrellis;
  // Prefer non-core label matches — bare "Thing" must not bind to core:Thing.
  const byLabel = list.find(
    (s) =>
      (s.tier ?? 'user') !== 'core' &&
      (s.label === type || s['@id'].endsWith(`:${type}`)),
  );
  return byLabel;
}

/**
 * Filter attribute bags for durable create/update.
 *
 * - unknown fields (no schema / no field spec) → keep (open-world)
 * - derived → strip
 * - realtime → throw {@link RealtimeFieldError}
 * - durable → keep
 */
export function filterDurableAttributes<T extends Record<string, unknown>>(
  attributes: T,
  schema: SchemaDefinition | undefined,
): T {
  if (!schema) return attributes;

  const byName = new Map(schema.fields.map((f) => [f.name, f]));
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(attributes)) {
    const field = byName.get(key);
    if (!field) {
      out[key] = value;
      continue;
    }
    const tier = effectiveFieldSync(field);
    if (tier === 'derived') continue;
    if (tier === 'realtime') throw new RealtimeFieldError(key);
    out[key] = value;
  }

  return out as T;
}
