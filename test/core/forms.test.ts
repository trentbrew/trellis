/**
 * Headless forms ontology — schema → FormDescriptor derivation tests.
 *
 * Covers the pure engine (derive), the graph override path (apply/resolve),
 * and the kernel adapter (readFormOverrides).
 */
import { describe, expect, test, beforeEach } from 'vitest';
import type {
  PropertyValueSpecification,
  SchemaDefinition,
} from '../../src/core/ontology/types.js';
import { TrellisKernel } from '../../src/core/kernel/trellis-kernel.js';
import { SqlJsKernelBackend } from '../../src/core/persist/sqljs-backend.js';
import { deriveFormDescriptor } from '../../src/forms/derive.js';
import {
  applyFormOverride,
  formEntityToOverride,
} from '../../src/forms/overrides.js';
import { resolveFormDescriptor } from '../../src/forms/resolve.js';
import { readFormOverrides } from '../../src/forms/kernel.js';
import type { FormEntityLike } from '../../src/forms/types.js';

function field(
  name: string,
  opts: Partial<PropertyValueSpecification> = {},
): PropertyValueSpecification {
  return { name, valueType: opts.valueType ?? 'rich_text', ...opts };
}

// A task-like schema exercising most property types + grouping.
const TASK_SCHEMA: SchemaDefinition = {
  '@id': 'trellis:Task',
  '@type': 'trellis:Schema',
  version: '2.0.0',
  tier: 'system',
  label: 'Task',
  labelPlural: 'Tasks',
  icon: 'square-check',
  propertyFieldIds: ['title', 'dueDate', 'priority', 'done', 'body', 'score', 'assignee'],
  fields: [
    { name: 'title', valueType: 'title', required: true },
    { name: 'body', valueType: 'rich_text' },
    { name: 'done', valueType: 'checkbox', defaultValue: false },
    { name: 'score', valueType: 'number', min: 0, max: 10 },
    { name: 'priority', valueType: 'select', selectOptions: ['low', 'medium', 'high'] },
    { name: 'tags', valueType: 'multi_select', selectOptions: ['dev', 'design'] },
    { name: 'dueDate', valueType: 'date' },
    { name: 'homepage', valueType: 'url' },
    { name: 'contact', valueType: 'email' },
    {
      name: 'assignee',
      valueType: 'relation',
      relation: { targetSchema: 'Person', cardinality: 'one' },
    },
    {
      name: 'itemCount',
      valueType: 'rollup',
      computed: true,
      required: false,
      rollup: { relationProperty: 'items', targetProperty: 'id', aggregation: 'count' },
    },
    { name: 'category', valueType: 'select', group: 'Organization', selectOptions: ['a', 'b'] },
    { name: 'project', valueType: 'relation', group: 'Organization', relation: { targetSchema: 'Project', cardinality: 'one' } },
  ],
};

