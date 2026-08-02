/**
 * Trellis Forms Svelte — `createFormStore` store-contract bindings.
 *
 * Import from `trellis/forms/svelte`:
 *
 *   const form = createFormStore(taskDescriptor);
 *   $: titleField = $form.field('title');
 *   <input bind:value={titleField.value} on:input={...} />
 *
 * This adapter takes **no dependency on the svelte package** — like
 * `trellis/svelte` (src/svelte/stores.ts), it only satisfies the store
 * contract (`subscribe(run) => unsubscribe`), so it works across Svelte 4/5.
 *
 * @module trellis/forms/svelte
 */

import type { AnyType } from '../../schema/define.js';
import type { FormDescriptor } from '../types.js';
import { toSvelteStore } from '../../headless/index.js';
import {
  createFormCore,
  formSchemaFrom,
  type FieldBinding,
  type UseFormReturn,
} from '../core/index.js';
import type { FormState, FormValues } from '../core/types.js';

export type FormSchemaInput = AnyType | FormDescriptor;

/** Minimal svelte-store-compatible read contract. */
export interface ReadableLike<T> {
  subscribe(run: (value: T) => void): () => void;
}

export interface FormStore {
  state: ReadableLike<FormState>;
  actions: UseFormReturn['actions'];
  field: (name: string) => ReadableLike<FieldBinding>;
  /** Raw core (framework-free) for advanced use. */
  core: UseFormReturn;
}

/**
 * Create a store-contract form for a schema. `state` and `field(name)` are
 * svelte-store-compatible; actions mutate the shared core.
 */
export function createFormStore(
  schema: FormSchemaInput,
  initialValues?: FormValues,
): FormStore {
  const core = createFormCore(formSchemaFrom(schema), initialValues ?? {});

  return {
    state: toSvelteStore(core),
    actions: core.actions,
    field: (name: string) =>
      toSvelteStore(core, (s: any) => ({
        value: s.values[name],
        error: s.errors[name],
        dirty: s.dirty[name],
        touched: s.touched[name],
        onChange: (value: unknown) => core.actions.setValue(name, value),
        onBlur: () => core.actions.setTouched(name, true),
      })),
    core,
  };
}

/** Alias kept for the sprite-era API surface. */
export function useFormSvelte(
  schema: FormSchemaInput,
  initialValues?: FormValues,
): FormStore {
  return createFormStore(schema, initialValues);
}
