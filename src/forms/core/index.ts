/**
 * Form Engine — headless form state machine (values, errors, dirty/touched,
 * validation, submit). Framework-free.
 *
 * Ported from the `form-v1` sprite work and merged with the descriptor
 * contract: `createFormCore` runs off a {@link FormSchema}, which is built
 * either from a `defineType` handle (zod validation) or a headless
 * `FormDescriptor` (metadata validation).
 *
 * Framework adapters (`trellis/forms/react`, `/vue`, `/svelte`, `/vanilla`)
 * build their reactivity on {@link UseFormReturn.subscribe}.
 *
 * @module trellis/forms/core
 */

import type {
  FieldBinding,
  FormActions,
  FormSchema,
  FormState,
  FormValues,
  UseFormReturn,
  ValidationError,
  ValidationResult,
} from './types.js';
import { validateFieldValue } from './validate.js';

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
} from './types.js';

export {
  formSchemaFrom,
  formSchemaFromDescriptor,
  toFormSchema,
} from './schema.js';

function createInitialState(
  initialValues: FormValues,
  fields: FormSchema['fields'],
): FormState {
  const shape: Record<string, unknown> = {};
  for (const f of fields) {
    if (initialValues[f.name] !== undefined) {
      shape[f.name] = initialValues[f.name];
    } else if (f.required && f.valueType !== 'checkbox') {
      shape[f.name] = '';
    } else {
      shape[f.name] = undefined;
    }
  }
  return {
    values: shape,
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

function computeIsDirty(
  values: FormValues,
  initialValues: FormValues,
  dirty: Record<string, boolean>,
): boolean {
  return Object.keys(values).some(
    (k) => dirty[k] || values[k] !== initialValues[k],
  );
}

/**
 * Create a headless form core for an entity schema.
 *
 *   const core = createFormCore(formSchemaFromDescriptor(descriptor));
 *   const unsub = core.subscribe(() => render(core.state));
 *   core.actions.setValue('title', 'Fix the sync');
 *   await core.actions.submit(async (values) => createEntity(type, values));
 */
export function createFormCore(
  formSchema: FormSchema,
  initialValues: FormValues = {},
): UseFormReturn {
  let state = createInitialState(initialValues, formSchema.fields);
  const initialRef = { current: { ...state.values } };
  const subscribers = new Set<() => void>();

  const notify = () => subscribers.forEach((fn) => fn());

  const validateField = async (
    fieldName: string,
    value: unknown,
  ): Promise<string | null> => {
    const field = formSchema.fields.find((f) => f.name === fieldName);
    if (!field) return null;
    return validateFieldValue(field, value, formSchema.zod?.shape);
  };

  const validate = async (
    values?: Partial<FormValues>,
  ): Promise<ValidationResult> => {
    const toValidate = values ?? state.values;
    const errors: ValidationError[] = [];

    for (const field of formSchema.fields) {
      if (field.computed) continue;
      const err = await validateField(field.name, toValidate[field.name]);
      if (err) errors.push({ field: field.name, message: err });
    }

    return { valid: errors.length === 0, errors, data: toValidate as FormValues };
  };

  const actions: FormActions = {
    setValue: (field, value) => {
      state = {
        ...state,
        values: { ...state.values, [field]: value },
        dirty: { ...state.dirty, [field]: true },
      };
      notify();
    },

    setValues: (values) => {
      const newDirty = { ...state.dirty };
      for (const k of Object.keys(values)) newDirty[k] = true;
      state = { ...state, values: { ...state.values, ...values }, dirty: newDirty };
      notify();
    },

    setError: (field, error) => {
      state = { ...state, errors: { ...state.errors, [field]: error } };
      notify();
    },

    setErrors: (errors) => {
      state = { ...state, errors: { ...state.errors, ...errors } };
      notify();
    },

    setTouched: (field, touched) => {
      state = { ...state, touched: { ...state.touched, [field]: touched } };
      notify();
    },

    setDirty: (field, dirty) => {
      state = { ...state, dirty: { ...state.dirty, [field]: dirty } };
      notify();
    },

    validate: async (values) => {
      const result = await validate(values);
      if (!values) {
        state = {
          ...state,
          errors: Object.fromEntries(
            result.errors.map((e) => [e.field, e.message]),
          ),
        };
        notify();
      }
      return result;
    },

    validateField: async (field, value) => {
      const err = await validateField(field, value);
      actions.setError(field, err);
      return err;
    },

    reset: (values) => {
      const next = values
        ? { ...initialRef.current, ...values }
        : initialRef.current;
      state = createInitialState({ ...next }, formSchema.fields);
      initialRef.current = { ...state.values };
      notify();
    },

    submit: async (onSubmit) => {
      state = { ...state, isSubmitting: true };
      notify();
      const result = await validate();
      if (result.valid) {
        try {
          await onSubmit({ ...state.values });
        } finally {
          state = { ...state, isSubmitting: false };
          notify();
        }
      } else {
        state = {
          ...state,
          isSubmitting: false,
          errors: Object.fromEntries(
            result.errors.map((e) => [e.field, e.message]),
          ),
        };
        notify();
      }
    },
  };

  const core: UseFormReturn = {
    get state(): FormState {
      return {
        ...state,
        isValid: computeIsValid(state.errors),
        isDirty: computeIsDirty(state.values, initialRef.current, state.dirty),
      };
    },
    actions,
    field: (name: string): FieldBinding => {
      const s = core.state;
      return {
        value: s.values[name],
        error: s.errors[name],
        dirty: s.dirty[name],
        touched: s.touched[name],
        onChange: (value: unknown) => actions.setValue(name, value),
        onBlur: () => actions.setTouched(name, true),
      };
    },
    subscribe: (listener: () => void) => {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
  };

  return core;
}
