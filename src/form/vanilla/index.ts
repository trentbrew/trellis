import { createFormCore, type FormSchema, type FormState, type FormActions } from '../core/index.js';
import type { AnyType } from '../../schema/define.js';

function getFormSchema<T extends AnyType>(schema: T): FormSchema<T> {
  const { toFormSchema } = require('../core/types.js');
  return toFormSchema(schema);
}

export interface VanillaForm<T extends AnyType> {
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
  subscribe: (listener: (state: FormState<any>) => void) => () => void;
}

export function createVanillaForm<T extends AnyType>(schema: T, initialValues?: any): VanillaForm<T> {
  const formSchema = getFormSchema(schema);
  const core = createFormCore(formSchema, initialValues);

  const listeners = new Set<(state: FormState<any>) => void>();

  const notify = () => {
    listeners.forEach((fn) => fn(core.state));
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

  const field = (name: string) => ({
    get value() { return core.state.values[name]; },
    get error() { return core.state.errors[name]; },
    get dirty() { return core.state.dirty[name]; },
    get touched() { return core.state.touched[name]; },
    onChange: (value: any) => actions.setValue(name, value),
    onBlur: () => actions.setTouched(name, true),
  });

  return {
    get state() { return core.state; },
    actions,
    field,
    subscribe: (listener: (state: FormState<any>) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function bindFormToDOM<T extends AnyType>(
  form: VanillaForm<T>,
  formElement: HTMLFormElement,
  fieldSelectors: Record<string, string>,
): () => void {
  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    await form.actions.validate();
    if (form.state.isValid) {
      console.log('Form valid, values:', form.state.values);
    }
  };

  formElement.addEventListener('submit', handleSubmit);

  const fieldElements: Record<string, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> = {};
  for (const [name, selector] of Object.entries(fieldSelectors)) {
    const el = formElement.querySelector(selector) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
    if (el) {
      fieldElements[name] = el;
      const sync = () => {
        form.actions.setValue(name, (el as any).value);
        form.actions.setTouched(name, true);
      };
      el.addEventListener('input', sync);
      el.addEventListener('blur', () => form.actions.setTouched(name, true));
    }
  }

  const unsubscribe = form.subscribe((state) => {
    for (const [name, el] of Object.entries(fieldElements)) {
      if (document.activeElement !== el) {
        (el as any).value = state.values[name] ?? '';
      }
      const errorEl = formElement.querySelector(`[data-error-for="${name}"]`);
      if (errorEl) {
        errorEl.textContent = state.errors[name] ?? '';
        (errorEl as HTMLElement).style.display = state.errors[name] ? 'block' : 'none';
      }
    }
  });

  return () => {
    formElement.removeEventListener('submit', handleSubmit);
    for (const el of Object.values(fieldElements)) {
      el.removeEventListener('input', () => {});
      el.removeEventListener('blur', () => {});
    }
    unsubscribe();
  };
}