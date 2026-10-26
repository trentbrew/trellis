/**
 * User-defined collections (ADR 0045) — "a table people make".
 *
 * A collection is a `CollectionMeta` (the header) plus `CollectionField` entities
 * (its columns). Rows are uniform `CollectionRecord` entities pointing at their
 * collection by `collectionId`. Each collection's fields compile to a
 * per-collection schema, `…/collections/<slug>/Record`, which the schema
 * middleware resolves from a record's `collectionId` to validate it.
 *
 * Identity rules (ADR 0045 §3, turtleOS ADR-0013): field `key`s and option `id`s
 * are stable ids minted once; labels are display-only and derived on read.
 *
 * Zod-free on purpose: the kernel core loads these. Typed `defineType` handles for
 * SDK users live in `trellis/schema` (`src/schema/collections.ts`).
 */

import {
  PropertyTypeSchema,
  type PropertyType,
  type PropertyValueSpecification,
  type RelationConfig,
  type SchemaDefinition,
} from './types.js';

const VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// Ids
// ---------------------------------------------------------------------------

/**
 * `collectionId` values are `collectionMeta:<slug>`. The prefix is exact and
 * case-sensitive — the middleware strips it to find the collection's schema — so
 * collections are created with explicit ids (an auto id would be lowercased).
 */
export const COLLECTION_META_PREFIX = 'collectionMeta:' as const;

export function collectionMetaId(slug: string): string {
  const trimmed = slug.trim();
  if (!trimmed) throw new Error('collection slug is required');
  return trimmed.startsWith(COLLECTION_META_PREFIX) ? trimmed : `${COLLECTION_META_PREFIX}${trimmed}`;
}

/** `collectionMeta:<slug>` → `<slug>`, or null for anything else. */
export function collectionSlug(collectionId: string): string | null {
  if (!collectionId.startsWith(COLLECTION_META_PREFIX)) return null;
  const slug = collectionId.slice(COLLECTION_META_PREFIX.length).trim();
  return slug || null;
}

/** The per-collection schema's `@id`; ends with the `/collections/<slug>/Record` the middleware matches. */
export function collectionSchemaId(collectionId: string): string {
  const slug = collectionSlug(collectionId);
  if (!slug) throw new Error(`Not a collection id: ${collectionId}`);
  return `trellis:user/collections/${slug}/Record`;
}

/** Does this schema `@id` belong to the collection with this slug? */
export function isCollectionSchemaId(schemaId: string, slug: string): boolean {
  return schemaId.endsWith(`/collections/${slug}/Record`);
}

// ---------------------------------------------------------------------------
// Fields and options
// ---------------------------------------------------------------------------

export const COLLECTION_FIELD_TYPES = [
  'text',
  'number',
  'select',
  'multi_select',
  'tags',
  'date',
  'checkbox',
] as const;

export type CollectionFieldType = (typeof COLLECTION_FIELD_TYPES)[number];

/** Rows store `id`; `label`/`color` are derived on read, so renames never orphan rows. */
export interface CollectionOption {
  id: string;
  label: string;
  color?: string;
}

/** A `CollectionField` entity's attributes. `options` is JSON `CollectionOption[]`. */
export interface CollectionFieldRow {
  collection: string;
  key: string;
  label: string;
  valueType: string;
  options?: string;
  /**
   * For `tags` fields: the root `core:Tag` whose child tags are the terms. A shared
   * vocabulary spans collections and apps (ADR 0045 decision 4); `options` is for
   * vocabularies local to one field.
   */
  vocabulary?: string;
  order: number;
}

/**
 * Cardinality vocabulary from `graph-ontology/core.json` (`RelationConfig`).
 */
export type RelationCardinality =
  | 'one_to_one'
  | 'one_to_many'
  | 'many_to_one'
  | 'many_to_many';

/**
 * Link configuration for relation-valued properties, aligned with
 * `graph-ontology/core.json` `$defs/RelationConfig`.
 */
export interface RelationLinkConfig {
  targetEntityTypes?: string[];
  relationType?: string;
  cardinality?: RelationCardinality;
  inverseProperty?: string;
  symmetric?: boolean;
}

/**
 * Attributes of a `trellis:Relation` entity (persisted or derived).
 */
export interface RelationRow {
  id: string;
  key: string;
  label: string;
  valueType: string;
  /** JSON `CollectionOption[]` (option ids) for select / multi_select. */
  options?: string;
  /** Root `core:Tag` entity id for `tags` relations. */
  vocabulary?: string;
  description?: string;
  /** `'user'` for user-defined relations, or `'app:<name>'` for code-derived relations. */
  owner?: string;
  /** True for code-derived relations; never persisted to the op log. */
  readOnly?: boolean;
  /** JSON `RelationLinkConfig` for link-valued relations (`relation` or `tags`). */
  relation?: string;
}

