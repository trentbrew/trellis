/**
 * ADR 0045 Phase 2: `computeCollectionFieldValues` — rollup/formula values for
 * a `CollectionRecord`, computed directly against the store (no TQL needed).
 */
import { describe, expect, it } from 'vitest';
import { EAVStore } from '../../src/core/store/eav-store.js';
import { computeCollectionFieldValues, type CollectionFieldRow } from '../../src/schema/index.js';

const COLLECTION = 'collectionMeta:authors';

function field(overrides: Partial<CollectionFieldRow>): CollectionFieldRow {
  return { collection: COLLECTION, key: 'f_x', label: 'X', valueType: 'text', order: 1, ...overrides };
}

describe('computeCollectionFieldValues', () => {
  function seedStore(): EAVStore {
    const store = new EAVStore();
    store.addFacts([
      { e: 'author:1', a: 'type', v: 'CollectionRecord' },
      { e: 'author:1', a: 'collectionId', v: COLLECTION },
      // Relation field value: a plain multi-valued fact (ADR 0045 write shape).
      { e: 'author:1', a: 'books', v: ['book:1', 'book:2'] as unknown as string },
      { e: 'book:1', a: 'pages', v: 100 },
      { e: 'book:2', a: 'pages', v: 150 },
    ]);
    return store;
  }

  it('computes a rollup over a sibling relation field', () => {
    const store = seedStore();
    const fields = [
      field({ key: 'books', valueType: 'relation', relationTarget: JSON.stringify({ targetCollection: 'collectionMeta:books', cardinality: 'many' }) }),
      field({ key: 'totalPages', valueType: 'rollup', rollupConfig: JSON.stringify({ relationField: 'books', targetField: 'pages', aggregation: 'sum' }) }),
    ];
    const values = computeCollectionFieldValues({ id: 'author:1', collectionId: COLLECTION }, fields, store);
    expect(values).toEqual({ totalPages: 250 });
  });

  it('computes a formula that reads an already-computed rollup', () => {
    const store = seedStore();
    const fields = [
      field({ key: 'books', valueType: 'relation', relationTarget: JSON.stringify({ targetCollection: 'collectionMeta:books', cardinality: 'many' }) }),
      field({ key: 'totalPages', valueType: 'rollup', rollupConfig: JSON.stringify({ relationField: 'books', targetField: 'pages', aggregation: 'sum' }) }),
      field({ key: 'summary', valueType: 'formula', formula: '$add($totalPages, 1)' }),
    ];
    const values = computeCollectionFieldValues({ id: 'author:1', collectionId: COLLECTION }, fields, store);
    expect(values).toEqual({ totalPages: 250, summary: 251 });
  });

  it('computes a formula over a plain stored field, no rollup involved', () => {
    const store = new EAVStore();
    store.addFacts([
      { e: 'book:3', a: 'type', v: 'CollectionRecord' },
      { e: 'book:3', a: 'collectionId', v: 'collectionMeta:books' },
      { e: 'book:3', a: 'pages', v: 400 },
    ]);
    const fields = [
      field({ collection: 'collectionMeta:books', key: 'pages', valueType: 'number' }),
      field({ collection: 'collectionMeta:books', key: 'double', valueType: 'formula', formula: '$mul($pages, 2)' }),
    ];
    const values = computeCollectionFieldValues({ id: 'book:3', collectionId: 'collectionMeta:books', pages: 400 }, fields, store);
    expect(values).toEqual({ double: 800 });
  });

  it('ignores fields belonging to a different collection', () => {
    const store = seedStore();
    const fields = [
      field({ collection: 'collectionMeta:other', key: 'f_unrelated', valueType: 'rollup', rollupConfig: JSON.stringify({ relationField: 'books', targetField: 'pages', aggregation: 'sum' }) }),
    ];
    const values = computeCollectionFieldValues({ id: 'author:1', collectionId: COLLECTION }, fields, store);
    expect(values).toEqual({});
  });

  it('returns null for a formula that fails to evaluate rather than throwing', () => {
    const store = seedStore();
    const fields = [field({ key: 'bad', valueType: 'formula', formula: '$unknownFn($totalPages)' })];
    const values = computeCollectionFieldValues({ id: 'author:1', collectionId: COLLECTION }, fields, store);
    expect(values).toEqual({ bad: null });
  });
});
