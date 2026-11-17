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
  type RollupConfig,
  type SchemaDefinition,
} from './types.js';
import type { EAVStore } from '../store/eav-store.js';
import { evaluateRollup } from '../computation/rollup.js';
import { parse as parseFormula } from '../../formula/parse.js';
import { parseAndEvaluate } from '../../formula/index.js';
import type { ExprNode } from '../../formula/ir.js';

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
  'relation',
  'rollup',
  'formula',
  'schedule',
  'sequence',
  'place',
] as const;

export type CollectionFieldType = (typeof COLLECTION_FIELD_TYPES)[number];

/** Rows store `id`; `label`/`color` are derived on read, so renames never orphan rows. */
export interface CollectionOption {
  id: string;
  label: string;
  color?: string;
}

/** A `relation` field's target, stored as JSON on `CollectionFieldRow.relationTarget`. */
export interface CollectionRelationTarget {
  /** A `collectionMeta:<slug>` id — must name an existing collection. */
  targetCollection: string;
  cardinality: 'one' | 'many';
}

/** A `rollup` field's config, stored as JSON on `CollectionFieldRow.rollupConfig`. */
export interface CollectionRollupConfig {
  /** Key of a `relation` field on this same collection. */
  relationField: string;
  /** Field key to read on each related record; `"id"` counts related ids. */
  targetField: string;
  aggregation: RollupConfig['aggregation'];
}

/**
 * A `sequence` field's config, stored as JSON on `CollectionFieldRow.sequenceConfig`
 * — generalizes the built-in Issue noun's `nextIssueId` (`guest/tsh-dispatch.mjs`
 * in os-sandbox: scan existing `issue:SYS-N` ids for the max `N`, increment) into
 * a declarable field any collection can have. The record stores the raw integer
 * (`PropertyType: 'number'`, same as a plain `number` field); `prefix` is a
 * display-only hint for rendering it as `PREFIX-N` (e.g. `TICKET-7`) — never part
 * of the stored value, so a prefix rename never rewrites existing rows.
 */
export interface CollectionSequenceConfig {
  /** Prepended with a dash when rendering, e.g. "TICKET" -> "TICKET-7". Empty: bare number. */
  prefix: string;
}

/**
 * A `schedule` field's *record value* shape (turtleOS ADR-0048 §3) — unlike
 * `relationTarget`/`rollupConfig`, this is never stored on the field
 * definition. A relation/rollup's behavior is the same for every row in the
 * collection; a reminder's due time is not shared across rows at all, so
 * `schedule` carries no field-level config, the same as `date`/`select` carry
 * none — each `CollectionRecord` stores its own JSON value for the field.
 * `once` is an ISO-8601 timestamp; `recurring` uses iCalendar RRULE rather
 * than cron, which has no clean one-off-timestamp case. This type declares
 * *when*, as data (Lexicon) — nothing here fires anything; a Harness-side
 * scheduler reads live values and invokes whatever action is declared for
 * the record (turtleOS ADR-0047).
 */
export type CollectionScheduleValue =
  | { kind: 'once'; at: string }
  | { kind: 'recurring'; rrule: string };

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
  /** For `relation` fields: JSON `CollectionRelationTarget`. */
  relationTarget?: string;
  /** For `rollup` fields: JSON `CollectionRollupConfig`. */
  rollupConfig?: string;
  /** For `formula` fields: `kernel-fn` dialect source (`src/formula/`). */
  formula?: string;
  /** For `sequence` fields: JSON `CollectionSequenceConfig`. */
  sequenceConfig?: string;
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
  // TRL-65: op-log-derived provenance, never a declarable field.
  'lastEditedBy',
  'lastEditedAt',
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

/** Parse a `relation` field's `relationTarget` JSON; `null` if missing or malformed. */
export function parseRelationTarget(raw: string | undefined): CollectionRelationTarget | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CollectionRelationTarget>;
    if (typeof parsed.targetCollection !== 'string' || !parsed.targetCollection) return null;
    return { targetCollection: parsed.targetCollection, cardinality: parsed.cardinality === 'one' ? 'one' : 'many' };
  } catch {
    return null;
  }
}