describe('deriveFormDescriptor', () => {
  test('maps valueTypes to headless controls', () => {
    const form = deriveFormDescriptor(TASK_SCHEMA);
    const byName = new Map(form.fields.map((f) => [f.name, f]));
    expect(byName.get('title')?.control).toBe('text');
    expect(byName.get('title')?.required).toBe(true);
    expect(byName.get('title')?.valueType).toBe('title');
    expect(byName.get('body')?.control).toBe('textarea');
    expect(byName.get('done')?.control).toBe('checkbox');
    expect(byName.get('score')?.control).toBe('number');
    expect(byName.get('score')?.validation).toEqual({ min: 0, max: 10 });
    expect(byName.get('priority')?.control).toBe('select');
    expect(byName.get('priority')?.options).toEqual([
      { value: 'low', label: 'low' },
      { value: 'medium', label: 'medium' },
      { value: 'high', label: 'high' },
    ]);
    expect(byName.get('tags')?.control).toBe('multi_select');
    expect(byName.get('dueDate')?.control).toBe('date');
    expect(byName.get('homepage')?.inputMode).toBe('url');
    expect(byName.get('contact')?.inputMode).toBe('email');
    expect(byName.get('assignee')?.control).toBe('relation');
    expect(byName.get('assignee')?.relation).toEqual({
      targetSchema: 'Person',
      cardinality: 'one',
    });
  });

  test('computed fields are readonly and view-only', () => {
    const create = deriveFormDescriptor(TASK_SCHEMA, { mode: 'create' });
    expect(create.fields.find((f) => f.name === 'itemCount')).toBeUndefined();

    const view = deriveFormDescriptor(TASK_SCHEMA, { mode: 'view' });
    const itemCount = view.fields.find((f) => f.name === 'itemCount')!;
    expect(itemCount.control).toBe('readonly');
    expect(itemCount.modes).toEqual(['view']);
  });

  test('orders by propertyFieldIds, title first', () => {
    const form = deriveFormDescriptor(TASK_SCHEMA);
    expect(form.fields.map((f) => f.name).slice(0, 6)).toEqual([
      'title',
      'dueDate',
      'priority',
      'done',
      'body',
      'score',
    ]);
  });

  test('groups fields into sections by schema group', () => {
    const form = deriveFormDescriptor(TASK_SCHEMA);
    const sections = form.sections.map((s) => s.title);
    expect(sections).toContain('Properties');
    expect(sections).toContain('Organization');
    const org = form.sections.find((s) => s.title === 'Organization')!;
    expect(org.fields.map((f) => f.name)).toEqual(['category', 'project']);
  });

  test('carries form metadata', () => {
    const form = deriveFormDescriptor(TASK_SCHEMA);
    expect(form.formId).toBe('trellis:Task:create');
    expect(form.entityType).toBe('Task');
    expect(form.schemaId).toBe('trellis:Task');
    expect(form.label).toBe('Task');
    expect(form.labelPlural).toBe('Tasks');
    expect(form.icon).toBe('square-check');
    expect(form.titleField).toBe('title');
    expect(form.schemaVersion).toBe('2.0.0');
    expect(form.derived).toBe(true);
    expect(form.overridden).toBe(false);
    expect(form.mode).toBe('create');
  });

  test('declaration order when no propertyFieldIds', () => {
    const schema: SchemaDefinition = {
      '@id': 'trellis:Note',
      '@type': 'trellis:Schema',
      version: '1.0.0',
      label: 'Note',
      fields: [{ name: 'body', valueType: 'rich_text' }, { name: 'title', valueType: 'title' }],
    };
    const form = deriveFormDescriptor(schema);
    expect(form.fields.map((f) => f.name)).toEqual(['title', 'body']);
  });

  test('humanizes labels', () => {
    const schema: SchemaDefinition = {
      '@id': 'trellis:Thing',
      '@type': 'trellis:Schema',
      version: '1.0.0',
      label: 'Thing',
      fields: [
        { name: 'firstName', valueType: 'rich_text' },
        { name: 'created_at', valueType: 'rich_text' },
      ],
    };
    const form = deriveFormDescriptor(schema);
    expect(form.fields[0]!.label).toBe('First Name');
    expect(form.fields[1]!.label).toBe('Created At');
  });
});

describe('applyFormOverride', () => {
  test('renames, recontrols, hides, reorders, and regoups fields', () => {
    const form = deriveFormDescriptor(TASK_SCHEMA);
    applyFormOverride(form, {
      entityType: 'Task',
      title: 'Ticket',
      fields: [
        { fieldName: 'body', label: 'Description', control: 'text' },
        { fieldName: 'done', hidden: true },
        { fieldName: 'score', order: -100 },
        { fieldName: 'category', section: 'Details' },
        { fieldName: 'title', section: 'Details', order: 1 },
      ],
    });
    expect(form.label).toBe('Ticket');
    expect(form.overridden).toBe(true);
    const body = form.fields.find((f) => f.name === 'body')!;
    expect(body.label).toBe('Description');
    expect(body.control).toBe('text');
    expect(form.fields.find((f) => f.name === 'done')).toBeUndefined();
    expect(
      form.sections.find((s) => s.title === 'Properties')?.fields.map((f) => f.name),
    ).toEqual([
      'score',
      'dueDate',
      'priority',
      'body',
      'assignee',
      'tags',
      'homepage',
      'contact',
    ]);
    const details = form.sections.find((s) => s.title === 'Details')!;
    expect(details.fields.map((f) => f.name)).toEqual(['title', 'category']);
    // Organization keeps the fields that weren't moved away.
    expect(
      form.sections.find((s) => s.title === 'Organization')?.fields.map((f) => f.name),
    ).toEqual(['project']);
  });

  test('mode-scoped override is skipped for other modes', () => {
    const form = deriveFormDescriptor(TASK_SCHEMA, { mode: 'view' });
    applyFormOverride(form, {
      entityType: 'Task',
      mode: 'create',
      fields: [{ fieldName: 'title', label: 'Nope' }],
    });
    expect(form.fields.find((f) => f.name === 'title')!.label).toBe('Title');
    expect(form.overridden).toBe(false);
  });
});

