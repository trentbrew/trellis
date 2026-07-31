import type {
  TrellisType,
  AnyType,
  InferType,
} from '../../schema/define.js';
import type {
  PropertyValueSpecification,
  PropertyType,
  SchemaDefinition,
} from '../../core/ontology/types.js';
import type { Atom } from '../../core/store/eav-store.js';
import type { z } from 'zod';

export interface FormFieldConfig {
  name: string;
  valueType: PropertyType;
  required: boolean;
  selectOptions?: readonly Atom[];
  relation?: { targetSchema: string; cardinality: 'one' | 'many' } | null;
  computed?: boolean;
  isTitle?: boolean;
}

export interface FormSchema<T extends AnyType> {
  typeName: string;
  fields: FormFieldConfig[];
  zod: z.ZodObject<any>;
  relations: T['relations'];
  computed: T['computed'];
  titleKey: string | undefined;
}

export function toFormSchema<T extends AnyType>(schema: T): FormSchema<T> {
  const def = schema.definition;
  const fields: FormFieldConfig[] = def.fields.map((f: PropertyValueSpecification) => ({
    name: f.name,
    valueType: f.valueType,
    required: f.required ?? false,
    selectOptions: f.selectOptions,
    relation: f.relation && f.relation.targetSchema && f.relation.cardinality
      ? { targetSchema: f.relation.targetSchema, cardinality: f.relation.cardinality }
      : undefined,
    computed: f.computed === true,
    isTitle: f.valueType === 'title',
  }));

  return {
    typeName: def['@id'].replace('trellis:', ''),
    fields,
    zod: schema.zod,
    relations: schema.relations,
    computed: schema.computed,
    titleKey: fields.find((f) => f.isTitle)?.name,
  };
}

export type FormValues<T extends AnyType> = Partial<InferType<T>> & {
  [K in keyof T['relations']]?: T['relations'][K] extends { cardinality: 'many' }
    ? string[]
    : string;
};

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  data?: FormValues<AnyType>;
}

export interface FieldState<T = unknown> {
  value: T;
  error: string | null;
  dirty: boolean;
  touched: boolean;
}

export interface FormState<T extends FormValues<AnyType>> {
  values: T;
  errors: Record<string, string | null>;
  dirty: Record<string, boolean>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
}

export interface FormActions<T extends FormValues<AnyType>> {
  setValue: (field: string, value: any) => void;
  setValues: (values: Partial<T>) => void;
  setError: (field: string, error: string | null) => void;
  setErrors: (errors: Record<string, string | null>) => void;
  setTouched: (field: string, touched: boolean) => void;
  setDirty: (field: string, dirty: boolean) => void;
  validate: (values?: Partial<T>) => Promise<ValidationResult>;
  validateField: (field: string, value: any) => Promise<string | null>;
  reset: (values?: Partial<T>) => void;
  submit: (onSubmit: (values: T) => Promise<void>) => Promise<void>;
}

export interface UseFormReturn<T extends FormValues<AnyType>> {
  state: FormState<T>;
  actions: FormActions<T>;
  field: (name: string) => {
    value: any;
    error: string | null;
    dirty: boolean;
    touched: boolean;
    onChange: (value: any) => void;
    onBlur: () => void;
  };
}