/**
 * Headless forms engine — createFormCore + dual-path validation tests.
 */
import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { defineType } from '../../src/schema/define.js';
import { deriveFormDescriptor } from '../../src/forms/derive.js';
import {
  createFormCore,
  formSchemaFromDescriptor,
  toFormSchema,
} from '../../src/forms/index.js';
import type { SchemaDefinition } from '../../src/core/ontology/types.js';

// ---------------------------------------------------------------------------
// Zod path — a defineType handle with real zod checks
// ---------------------------------------------------------------------------

const Ticket = defineType(
  'Ticket',
  {
    title: z.string().min(3),
    email: z.string().email(),
    priority: z.enum(['low', 'high']),
    done: z.boolean(),
  },
  { title: 'title' },
);

describe('createFormCore (zod path via toFormSchema)', () => {
  test('validates with the zod shape (min length, email, enum)', async () => {
    const core = createFormCore(toFormSchema(Ticket), {
      title: 'ab',
      email: 'not-an-email',
      priority: 'urgent',
      done: false,
    });
    const result = await core.actions.validate();
    expect(result.valid).toBe(false);
    const byField = Object.fromEntries(
      result.errors.map((e) => [e.field, e.message]),
    );
    expect(byField.title).toMatch(/at least 3/);
    expect(byField.email).toMatch(/Invalid email/);
    expect(byField.priority).toMatch(/Invalid enum/);
    expect(byField.done).toBeUndefined();
  });

  test('valid input passes and submit delivers values', async () => {
    const core = createFormCore(toFormSchema(Ticket), {
      title: 'Fix sync',
      email: 'ada@example.com',
      priority: 'high',
      done: false,
    });
    const result = await core.actions.validate();
    expect(result.valid).toBe(true);

    let submitted: Record<string, unknown> | null = null;
    await core.actions.submit(async (values) => {
      submitted = values;
    });
    expect(submitted?.title).toBe('Fix sync');
    expect(core.state.isSubmitting).toBe(false);
  });

  test('failed submit keeps isSubmitting false', async () => {
    const core = createFormCore(toFormSchema(Ticket), {
      title: 'x',
      email: 'bad',
      priority: 'low',
      done: false,
    });
    let called = false;
    await core.actions.submit(async () => {
      called = true;
    });
    expect(called).toBe(false);
    expect(core.state.isSubmitting).toBe(false);
    expect(core.state.errors.title).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Metadata path — a headless descriptor
// ---------------------------------------------------------------------------

const TASK_SCHEMA: SchemaDefinition = {
  '@id': 'trellis:Task',
  '@type': 'trellis:Schema',
  version: '1.0.0',
  label: 'Task',
  fields: [
    { name: 'title', valueType: 'title', required: true },
    { name: 'score', valueType: 'number', min: 0, max: 10 },
    { name: 'code', valueType: 'rich_text', pattern: '^TRL-\\d+$' },
    { name: 'bio', valueType: 'rich_text', minLength: 5, maxLength: 20 },
    { name: 'priority', valueType: 'select', selectOptions: ['low', 'high'] },
    {
      name: 'itemCount',
      valueType: 'rollup',
      computed: true,
      required: false,
      rollup: { relationProperty: 'items', targetProperty: 'id', aggregation: 'count' },
    },
  ],
};

describe('createFormCore (metadata path via formSchemaFromDescriptor)', () => {
  test('validates required, ranges, pattern, lengths, select membership', async () => {
    const descriptor = deriveFormDescriptor(TASK_SCHEMA, { mode: 'create' });
    const core = createFormCore(formSchemaFromDescriptor(descriptor), {
      title: '',
      score: 11,
      code: 'nope',
      bio: 'hi',
      priority: 'urgent',
    });
    const result = await core.actions.validate();
    expect(result.valid).toBe(false);
    const byField = Object.fromEntries(
      result.errors.map((e) => [e.field, e.message]),
    );
    expect(byField.title).toBe('Required');
    expect(byField.score).toBe('Must be at most 10');
    expect(byField.code).toBe('Invalid format');
    expect(byField.bio).toBe('Must be at least 5 characters');
    expect(byField.priority).toBe('Invalid option');
    expect(byField.itemCount).toBeUndefined(); // computed skipped
  });

  test('valid values pass with metadata checks', async () => {
    const descriptor = deriveFormDescriptor(TASK_SCHEMA, { mode: 'create' });
    const core = createFormCore(formSchemaFromDescriptor(descriptor), {
      title: 'Ship forms',
      score: 7,
      code: 'TRL-33',
      bio: 'headless forms',
      priority: 'high',
    });
    const result = await core.actions.validate();
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

describe('createFormCore state machine', () => {
  const descriptor = deriveFormDescriptor(TASK_SCHEMA, { mode: 'create' });

  test('setValue marks dirty; setTouched marks touched', () => {
    const core = createFormCore(formSchemaFromDescriptor(descriptor));
    expect(core.state.isDirty).toBe(false);
    core.actions.setValue('title', 'New title');
    expect(core.state.values.title).toBe('New title');
    expect(core.state.dirty.title).toBe(true);
    expect(core.state.isDirty).toBe(true);
    core.actions.setTouched('title', true);
    expect(core.state.touched.title).toBe(true);
    const binding = core.field('title');
    expect(binding.value).toBe('New title');
    expect(binding.dirty).toBe(true);
  });

  test('required fields start empty and ready for validation', () => {
    const core = createFormCore(formSchemaFromDescriptor(descriptor));
    expect(core.state.values.title).toBe('');
    expect(core.state.values.score).toBeUndefined();
  });

  test('reset restores initial values', () => {
    const core = createFormCore(formSchemaFromDescriptor(descriptor), {
      title: 'Original',
    });
    core.actions.setValue('title', 'Changed');
    core.actions.reset();
    expect(core.state.values.title).toBe('Original');
    expect(core.state.dirty.title).toBe(false);
  });

  test('reset with values merges over initial', () => {
    const core = createFormCore(formSchemaFromDescriptor(descriptor), {
      title: 'Original',
    });
    core.actions.setValue('title', 'Changed');
    core.actions.reset({ title: 'Merged' });
    expect(core.state.values.title).toBe('Merged');
  });

  test('subscribe notifies on changes and unsubscribes', () => {
    const core = createFormCore(formSchemaFromDescriptor(descriptor));
    let calls = 0;
    const unsubscribe = core.subscribe(() => calls++);
    core.actions.setValue('title', 'a');
    core.actions.setTouched('title', true);
    expect(calls).toBe(2);
    unsubscribe();
    core.actions.setValue('title', 'b');
    expect(calls).toBe(2);
  });

  test('field() getter reflects state after changes', () => {
    const core = createFormCore(formSchemaFromDescriptor(descriptor), {
      title: 'T',
    });
    const field = core.field('title');
    field.onChange('Updated');
    field.onBlur();
    expect(core.state.values.title).toBe('Updated');
    expect(core.state.touched.title).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Engine + descriptor pipeline end-to-end (no kernel)
// ---------------------------------------------------------------------------

describe('engine pipeline', () => {
  test('formSchemaFromDescriptor round-trips a derived descriptor', () => {
    const descriptor = deriveFormDescriptor(TASK_SCHEMA, { mode: 'view' });
    const schema = formSchemaFromDescriptor(descriptor);
    expect(schema.typeName).toBe('Task');
    expect(schema.titleKey).toBe('title');
    expect(schema.zod).toBeUndefined();
    const title = schema.fields.find((f) => f.name === 'title')!;
    expect(title.required).toBe(true);
    expect(title.isTitle).toBe(true);
    const priority = schema.fields.find((f) => f.name === 'priority')!;
    expect(priority.selectOptions).toEqual(['low', 'high']);
    const count = schema.fields.find((f) => f.name === 'itemCount')!;
    expect(count.computed).toBe(true);
  });
});
