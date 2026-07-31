/**
 * Form Overrides — apply graph `trellis:Form` entities to a derived
 * descriptor.
 *
 * Derivation is the default; overrides are the exception. A `Form` entity
 * (with its `FormField` children) can rename, recontrol, hide, reorder, and
 * regoup fields of an otherwise schema-derived form.
 *
 * @module trellis/forms
 */

import type {
  FormDescriptor,
  FormEntityLike,
  FormFieldDescriptor,
  FormOverride,
  FormSectionDescriptor,
} from './types.js';

/** Match the override to a mode: exact mode wins; mode-less applies to all. */
export function formMatchesMode(
  form: { mode?: string },
  mode: string,
): boolean {
  return form.mode === undefined || form.mode === mode;
}

/** Adapter from a graph-read `Form` entity to the override shape. */
export function formEntityToOverride(entity: FormEntityLike): FormOverride {
  return {
    id: entity.id,
    entityType: entity.entityType,
    ...(entity.mode ? { mode: entity.mode } : {}),
    ...(entity.title !== undefined ? { title: entity.title } : {}),
    ...(entity.description !== undefined ? { description: entity.description } : {}),
    fields: (entity.fields ?? []).map((f) => ({
      fieldName: f.fieldName,
      ...(f.label !== undefined ? { label: f.label } : {}),
      ...(f.control !== undefined ? { control: f.control } : {}),
      ...(f.required !== undefined ? { required: f.required } : {}),
      ...(f.readonly !== undefined ? { readonly: f.readonly } : {}),
      ...(f.hidden !== undefined ? { hidden: f.hidden } : {}),
      ...(f.order !== undefined ? { order: f.order } : {}),
      ...(f.section !== undefined ? { section: f.section } : {}),
      ...(f.options !== undefined ? { options: f.options } : {}),
      ...(f.defaultValue !== undefined ? { defaultValue: f.defaultValue } : {}),
      ...(f.placeholder !== undefined ? { placeholder: f.placeholder } : {}),
      ...(f.description !== undefined ? { description: f.description } : {}),
    })),
  };
}

function applyFieldOverride(
  field: FormFieldDescriptor,
  ov: FormOverride['fields'][number],
): void {
  if (ov.label !== undefined) field.label = ov.label;
  if (ov.control !== undefined) field.control = ov.control;
  if (ov.required !== undefined) field.required = ov.required;
  if (ov.readonly !== undefined) {
    field.readonly = ov.readonly;
    if (ov.readonly) field.control = 'readonly';
  }
  if (ov.order !== undefined) field.order = ov.order;
  if (ov.defaultValue !== undefined) field.defaultValue = ov.defaultValue;
  if (ov.placeholder !== undefined) field.placeholder = ov.placeholder;
  if (ov.description !== undefined) field.description = ov.description;
  if (ov.options !== undefined) {
    field.options = ov.options.map((value) => ({ value, label: String(value) }));
  }
}

function titleize(section: string): string {
  return section
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Apply one override to a derived descriptor (mutates and returns it).
 *
 * - `hidden` fields are removed from sections and the flattened list.
 * - `section` moves the field into a section (created on demand, appended).
 * - `order` re-sorts within each section; sections renumber sequentially.
 */
export function applyFormOverride(
  descriptor: FormDescriptor,
  override: FormOverride,
): FormDescriptor {
  if (!formMatchesMode(override, descriptor.mode)) return descriptor;

  if (override.title !== undefined) descriptor.label = override.title;
  if (override.description !== undefined) {
    descriptor.description = override.description;
  }

  const hidden = new Set<string>();
  for (const ov of override.fields) {
    const field = descriptor.fields.find((f) => f.name === ov.fieldName);
    if (!field) continue;
    applyFieldOverride(field, ov);
    if (ov.section !== undefined) field.section = ov.section;
    if (ov.hidden) hidden.add(field.name);
  }

  if (hidden.size > 0 || override.fields.some((f) => f.section !== undefined)) {
    rebuildSections(descriptor);
  }
  descriptor.fields = descriptor.fields.filter((f) => !hidden.has(f.name));
  descriptor.sections = descriptor.sections
    .map((s) => ({ ...s, fields: s.fields.filter((f) => !hidden.has(f.name)) }))
    .filter((s) => s.fields.length > 0);

  descriptor.overridden = true;
  return descriptor;
}

function rebuildSections(descriptor: FormDescriptor): void {
  const sections = new Map<string, FormSectionDescriptor>();
  for (const field of descriptor.fields) {
    let section = sections.get(field.section);
    if (!section) {
      section = {
        id: field.section,
        title: field.section === 'properties' ? 'Properties' : titleize(field.section),
        fields: [],
      };
      sections.set(field.section, section);
    }
    section.fields.push(field);
  }
  descriptor.sections = Array.from(sections.values());
  for (const section of descriptor.sections) {
    section.fields.sort((a, b) => a.order - b.order);
  }
  let order = 0;
  for (const section of descriptor.sections) {
    for (const field of section.fields) field.order = order++;
  }
}