/**
 * Parse a `CollectionMeta.relations` value (JSON string or string array) into
 * an ordered, deduplicated list of relation ids.
 */
export function parseRelationIds(
  raw: string | readonly string[] | undefined,
): string[] {
  if (!raw) return [];
  let list: unknown;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      list = JSON.parse(trimmed);
    } catch {
      return [];
    }
  } else {
    list = raw;
  }
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of list) {
    if (typeof item !== 'string') continue;
    const id = item.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

/**
 * Parse a `RelationRow.relation` JSON string into a `RelationLinkConfig`.
 */
export function parseRelationLinkConfig(
  raw: string | undefined,
): RelationLinkConfig | undefined {
  if (!raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return undefined;
    }
    const obj = parsed as Record<string, unknown>;
    const config: RelationLinkConfig = {};
    if (Array.isArray(obj.targetEntityTypes)) {
      config.targetEntityTypes = obj.targetEntityTypes.filter(
        (t): t is string => typeof t === 'string' && t.trim().length > 0,
      );
    }
    if (typeof obj.relationType === 'string' && obj.relationType.trim()) {
      config.relationType = obj.relationType.trim();
    }
    if (
      obj.cardinality === 'one_to_one' ||
      obj.cardinality === 'one_to_many' ||
      obj.cardinality === 'many_to_one' ||
      obj.cardinality === 'many_to_many'
    ) {
      config.cardinality = obj.cardinality;
    }
    if (typeof obj.inverseProperty === 'string' && obj.inverseProperty.trim()) {
      config.inverseProperty = obj.inverseProperty.trim();
    }
    if (typeof obj.symmetric === 'boolean') {
      config.symmetric = obj.symmetric;
    }
    return config;
  } catch {
    return undefined;
  }
}

/**
 * Convert a kernel `RelationConfig` (`targetSchema`, `cardinality: 'one' | 'many'`)
 * into `core.json`'s `RelationLinkConfig`.
 */
export function toRelationLinkConfig(config: RelationConfig): RelationLinkConfig {
  const link: RelationLinkConfig = {
    cardinality: config.cardinality === 'one' ? 'many_to_one' : 'many_to_many',
  };
  if (config.targetSchema) {
    link.targetEntityTypes = [config.targetSchema];
  }
  if (config.syncedProperty) {
    link.inverseProperty = config.syncedProperty;
  }
  return link;
}

/**
 * Convert `core.json`'s `RelationLinkConfig` back to the kernel's `RelationConfig`.
 */
export function fromRelationLinkConfig(
  link: RelationLinkConfig | undefined,
): RelationConfig | undefined {
  if (!link) return undefined;
  const cardinality: 'one' | 'many' =
    link.cardinality === 'one_to_one' || link.cardinality === 'many_to_one'
      ? 'one'
      : 'many';
  const result: RelationConfig = { cardinality };
  if (link.targetEntityTypes && link.targetEntityTypes.length > 0) {
    result.targetSchema = link.targetEntityTypes[0];
  }
  if (link.inverseProperty) {
    result.syncedProperty = link.inverseProperty;
  }
  return result;
}

/** Attributes every row has; never user field keys. */
export const RESERVED_RECORD_KEYS: ReadonlySet<string> = new Set([
  'id',
  'type',
  'collectionId',
  'title',
  'body',
  'sortOrder',
  'createdAt',
  'updatedAt',
  'createdBy',
  'tenantId',
  'laneId',
]);

export function isCollectionFieldType(value: string): value is CollectionFieldType {
  return (COLLECTION_FIELD_TYPES as readonly string[]).includes(value);
}

/** Parse a field's `options` JSON, dropping anything without an id and label. */
export function parseCollectionOptions(raw: string | undefined): CollectionOption[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (option): option is CollectionOption =>
        typeof option?.id === 'string' && typeof option?.label === 'string',
    );
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Migrating legacy string options (ADR 0045 phase 3)
// ---------------------------------------------------------------------------

/** FNV-1a, base36 — a short, stable id from text (not cryptographic). */
function stableHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(7, '0');
}

/**
 * The id a legacy option gets. Derived from its label, so every client migrating
 * the same collection mints the same id and re-running is a no-op.
 */
export function legacyOptionId(label: string): string {
  return `o_${stableHash(label.trim().toLowerCase())}`;
}

