/**
 * Form Engine Types — headless form state + behavior contract.
 *
 * The engine (see `./index.ts`) is the runtime half of `trellis/forms`:
 * values, errors, dirty/touched tracking, validation, and submit — with no
 * UI binding. The descriptor contract (`../types.ts`) is the shape half.
 * Together: derive the shape, drive the state.
 *
 * @module trellis/forms/core
 */

import type { z } from 'zod';
import type { Atom } from '../../core/store/eav-store.js';
import type { PropertyType } from '../../core/ontology/types.js';

/** Field shape the engine needs — a subset of the descriptor/schema vocab. */
export interface FormFieldConfig {
  name: string;
  valueType: PropertyType;
  required: boolean;
  selectOptions?: readonly Atom[];
  relation?: { targetSchema: string; cardinality: 'one' | 'many' } | null;
  computed?: boolean;
  isTitle?: boolean;
  /** Lifted schema constraints (used when no zod shape is available). */
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}

/**
 * Engine schema — what `createFormCore` needs.
 *
 * `zod` is present when the form comes from a `TrellisType` handle
 * (`toFormSchema`), giving precise validation (email/url/enum/length checks).
 * Descriptor-derived forms (`formSchemaFromDescriptor`) have no zod shape and
 * validate against field metadata instead.
 */
export interface FormSchema {
  typeName: string;
  fields: FormFieldConfig[];
  zod?: { shape: Record<string, z.ZodTypeAny | undefined> };
  titleKey?: string;
}

/** Form values are plain records — relations hold target ids. */
export type FormValues = Record<string, unknown>;

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  data?: FormValues;
}

export interface FieldState<T = unknown> {
  value: T | undefined;
  error: string | null;
  dirty: boolean;
  touched: boolean;
}

export interface FormState {
  values: FormValues;
  errors: Record<string, string | null>;
  dirty: Record<string, boolean>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
}

export interface FormActions {
  setValue: (field: string, value: unknown) => void;
  setValues: (values: Partial<FormValues>) => void;
  setError: (field: string, error: string | null) => void;
  setErrors: (errors: Record<string, string | null>) => void;
  setTouched: (field: string, touched: boolean) => void;
  setDirty: (field: string, dirty: boolean) => void;
  validate: (values?: Partial<FormValues>) => Promise<ValidationResult>;
  validateField: (field: string, value: unknown) => Promise<string | null>;
  reset: (values?: Partial<FormValues>) => void;
  submit: (onSubmit: (values: FormValues) => Promise<void>) => Promise<void>;
}

/** The binding a UI control attaches to for one field. */
export interface FieldBinding {
  value: unknown;
  error: string | null;
  dirty: boolean;
  touched: boolean;
  onChange: (value: unknown) => void;
  onBlur: () => void;
}

/** What `createFormCore` returns — state, actions, field bindings, subscribe. */
export interface UseFormReturn {
  readonly state: FormState;
  readonly actions: FormActions;
  field: (name: string) => FieldBinding;
  /** Subscribe to state changes (framework adapters build on this). */
  subscribe: (listener: () => void) => () => void;
}
