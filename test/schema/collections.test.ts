/**
 * ADR 0045 phase 2: user-defined collections as kernel system types.
 */
import { describe, expect, it } from 'vitest';
import { CORE_ONTOLOGY } from '../../src/core/ontology/core-ontology.js';
import {
  COLLECTION_FIELD_SCHEMA,
  COLLECTION_META_SCHEMA,
  COLLECTION_RECORD_SCHEMA,
} from '../../src/core/ontology/collections.js';
import type { SchemaDefinition } from '../../src/core/ontology/types.js';
import {
  CollectionField,
  CollectionMeta,
  CollectionRecord,
  collectionMetaId,
  collectionSchemaId,
  collectionSlug,
  compileCollectionSchema,
  legacyOptionId,
  migrateCollectionOptions,
  migrateOptionValue,
  parseCollectionOptions,
  parseSequenceConfig,
  validateCollectionField,
  type CollectionFieldRow,
} from '../../src/schema/index.js';

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

describe('kernel system types', () => {
  it('ship in CORE_ONTOLOGY', () => {
    const ids = CORE_ONTOLOGY.map((schema) => schema['@id']);
    expect(ids).toEqual(
      expect.arrayContaining(['trellis:CollectionMeta', 'trellis:CollectionRecord', 'trellis:CollectionField']),
    );
    for (const schema of [COLLECTION_META_SCHEMA, COLLECTION_RECORD_SCHEMA, COLLECTION_FIELD_SCHEMA]) {
      expect(schema.tier).toBe('system');
    }
  });

  it('match the typed SDK handles exactly', () => {
    expect(shape(CollectionMeta.definition)).toEqual(shape(COLLECTION_META_SCHEMA));
    expect(shape(CollectionRecord.definition)).toEqual(shape(COLLECTION_RECORD_SCHEMA));
    expect(shape(CollectionField.definition)).toEqual(shape(COLLECTION_FIELD_SCHEMA));
  });

  it('do not reuse core:Collection, which stays a folder', () => {
    expect(CORE_ONTOLOGY.find((schema) => schema['@id'] === 'core:Collection')?.label).toBe('Collection');
    expect(COLLECTION_META_SCHEMA.label).not.toBe('Collection');
  });
});

describe('ids', () => {
  it('uses the exact prefix and schema suffix the middleware expects', () => {
    expect(collectionMetaId('books')).toBe('collectionMeta:books');
    expect(collectionMetaId('collectionMeta:books')).toBe('collectionMeta:books');
    expect(collectionSlug('collectionMeta:books')).toBe('books');
    expect(collectionSlug('collectionmeta:books')).toBeNull();
    expect(collectionSchemaId('collectionMeta:books')).toBe('trellis:user/collections/books/Record');
    expect(() => collectionSchemaId('books')).toThrow();
    expect(() => collectionMetaId('  ')).toThrow();
  });
});

describe('options', () => {
  it('keep only options with an id and a label', () => {
    expect(parseCollectionOptions(undefined)).toEqual([]);
    expect(parseCollectionOptions('nope')).toEqual([]);
    expect(parseCollectionOptions('[{"id":"o_1","label":"A","color":"#fff"},{"value":"x","label":"B"}]')).toEqual([
      { id: 'o_1', label: 'A', color: '#fff' },
    ]);
  });
});

describe('migrating legacy options', () => {
  it('mints stable ids from labels, so every client agrees and re-runs are no-ops', () => {
    expect(legacyOptionId('To read')).toBe(legacyOptionId('  to read '));
    expect(legacyOptionId('To read')).not.toBe(legacyOptionId('Reading'));
    expect(legacyOptionId('To read')).toMatch(/^o_[0-9a-z]{7}$/);
    const first = migrateCollectionOptions(['To read', 'Reading']);
    const again = migrateCollectionOptions(first.options);
    expect(again.options).toEqual(first.options);
  });

  it('accepts string[], {value,label,color}[] and current {id,label,color}[] (also as JSON)', () => {
    const fromStrings = migrateCollectionOptions(['A', 'B', 'A']);
    expect(fromStrings.options.map((o) => o.label)).toEqual(['A', 'B']);

    const fromValues = migrateCollectionOptions(
      JSON.stringify([{ value: 'todo', label: 'To do', color: '#f97316' }]),
    );
    expect(fromValues.options).toEqual([{ id: legacyOptionId('To do'), label: 'To do', color: '#f97316' }]);
    expect(fromValues.idFor('todo')).toBe(legacyOptionId('To do'));

    const current = migrateCollectionOptions([{ id: 'o_keep', label: 'Kept' }]);
    expect(current.options).toEqual([{ id: 'o_keep', label: 'Kept' }]);
    expect(current.idFor('o_keep')).toBe('o_keep');

    expect(migrateCollectionOptions('not json').options).toEqual([]);
    expect(migrateCollectionOptions(undefined).options).toEqual([]);
  });

  it('rewrites stored values to ids, leaving unknown values intact', () => {
    const { idFor } = migrateCollectionOptions(['bug', 'feature']);
    expect(migrateOptionValue('bug', idFor)).toBe(legacyOptionId('bug'));
    expect(migrateOptionValue(['feature', 'mystery'], idFor)).toEqual([legacyOptionId('feature'), 'mystery']);
    expect(migrateOptionValue(42, idFor)).toBe(42);
    // Already migrated values stay put.
    expect(migrateOptionValue(legacyOptionId('bug'), idFor)).toBe(legacyOptionId('bug'));
  });
});

