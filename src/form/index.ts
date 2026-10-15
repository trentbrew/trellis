export {
  type FormSchema,
  type FormValues,
  type FormState,
  type FormActions,
  type UseFormReturn,
  type ValidationResult,
  type ValidationError,
  type FormFieldConfig,
  toFormSchema,
} from './core/types.js';

export {
  createFormCore,
  type FormSchema as CoreFormSchema,
  type FormValues as CoreFormValues,
  type FormState as CoreFormState,
  type FormActions as CoreFormActions,
  type UseFormReturn as CoreUseFormReturn,
} from './core/index.js';

export {
  useForm,
  Form,
  Field,
  type FormProps,
  type FormFieldProps,
} from './react/index.js';

export {
  createFormStore,
  useForm as useFormSvelte,
} from './svelte/index.js';

export {
  useFormVue,
  type UseFormReturnVue,
} from './vue/index.js';

export {
  createVanillaForm,
  bindFormToDOM,
  type VanillaForm,
} from './vanilla/index.js';