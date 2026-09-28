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
      row({ key: 'f_bogus', valueType: 'formula' }),
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
    // Option membership is not enforced (the add-and-select race).
    expect(schema.fields.find((field) => field.name === 'f_b')?.selectOptions).toBeUndefined();
  });
});
