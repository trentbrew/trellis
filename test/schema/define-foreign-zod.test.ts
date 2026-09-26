/**
 * ADR 0045 addendum, defect 1: an app's own `zod` is a different copy from the
 * one bundled into trellis, so `instanceof` checks fail and every field used to
 * register as `json` (never validated). Kinds are read from `_def.typeName`.
 */
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineType } from '../../src/schema/define.js';
import { isZodError, zodKind } from '../../src/schema/zod-kind.js';
import { extractEnumValues } from '../../src/plugins/brand/constraints.js';

// The CJS build of zod: same version, different classes — exactly an app's copy.
const foreign = createRequire(import.meta.url)('zod') as typeof z;

function specs(zod: typeof z) {
  const Book = defineType(
    'ForeignZodBook',
    {
      title: zod.string(),
      pages: zod.number().optional(),
      email: zod.string().email().optional(),
      read: zod.boolean().default(false),
      status: zod.enum(['todo', 'done']),
      tags: zod.array(zod.enum(['a', 'b'])).optional(),
      meta: zod.record(zod.string()).optional(),
    },
    { title: 'title' },
  );
  return Object.fromEntries(
    Book.definition.fields.map((field) => [
      field.name,
      { valueType: field.valueType, required: field.required, selectOptions: field.selectOptions },
    ]),
  );
}

describe('defineType with a foreign zod copy', () => {
  it('is really a different copy', () => {
    expect(foreign.number() instanceof z.ZodNumber).toBe(false);
    expect(zodKind(foreign.number())).toBe('ZodNumber');
  });

  it('maps field kinds instead of falling through to json', () => {
    const fields = specs(foreign);
    expect(fields.title?.valueType).toBe('title');
    expect(fields.pages).toMatchObject({ valueType: 'number', required: false });
    expect(fields.email?.valueType).toBe('email');
    expect(fields.read?.valueType).toBe('checkbox');
    expect(fields.status).toMatchObject({ valueType: 'select', selectOptions: ['todo', 'done'] });
    expect(fields.tags).toMatchObject({ valueType: 'multi_select', selectOptions: ['a', 'b'] });
    expect(fields.meta?.valueType).toBe('json');
  });

  it('matches the bundled zod exactly', () => {
    expect(specs(foreign)).toEqual(specs(z));
  });
});

describe('zod-kind helpers', () => {
  it('recognises a ZodError from either copy', () => {
    const local = z.number().safeParse('x');
    const other = foreign.number().safeParse('x');
    expect(!local.success && isZodError(local.error)).toBe(true);
    expect(!other.success && isZodError(other.error)).toBe(true);
    expect(isZodError(new Error('nope'))).toBe(false);
  });

  it('brand constraints read enums from a foreign copy', () => {
    expect(extractEnumValues(foreign.enum(['sm', 'lg']).optional() as never)).toEqual(['sm', 'lg']);
  });
});
