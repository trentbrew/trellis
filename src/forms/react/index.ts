/**
 * Trellis Forms React — `useForm` + `<Form>` / `<Field>` bindings.
 *
 * Import from `trellis/forms/react`:
 *
 *   import { useForm, Form, Field } from 'trellis/forms/react';
 *
 * Accepts a `defineType` handle (in-process, zod validation) or a headless
 * `FormDescriptor` (remote or runtime-registered schemas).
 *
 * @module trellis/forms/react
 */

import * as React from 'react';
import {
  createContext,
  createElement,
  useContext,
  useRef,
  useSyncExternalStore,
} from 'react';
import type { AnyType } from '../../schema/define.js';
import type { FormDescriptor } from '../types.js';
import {
  createFormCore,
  formSchemaFrom,
  type FieldBinding,
  type UseFormReturn,
} from '../core/index.js';
import type { FormValues } from '../core/types.js';

export type FormSchemaInput = AnyType | FormDescriptor;

export interface FormFieldProps<K extends string> {
  name: K;
  children: (field: FieldBinding) => React.ReactElement;
}

export interface FormProps {
  schema: FormSchemaInput;
  initialValues?: FormValues;
  onSubmit?: (values: FormValues) => Promise<void>;
  children: (form: UseFormReturn) => React.ReactElement;
}

const FormContext = createContext<UseFormReturn | null>(null);

/**
 * Bind a form core to React. The core is created once per schema; state
 * flows through `useSyncExternalStore`.
 */
export function useForm(
  schema: FormSchemaInput,
  initialValues?: FormValues,
): UseFormReturn {
  const ref = useRef<UseFormReturn | null>(null);
  if (ref.current === null) {
    ref.current = createFormCore(formSchemaFrom(schema), initialValues ?? {});
  }
  const core = ref.current;

  const state = useSyncExternalStore(
    core.subscribe,
    () => core.state,
    () => core.state,
  );

  return {
    state,
    actions: core.actions,
    field: core.field,
    subscribe: core.subscribe,
  };
}

/** Read the nearest form from context (inside `<Form>`). */
export function useFormContext(): UseFormReturn {
  const form = useContext(FormContext);
  if (!form) {
    throw new Error(
      'useFormContext / <Field> must be used inside a <Form> provider',
    );
  }
  return form;
}

/** `<form>` element wired to a form core, providing context to `<Field>`. */
export function Form({ schema, initialValues, onSubmit, children }: FormProps) {
  const form = useForm(schema, initialValues);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) void form.actions.submit(onSubmit);
  };

  return createElement(
    FormContext.Provider,
    { value: form },
    createElement('form', { onSubmit: handleSubmit }, children(form)),
  );
}

/** Render-prop field binding for one attribute, from the nearest `<Form>`. */
export function Field<K extends string>({ name, children }: FormFieldProps<K>) {
  const form = useFormContext();
  return children(form.field(name));
}