/**
 * Normalize a field's options from any legacy shape — `string[]` (demos, CMS),
 * `{ value, label, color? }[]` (FINANCE's first shape) — or the current
 * `{ id, label, color? }[]`. Returns id'd options plus how to map a stored legacy
 * value (the old string / `value`) to its option id. Existing ids are kept.
 */
export function migrateCollectionOptions(raw: unknown): {
  options: CollectionOption[];
  idFor: (legacyValue: string) => string | undefined;
} {
  const parsed: unknown = typeof raw === 'string' ? safeJson(raw) : raw;
  const options: CollectionOption[] = [];
  const byLegacy = new Map<string, string>();
  const seen = new Set<string>();

  for (const entry of Array.isArray(parsed) ? parsed : []) {
    let option: CollectionOption | undefined;
    let legacy: string | undefined;
    if (typeof entry === 'string') {
      option = { id: legacyOptionId(entry), label: entry };
      legacy = entry;
    } else if (entry && typeof entry === 'object') {
      const record = entry as Record<string, unknown>;
      const label = typeof record.label === 'string' ? record.label : undefined;
      const value = typeof record.value === 'string' ? record.value : undefined;
      const text = label ?? value;
      if (!text) continue;
      const id = typeof record.id === 'string' ? record.id : legacyOptionId(text);
      option = { id, label: text, ...(typeof record.color === 'string' ? { color: record.color } : {}) };
      legacy = value ?? label;
    }
    if (!option || seen.has(option.id)) continue;
    seen.add(option.id);
    options.push(option);
    if (legacy !== undefined) byLegacy.set(legacy, option.id);
    byLegacy.set(option.id, option.id);
  }

  return { options, idFor: (legacyValue) => byLegacy.get(legacyValue) };
}

/**
 * A stored select / multi-select value, rewritten to option ids. Values that match
 * no option are left as they are (never dropped) so nothing is lost silently.
 */
