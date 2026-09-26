/**
 * Typed handles for user-defined collections (ADR 0045), for SDK use:
 *
 *   import { CollectionRecord, compileCollectionSchema } from 'trellis/schema';
 *   entitiesStore(client, CollectionRecord, { where: { collectionId } });
 *
 * The kernel ships the same schemas (system tier, `core/ontology/collections.ts`);
 * `test/schema/collections.test.ts` keeps the two identical.
 */
import { z } from 'zod';
import { COLLECTION_FIELD_TYPES } from '../core/ontology/collections.js';
import { defineType } from './define.js';

export const CollectionMeta = defineType(
  'CollectionMeta',
  {
    title: z.string(),
    slug: z.string(),
    icon: z.string().optional(),
    color: z.string().optional(),
    description: z.string().optional(),
    sortOrder: z.number().optional(),
  },
  { title: 'title', extends: 'core:Record', tier: 'system', label: 'User Collection' },
);

export const CollectionRecord = defineType(
  'CollectionRecord',
  {
    collectionId: z.string(),
    title: z.string(),
    body: z.string().optional(),
    sortOrder: z.number().optional(),
  },
  { title: 'title', extends: 'core:Record', tier: 'system', label: 'Collection Record' },
);

export const CollectionField = defineType(
  'CollectionField',
  {
    collection: z.string(),
    key: z.string(),
    label: z.string(),
    valueType: z.enum(COLLECTION_FIELD_TYPES),
    options: z.string().optional(),
    order: z.number(),
  },
  { title: 'label', extends: 'core:Thing', tier: 'system', label: 'Collection Field' },
);

export {
  COLLECTION_FIELD_TYPES,
  COLLECTION_META_PREFIX,
  RESERVED_RECORD_KEYS,
  collectionMetaId,
  collectionSchemaId,
  collectionSlug,
  compileCollectionSchema,
  isCollectionFieldType,
  parseCollectionOptions,
} from '../core/ontology/collections.js';
export type {
  CollectionFieldRow,
  CollectionFieldType,
  CollectionOption,
} from '../core/ontology/collections.js';
