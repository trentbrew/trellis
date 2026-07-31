import { createFormCore, type FormSchema, type UseFormReturn, type FormState, type FormActions } from '../core/index.js';
import type { AnyType } from '../../schema/define.js';
import * as React from 'react';
import { useSyncExternalStore } from 'react';

export interface FormFieldProps<K extends string> {
  name: K;
  children: (field: {
    value: any;
    error: string | null;
    dirty: boolean;
    touched: boolean;
    onChange: (value: any) => void;
    onBlur: () => void;
  }) => React.ReactElement;
}

export interface FormProps<T extends AnyType> {
  schema: T;
  initialValues?: Partial<any>;
  onSubmit?: (values: any) => Promise<void>;
  children: (form: UseFormReturn<any>) => React.ReactElement;
}

function getFormSchema<T extends AnyType>(schema: T): FormSchema<T> {
  const { toFormSchema } = require('../core/types.js');
  return toFormSchema(schema);
}

export function useForm<T extends AnyType>(schema: T, initialValues?: any): UseFormReturn<any> {
  const formSchema = getFormSchema(schema);
  const core = createFormCore(formSchema, initialValues);

  const subscribe = (callback: () => void) => {
    core.actions.validate = (async (values?: any) => {
      const result = await core.actions.validate(values);
      callback();
      return result;
    }) as any;
    return () => {};
  };

  const snapshot = useSyncExternalStore(
    subscribe,
    () => core.state,
    () => core.state,
  );

  return {
    state: snapshot,
    actions: core.actions,
    field: core.useFormReturn.field,
  };
}

export function Form<T extends AnyType>({
  schema,
  initialValues,
  onSubmit,
  children,
}: FormProps<T>) {
  const form = useForm(schema, initialValues);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) await form.actions.submit(onSubmit);
  };

  return React.createElement('form', { onSubmit: handleSubmit }, children(form));
}

export function Field<K extends string>({
  name,
  children,
}: FormFieldProps<K>) {
  // Field needs to get form from context in real implementation
  const form = useForm(null as any, null as any);
  const field = form.field(name);
  return children(field);
}