describe('compileCollectionSchema', () => {
  const books = { id: 'collectionMeta:books', title: 'Books' };
  const row = (overrides: Partial<CollectionFieldRow>): CollectionFieldRow => ({
    collection: books.id,
    key: 'f_x',
    label: 'X',
    valueType: 'text',
    order: 1,
    ...overrides,
  });

  it('extends the row schema with this collection’s fields, in order', () => {
    const schema = compileCollectionSchema(books, [
      row({ key: 'f_b', label: 'Status', valueType: 'select', order: 2 }),
      row({ key: 'f_a', label: 'Pages', valueType: 'number', order: 1 }),
      row({ key: 'f_c', label: 'Read', valueType: 'checkbox', order: 3 }),
      row({ key: 'f_d', label: 'Tags', valueType: 'multi_select', order: 4 }),
      row({ key: 'f_e', label: 'Finished', valueType: 'date', order: 5 }),
      row({ key: 'f_f', label: 'Notes', valueType: 'text', order: 6 }),
      row({ key: 'f_other', collection: 'collectionMeta:films' }),
      row({ key: 'f_bogus', valueType: 'not_a_real_value_type' }),
      row({ key: 'title', label: 'Shadowing title' }),
    ]);
    expect(schema['@id']).toBe('trellis:user/collections/books/Record');
    expect(schema.subClassOf).toBe('trellis:CollectionRecord');
    expect(schema.label).toBe('Books records');
    expect(schema.fields.map((field) => [field.name, field.valueType])).toEqual([
      ['collectionId', 'rich_text'],
      ['title', 'title'],
      ['body', 'rich_text'],
      ['sortOrder', 'number'],
      ['f_a', 'number'],
      ['f_b', 'select'],
      ['f_c', 'checkbox'],
      ['f_d', 'multi_select'],
      ['f_e', 'date'],
      ['f_f', 'rich_text'],
    ]);
    expect(schema.fields.find((field) => field.name === 'f_a')?.description).toBe('Pages');
    // Tags fields are relations to core:Tag, not options.
    const tagged = compileCollectionSchema(books, [
      row({ key: 'f_t', label: 'Topics', valueType: 'tags', vocabulary: 'tag:vocab.workspace' }),
    ]).fields.find((field) => field.name === 'f_t');
    expect(tagged).toMatchObject({
      valueType: 'relation',
      description: 'Topics',
      relation: { targetSchema: 'core:Tag', cardinality: 'many' },
    });
    // Option membership is not enforced (the add-and-select race).
    expect(schema.fields.find((field) => field.name === 'f_b')?.selectOptions).toBeUndefined();
  });

  it('compiles relation, rollup, and formula fields', () => {
    const authors = { id: 'collectionMeta:authors', title: 'Authors' };
    const schema = compileCollectionSchema(authors, [
      row({
        key: 'f_rel',
        label: 'Books',
        valueType: 'relation',
        relationTarget: JSON.stringify({ targetCollection: books.id, cardinality: 'many' }),
        collection: authors.id,
      }),
      row({
        key: 'f_roll',
        label: 'Total pages',
        valueType: 'rollup',
        rollupConfig: JSON.stringify({ relationField: 'f_rel', targetField: 'pages', aggregation: 'sum' }),
        collection: authors.id,
      }),
      row({
        key: 'f_formula',
        label: 'Summary',
        valueType: 'formula',
        formula: '$add($f_roll, 1)',
        collection: authors.id,
      }),
    ]);

    expect(schema.fields.find((f) => f.name === 'f_rel')).toMatchObject({
      valueType: 'relation',
      relation: { targetSchema: 'trellis:user/collections/books/Record', cardinality: 'many' },
    });
    expect(schema.fields.find((f) => f.name === 'f_roll')).toMatchObject({
      valueType: 'rollup',
      rollup: { relationProperty: 'f_rel', targetProperty: 'pages', aggregation: 'sum' },
    });
    expect(schema.fields.find((f) => f.name === 'f_formula')).toMatchObject({
      valueType: 'formula',
      formula: '$add($f_roll, 1)',
    });
  });

  it('compiles sequence and place fields (TRL-64)', () => {
    const tickets = { id: 'collectionMeta:tickets', title: 'Tickets' };
    const schema = compileCollectionSchema(tickets, [
      row({
        key: 'f_seq',
        label: 'Ticket #',
        valueType: 'sequence',
        sequenceConfig: JSON.stringify({ prefix: 'TICKET' }),
        collection: tickets.id,
      }),
      row({
        key: 'f_place',
        label: 'Location',
        valueType: 'place',
        collection: tickets.id,
      }),
    ]);

    // Record value is a plain number; the prefix is display-only, so it
    // never changes the compiled PropertyType.
    expect(schema.fields.find((f) => f.name === 'f_seq')).toMatchObject({ valueType: 'number', description: 'Ticket #' });
    // Minimum viable shape per TRL-62 item B.4: a plain string.
    expect(schema.fields.find((f) => f.name === 'f_place')).toMatchObject({ valueType: 'rich_text', description: 'Location' });
  });

  it('degrades a malformed relation target instead of throwing', () => {
    expect(() =>
      compileCollectionSchema(books, [
        row({
          key: 'f_bad_rel',
          valueType: 'relation',
          relationTarget: JSON.stringify({ targetCollection: 'not-a-valid-id', cardinality: 'one' }),
        }),
      ]),
    ).not.toThrow();
    const field = compileCollectionSchema(books, [
      row({
        key: 'f_bad_rel',
        valueType: 'relation',
        relationTarget: JSON.stringify({ targetCollection: 'not-a-valid-id', cardinality: 'one' }),
      }),
    ]).fields.find((f) => f.name === 'f_bad_rel');
    expect(field).toMatchObject({ valueType: 'relation', relation: { cardinality: 'one' } });
    expect(field?.relation).not.toHaveProperty('targetSchema');
  });
});