export function migrateOptionValue(
  value: unknown,
  idFor: (legacyValue: string) => string | undefined,
): unknown {
  if (typeof value === 'string') return idFor(value) ?? value;
  if (Array.isArray(value)) {
    return value.map((entry) => (typeof entry === 'string' ? (idFor(entry) ?? entry) : entry));
  }
  return value;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** `tags` is a relation to `core:Tag`, compiled separately. */
const KERNEL_TYPE: Record<Exclude<CollectionFieldType, 'tags'>, PropertyType> = {
  text: 'rich_text',
  number: 'number',
  select: 'select',
  multi_select: 'multi_select',
  date: 'date',
  checkbox: 'checkbox',
};

function compileRelationToField(rel: RelationRow): PropertyValueSpecification | null {
  if (RESERVED_RECORD_KEYS.has(rel.key)) return null;
  if (rel.valueType === 'tags') {
    return {
      name: rel.key,
      valueType: 'relation',
      description: rel.label,
      relation: { targetSchema: 'core:Tag', cardinality: 'many' },
    };
  }
  if (isCollectionFieldType(rel.valueType)) {
    return {
      name: rel.key,
      valueType: KERNEL_TYPE[rel.valueType as Exclude<CollectionFieldType, 'tags'>],
      description: rel.label,
    };
  }
  if (rel.valueType === 'relation') {
    const link = fromRelationLinkConfig(parseRelationLinkConfig(rel.relation));
    return {
      name: rel.key,
      valueType: 'relation',
      description: rel.label,
      ...(link ? { relation: link } : {}),
    };
  }
  if ((PropertyTypeSchema as readonly string[]).includes(rel.valueType)) {
    return {
      name: rel.key,
      valueType: rel.valueType as PropertyType,
      description: rel.label,
    };
  }
  return null;
}

function isRelationRowCandidate(
  row: CollectionFieldRow | RelationRow,
): row is RelationRow {
  return 'id' in row && typeof row.id === 'string' && !('collection' in row);
}

/**
 * Compile a collection's fields into the per-collection row schema the middleware
 * validates `CollectionRecord`s against. Option membership is deliberately not
 * enforced: a picker adds an option and selects it in one gesture, so the row
 * write can land before the re-compiled schema does.
 *
 * ADR 0048 phase 3: when `collection.relations` lists ordered `trellis:Relation`
 * ids and matching relation rows are supplied (via `relationRows` or in `fieldRows`),
 * the schema compiles from those Relations in order; otherwise it falls back to
 * `CollectionField` rows.
 */
export function compileCollectionSchema(
  collection: { id: string; title?: string; relations?: string | readonly string[] },
  fieldRows: readonly (CollectionFieldRow | RelationRow)[] = [],
  relationRows?: readonly RelationRow[],
): SchemaDefinition {
  const relationIds = parseRelationIds(collection.relations);
  const candidateRelations: readonly RelationRow[] =
    relationRows ?? fieldRows.filter(isRelationRowCandidate);

  let userFields: PropertyValueSpecification[];
  if (relationIds.length > 0 && (relationRows !== undefined || candidateRelations.length > 0)) {
    const byId = new Map<string, RelationRow>();
    for (const rel of candidateRelations) {
      byId.set(rel.id, rel);
    }
    userFields = [];
    const seenKeys = new Set<string>();
    for (const relId of relationIds) {
      const rel = byId.get(relId);
      if (!rel || seenKeys.has(rel.key)) continue;
      const spec = compileRelationToField(rel);
      if (spec) {
        seenKeys.add(rel.key);
        userFields.push(spec);
      }
    }
  } else {
    const legacyRows = fieldRows.filter(
      (row): row is CollectionFieldRow => 'collection' in row,
    );
    userFields = legacyRows
      .filter(
        (row) =>
          row.collection === collection.id &&
          isCollectionFieldType(row.valueType) &&
          !RESERVED_RECORD_KEYS.has(row.key),
      )
      .sort((a, b) => a.order - b.order || a.key.localeCompare(b.key))
      .map((row): PropertyValueSpecification => {
        // Field specs have no label; the display label rides in `description`.
        if (row.valueType === 'tags') {
          return {
            name: row.key,
            valueType: 'relation',
            description: row.label,
            relation: { targetSchema: 'core:Tag', cardinality: 'many' },
          };
        }
        return {
          name: row.key,
          valueType: KERNEL_TYPE[row.valueType as Exclude<CollectionFieldType, 'tags'>],
          description: row.label,
        };
      });
  }

  const title = collection.title?.trim();
  return {
    '@id': collectionSchemaId(collection.id),
    '@type': 'trellis:Schema',
    version: VERSION,
    tier: 'user',
    subClassOf: COLLECTION_RECORD_SCHEMA['@id'],
    label: title ? `${title} records` : 'Collection records',
    fields: [...COLLECTION_RECORD_SCHEMA.fields, ...userFields],
  };
}

// ---------------------------------------------------------------------------
// System-tier schemas (loaded with CORE_ONTOLOGY)
// ---------------------------------------------------------------------------

function f(
  name: string,
  valueType: PropertyType,
  required = false,
): PropertyValueSpecification {
  return { name, valueType, required } as PropertyValueSpecification;
}

/** A user-defined table's header. Not `core:Collection`, which is a folder. */
export const COLLECTION_META_SCHEMA: SchemaDefinition = {
  '@id': 'trellis:CollectionMeta',
  '@type': 'trellis:Schema',
  version: VERSION,
  tier: 'system',
  subClassOf: 'core:Record',
  label: 'User Collection',
  fields: [
    f('title', 'title', true),
    f('slug', 'rich_text', true),
    f('icon', 'rich_text'),
    f('color', 'rich_text'),
    f('description', 'rich_text'),
    f('sortOrder', 'number'),
    f('relations', 'rich_text'),
  ],
};

/** One row of any user collection; its collection's schema adds the user fields. */
export const COLLECTION_RECORD_SCHEMA: SchemaDefinition = {
  '@id': 'trellis:CollectionRecord',
  '@type': 'trellis:Schema',
  version: VERSION,
  tier: 'system',
  subClassOf: 'core:Record',
  label: 'Collection Record',
  fields: [
    f('collectionId', 'rich_text', true),
    f('title', 'title', true),
    f('body', 'rich_text'),
    f('sortOrder', 'number'),
  ],
};

/** One column of a user collection. `key` is the row attribute and never changes. */
export const COLLECTION_FIELD_SCHEMA: SchemaDefinition = {
  '@id': 'trellis:CollectionField',
  '@type': 'trellis:Schema',
  version: VERSION,
  tier: 'system',
  subClassOf: 'core:Thing',
  label: 'Collection Field',
  fields: [
    f('collection', 'rich_text', true),
    f('key', 'rich_text', true),
    f('label', 'title', true),
    { name: 'valueType', valueType: 'select', required: true, selectOptions: [...COLLECTION_FIELD_TYPES] } as PropertyValueSpecification,
    f('options', 'rich_text'),
    f('vocabulary', 'rich_text'),
    f('order', 'number', true),
  ],
};

export const COLLECTION_SCHEMAS: SchemaDefinition[] = [
  COLLECTION_META_SCHEMA,
  COLLECTION_RECORD_SCHEMA,
  COLLECTION_FIELD_SCHEMA,
];
