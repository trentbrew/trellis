/**
 * ADR 0018 Phase 1 — field sync policy unit tests.
 */
import { describe, expect, test } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  effectiveFieldSync,
  filterDurableAttributes,
  findSchemaForType,
  RealtimeFieldError,
} from '../../src/core/ontology/sync-policy.js';
import type {
  PropertyValueSpecification,
  SchemaDefinition,
} from '../../src/core/ontology/types.js';
import { TrellisKernel } from '../../src/core/kernel/trellis-kernel.js';
import { BetterSqliteKernelBackend } from '../../src/core/persist/better-sqlite-backend.js';

function field(
  name: string,
  opts: Partial<PropertyValueSpecification> = {},
): PropertyValueSpecification {
  return {
    name,
    valueType: opts.valueType ?? 'title',
    ...opts,
  };
}

describe('effectiveFieldSync', () => {
  test('defaults to durable', () => {
    expect(effectiveFieldSync(field('label'))).toBe('durable');
  });

  test('honors explicit sync', () => {
    expect(effectiveFieldSync(field('pos', { sync: 'realtime' }))).toBe(
      'realtime',
    );
  });

  test('formula / rollup / computed → derived', () => {
    expect(
      effectiveFieldSync(field('score', { valueType: 'formula', formula: '1' })),
    ).toBe('derived');
    expect(
      effectiveFieldSync(
        field('count', {
          valueType: 'rollup',
          rollup: {
            relationProperty: 'items',
            targetProperty: 'n',
            aggregation: 'count',
          },
        }),
      ),
    ).toBe('derived');
    expect(effectiveFieldSync(field('x', { computed: true }))).toBe('derived');
  });
});

describe('filterDurableAttributes', () => {
  const schema: SchemaDefinition = {
    '@id': 'trellis:Thing',
    '@type': 'trellis:Schema',
    version: '1.0.0',
    label: 'Thing',
    fields: [
      field('label'),
      field('juice', { sync: 'derived' }),
      field('position', { sync: 'realtime' }),
      field('auto', { valueType: 'formula', formula: '1+1', computed: true }),
    ],
  };

  test('strips derived fields', () => {
    const out = filterDurableAttributes(
      { label: 'a', juice: 9, auto: 2, extra: true },
      schema,
    );
    expect(out).toEqual({ label: 'a', extra: true });
  });

  test('rejects realtime fields', () => {
    expect(() =>
      filterDurableAttributes({ label: 'a', position: [0, 0, 0] }, schema),
    ).toThrow(RealtimeFieldError);
  });

  test('open-world when no schema', () => {
    expect(filterDurableAttributes({ a: 1 }, undefined)).toEqual({ a: 1 });
  });
});

describe('findSchemaForType', () => {
  const schema: SchemaDefinition = {
    '@id': 'trellis:Player',
    '@type': 'trellis:Schema',
    version: '1.0.0',
    label: 'Player',
    fields: [field('name')],
  };

  test('resolves by trellis:Type and label', () => {
    expect(findSchemaForType([schema], 'Player')?.['@id']).toBe(
      'trellis:Player',
    );
    expect(findSchemaForType([schema], 'trellis:Player')?.label).toBe('Player');
  });
});

describe('kernel durable write peel', () => {
  test('create/update strip derived and reject realtime', async () => {
    const schema: SchemaDefinition = {
      '@id': 'trellis:Player',
      '@type': 'trellis:Schema',
      version: '1.0.0',
      label: 'Player',
      tier: 'user',
      fields: [
        field('name'),
        field('position', { sync: 'realtime' }),
        field('score', { sync: 'derived' }),
        field('display', {
          valueType: 'formula',
          formula: '$name',
          computed: true,
        }),
      ],
    };

    const tmpDir = mkdtempSync(join(tmpdir(), 'sync-policy-'));
    const backend = new BetterSqliteKernelBackend(join(tmpDir, 'k.db'));
    const kernel = new TrellisKernel({
      backend,
      agentId: 'test',
    });
    kernel.boot();
    kernel.createOntology(schema);

    try {
      await kernel.createEntity('entity:hero', 'Player', {
        name: 'Hero',
        score: 99,
      } as any);

      const created = kernel.getEntity('entity:hero');
      expect(created?.facts.find((f) => f.a === 'name')?.v).toBe('Hero');
      expect(created?.facts.find((f) => f.a === 'score')).toBeUndefined();

      await expect(
        kernel.updateEntity('entity:hero', {
          position: [1, 2, 3],
        } as any),
      ).rejects.toBeInstanceOf(RealtimeFieldError);
    } finally {
      kernel.close();
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
