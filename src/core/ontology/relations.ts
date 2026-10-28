/**
 * Global Relation properties (ADR 0048 phase 3, TRL-494).
 *
 * In Anytype terminology, a Relation is a property definition of any value type
 * that exists as a first-class graph entity and can be referenced by one or more
 * types. In `graph-ontology/core.json`, `trellis:Relation` corresponds to
 * `PropertyDef`; only link-valued relations (`valueType === 'relation'` or
 * `'tags'`) carry `core.json`'s `RelationConfig` payload under `relation`.
 *
 * Two origins coexist without two-way mirroring:
 * - User relations (`rel:user.<slug>.<key>`) are persisted in the graph and
 *   referenced in order by `CollectionMeta.relations`.
 * - Code relations (`rel:<app>.<Type>.<key>`) are derived on read from
 *   `SchemaDefinition`s via `deriveCodeRelations` (`readOnly: true`, never
 *   written to the op log).
 *
 * Zod-free on purpose so the kernel core can load this module directly.
 */

import type { EAVStore, Fact } from '../store/eav-store.js';
import type { OpProvenance } from '../persist/canonical-op.js';
import type {
  PropertyType,
  PropertyValueSpecification,
  SchemaDefinition,
} from './types.js';
import { PropertyTypeSchema } from './types.js';
import {
  COLLECTION_FIELD_TYPES,
  RESERVED_RECORD_KEYS,
  collectionSlug,
  fromRelationLinkConfig,
  isCollectionFieldType,
  migrateCollectionOptions,
  parseCollectionOptions,
  parseRelationIds,
  parseRelationLinkConfig,
  toRelationLinkConfig,
  type CollectionFieldRow,
  type CollectionFieldType,
  type RelationCardinality,
  type RelationLinkConfig,
  type RelationRow,
} from './collections.js';

export {
  fromRelationLinkConfig,
  parseRelationIds,
  parseRelationLinkConfig,
  toRelationLinkConfig,
} from './collections.js';
export type {
  RelationCardinality,
  RelationLinkConfig,
  RelationRow,
} from './collections.js';

const VERSION = '1.0.0';

export const RELATION_PREFIX = 'rel:' as const;

export const RELATION_VALUE_TYPES = [
  ...COLLECTION_FIELD_TYPES,
  ...PropertyTypeSchema.filter(
    (t): t is Exclude<PropertyType, CollectionFieldType> =>
      !(COLLECTION_FIELD_TYPES as readonly string[]).includes(t),
  ),
] as const;

export type RelationValueType = (typeof RELATION_VALUE_TYPES)[number];

