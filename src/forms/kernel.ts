/**
 * Kernel adapter — read `trellis:Form` override entities out of the graph.
 *
 * The resolve path is pure; this module bridges it to a live kernel. The
 * reader is structural, so a `TrellisKernel` (or any layer exposing
 * `listEntities` / `getEntity`) satisfies it.
 *
 * @module trellis/forms
 */

import type { Atom } from '../core/store/eav-store.js';
import type { FormEntityLike, FormFieldEntityLike, FormMode } from './types.js';

/** Minimal structural view of a kernel for reading override entities. */
export interface FormKernelReader {
  listEntities(type?: string): Array<{
    id: string;
    type: string;
    facts: Array<{ a: string; v: Atom }>;
    links: Array<{ a: string; e2: string }>;
  }>;
  getEntity(id: string): {
    id: string;
    type: string;
    facts: Array<{ a: string; v: Atom }>;
    links: Array<{ a: string; e2: string }>;
  } | null;
}

function attr(
  entity: { facts: Array<{ a: string; v: Atom }> },
  name: string,
): Atom | undefined {
  return entity.facts.find((f) => f.a === name)?.v;
}

function fieldFromEntity(
  entity: NonNullable<ReturnType<FormKernelReader['getEntity']>>,
): FormFieldEntityLike {
  const field: FormFieldEntityLike = {
    id: entity.id,
    type: 'FormField',
    fieldName: String(attr(entity, 'fieldName') ?? ''),
  };
  const s = (n: string) => attr(entity, n);
  const sv = s('label');
  if (sv !== undefined) field.label = String(sv);
  const control = s('control');
  if (control !== undefined) field.control = String(control) as FormFieldEntityLike['control'];
  const required = s('required');
  if (required !== undefined) field.required = required === true;
  const readonly = s('readonly');
  if (readonly !== undefined) field.readonly = readonly === true;
  const hidden = s('hidden');
  if (hidden !== undefined) field.hidden = hidden === true;
  const order = s('order');
  if (order !== undefined && typeof order === 'number') field.order = order;
  const section = s('section');
  if (section !== undefined) field.section = String(section);
  const options = s('options');
  if (options !== undefined && typeof options === 'string') {
    try {
      const parsed = JSON.parse(options);
      if (Array.isArray(parsed)) field.options = parsed as Atom[];
    } catch {
      // ignore malformed options
    }
  }
  const defaultValue = s('defaultValue');
  if (defaultValue !== undefined) field.defaultValue = defaultValue;
  const placeholder = s('placeholder');
  if (placeholder !== undefined) field.placeholder = String(placeholder);
  const description = s('description');
  if (description !== undefined) field.description = String(description);
  return field;
}

/**
 * Read all `Form` override entities from a kernel, resolving their
 * `fields` relation in one pass. Returns entities ready for
 * {@link resolveFormDescriptor}.
 */
export function readFormOverrides(reader: FormKernelReader): FormEntityLike[] {
  const forms = reader.listEntities('Form');
  return forms
    .map((record) => {
      const entityType = attr(record, 'entityType');
      if (entityType === undefined) return null;
      const fieldIds = record.links
        .filter((l) => l.a === 'fields')
        .map((l) => l.e2);
      const fields: FormFieldEntityLike[] = [];
      for (const id of fieldIds) {
        const fieldEntity = reader.getEntity(id);
        if (fieldEntity && fieldEntity.type === 'FormField') {
          fields.push(fieldFromEntity(fieldEntity));
        }
      }
      const form: FormEntityLike = {
        id: record.id,
        type: 'Form',
        entityType: String(entityType),
        fields,
      };
      const mode = attr(record, 'mode');
      if (mode !== undefined) {
        form.mode = String(mode) as FormMode;
      }
      const title = attr(record, 'title');
      if (title !== undefined) form.title = String(title);
      const description = attr(record, 'description');
      if (description !== undefined) form.description = String(description);
      return form;
    })
    .filter((f): f is FormEntityLike => f !== null);
}