describe('validateCollectionField', () => {
  const COLLECTION = 'collectionMeta:authors';
  const row = (overrides: Partial<CollectionFieldRow>): CollectionFieldRow => ({
    collection: COLLECTION,
    key: 'f_x',
    label: 'X',
    valueType: 'text',
    order: 1,
    ...overrides,
  });

  it('rejects a relation field whose target collection does not exist', () => {
    const field = row({
      key: 'f_rel',
      valueType: 'relation',
      relationTarget: JSON.stringify({ targetCollection: 'collectionMeta:ghost', cardinality: 'many' }),
    });
    expect(
      validateCollectionField(field, { siblingFields: [field], knownCollectionIds: new Set(['collectionMeta:books']) }),
    ).toMatch(/does not exist/);
  });

  it('accepts a relation field whose target collection exists', () => {
    const field = row({
      key: 'f_rel',
      valueType: 'relation',
      relationTarget: JSON.stringify({ targetCollection: 'collectionMeta:books', cardinality: 'many' }),
    });
    expect(
      validateCollectionField(field, { siblingFields: [field], knownCollectionIds: new Set(['collectionMeta:books']) }),
    ).toBeNull();
  });

  it('rejects a rollup field whose relationField is not a relation field on the same collection', () => {
    const rollup = row({
      key: 'f_roll',
      valueType: 'rollup',
      rollupConfig: JSON.stringify({ relationField: 'f_text', targetField: 'pages', aggregation: 'sum' }),
    });
    const text = row({ key: 'f_text', valueType: 'text' });
    expect(
      validateCollectionField(rollup, { siblingFields: [rollup, text], knownCollectionIds: new Set() }),
    ).toMatch(/not a relation field/);
  });

  it('accepts a rollup field pointing at a sibling relation field', () => {
    const relation = row({
      key: 'f_rel',
      valueType: 'relation',
      relationTarget: JSON.stringify({ targetCollection: 'collectionMeta:books', cardinality: 'many' }),
    });
    const rollup = row({
      key: 'f_roll',
      valueType: 'rollup',
      rollupConfig: JSON.stringify({ relationField: 'f_rel', targetField: 'pages', aggregation: 'sum' }),
    });
    expect(
      validateCollectionField(rollup, {
        siblingFields: [relation, rollup],
        knownCollectionIds: new Set(['collectionMeta:books']),
      }),
    ).toBeNull();
  });

  it('rejects a formula that does not parse', () => {
    const formula = row({ key: 'f_formula', valueType: 'formula', formula: '@@@ not an expression' });
    expect(
      validateCollectionField(formula, { siblingFields: [formula], knownCollectionIds: new Set() }),
    ).toMatch(/does not parse/);
  });

  it('rejects a formula referencing an unknown sibling field', () => {
    const formula = row({ key: 'f_formula', valueType: 'formula', formula: '$add($f_missing, 1)' });
    expect(
      validateCollectionField(formula, { siblingFields: [formula], knownCollectionIds: new Set() }),
    ).toMatch(/unknown field/);
  });

  it('rejects a formula referencing a relation field directly', () => {
    const relation = row({
      key: 'f_rel',
      valueType: 'relation',
      relationTarget: JSON.stringify({ targetCollection: 'collectionMeta:books', cardinality: 'many' }),
    });
    const formula = row({ key: 'f_formula', valueType: 'formula', formula: '$add($f_rel, 1)' });
    expect(
      validateCollectionField(formula, {
        siblingFields: [relation, formula],
        knownCollectionIds: new Set(['collectionMeta:books']),
      }),
    ).toMatch(/use a rollup/);
  });

  it('accepts a formula referencing a rollup field', () => {
    const rollup = row({ key: 'f_roll', valueType: 'rollup', rollupConfig: JSON.stringify({ relationField: 'f_rel', targetField: 'pages', aggregation: 'sum' }) });
    const formula = row({ key: 'f_formula', valueType: 'formula', formula: '$add($f_roll, 1)' });
    expect(
      validateCollectionField(formula, { siblingFields: [rollup, formula], knownCollectionIds: new Set() }),
    ).toBeNull();
  });

  it('rejects a rollup field with an unrecognized aggregation', () => {
    const relation = row({
      key: 'f_rel',
      valueType: 'relation',
      relationTarget: JSON.stringify({ targetCollection: 'collectionMeta:books', cardinality: 'many' }),
    });
    const rollup = row({
      key: 'f_roll',
      valueType: 'rollup',
      rollupConfig: JSON.stringify({ relationField: 'f_rel', targetField: 'pages', aggregation: 'bogus' }),
    });
    expect(
      validateCollectionField(rollup, {
        siblingFields: [relation, rollup],
        knownCollectionIds: new Set(['collectionMeta:books']),
      }),
    ).toMatch(/not a recognized aggregation/);
  });

  it('rejects a formula cycle through another formula field', () => {
    const a = row({ key: 'f_a', valueType: 'formula', formula: '$add($f_b, 1)' });
    const b = row({ key: 'f_b', valueType: 'formula', formula: '$add($f_a, 1)' });
    expect(
      validateCollectionField(a, { siblingFields: [a, b], knownCollectionIds: new Set() }),
    ).toMatch(/circular/);
  });

  it('accepts sequence and place fields with no required config (TRL-64)', () => {
    const seq = row({ key: 'f_seq', valueType: 'sequence', sequenceConfig: JSON.stringify({ prefix: 'TICKET' }) });
    expect(validateCollectionField(seq, { siblingFields: [seq], knownCollectionIds: new Set() })).toBeNull();
    // Even with no sequenceConfig at all — a sequence is valid bare.
    const bareSeq = row({ key: 'f_seq', valueType: 'sequence' });
    expect(validateCollectionField(bareSeq, { siblingFields: [bareSeq], knownCollectionIds: new Set() })).toBeNull();
    const place = row({ key: 'f_place', valueType: 'place' });
    expect(validateCollectionField(place, { siblingFields: [place], knownCollectionIds: new Set() })).toBeNull();
  });
});

describe('parseSequenceConfig', () => {
  it('defaults to an empty prefix when missing or malformed', () => {
    expect(parseSequenceConfig(undefined)).toEqual({ prefix: '' });
    expect(parseSequenceConfig('not json')).toEqual({ prefix: '' });
    expect(parseSequenceConfig(JSON.stringify({ prefix: 42 }))).toEqual({ prefix: '' });
  });

  it('reads a configured prefix', () => {
    expect(parseSequenceConfig(JSON.stringify({ prefix: 'TICKET' }))).toEqual({ prefix: 'TICKET' });
  });
});
