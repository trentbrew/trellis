import { describe, expect, it } from 'vitest';
import { EAVStore, type Fact } from '../../src/core/store/eav-store.js';

/** Facts the way the kernel writes them: one per attribute, arrays kept whole. */
function entity(id: string, type: string, attrs: Record<string, unknown>): Fact[] {
  return [
    { e: id, a: 'type', v: type },
    ...Object.entries(attrs).map(([a, v]) => ({ e: id, a, v: v as any })),
  ];
}

const shapeOf = (store: EAVStore, type: string | undefined, attribute: string) =>
  store.describeAttributes(type).find((shape) => shape.attribute === attribute);

describe('EAVStore.describeAttributes', () => {
  it('reports scalar attributes per type, leaving out type itself', () => {
    const store = new EAVStore();
    store.addFacts(entity('t1', 'Task', { title: 'a', points: 3 }));
    store.addFacts(entity('t2', 'Task', { title: 'b' }));

    expect(store.describeAttributes('Task')).toEqual([
      { attribute: 'points', type: 'number', cardinality: 'one', entityCount: 1, scalar: true },
      { attribute: 'title', type: 'string', cardinality: 'one', entityCount: 2, scalar: true },
    ]);
  });

  it('is not scalar when even one entity holds an array atom', () => {
    const store = new EAVStore();
    store.addFacts(entity('t1', 'Task', { tags: 'solo' }));
    store.addFacts(entity('t2', 'Task', { tags: ['a', 'b'] }));

    expect(shapeOf(store, 'Task', 'tags')).toMatchObject({
      type: 'mixed',
      cardinality: 'one',
      scalar: false,
    });
  });

  it('names an all-array attribute array', () => {
    const store = new EAVStore();
    store.addFacts(entity('t1', 'Task', { tags: ['a'] }));

    expect(shapeOf(store, 'Task', 'tags')).toMatchObject({ type: 'array', scalar: false });
    expect(store.getCatalogEntry('tags')?.type).toBe('array');
  });

  it('scopes to the asked-for type', () => {
    const store = new EAVStore();
    store.addFacts(entity('t1', 'Task', { label: 'x' }));
    store.addFacts(entity('p1', 'Process', { label: ['x', 'y'] }));

    expect(shapeOf(store, 'Task', 'label')?.scalar).toBe(true);
    expect(shapeOf(store, 'Process', 'label')?.scalar).toBe(false);
    expect(shapeOf(store, undefined, 'label')).toMatchObject({ entityCount: 2, scalar: false });
  });

  it('follows current facts: a second value makes it many, deleting it restores one', () => {
    const store = new EAVStore();
    const second: Fact = { e: 't1', a: 'updatedAt', v: '2026-11-02' };
    store.addFacts(entity('t1', 'Task', { updatedAt: '2026-11-01' }));
    store.addFacts([second]);
    expect(shapeOf(store, 'Task', 'updatedAt')).toMatchObject({ cardinality: 'many', scalar: false });

    store.deleteFacts([second]);
    expect(shapeOf(store, 'Task', 'updatedAt')).toMatchObject({ cardinality: 'one', scalar: true });
  });

  it('drops attributes whose facts were all deleted', () => {
    const store = new EAVStore();
    store.addFacts(entity('t1', 'Task', { title: 'a', note: 'gone' }));
    store.deleteFacts([{ e: 't1', a: 'note', v: 'gone' }]);

    expect(shapeOf(store, 'Task', 'note')).toBeUndefined();
  });

  it('returns nothing for a type with no entities', () => {
    const store = new EAVStore();
    store.addFacts(entity('t1', 'Task', { title: 'a' }));
    expect(store.describeAttributes('Nope')).toEqual([]);
  });
});

describe('EAVStore.restore', () => {
  it('rebuilds the catalog from the facts instead of trusting the snapshot copy', () => {
    const store = new EAVStore();
    store.addFacts(entity('t1', 'Task', { title: 'a' }));
    const snapshot = store.snapshot();
    snapshot.catalog = [
      { attribute: 'title', type: 'mixed', cardinality: 'many', distinctCount: 9, examples: [] },
    ];

    const restored = new EAVStore();
    restored.restore(snapshot);
    expect(restored.getCatalogEntry('title')).toMatchObject({
      type: 'string',
      cardinality: 'one',
      distinctCount: 1,
    });
  });
});