/** Parse a `rollup` field's `rollupConfig` JSON; `null` if missing or malformed. */
export function parseRollupConfig(raw: string | undefined): CollectionRollupConfig | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CollectionRollupConfig>;
    if (
      typeof parsed.relationField !== 'string' || !parsed.relationField ||
      typeof parsed.targetField !== 'string' || !parsed.targetField ||
      typeof parsed.aggregation !== 'string'
    ) {
      return null;
    }
    return {
      relationField: parsed.relationField,
      targetField: parsed.targetField,
      aggregation: parsed.aggregation as CollectionRollupConfig['aggregation'],
    };
  } catch {
    return null;
  }
}

/**
 * Parse a `sequence` field's `sequenceConfig` JSON. Unlike `relation`/`rollup`
 * (which have a required target), a sequence is valid with no config at all —
 * missing or malformed JSON degrades to an empty prefix (bare number) rather
 * than `null`, so a sequence field never needs its own validation branch in
 * `validateCollectionField`.
 */
export function parseSequenceConfig(raw: string | undefined): CollectionSequenceConfig {
  if (!raw) return { prefix: '' };
  try {
    const parsed = JSON.parse(raw) as Partial<CollectionSequenceConfig>;
    return { prefix: typeof parsed.prefix === 'string' ? parsed.prefix : '' };
  } catch {
    return { prefix: '' };
  }
}

/**
 * Parse a `schedule`-type field's *record value* JSON; `null` if missing or
 * malformed. Operates on a `CollectionRecord`'s own attribute value (e.g.
 * `record.due`), never on field-definition JSON — `schedule` has no
 * field-level config to parse (see `CollectionScheduleValue`). Exported for
 * consumers (a Harness scheduler, a pack installer validating seed rows) —
 * the kernel's own `validateCollectionField` never calls this, since it
 * validates field definitions, not record values, for any field type.
 */
