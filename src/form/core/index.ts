import { z } from 'zod';
import type {
  FormSchema,
  FormValues,
  FormState,
  FormActions,
  UseFormReturn,
  ValidationResult,
  ValidationError,
  FieldState,
} from './types.js';

import type { AnyType } from '../../schema/define.js';

function createInitialState<T extends FormValues<AnyType>>(
  initialValues: T,
  fields: FormSchema<any>['fields'],
): FormState<T> {
  const shape = {} as Record<string, unknown>;
  for (const f of fields) {
    shape[f.name] = initialValues[f.name] ?? (f.required ? '' : undefined);
  }
  return {
    values: shape as T,
    errors: Object.fromEntries(fields.map((f) => [f.name, null])),
    dirty: Object.fromEntries(fields.map((f) => [f.name, false])),
    touched: Object.fromEntries(fields.map((f) => [f.name, false])),
    isSubmitting: false,
    isValid: true,
    isDirty: false,
  };
}

function computeIsValid(errors: Record<string, string | null>): boolean {
  return Object.values(errors).every((e) => e === null);
}

function computeIsDirty<T extends FormValues<AnyType>>(
  values: T,
  initialValues: T,
  dirty: Record<string, boolean>,
): boolean {
  return Object.keys(values).some((k) => dirty[k] || values[k] !== initialValues[k]);
}

export function createFormCore<T extends FormValues<AnyType>>(
  formSchema: FormSchema<any>,
  initialValues: T = {} as T,
): { state: FormState<T>; actions: FormActions<T>; useFormReturn: UseFormReturn<T> } {
  let state = createInitialState(initialValues, formSchema.fields);
  const initialRef = { current: { ...initialValues } };
  let subscribers = new Set<() => void>();

  const notify = () => subscribers.forEach((fn) => fn());

  const validateField = async (
    fieldName: string,
    value: any,
  ): Promise<string | null> => {
    const field = formSchema.fields.find((f) => f.name === fieldName);
    if (!field) return null;

    if (field.computed) return null;

    try {
      const fieldSchema = formSchema.zod.shape[fieldName];
      if (fieldSchema) {
        await fieldSchema.parseAsync(value);
      }
      return null;
    } catch (e) {
      if (e instanceof z.ZodError) {
        return e.errors[0]?.message ?? 'Invalid value';
      }
      return 'Validation failed';
    }
  };

  const validate = async (values?: Partial<T>): Promise<ValidationResult> => {
    const toValidate = values ?? state.values;
    const errors: ValidationError[] = [];

    for (const field of formSchema.fields) {
      if (field.computed) continue;
      const val = toValidate[field.name];
      const err = await validateField(field.name, val);
      if (err) errors.push({ field: field.name, message: err });
    }

    const valid = errors.length === 0;
    return { valid, errors, data: toValidate };
  };

  const actions: FormActions<T> = {
    setValue: (field: string, value: any) => {
      state = { ...state, values: { ...state.values, [field]: value }, dirty: { ...state.dirty, [field]: true } };
      notify();
    },

    setValues: (values: Partial<T>) => {
      const newDirty = { ...state.dirty };
      for (const k of Object.keys(values)) newDirty[k] = true;
      state = { ...state, values: { ...state.values, ...values }, dirty: newDirty };
      notify();
    },

    setError: (field: string, error: string | null) => {
      state = { ...state, errors: { ...state.errors, [field]: error } };
      notify();
    },

    setErrors: (errors: Record<string, string | null>) => {
      state = { ...state, errors: { ...state.errors, ...errors } };
      notify();
    },

    setTouched: (field: string, touched: boolean) => {
      state = { ...state, touched: { ...state.touched, [field]: touched } };
      notify();
    },

    setDirty: (field: string, dirty: boolean) => {
      state = { ...state, dirty: { ...state.dirty, [field]: dirty } };
      notify();
    },

    validate: async (values?: Partial<T>) => {
      const result = await validate(values);
      if (!values) {
        actions.setErrors(
          Object.fromEntries(result.errors.map((e) => [e.field, e.message])),
        );
      }
      return result;
    },

    validateField: async (field: string, value: any) => {
      const err = await validateField(field, value);
      actions.setError(field, err);
      return err;
    },

    reset: (values?: Partial<T>) => {
      const next = values ? { ...initialRef.current, ...values } : initialRef.current;
      state = createInitialState(next as T, formSchema.fields);
      initialRef.current = { ...next };
      notify();
    },

    submit: async (onSubmit: (values: T) => Promise<void>) => {
      state = { ...state, isSubmitting: true };
      notify();
      const result = await validate();
      if (result.valid) {
        try {
          await onSubmit(state.values);
        } finally {
          state = { ...state, isSubmitting: false };
          notify();
        }
      } else {
        state = { ...state, isSubmitting: false };
        notify();
      }
    },
  };

  const derivedState = {
    get state(): FormState<T> {
      return {
        ...state,
        isValid: computeIsValid(state.errors),
        isDirty: computeIsDirty(state.values, initialRef.current, state.dirty),
      };
    },
  };

  const useFormReturn: UseFormReturn<T> = {
    get state() {
      return derivedState.state;
    },
    actions,
    field: (name: string) => {
      const fieldState = derivedState.state;
      return {
        value: fieldState.values[name],
        error: fieldState.errors[name],
        dirty: fieldState.dirty[name],
        touched: fieldState.touched[name],
        onChange: (value: any) => actions.setValue(name, value),
        onBlur: () => actions.setTouched(name, true),
      };
    },
  };

  return { state: derivedState.state, actions, useFormReturn };
}

export type { FormSchema, FormValues, FormState, FormActions, UseFormReturn, ValidationResult, ValidationError };