/**
 * Forms Ontology — `trellis:Form` / `trellis:FormField` graph entities.
 *
 * Forms are **derived** from entity schemas (`./derive.ts`), but a
 * `Form` entity in the graph is a first-class override surface: rename
 * fields, change controls, hide, reorder, regoup. This mirrors the
 * workflow/pipeline registry packages: schemas are the default, graph
 * entities are the exception.
 *
 * @module trellis/forms
 */

import { z } from 'zod';
import { defineType, rel, type InferType } from '../schema/define.js';
import { FIELD_CONTROLS, type FieldControl, type FormMode } from './types.js';

const CONTROL_ENUM = [...FIELD_CONTROLS] as const;

/**
 * `trellis:FormField` — one field override, keyed by its schema attribute
 * name. `hidden: true` removes the field from the derived descriptor.
 */
export const FormFieldType = defineType('FormField', {
  /** Attribute name in the entity record — must match a schema field. */
  fieldName: z.string(),
  label: z.string().optional(),
  control: z.enum(CONTROL_ENUM).optional(),
  required: z.boolean().optional(),
  readonly: z.boolean().optional(),
  hidden: z.boolean().optional(),
  /** Render order within the section (relative). */
  order: z.number().optional(),
  /** Move the field to a section (created on demand). */
  section: z.string().optional(),
  options: z.array(z.union([z.string(), z.number(), z.boolean()])).optional(),
  defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
  placeholder: z.string().optional(),
  description: z.string().optional(),
}, { title: 'fieldName' });

/**
 * `trellis:Form` — form override for one entity type. `mode` undefined
 * applies to every mode; a mode-scoped entity wins for that mode.
 */
export const FormType = defineType('Form', {
  /** Bare entity type name (e.g. `Task`). */
  entityType: z.string(),
  /** Undefined = applies to all modes. */
  mode: z.enum(['create', 'edit', 'view']).optional(),
  /** Overrides the schema label / form title. */
  title: z.string().optional(),
  description: z.string().optional(),
}, {
  title: 'entityType',
  relations: {
    fields: rel(() => FormFieldType, 'many'),
  },
});

export type FormEntity = InferType<typeof FormType>;
export type FormFieldEntity = InferType<typeof FormFieldType>;

/** Both schemas for kernel registration (`client.registerType`). */
export const FORMS_ONTOLOGY = [FormType.definition, FormFieldType.definition];

export type { FieldControl, FormMode };
