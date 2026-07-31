/**
 * Trellis Forms Vanilla — framework-free bindings + DOM glue.
 *
 * Import from `trellis/forms/vanilla`:
 *
 *   const form = createVanillaForm(taskDescriptor);
 *   const unbind = bindFormToDOM(form, document.querySelector('form'), {
 *     title: '[name="title"]',
 *   }, async (values) => createEntity(type, values));
 *
 * @module trellis/forms/vanilla
 */

import type { AnyType } from '../../schema/define.js';
import type { FormDescriptor } from '../types.js';
import {
  createFormCore,
  formSchemaFrom,
  type FieldBinding,
  type UseFormReturn,
} from '../core/index.js';
import type { FormState, FormValues } from '../core/types.js';

export type FormSchemaInput = AnyType | FormDescriptor;

export interface VanillaForm extends UseFormReturn {
  field: (name: string) => FieldBinding;
  subscribe: (listener: (state: FormState) => void) => () => void;
}

/** Create a framework-free form core with a state-subscription surface. */
export function createVanillaForm(
  schema: FormSchemaInput,
  initialValues?: FormValues,
): VanillaForm {
  const core = createFormCore(formSchemaFrom(schema), initialValues ?? {});

  const form: VanillaForm = {
    get state() {
      return core.state;
    },
    actions: core.actions,
    field: core.field,
    subscribe: (listener: (state: FormState) => void) =>
      core.subscribe(() => listener(core.state)),
  };

  return form;
}

export interface DomBindOptions {
  /** Attribute name for per-field error text (`data-error-for="{name}"`). */
  errorAttribute?: string;
}

/**
 * Bind a vanilla form to real DOM: two-way value sync via `input`/`blur`,
 * submit handling with validation, and error text rendered into
 * `[data-error-for]` elements. Returns an unbind function.
 */
export function bindFormToDOM(
  form: VanillaForm,
  formElement: HTMLFormElement,
  fieldSelectors: Record<string, string>,
  onSubmit?: (values: FormValues) => Promise<void>,
  options: DomBindOptions = {},
): () => void {
  const errorAttribute = options.errorAttribute ?? 'data-error-for';

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    void (async () => {
      const result = await form.actions.validate();
      if (result.valid) {
        await onSubmit?.(form.state.values);
      }
    })();
  };
  formElement.addEventListener('submit', handleSubmit);

  const fieldElements: Record<
    string,
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  > = {};
  const removers: Array<() => void> = [];

  for (const [name, selector] of Object.entries(fieldSelectors)) {
    const el = formElement.querySelector(
      selector,
    ) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
    if (!el) continue;
    fieldElements[name] = el;

    const onInput = () => {
      form.actions.setValue(name, el.value);
    };
    const onBlur = () => {
      form.actions.setTouched(name, true);
    };
    el.addEventListener('input', onInput);
    el.addEventListener('blur', onBlur);
    removers.push(() => {
      el.removeEventListener('input', onInput);
      el.removeEventListener('blur', onBlur);
    });
  }

  const unsubscribe = form.subscribe((state) => {
    for (const [name, el] of Object.entries(fieldElements)) {
      if (document.activeElement !== el) {
        el.value = state.values[name] !== undefined ? String(state.values[name]) : '';
      }
      const errorEl = formElement.querySelector(
        `[${errorAttribute}="${name}"]`,
      );
      if (errorEl) {
        errorEl.textContent = state.errors[name] ?? '';
        (errorEl as HTMLElement).style.display = state.errors[name]
          ? 'block'
          : 'none';
      }
    }
  });

  return () => {
    formElement.removeEventListener('submit', handleSubmit);
    removers.forEach((remove) => remove());
    unsubscribe();
  };
}