export function isRelationValueType(value: string): value is RelationValueType {
  return (RELATION_VALUE_TYPES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Identity helpers (ADR 0048 §2.3 - §2.4)
// ---------------------------------------------------------------------------

function cleanSegment(segment: string, label: string): string {
  const trimmed = segment.trim();
  if (!trimmed) {
    throw new Error(`relation ${label} is required`);
  }
  return trimmed;
}

/**
 * Default per-type relation id: `rel:<app>.<type>.<key>` (ADR 0048 §2.4).
 */
export function relationId(app: string, type: string, key: string): string {
  const cleanApp = cleanSegment(app, 'app');
  const cleanType = cleanSegment(type, 'type');
  const cleanKey = cleanSegment(key, 'key');
  return `${RELATION_PREFIX}${cleanApp}.${cleanType}.${cleanKey}`;
}

/**
 * Deterministic id for a user collection's relation: `rel:user.<slug>.<key>`.
 * Accepts either `collectionMeta:<slug>` or a bare `<slug>`.
 */
export function userRelationId(slugOrCollectionId: string, key: string): string {
  const raw = cleanSegment(slugOrCollectionId, 'collection');
  const slug = collectionSlug(raw) ?? raw;
  return relationId('user', slug, key);
}

// ---------------------------------------------------------------------------
// Migration: CollectionField -> Relation (ADR 0048 phase 3)
// ---------------------------------------------------------------------------

export interface CollectionFieldMigrationResult {
  /** Deterministic `trellis:Relation` rows for the collection. */
  relations: RelationRow[];
  /** Ordered list of relation ids for `CollectionMeta.relations`. */
  relationIds: string[];
  /** Canonical JSON encoding of `relationIds` for `CollectionMeta.relations`. */
  relationsJson: string;
}

/**
 * Pure, deterministic conversion from `CollectionField` rows to `trellis:Relation`
 * rows plus the ordered `CollectionMeta.relations` list.
 *
 * Re-running on the same inputs (or with `meta.relations` already populated from
 * a prior run) produces identical output.
 */
export function migrateCollectionFieldsToRelations(
  meta: { id: string; title?: string; relations?: string | readonly string[] },
  fieldRows: readonly CollectionFieldRow[],
): CollectionFieldMigrationResult {
  const slug = collectionSlug(meta.id);
  if (!slug) {
    throw new Error(`Not a collection id: ${meta.id}`);
  }

  const validFields = fieldRows
    .filter(
      (row) =>
        row.collection === meta.id &&
        isCollectionFieldType(row.valueType) &&
        !RESERVED_RECORD_KEYS.has(row.key),
    )
    .sort((a, b) => a.order - b.order || a.key.localeCompare(b.key));

  const byId = new Map<string, RelationRow>();
  for (const row of validFields) {
    const id = userRelationId(slug, row.key);
    if (byId.has(id)) continue;

    const rel: RelationRow = {
      id,
      key: row.key,
      label: row.label,
      valueType: row.valueType,
      owner: 'user',
      readOnly: false,
    };

    if (row.options !== undefined) {
      const parsed = parseCollectionOptions(row.options);
      if (parsed.length > 0) {
        rel.options = JSON.stringify(parsed);
      } else {
        const migrated = migrateCollectionOptions(row.options).options;
        if (migrated.length > 0) {
          rel.options = JSON.stringify(migrated);
        }
      }
    }

    if (row.vocabulary) {
      rel.vocabulary = row.vocabulary;
    }

    if (row.valueType === 'tags') {
      rel.relation = JSON.stringify({
        targetEntityTypes: ['core:Tag'],
        cardinality: 'many_to_many',
      } satisfies RelationLinkConfig);
    }

    byId.set(id, rel);
  }

  // Preserve any existing relation ordering on CollectionMeta first, then append
  // newly migrated field relations in their sorted field order.
  const existingIds = parseRelationIds(meta.relations);
  const relationIds: string[] = [];
  const seen = new Set<string>();

  for (const id of existingIds) {
    if (byId.has(id) && !seen.has(id)) {
      seen.add(id);
      relationIds.push(id);
    }
  }
  for (const id of byId.keys()) {
    if (!seen.has(id)) {
      seen.add(id);
      relationIds.push(id);
    }
  }

  const relations = relationIds
    .map((id) => byId.get(id))
    .filter((row): row is RelationRow => row !== undefined);

  return {
    relations,
    relationIds,
    relationsJson: JSON.stringify(relationIds),
  };
}

// ---------------------------------------------------------------------------
// Store helpers + idempotent op-emitting entry point
// ---------------------------------------------------------------------------

/**
 * Reconstruct a `RelationRow` from its EAV facts, or null if not a Relation.
 */
export function relationRowFromFacts(
  entityId: string,
  facts: readonly Fact[],
): RelationRow | null {
  if (facts.length === 0) return null;
  const byAttr = new Map<string, unknown>();
  for (const fact of facts) {
    if (fact.e === entityId) {
      byAttr.set(fact.a, fact.v);
    }
  }
  const rawType = typeof byAttr.get('type') === 'string' ? (byAttr.get('type') as string) : '';
  const shortType = rawType.includes(':') ? rawType.split(':').pop()! : rawType;
  if (shortType !== 'Relation') return null;

  const key = typeof byAttr.get('key') === 'string' ? (byAttr.get('key') as string) : '';
  const label = typeof byAttr.get('label') === 'string' ? (byAttr.get('label') as string) : key;
  const valueType =
    typeof byAttr.get('valueType') === 'string' ? (byAttr.get('valueType') as string) : '';
  if (!key || !valueType) return null;

  const row: RelationRow = {
    id: entityId,
    key,
    label,
    valueType,
  };
  if (typeof byAttr.get('options') === 'string') row.options = byAttr.get('options') as string;
  if (typeof byAttr.get('vocabulary') === 'string') {
    row.vocabulary = byAttr.get('vocabulary') as string;
  }
  if (typeof byAttr.get('description') === 'string') {
    row.description = byAttr.get('description') as string;
  }
  if (typeof byAttr.get('owner') === 'string') row.owner = byAttr.get('owner') as string;
  if (typeof byAttr.get('readOnly') === 'boolean') row.readOnly = byAttr.get('readOnly') as boolean;
  if (typeof byAttr.get('relation') === 'string') row.relation = byAttr.get('relation') as string;
  return row;
}

/**
 * Read all persisted `trellis:Relation` rows from an `EAVStore`.
 */
export function readRelationsFromStore(store: EAVStore): RelationRow[] {
  const typeFacts = [
    ...store.getFactsByValue('type', 'Relation'),
    ...store.getFactsByValue('type', 'trellis:Relation'),
  ];
  const ids = new Set<string>(typeFacts.map((f) => f.e));
  const rows: RelationRow[] = [];
  for (const id of ids) {
    const row = relationRowFromFacts(id, store.getFactsByEntity(id));
    if (row) rows.push(row);
  }
  return rows.sort((a, b) => a.id.localeCompare(b.id));
}

export interface ApplyCollectionRelationMigrationTarget {
  getStore(): EAVStore;
  mutate(
    kind: string,
    payload: {
      facts?: Fact[];
      deleteFacts?: Fact[];
      provenance?: OpProvenance;
    },
  ): Promise<unknown>;
}

export interface AppliedCollectionRelationMigration extends CollectionFieldMigrationResult {
  opsApplied: number;
}

const MIGRATION_PROVENANCE: OpProvenance = {
  actorType: 'machine',
  origin: 'migration',
};

/**
 * Idempotent op-emitting entry point: reads a collection's `CollectionMeta` and
 * `CollectionField` entities from `kernel.getStore()`, computes the target
 * `trellis:Relation` rows and `CollectionMeta.relations`, and emits a single
 * mutation op only if any relation facts or `CollectionMeta.relations` differ.
 *
 * Re-running on an already-migrated collection emits 0 ops.
 */
export async function applyCollectionRelationMigration(
  kernel: ApplyCollectionRelationMigrationTarget,
  collectionId: string,
): Promise<AppliedCollectionRelationMigration> {
  const store = kernel.getStore();
  const metaFacts = store.getFactsByEntity(collectionId);
  const existingRelationsFact = metaFacts.find((f) => f.a === 'relations');
  const titleFact = metaFacts.find((f) => f.a === 'title');

  const fieldTypeFacts = [
    ...store.getFactsByValue('type', 'CollectionField'),
    ...store.getFactsByValue('type', 'trellis:CollectionField'),
  ];
  const fieldIds = new Set<string>(fieldTypeFacts.map((f) => f.e));
  const fieldRows: CollectionFieldRow[] = [];

  for (const fieldId of fieldIds) {
    const facts = store.getFactsByEntity(fieldId);
    const byAttr = new Map<string, unknown>(facts.map((f) => [f.a, f.v]));
    if (byAttr.get('collection') !== collectionId) continue;
    const key = typeof byAttr.get('key') === 'string' ? (byAttr.get('key') as string) : '';
    const label = typeof byAttr.get('label') === 'string' ? (byAttr.get('label') as string) : '';
    const valueType =
      typeof byAttr.get('valueType') === 'string' ? (byAttr.get('valueType') as string) : '';
    const order = typeof byAttr.get('order') === 'number' ? (byAttr.get('order') as number) : 0;
    if (!key || !valueType) continue;
    const row: CollectionFieldRow = {
      collection: collectionId,
      key,
      label,
      valueType,
      order,
    };
    if (typeof byAttr.get('options') === 'string') row.options = byAttr.get('options') as string;
    if (typeof byAttr.get('vocabulary') === 'string') {
      row.vocabulary = byAttr.get('vocabulary') as string;
    }
    fieldRows.push(row);
  }

  const migration = migrateCollectionFieldsToRelations(
    {
      id: collectionId,
      title: typeof titleFact?.v === 'string' ? titleFact.v : undefined,
      relations:
        typeof existingRelationsFact?.v === 'string' ? existingRelationsFact.v : undefined,
    },
    fieldRows,
  );

  const factsToAdd: Fact[] = [];
  const factsToDelete: Fact[] = [];

  for (const rel of migration.relations) {
    const storedFacts = store.getFactsByEntity(rel.id);
    const storedByAttr = new Map<string, Fact>();
    for (const f of storedFacts) {
      storedByAttr.set(f.a, f);
    }

    const desiredEntries: [string, string | boolean | undefined][] = [
      ['type', 'Relation'],
      ['key', rel.key],
      ['label', rel.label],
      ['valueType', rel.valueType],
      ['options', rel.options],
      ['vocabulary', rel.vocabulary],
      ['description', rel.description],
      ['owner', rel.owner],
      ['readOnly', rel.readOnly],
      ['relation', rel.relation],
    ];

    for (const [attr, value] of desiredEntries) {
      if (value === undefined) continue;
      const existing = storedByAttr.get(attr);
      if (
        attr === 'type' &&
        existing &&
        (existing.v === 'Relation' || existing.v === 'trellis:Relation')
      ) {
        continue;
      }
      if (!existing || existing.v !== value) {
        if (existing) factsToDelete.push(existing);
        factsToAdd.push({ e: rel.id, a: attr, v: value });
      }
    }
  }

  if (metaFacts.length > 0) {
    if (!existingRelationsFact || existingRelationsFact.v !== migration.relationsJson) {
      if (existingRelationsFact) factsToDelete.push(existingRelationsFact);
      factsToAdd.push({
        e: collectionId,
        a: 'relations',
        v: migration.relationsJson,
      });
    }
  }

  let opsApplied = 0;
  if (factsToAdd.length > 0 || factsToDelete.length > 0) {
    await kernel.mutate('addFacts', {
      facts: factsToAdd,
      deleteFacts: factsToDelete.length > 0 ? factsToDelete : undefined,
      provenance: MIGRATION_PROVENANCE,
    });
    opsApplied = 1;
  }

  return {
    ...migration,
    opsApplied,
  };
}

// ---------------------------------------------------------------------------
// Derived code relations (ADR 0048 §2.4 + phase 3 addendum)
// ---------------------------------------------------------------------------

function parseSchemaNamespaceAndType(
  schemaId: string,
  explicitApp?: string,
): { app: string; typeName: string } {
  const trimmed = schemaId.trim();
  if (trimmed.includes(':')) {
    const idx = trimmed.indexOf(':');
    const prefix = trimmed.slice(0, idx).trim() || 'trellis';
    const rest = trimmed.slice(idx + 1).trim();
    const shortType = rest.includes('/') ? rest.split('/').pop()! : rest;
    return {
      app: explicitApp?.trim() || prefix,
      typeName: shortType || trimmed,
    };
  }
  return {
    app: explicitApp?.trim() || 'trellis',
    typeName: trimmed,
  };
}

/**
 * Project a code `SchemaDefinition`'s fields into read-only `RelationRow` records.
 *
 * These records are derived on read and never persisted to the op log, so a
 * field rename or removal in code cannot leave orphaned relation entities in
 * storage (ADR 0048 phase 3 addendum decision 3).
 */
export function deriveCodeRelations(
  schemaOrHandle: SchemaDefinition | { readonly definition: SchemaDefinition },
  app?: string,
): RelationRow[] {
  const schema: SchemaDefinition =
    'definition' in schemaOrHandle ? schemaOrHandle.definition : schemaOrHandle;
  const { app: resolvedApp, typeName } = parseSchemaNamespaceAndType(schema['@id'], app);
  const owner = `app:${resolvedApp}`;

  return schema.fields.map((field): RelationRow => {
    const sharedId = field.sharedRelationId?.trim();
    if (sharedId && !sharedId.startsWith(RELATION_PREFIX)) {
      throw new Error(
        `Field ${field.name}: sharedRelationId must start with "${RELATION_PREFIX}"`,
      );
    }
    const id = sharedId || relationId(resolvedApp, typeName, field.name);
    const row: RelationRow = {
      id,
      key: field.name,
      label: field.description?.trim() || field.name,
      valueType: field.valueType,
      owner,
      readOnly: true,
    };

    if (field.description) {
      row.description = field.description;
    }

    if (field.selectOptions && field.selectOptions.length > 0) {
      const normalized = migrateCollectionOptions(field.selectOptions).options;
      if (normalized.length > 0) {
        row.options = JSON.stringify(normalized);
      }
    }

    if (field.relation) {
      row.relation = JSON.stringify(toRelationLinkConfig(field.relation));
    }

    return row;
  });
}

export type SchemaWithOptionalApp =
  | SchemaDefinition
  | { readonly definition: SchemaDefinition }
  | { readonly schema: SchemaDefinition | { readonly definition: SchemaDefinition }; readonly app?: string };

export interface ListRelationsOptions {
  /** Persisted user Relation rows. */
  persisted?: readonly RelationRow[];
  /** Optional EAVStore to read persisted `trellis:Relation` rows from directly. */
  store?: EAVStore;
  /** Code schemas (or `{ schema, app }` pairs) to derive read-only Relations from. */
  schemas?: readonly SchemaWithOptionalApp[];
  /** Default app name for code schemas when not provided per entry. */
  app?: string;
}

function isWrappedSchemaEntry(
  entry: SchemaWithOptionalApp,
): entry is { readonly schema: SchemaDefinition | { readonly definition: SchemaDefinition }; readonly app?: string } {
  return typeof entry === 'object' && entry !== null && 'schema' in entry && entry.schema !== undefined;
}

/**
 * Merge persisted user Relations with derived read-only code Relations.
 * Persisted relations take precedence on id collision; derived code relations
 * are always marked `readOnly: true` and are never written to storage.
 */
export function listRelations(options: ListRelationsOptions = {}): RelationRow[] {
  const byId = new Map<string, RelationRow>();

  if (options.store) {
    for (const row of readRelationsFromStore(options.store)) {
      byId.set(row.id, row);
    }
  }

  if (options.persisted) {
    for (const row of options.persisted) {
      byId.set(row.id, row);
    }
  }

  if (options.schemas) {
    for (const entry of options.schemas) {
      const target = isWrappedSchemaEntry(entry) ? entry.schema : entry;
      const entryApp = isWrappedSchemaEntry(entry) ? entry.app ?? options.app : options.app;
      for (const derived of deriveCodeRelations(target, entryApp)) {
        if (!byId.has(derived.id)) {
          byId.set(derived.id, derived);
        }
      }
    }
  }

  return Array.from(byId.values());
}

// ---------------------------------------------------------------------------
// System-tier schema (loaded with CORE_ONTOLOGY)
// ---------------------------------------------------------------------------

function f(
  name: string,
  valueType: PropertyType,
  required = false,
): PropertyValueSpecification {
  return { name, valueType, required } as PropertyValueSpecification;
}

/**
 * Global property definition (`trellis:Relation`, ADR 0048 §2.3).
 */
export const RELATION_SCHEMA: SchemaDefinition = {
  '@id': 'trellis:Relation',
  '@type': 'trellis:Schema',
  version: VERSION,
  tier: 'system',
  subClassOf: 'core:Thing',
  label: 'Relation',
  fields: [
    f('key', 'rich_text', true),
    f('label', 'title', true),
    {
      name: 'valueType',
      valueType: 'select',
      required: true,
      selectOptions: [...RELATION_VALUE_TYPES],
    } as PropertyValueSpecification,
    f('options', 'rich_text'),
    f('vocabulary', 'rich_text'),
    f('description', 'rich_text'),
    f('owner', 'rich_text'),
    f('readOnly', 'checkbox'),
    f('relation', 'rich_text'),
  ],
};
