/// <reference path="../svelte.d.ts" />
import { createFormCore, type FormSchema, type UseFormReturn, type FormState, type FormActions } from '../core/index.js';
import type { AnyType } from '../../schema/define.js';
import { writable, derived, type Readable, type Writable } from 'svelte/store';

function getFormSchema<T extends AnyType>(schema: T): FormSchema<T> {
  const { toFormSchema } = require('../core/types.js');
  return toFormSchema(schema);
}

export function createFormStore<T extends AnyType>(
  schema: T,
  initialValues?: any,
): {
  state: Readable<FormState<any>>;
  actions: FormActions<any>;
  field: (name: string) => Readable<{
    value: any;
    error: string | null;
    dirty: boolean;
    touched: boolean;
    onChange: (value: any) => void;
    onBlur: () => void;
  }>;
} {
  const formSchema = getFormSchema(schema);
  const core = createFormCore(formSchema, initialValues);

  const stateStore: Writable<FormState<any>> = writable(core.state);
  const notify = () => stateStore.set(core.state);

  const actions: FormActions<any> = {
    ...core.actions,
    validate: async (values?: any) => {
      const result = await core.actions.validate(values);
      notify();
      return result;
    },
    validateField: async (field: string, value: any) => {
      const result = await core.actions.validateField(field, value);
      notify();
      return result;
    },
    setValue: (field: string, value: any) => {
      core.actions.setValue(field, value);
      notify();
    },
    setValues: (values: any) => {
      core.actions.setValues(values);
      notify();
    },
    setError: (field: string, error: string | null) => {
      core.actions.setError(field, error);
      notify();
    },
    setTouched: (field: string, touched: boolean) => {
      core.actions.setTouched(field, touched);
      notify();
    },
    setDirty: (field: string, dirty: boolean) => {
      core.actions.setDirty(field, dirty);
      notify();
    },
    reset: (values?: any) => {
      core.actions.reset(values);
      notify();
    },
    submit: async (onSubmit: (values: any) => Promise<void>) => {
      await core.actions.submit(onSubmit);
      notify();
    },
  };

  const field = (name: string) => {
    return derived(stateStore, (($state: FormState<any>) => {
      return {
        value: $state.values[name],
        error: $state.errors[name],
        dirty: $state.dirty[name],
        touched: $state.touched[name],
        onChange: (value: any) => actions.setValue(name, value),
        onBlur: () => actions.setTouched(name, true),
      };
    }));
  };

  return { state: stateStore, actions, field };
}

export function useForm<T extends AnyType>(schema: T, initialValues?: any) {
  return createFormStore(schema, initialValues);
}