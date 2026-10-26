/**
 * ADR 0048 phase 3 (TRL-494): global `trellis:Relation` properties,
 * relation-backed collections with `CollectionField` fallback, idempotent
 * migration, and derived read-only code relations.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { CORE_ONTOLOGY } from '../../src/core/ontology/core-ontology.js';
import {
  RELATION_SCHEMA,
  applyCollectionRelationMigration,
  deriveCodeRelations,
  fromRelationLinkConfig,
  listRelations,
  migrateCollectionFieldsToRelations,
  parseRelationIds,
  parseRelationLinkConfig,
  readRelationsFromStore,
  relationId,
  toRelationLinkConfig,
  userRelationId,
  type CollectionFieldRow,
  type RelationRow,
} from '../../src/core/ontology/index.js';
import type { SchemaDefinition } from '../../src/core/ontology/types.js';
import type { KernelBackend, KernelOp } from '../../src/core/persist/backend.js';
import { TrellisKernel } from '../../src/core/kernel/trellis-kernel.js';
import { attachStandardMiddleware } from '../../src/core/kernel/boot-middleware.js';
import {
  Relation,
  RelationEntity,
  compileCollectionSchema,
  defineType,
  legacyOptionId,
  rel,
} from '../../src/schema/index.js';

function createMemoryKernel(): TrellisKernel {
  const ops: KernelOp[] = [];
  const backend: KernelBackend = {
    init() {},
    append(op) {
      ops.push(op);
    },
    readAll() {
      return [...ops];
    },
    readUntil() {
      return [...ops];
    },
    readAfter() {
      return [];
    },
    readUntilTimestamp() {
      return [...ops];
    },
    getByHash(hash) {
      return ops.find((o) => o.hash === hash);
    },
    getLastOp() {
      return ops[ops.length - 1];
    },
    saveSnapshot() {},
    loadLatestSnapshot() {
      return undefined;
    },
    close() {},
  };
  const kernel = new TrellisKernel({
    backend,
    agentId: 'test-agent',
    snapshotThreshold: 0,
  });
  kernel.boot();
  return kernel;
}

function shape(schema: SchemaDefinition) {
  return {
    id: schema['@id'],
    tier: schema.tier,
    subClassOf: schema.subClassOf,
    label: schema.label,
    fields: schema.fields.map((field) => ({
      name: field.name,
      valueType: field.valueType,
      required: Boolean(field.required),
      selectOptions: field.selectOptions,
    })),
  };
}

describe('trellis:Relation system schema', () => {
  it('ships in CORE_ONTOLOGY at system tier and matches the typed SDK handle', () => {
    const inCore = CORE_ONTOLOGY.find((s) => s['@id'] === 'trellis:Relation');
    expect(inCore).toBeDefined();
    expect(inCore?.tier).toBe('system');
    expect(inCore?.subClassOf).toBe('core:Thing');
    expect(shape(Relation.definition)).toEqual(shape(RELATION_SCHEMA));
    expect(RelationEntity).toBe(Relation);
  });

  it('mints stable per-type and user relation ids', () => {
    expect(relationId('projects', 'Task', 'status')).toBe('rel:projects.Task.status');
    expect(relationId('  projects ', ' Task ', ' dueDate ')).toBe('rel:projects.Task.dueDate');
    expect(userRelationId('collectionMeta:books', 'pages')).toBe('rel:user.books.pages');
    expect(userRelationId('books', 'pages')).toBe('rel:user.books.pages');
    expect(() => relationId('', 'Task', 'status')).toThrow(/app/);
    expect(() => relationId('projects', ' ', 'status')).toThrow(/type/);
    expect(() => relationId('projects', 'Task', '')).toThrow(/key/);
  });

  it('round-trips RelationConfig to core.json RelationLinkConfig', () => {
    const link = toRelationLinkConfig({
      targetSchema: 'core:Person',
      cardinality: 'one',
      syncedProperty: 'assignedTasks',
    });
    expect(link).toEqual({
      targetEntityTypes: ['core:Person'],
      cardinality: 'many_to_one',
      inverseProperty: 'assignedTasks',
    });
    const parsed = parseRelationLinkConfig(JSON.stringify(link));
    expect(parsed).toEqual(link);
    expect(fromRelationLinkConfig(parsed)).toEqual({
      targetSchema: 'core:Person',
      cardinality: 'one',
      syncedProperty: 'assignedTasks',
    });
  });
});

describe('migrateCollectionFieldsToRelations and compile parity', () => {
  const books = { id: 'collectionMeta:books', title: 'Books' };
  const fieldRows: CollectionFieldRow[] = [
    {
      collection: books.id,
      key: 'f_status',
      label: 'Status',
      valueType: 'select',
      options: JSON.stringify(['To read', 'Reading', 'Done']),
      order: 2,
    },
    {
      collection: books.id,
      key: 'f_pages',
      label: 'Pages',
      valueType: 'number',
      order: 1,
    },
    {
      collection: books.id,
      key: 'f_read',
      label: 'Read',
      valueType: 'checkbox',
      order: 3,
    },
    {
      collection: books.id,
      key: 'f_formats',
      label: 'Formats',
      valueType: 'multi_select',
      options: JSON.stringify([{ id: 'o_print', label: 'Print' }]),
      order: 4,
    },
    {
      collection: books.id,
      key: 'f_finished',
      label: 'Finished',
      valueType: 'date',
      order: 5,
    },
    {
      collection: books.id,
      key: 'f_notes',
      label: 'Notes',
      valueType: 'text',
      order: 6,
    },
    {
      collection: books.id,
      key: 'f_topics',
      label: 'Topics',
      valueType: 'tags',
      vocabulary: 'tag:vocab.workspace',
      order: 7,
    },
    // Ignored noise: other collection, unsupported type, reserved key
    {
      collection: 'collectionMeta:films',
      key: 'f_director',
      label: 'Director',
      valueType: 'text',
      order: 1,
    },
    {
      collection: books.id,
      key: 'f_formula',
      label: 'Invalid',
      valueType: 'formula',
      order: 8,
    },
    {
      collection: books.id,
      key: 'title',
      label: 'Shadow title',
      valueType: 'text',
      order: 0,
    },
  ];

  it('is deterministic and idempotent across repeated runs', () => {
    const first = migrateCollectionFieldsToRelations(books, fieldRows);
    expect(first.relationIds).toEqual([
      'rel:user.books.f_pages',
      'rel:user.books.f_status',
      'rel:user.books.f_read',
      'rel:user.books.f_formats',
      'rel:user.books.f_finished',
      'rel:user.books.f_notes',
      'rel:user.books.f_topics',
    ]);
    expect(parseRelationIds(first.relationsJson)).toEqual(first.relationIds);

    // Legacy string options are normalized to stable option ids on migration
    const statusRel = first.relations.find((r) => r.key === 'f_status');
    expect(statusRel?.options).toBe(
      JSON.stringify([
        { id: legacyOptionId('To read'), label: 'To read' },
        { id: legacyOptionId('Reading'), label: 'Reading' },
        { id: legacyOptionId('Done'), label: 'Done' },
      ]),
    );

    // Tags relation carries both vocabulary and core.json RelationLinkConfig
    const topicsRel = first.relations.find((r) => r.key === 'f_topics');
    expect(topicsRel?.vocabulary).toBe('tag:vocab.workspace');
    expect(parseRelationLinkConfig(topicsRel?.relation)).toEqual({
      targetEntityTypes: ['core:Tag'],
      cardinality: 'many_to_many',
    });

    // Re-running with `meta.relations` already set returns identical output
    const second = migrateCollectionFieldsToRelations(
      { ...books, relations: first.relationsJson },
      fieldRows,
    );
    expect(second).toEqual(first);
  });

  it('compiles an identical SchemaDefinition from CollectionField rows and from Relation rows', () => {
    const migrated = migrateCollectionFieldsToRelations(books, fieldRows);
    const fromFields = compileCollectionSchema(books, fieldRows);
    const fromRelationsExplicit = compileCollectionSchema(
      { ...books, relations: migrated.relationsJson },
      [],
      migrated.relations,
    );
    const fromRelationsTwoArg = compileCollectionSchema(
      { ...books, relations: migrated.relationIds },
      migrated.relations,
    );

    expect(fromRelationsExplicit).toEqual(fromFields);
    expect(fromRelationsTwoArg).toEqual(fromFields);

    // Falls back to CollectionField rows when CollectionMeta.relations is absent
    const fallback = compileCollectionSchema(books, fieldRows, migrated.relations);
    expect(fallback).toEqual(fromFields);
  });

  it('emits migration ops once and 0 ops on subsequent runs against TrellisKernel', async () => {
    const kernel = createMemoryKernel();
    attachStandardMiddleware(kernel);

    await kernel.mutate('addFacts', {
      facts: [
        { e: books.id, a: 'type', v: 'CollectionMeta' },
        { e: books.id, a: 'title', v: 'Books' },
        { e: books.id, a: 'slug', v: 'books' },
        { e: 'field:1', a: 'type', v: 'CollectionField' },
        { e: 'field:1', a: 'collection', v: books.id },
        { e: 'field:1', a: 'key', v: 'f_pages' },
        { e: 'field:1', a: 'label', v: 'Pages' },
        { e: 'field:1', a: 'valueType', v: 'number' },
        { e: 'field:1', a: 'order', v: 1 },
        { e: 'field:2', a: 'type', v: 'CollectionField' },
        { e: 'field:2', a: 'collection', v: books.id },
        { e: 'field:2', a: 'key', v: 'f_topics' },
        { e: 'field:2', a: 'label', v: 'Topics' },
        { e: 'field:2', a: 'valueType', v: 'tags' },
        { e: 'field:2', a: 'vocabulary', v: 'tag:vocab' },
        { e: 'field:2', a: 'order', v: 2 },
      ],
      provenance: { actorType: 'user', origin: 'sdk' },
    });

    const opsBefore = kernel.readAllOps().length;
    const firstRun = await applyCollectionRelationMigration(kernel, books.id);
    expect(firstRun.opsApplied).toBe(1);
    expect(kernel.readAllOps().length).toBe(opsBefore + 1);

    const storedRelations = readRelationsFromStore(kernel.getStore());
    expect(storedRelations.map((r) => r.id)).toEqual([
      'rel:user.books.f_pages',
      'rel:user.books.f_topics',
    ]);

    const secondRun = await applyCollectionRelationMigration(kernel, books.id);
    expect(secondRun.opsApplied).toBe(0);
    expect(kernel.readAllOps().length).toBe(opsBefore + 1);
  });
});

describe('deriveCodeRelations and listRelations', () => {
  const Person = defineType(
    'Person',
    {
      name: z.string(),
    },
    { title: 'name', tier: 'core' },
  );

  const Task = defineType(
    'Task',
    {
      title: z.string(),
      status: z.enum(['todo', 'doing', 'done']),
      estimate: z.number().optional(),
    },
    {
      title: 'title',
      relations: {
        assignee: rel(() => Person, 'one'),
      },
    },
  );

  it('derives stable, read-only Relation rows from code schemas without persisting to the op log', () => {
    const kernel = createMemoryKernel();
    const opsBefore = kernel.readAllOps().length;

    const derived = deriveCodeRelations(Task, 'projects');
    expect(derived.map((r) => r.id)).toEqual([
      'rel:projects.Task.title',
      'rel:projects.Task.status',
      'rel:projects.Task.estimate',
      'rel:projects.Task.assignee',
    ]);
    for (const row of derived) {
      expect(row.owner).toBe('app:projects');
      expect(row.readOnly).toBe(true);
    }

    // Project.status and Task.status remain distinct by default (ADR 0048 §2.4)
    const Project = defineType('Project', { status: z.enum(['active', 'archived']) });
    const projectStatus = deriveCodeRelations(Project, 'projects')[0];
    const taskStatus = derived.find((r) => r.key === 'status')!;
    expect(projectStatus.id).toBe('rel:projects.Project.status');
    expect(taskStatus.id).toBe('rel:projects.Task.status');
    expect(projectStatus.id).not.toBe(taskStatus.id);

    // Link field carries core.json RelationLinkConfig
    const assignee = derived.find((r) => r.key === 'assignee')!;
    expect(parseRelationLinkConfig(assignee.relation)).toEqual({
      targetEntityTypes: ['Person'],
      cardinality: 'many_to_one',
    });

    // Merging persisted user relations with derived code relations keeps store untouched
    const userRel: RelationRow = {
      id: 'rel:user.books.f_pages',
      key: 'f_pages',
      label: 'Pages',
      valueType: 'number',
      owner: 'user',
      readOnly: false,
    };
    const merged = listRelations({
      store: kernel.getStore(),
      persisted: [userRel],
      schemas: [{ schema: Task, app: 'projects' }, Person.definition],
    });
    expect(merged.map((r) => r.id)).toEqual([
      'rel:user.books.f_pages',
      'rel:projects.Task.title',
      'rel:projects.Task.status',
      'rel:projects.Task.estimate',
      'rel:projects.Task.assignee',
      'rel:trellis.Person.name',
    ]);
    expect(kernel.readAllOps().length).toBe(opsBefore);
    expect(readRelationsFromStore(kernel.getStore())).toEqual([]);
  });
});