describe('resolveFormDescriptor', () => {
  test('returns undefined for unregistered types', () => {
    expect(resolveFormDescriptor([TASK_SCHEMA], 'Nope')).toBeUndefined();
  });

  test('finds schema by bare type name', () => {
    const form = resolveFormDescriptor([TASK_SCHEMA], 'Task', { mode: 'view' })!;
    expect(form.entityType).toBe('Task');
    expect(form.mode).toBe('view');
  });

  test('applies graph form entities with mode-scoped precedence', () => {
    const formEntity: FormEntityLike = {
      id: 'form:task-create',
      type: 'Form',
      entityType: 'Task',
      mode: 'create',
      fields: [
        { id: 'ff1', type: 'FormField', fieldName: 'title', label: 'Summary' },
      ],
    };
    const form = resolveFormDescriptor([TASK_SCHEMA], 'Task', {
      mode: 'create',
      forms: [formEntity],
    })!;
    expect(form.overridden).toBe(true);
    expect(form.fields.find((f) => f.name === 'title')!.label).toBe('Summary');
  });

  test('formEntityToOverride round-trips graph entity shape', () => {
    const entity: FormEntityLike = {
      id: 'form:task',
      type: 'Form',
      entityType: 'Task',
      title: 'Ticket',
      fields: [
        {
          id: 'ff1',
          type: 'FormField',
          fieldName: 'priority',
          control: 'multi_select',
          order: 3,
          hidden: false,
        },
      ],
    };
    const override = formEntityToOverride(entity);
    expect(override.title).toBe('Ticket');
    expect(override.fields[0]).toEqual({
      fieldName: 'priority',
      control: 'multi_select',
      order: 3,
      hidden: false,
    });
  });
});

describe('readFormOverrides (kernel adapter)', () => {
  let kernel: TrellisKernel;

  beforeEach(async () => {
    const backend = await SqlJsKernelBackend.create({ dbPath: ':memory:' });
    kernel = new TrellisKernel({ backend, agentId: 'test' });
    kernel.boot();
  });

  test('round-trips Form entities created through the kernel', async () => {
    await kernel.createEntity('form:task', 'Form', {
      entityType: 'Task',
      mode: 'edit',
      title: 'Ticket',
    }, [
      { attribute: 'fields', targetEntityId: 'ff1' },
      { attribute: 'fields', targetEntityId: 'ff2' },
    ]);
    await kernel.createEntity('ff1', 'FormField', {
      fieldName: 'title',
      label: 'Summary',
      required: true,
      order: 0,
    });
    await kernel.createEntity('ff2', 'FormField', {
      fieldName: 'body',
      hidden: true,
    });

    const forms = readFormOverrides(kernel);
    expect(forms).toHaveLength(1);
    const form = forms[0]!;
    expect(form.entityType).toBe('Task');
    expect(form.mode).toBe('edit');
    expect(form.title).toBe('Ticket');
    expect(form.fields).toHaveLength(2);
    expect(form.fields[0]).toMatchObject({
      fieldName: 'title',
      label: 'Summary',
      required: true,
      order: 0,
    });

    const resolved = resolveFormDescriptor(kernel.listOntologies(), 'Task', {
      mode: 'edit',
      forms,
    });
    expect(resolved).toBeUndefined(); // Task schema not registered here
  });

  test('end-to-end: register schema + overrides → resolved descriptor', async () => {
    kernel.createOntology(TASK_SCHEMA);
    await kernel.createEntity('form:task-create', 'Form', {
      entityType: 'Task',
      mode: 'create',
    }, [
      { attribute: 'fields', targetEntityId: 'ff1' },
    ]);
    await kernel.createEntity('ff1', 'FormField', {
      fieldName: 'title',
      label: 'Summary',
      section: 'Details',
      order: 5,
    });

    const resolved = resolveFormDescriptor(kernel.listOntologies(), 'Task', {
      mode: 'create',
      overrides: readFormOverrides(kernel),
    })!;
    expect(resolved.overridden).toBe(true);
    expect(resolved.fields.find((f) => f.name === 'title')!.label).toBe('Summary');
    expect(
      resolved.sections.find((s) => s.title === 'Details')?.fields.map((f) => f.name),
    ).toContain('title');
  });
});
