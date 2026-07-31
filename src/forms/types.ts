/**
 * Headless Forms — the form descriptor contract.
 *
 * A {@link FormDescriptor} is a pure, JSON-serializable description of a
 * form, **derived from an entity schema** (`SchemaDefinition`). It carries
 * everything a UI needs to render a create/edit/view form — field controls,
 * options, validation, ordering, section grouping — and binds to nothing:
 * no framework, no components, no store. Any client (Vue, React, Svelte,
 * native, headless) renders it.
 *
 * The graph layer (`trellis:Form` entities, see `./ontology.ts`) provides
 * optional **overrides** on top of the derived descriptor: rename fields,
 * hide them, reorder, change controls. Derivation is the default; the graph
 * is the exception.
 *
 * @module trellis/forms
 */

import type { Atom } from '../core/store/eav-store.js';
import type { PropertyType } from '../core/ontology/types.js';

/** A form is derived for one interaction mode. */
export type FormMode = 'create' | 'edit' | 'view';

export const FORM_MODES: readonly FormMode[] = ['create', 'edit', 'view'];

/** Framework-agnostic control kinds a renderer must support. */
export const FIELD_CONTROLS = [
  'text',
  'textarea',
  'number',
  'checkbox',
  'select',
  'multi_select',
  'date',
  'relation',
  'people',
  'files',
  'json',
  'readonly',
] as const;

export type FieldControl = (typeof FIELD_CONTROLS)[number];

export interface FieldOption {
  value: Atom;
  label: string;
}

/** Validation constraints lifted from the schema spec. */
export interface FieldValidation {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
}

/** Relation target information for `relation` controls. */
export interface FieldRelation {
  targetSchema?: string;
  cardinality?: 'one' | 'many';
}

export interface FormFieldDescriptor {
  /** Attribute name in the entity record (matches `PropertyValueSpecification.name`). */
  name: string;
  /** Humanized label (schema has no per-field labels; overrides can set one). */
  label: string;
  control: FieldControl;
  /** Original ontology property type — renderers can specialize further. */
  valueType: PropertyType;
  required: boolean;
  /** Computed/derived or `editable: false` fields are readonly. */
  readonly: boolean;
  description?: string;
  placeholder?: string;
  options?: FieldOption[];
  defaultValue?: Atom;
  validation?: FieldValidation;
  relation?: FieldRelation;
  /** Keyboard hint for text controls (email/url/tel/numeric). */
  inputMode?: 'text' | 'email' | 'url' | 'tel' | 'numeric' | 'datetime-local';
  /** Schema `display` hint (pill/toggle/inline-input/popover). */
  display?: 'pill' | 'toggle' | 'inline-input' | 'popover';
  /** The interaction modes this field participates in. */
  modes: FormMode[];
  /** Stable order within the form (declaration or `propertyFieldIds` order). */
  order: number;
  /** Section id this field lives in (`field.group`, `properties` default). */
  section: string;
}

export interface FormSectionDescriptor {
  /** Group name from the schema (`field.group`) — `Properties` when ungrouped. */
  id: string;
  title: string;
  fields: FormFieldDescriptor[];
}

export interface FormDescriptor {
  /** `${schema['@id']}:${mode}` — stable identity for caching/lookup. */
  formId: string;
  /** Schema `@id` (e.g. `trellis:Task`). */
  schemaId: string;
  /** Bare entity type name (e.g. `Task`). */
  entityType: string;
  label: string;
  labelPlural?: string;
  icon?: string;
  /** Form-level description (graph override only). */
  description?: string;
  /** Primary title attribute, if the schema declares one. */
  titleField?: string;
  mode: FormMode;
  /** Schema version the form was derived from. */
  schemaVersion: string;
  /** True when a graph `Form` entity modified this descriptor. */
  overridden: boolean;
  /** Derived-only — never hand-authored (except via overrides). */
  derived: true;
  sections: FormSectionDescriptor[];
  /** Flattened fields in render order (across sections). */
  fields: FormFieldDescriptor[];
}

// ---------------------------------------------------------------------------
// Graph override input
// ---------------------------------------------------------------------------

/** One `trellis:FormField` override record as read from the graph. */
export interface FormFieldOverride {
  fieldName: string;
  label?: string;
  control?: FieldControl;
  required?: boolean;
  readonly?: boolean;
  hidden?: boolean;
  order?: number;
  section?: string;
  options?: Atom[];
  defaultValue?: Atom;
  placeholder?: string;
  description?: string;
}

/** One `trellis:Form` override record as read from the graph. */
export interface FormOverride {
  id?: string;
  entityType: string;
  /** Undefined = applies to all modes. */
  mode?: FormMode;
  title?: string;
  description?: string;
  fields: FormFieldOverride[];
}

/** Field-shaped input for {@link applyFieldOverrides}. */
export type FieldOverrideInput = Pick<FormFieldOverride, 'fieldName'> &
  Partial<Omit<FormFieldOverride, 'fieldName'>>;

/** Shape of the graph field entity (`InferType<typeof FormFieldType>`). */
export type FormFieldEntityLike = {
  id: string;
  type: 'FormField';
  fieldName: string;
  label?: string;
  control?: FieldControl;
  required?: boolean;
  readonly?: boolean;
  hidden?: boolean;
  order?: number;
  section?: string;
  options?: Atom[];
  defaultValue?: Atom;
  placeholder?: string;
  description?: string;
};

/** Shape of the graph form entity (`InferType<typeof FormType>`). */
export type FormEntityLike = {
  id: string;
  type: 'Form';
  entityType: string;
  mode?: FormMode;
  title?: string;
  description?: string;
  /** Relation to `FormField` entities — resolved by the caller. */
  fields: FormFieldEntityLike[];
};
