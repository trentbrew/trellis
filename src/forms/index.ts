/**
 * Headless Forms — Public API Surface
 *
 * Schema-derived form descriptors, framework-free. Import from
 * `trellis/forms`:
 *
 *   import { deriveFormDescriptor, resolveFormDescriptor } from 'trellis/forms';
 *
 *   const form = deriveFormDescriptor(taskSchema, { mode: 'create' });
 *   const resolved = resolveFormDescriptor(kernel.listOntologies(), 'Task', {
 *     mode: 'edit',
 *     forms: formEntities,
 *   });
 *
 * @module trellis/forms
 */

// Types
export type {
  FieldControl,
  FieldOption,
  FieldRelation,
  FieldValidation,
  FormDescriptor,
  FormEntityLike,
  FormFieldDescriptor,
  FormFieldEntityLike,
  FormFieldOverride,
  FormMode,
  FormOverride,
  FormSectionDescriptor,
} from './types.js';
export { FIELD_CONTROLS, FORM_MODES } from './types.js';

// Derivation (pure, schema → descriptor)
export {
  deriveFormDescriptor,
  deriveFormFields,
  deriveTypeName,
  humanize,
} from './derive.js';
export type { DeriveFormOptions } from './derive.js';

// Graph ontology (override entities)
export { FormFieldType, FormType, FORMS_ONTOLOGY } from './ontology.js';
export type { FormEntity, FormFieldEntity } from './ontology.js';

// Overrides + resolution (graph-aware, end-to-end)
export {
  applyFormOverride,
  formEntityToOverride,
  formMatchesMode,
} from './overrides.js';
export {
  listFormableTypes,
  resolveFormDescriptor,
} from './resolve.js';
export type { ResolveFormOptions } from './resolve.js';

// Kernel adapter (read Form override entities from the graph)
export { readFormOverrides } from './kernel.js';
export type { FormKernelReader } from './kernel.js';

// Core engine (framework-free form state — react/vue/svelte/vanilla adapters
// live in `trellis/forms/<framework>` subpaths)
export { createFormCore } from './core/index.js';
export type {
  FieldBinding,
  FieldState,
  FormActions,
  FormFieldConfig,
  FormSchema,
  FormState,
  FormValues,
  UseFormReturn,
  ValidationError,
  ValidationResult,
} from './core/index.js';
export {
  formSchemaFrom,
  formSchemaFromDescriptor,
  toFormSchema,
} from './core/schema.js';
export { validateFieldValue } from './core/validate.js';
