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

import type {
  PropertyType,
  PropertyValueSpecification,
  SchemaDefinition,
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
  order: number;
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

const KERNEL_TYPE: Record<CollectionFieldType, PropertyType> = {
  text: 'rich_text',
  number: 'number',
  select: 'select',
  multi_select: 'multi_select',
  date: 'date',
  checkbox: 'checkbox',
};

/**
 * Compile a collection's fields into the per-collection row schema the middleware
 * validates `CollectionRecord`s against. Option membership is deliberately not
 * enforced: a picker adds an option and selects it in one gesture, so the row
 * write can land before the re-compiled schema does.
 */
export function compileCollectionSchema(
  collection: { id: string; title?: string },
  fieldRows: readonly CollectionFieldRow[],
): SchemaDefinition {
  const userFields = fieldRows
    .filter(
      (row) =>
        row.collection === collection.id &&
        isCollectionFieldType(row.valueType) &&
        !RESERVED_RECORD_KEYS.has(row.key),
    )
    .sort((a, b) => a.order - b.order || a.key.localeCompare(b.key))
    .map(
      (row): PropertyValueSpecification => ({
        name: row.key,
        valueType: KERNEL_TYPE[row.valueType as CollectionFieldType],
        // Field specs have no label; the display label rides in `description`.
        description: row.label,
      }),
    );

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
    f('order', 'number', true),
  ],
};

export const COLLECTION_SCHEMAS: SchemaDefinition[] = [
  COLLECTION_META_SCHEMA,
  COLLECTION_RECORD_SCHEMA,
  COLLECTION_FIELD_SCHEMA,
];
