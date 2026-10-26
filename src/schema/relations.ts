/**
 * Typed handle and helpers for global `trellis:Relation` properties (ADR 0048 phase 3).
 *
 * The kernel ships the same system-tier schema in `core/ontology/relations.ts`;
 * `test/schema/relations.test.ts` keeps the two identical.
 */
import { z } from 'zod';
import { RELATION_VALUE_TYPES } from '../core/ontology/relations.js';
import { defineType } from './define.js';

export const Relation = defineType(
  'Relation',
  {
    key: z.string(),
    label: z.string(),
    valueType: z.enum(RELATION_VALUE_TYPES),
    options: z.string().optional(),
    vocabulary: z.string().optional(),
    description: z.string().optional(),
    owner: z.string().optional(),
    readOnly: z.boolean().optional(),
    relation: z.string().optional(),
  },
  { title: 'label', extends: 'core:Thing', tier: 'system', label: 'Relation' },
);

export const RelationEntity = Relation;

export {
  RELATION_PREFIX,
  RELATION_SCHEMA,
  RELATION_VALUE_TYPES,
  applyCollectionRelationMigration,
  deriveCodeRelations,
  fromRelationLinkConfig,
  isRelationValueType,
  listRelations,
  migrateCollectionFieldsToRelations,
  parseRelationIds,
  parseRelationLinkConfig,
  readRelationsFromStore,
  relationId,
  relationRowFromFacts,
  toRelationLinkConfig,
  userRelationId,
} from '../core/ontology/relations.js';
export type {
  AppliedCollectionRelationMigration,
  ApplyCollectionRelationMigrationTarget,
  CollectionFieldMigrationResult,
  ListRelationsOptions,
  RelationCardinality,
  RelationLinkConfig,
  RelationRow,
  RelationValueType,
  SchemaWithOptionalApp,
} from '../core/ontology/relations.js';
