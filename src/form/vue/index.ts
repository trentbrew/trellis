import { createFormCore, type FormSchema, type FormState, type FormActions } from '../core/index.js';
import type { AnyType } from '../../schema/define.js';
import { ref, computed, reactive, watch, type Ref, type ComputedRef } from 'vue';

function getFormSchema<T extends AnyType>(schema: T): FormSchema<T> {
  const { toFormSchema } = require('../core/types.js');
  return toFormSchema(schema);
}

export function useFormVue<T extends AnyType>(schema: T, initialValues?: any) {
  const formSchema = getFormSchema(schema);
  const core = createFormCore(formSchema, initialValues);

  const state = reactive(core.state);

  const notify = () => {
    Object.assign(state, core.state);
  };

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
    return {
      get value() { return state.values[name]; },
      get error() { return state.errors[name]; },
      get dirty() { return state.dirty[name]; },
      get touched() { return state.touched[name]; },
      onChange: (value: any) => actions.setValue(name, value),
      onBlur: () => actions.setTouched(name, true),
    };
  };

  return {
    state,
    actions,
    field,
  };
}

export type UseFormReturnVue<T extends AnyType> = {
  state: FormState<any>;
  actions: FormActions<any>;
  field: (name: string) => {
    value: any;
    error: string | null;
    dirty: boolean;
    touched: boolean;
    onChange: (value: any) => void;
    onBlur: () => void;
  };
};