export function parseScheduleValue(raw: unknown): CollectionScheduleValue | null {
  if (typeof raw !== 'string' || !raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CollectionScheduleValue>;
    if (parsed.kind === 'once') {
      const at = (parsed as { at?: unknown }).at;
      if (typeof at !== 'string' || !at || Number.isNaN(Date.parse(at))) return null;
      return { kind: 'once', at };
    }
    if (parsed.kind === 'recurring') {
      const rrule = (parsed as { rrule?: unknown }).rrule;
      if (typeof rrule !== 'string' || !rrule.startsWith('FREQ=')) return null;
      return { kind: 'recurring', rrule };
    }
    return null;
  } catch {
    return null;
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

/** `tags`/`relation`/`rollup`/`formula` compile to their own `PropertyValueSpecification` shape below. */
const KERNEL_TYPE: Record<
  Exclude<
    CollectionFieldType,
    'tags' | 'relation' | 'rollup' | 'formula' | 'schedule'
  >,
  PropertyType
> = {
  text: 'rich_text',
  number: 'number',
  select: 'select',
  multi_select: 'multi_select',
  date: 'date',
  checkbox: 'checkbox',
  // A sequence's record value is the raw integer; `sequenceConfig`'s prefix
  // is display-only (see CollectionSequenceConfig) and never changes this.
  sequence: 'number',
  // Minimum viable shape per TRL-62 item B.4: a label/address string. lat/lng
  // is an explicit open question, deferred to a future spec.
  place: 'rich_text',
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
  if (rel.valueType === 'relation') {
    const link = fromRelationLinkConfig(parseRelationLinkConfig(rel.relation));
    return {
      name: rel.key,
      valueType: 'relation',
      description: rel.label,
      ...(link ? { relation: link } : {}),
    };
  }
  if (rel.valueType === 'schedule') {
    return {
      name: rel.key,
      valueType: 'json',
      description: rel.label,
    };
  }
  if (Object.prototype.hasOwnProperty.call(KERNEL_TYPE, rel.valueType)) {
    return {
      name: rel.key,
      valueType: KERNEL_TYPE[rel.valueType as keyof typeof KERNEL_TYPE],
      description: rel.label,
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
        if (row.valueType === 'relation') {
          const target = parseRelationTarget(row.relationTarget);
          // A malformed (but present) targetCollection must not crash the whole
          // collection's schema compile — degrade to the same shape a missing
          // target already gets, same as `collectionSchemaId` would otherwise throw.
          let relation: PropertyValueSpecification['relation'] = { cardinality: 'many' };
          if (target) {
            try {
              relation = { targetSchema: collectionSchemaId(target.targetCollection), cardinality: target.cardinality };
            } catch {
              relation = { cardinality: target.cardinality };
            }
          }
          return { name: row.key, valueType: 'relation', description: row.label, relation };
        }
        if (row.valueType === 'rollup') {
          const config = parseRollupConfig(row.rollupConfig);
          return {
            name: row.key,
            valueType: 'rollup',
            description: row.label,
            ...(config
              ? { rollup: { relationProperty: config.relationField, targetProperty: config.targetField, aggregation: config.aggregation } }
              : {}),
          };
        }
        if (row.valueType === 'formula') {
          return {
            name: row.key,
            valueType: 'formula',
            description: row.label,
            ...(row.formula ? { formula: row.formula } : {}),
          };
        }
        // schedule carries no field-level config; each record stores its own
        // JSON value (CollectionScheduleValue), so the row schema sees json.
        if (row.valueType === 'schedule') {
          return {
            name: row.key,
            valueType: 'json',
            description: row.label,
          };
        }
        return {
          name: row.key,
          valueType: KERNEL_TYPE[
            row.valueType as Exclude<
              CollectionFieldType,
              'tags' | 'relation' | 'rollup' | 'formula' | 'schedule'
            >
          ],
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
    f('relationTarget', 'rich_text'),
    f('rollupConfig', 'rich_text'),
    f('formula', 'rich_text'),
    f('sequenceConfig', 'rich_text'),
  ],
};

export const COLLECTION_SCHEMAS: SchemaDefinition[] = [
  COLLECTION_META_SCHEMA,
  COLLECTION_RECORD_SCHEMA,
  COLLECTION_FIELD_SCHEMA,
];

// ---------------------------------------------------------------------------
// Validating relation/rollup/formula field definitions (ADR 0045 Phase 2)
// ---------------------------------------------------------------------------

/** Field keys a `formula` directly reads (`$key` references; `scope: 'request'` refs are ignored — not a collection field). */
function formulaFieldRefs(node: ExprNode): string[] {
  switch (node.kind) {
    case 'field':
      return node.scope === 'record' ? [node.path[0]!] : [];
    case 'binop':
      return [...formulaFieldRefs(node.left), ...formulaFieldRefs(node.right)];
    case 'unary':
      return formulaFieldRefs(node.arg);
    case 'call':
      return node.args.flatMap(formulaFieldRefs);
    default:
      return [];
  }
}

/** True if following formula→formula field refs from `refs` ever reaches `startKey` again. */
function hasFormulaCycle(
  startKey: string,
  refs: readonly string[],
  fieldsByKey: ReadonlyMap<string, CollectionFieldRow>,
  visiting: Set<string>,
): boolean {
  for (const ref of refs) {
    if (ref === startKey) return true;
    const field = fieldsByKey.get(ref);
    if (!field || field.valueType !== 'formula' || !field.formula || visiting.has(ref)) continue;
    visiting.add(ref);
    let ast: ExprNode;
    try {
      ast = parseFormula(field.formula, 'kernel-fn');
    } catch {
      continue;
    }
    if (hasFormulaCycle(startKey, formulaFieldRefs(ast), fieldsByKey, visiting)) return true;
  }
  return false;
}

export interface CollectionFieldValidationContext {
  /** Every `CollectionField` row on this same collection (including the one being validated). */
  siblingFields: readonly CollectionFieldRow[];
  /** Every known `collectionMeta:<slug>` id, to check a `relation` field's target exists. */
  knownCollectionIds: ReadonlySet<string>;
}

/**
 * Validates one field definition against its collection's other fields and
 * known collections. Pure — this is the check ADR 0045 §5 names as needed
 * before collection writes are gated; wiring it into the live create/update
 * path is that separate, deferred work. Returns an error message, or `null`
 * when the field is valid.
 */
const ROLLUP_AGGREGATIONS: ReadonlySet<string> = new Set(['count', 'sum', 'avg', 'min', 'max', 'median', 'mode']);

export function validateCollectionField(
  row: CollectionFieldRow,
  ctx: CollectionFieldValidationContext,
): string | null {
  if (RESERVED_RECORD_KEYS.has(row.key)) {
    return `field "${row.key}": "${row.key}" is a reserved record attribute, not a declarable field`;
  }

  if (row.valueType === 'relation') {
    const target = parseRelationTarget(row.relationTarget);
    if (!target) return `field "${row.key}": relation field needs a target collection`;
    if (!ctx.knownCollectionIds.has(target.targetCollection)) {
      return `field "${row.key}": relation target "${target.targetCollection}" does not exist`;
    }
    return null;
  }

  if (row.valueType === 'rollup') {
    const config = parseRollupConfig(row.rollupConfig);
    if (!config) return `field "${row.key}": rollup field needs relationField, targetField, and aggregation`;
    const relationField = ctx.siblingFields.find(
      (f) => f.collection === row.collection && f.key === config.relationField,
    );
    if (!relationField || relationField.valueType !== 'relation') {
      return `field "${row.key}": rollup.relationField "${config.relationField}" is not a relation field on this collection`;
    }
    if (!ROLLUP_AGGREGATIONS.has(config.aggregation)) {
      return `field "${row.key}": rollup.aggregation "${config.aggregation}" is not a recognized aggregation`;
    }
    return null;
  }

  if (row.valueType === 'formula') {
    if (!row.formula?.trim()) return `field "${row.key}": formula field needs a formula`;
    let ast: ExprNode;
    try {
      ast = parseFormula(row.formula, 'kernel-fn');
    } catch (error) {
      return `field "${row.key}": formula does not parse — ${(error as Error).message}`;
    }
    const fieldsByKey = new Map(
      ctx.siblingFields.filter((f) => f.collection === row.collection).map((f) => [f.key, f] as const),
    );
    const refs = formulaFieldRefs(ast);
    for (const ref of refs) {
      if (RESERVED_RECORD_KEYS.has(ref)) continue;
      const sibling = fieldsByKey.get(ref);
      if (!sibling) return `field "${row.key}": formula references unknown field "${ref}"`;
      if (sibling.valueType === 'relation' || sibling.valueType === 'tags') {
        return `field "${row.key}": formula cannot reference relation field "${ref}" directly; use a rollup`;
      }
    }
    if (hasFormulaCycle(row.key, refs, fieldsByKey, new Set([row.key]))) {
      return `field "${row.key}": formula has a circular reference`;
    }
    return null;
  }

  // 'schedule' needs no field-level config check — it has none, by design
  // (see CollectionScheduleValue); it falls through to `return null` below,
  // same as date/select/checkbox. Its own *value* shape is validated by
  // parseScheduleValue, called by consumers against record data, never here.

  // 'sequence'/'place' also fall through: sequence's prefix is optional
  // (parseSequenceConfig always returns a value, never null) and place's
  // minimum shape is a plain string, same as text/date/checkbox.

  return null;
}

// ---------------------------------------------------------------------------
// Computing rollup/formula values at read time (ADR 0045 Phase 2)
// ---------------------------------------------------------------------------

/**
 * Computes `rollup` and `formula` field values for one `CollectionRecord`,
 * from its collection's `CollectionField` rows. Pure composition over the
 * kernel's existing `evaluateRollup` (`src/core/computation/rollup.ts`) and
 * formula engine (`src/formula/`) — no new computation engine. Rollups are
 * computed first, so a formula may read an already-computed rollup value.
 *
 * Returns a plain `{ fieldKey: value }` map; nothing is written back to the
 * store — the caller merges this into whatever it renders or returns.
 */
export function computeCollectionFieldValues(
  record: { id: string; collectionId: string; [key: string]: unknown },
  fields: readonly CollectionFieldRow[],
  store: EAVStore,
): Record<string, unknown> {
  const collectionFields = fields.filter((f) => f.collection === record.collectionId);
  const values: Record<string, unknown> = {};

  for (const field of collectionFields) {
    if (field.valueType !== 'rollup') continue;
    const config = parseRollupConfig(field.rollupConfig);
    if (!config) continue;
    const relationField = collectionFields.find(
      (f) => f.key === config.relationField && f.valueType === 'relation',
    );
    if (!relationField) continue;
    values[field.key] = evaluateRollup(
      { relationProperty: config.relationField, targetProperty: config.targetField, aggregation: config.aggregation },
      { store, entityId: record.id },
    );
  }

  const recordForFormulas: Record<string, unknown> = { ...record, ...values };
  for (const field of collectionFields) {
    if (field.valueType !== 'formula' || !field.formula) continue;
    try {
      values[field.key] = parseAndEvaluate(field.formula, 'kernel-fn', { record: recordForFormulas });
    } catch {
      values[field.key] = null;
    }
  }

  return values;
}
