/**
 * Ontology Module — Public API Surface
 *
 * @module trellis/core/ontology
 */

// Types (expanded with 18 property types and tiered mutability)
export type {
  PropertyType,
  OntologyTier,
  FieldSyncTier,
  PropertyValueSpecification,
  RelationConfig,
  RollupConfig,
  AiGeneratedConfig,
  EntityClass,
  SchemaDefinition,
  ProjectionDefinition,
  RouteDefinition,
  WorkspaceConfig,
  AttrType,
  AttributeDef,
  RelationDef,
  EntityDef,
  OntologySchema,
  ValidationError,
  ValidationResult,
} from './types.js';

export {
  effectiveFieldSync,
  filterDurableAttributes,
  findSchemaForType,
  RealtimeFieldError,
  EntityConflictError,
} from './sync-policy.js';

// Re-export Atom for convenience
export type { Atom } from '../store/eav-store.js';

// Core ontology (immutable built-in schemas)
export { CORE_ONTOLOGY, CORE_VERSION, integrationEntityId, KNOWN_INTEGRATION_PROVIDERS } from './core-ontology.js';

// Registry
export { OntologyRegistry } from './registry.js';

// Built-in ontologies
export {
  teamOntology,
  agentOntology,
  builtinOntologies,
} from './builtins.js';

// Validation
export {
  validateEntity,
  validateStore,
  createValidationMiddleware,
} from './validator.js';

// Global relations (ADR 0048 phase 3)
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
} from './relations.js';
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
} from './relations.js';
