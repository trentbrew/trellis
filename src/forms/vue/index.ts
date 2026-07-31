/**
 * Trellis Forms Vue — `useFormVue` composable.
 *
 * Import from `trellis/forms/vue`:
 *
 *   const { state, actions, field } = useFormVue(taskDescriptor);
 *
 * Accepts a `defineType` handle or a headless `FormDescriptor`. State is a
 * Vue `reactive` object kept in sync with the form core.
 *
 * @module trellis/forms/vue
 */

import { reactive } from 'vue';
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

export interface UseFormReturnVue extends UseFormReturn {
  state: UseFormReturn['state'];
}

/**
 * Create a reactive Vue form from a schema. The core's state is mirrored
 * into a `reactive()` object via subscription; `field(name)` exposes
 * reactive getters for template bindings.
 */
export function useFormVue(
  schema: FormSchemaInput,
  initialValues?: FormValues,
): UseFormReturnVue {
  const core = createFormCore(formSchemaFrom(schema), initialValues ?? {});
  const state = reactive(core.state);

  core.subscribe(() => {
    Object.assign(state, core.state);
  });

  const field = (name: string): FieldBinding => {
    return {
      get value() {
        return state.values[name];
      },
      get error() {
        return state.errors[name];
      },
      get dirty() {
        return state.dirty[name];
      },
      get touched() {
        return state.touched[name];
      },
      onChange: (value: unknown) => core.actions.setValue(name, value),
      onBlur: () => core.actions.setTouched(name, true),
    };
  };

  return {
    get state() {
      return state as UseFormReturn['state'];
    },
    actions: core.actions,
    field,
    subscribe: core.subscribe,
  };
}

export type { FieldBinding };
