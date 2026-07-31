/**
 * Engine schema adapters — `TrellisType` or `FormDescriptor` → `FormSchema`.
 *
 * @module trellis/forms/core
 */

import type { AnyType } from '../../schema/define.js';
import type { PropertyValueSpecification } from '../../core/ontology/types.js';
import type { FormDescriptor } from '../types.js';
import type { FormFieldConfig, FormSchema } from './types.js';

function fieldConfigFromSpec(
  spec: PropertyValueSpecification,
): FormFieldConfig {
  return {
    name: spec.name,
    valueType: spec.valueType,
    required: spec.required ?? false,
    ...(spec.selectOptions && spec.selectOptions.length > 0
      ? { selectOptions: spec.selectOptions }
      : {}),
    ...(spec.relation && spec.relation.targetSchema && spec.relation.cardinality
      ? {
          relation: {
            targetSchema: spec.relation.targetSchema,
            cardinality: spec.relation.cardinality,
          },
        }
      : {}),
    computed: spec.computed === true,
    isTitle: spec.valueType === 'title',
    ...(spec.min !== undefined ||
    spec.max !== undefined ||
    spec.pattern !== undefined ||
    spec.minLength !== undefined ||
    spec.maxLength !== undefined
      ? {
          validation: {
            ...(spec.min !== undefined ? { min: spec.min } : {}),
            ...(spec.max !== undefined ? { max: spec.max } : {}),
            ...(spec.pattern !== undefined ? { pattern: spec.pattern } : {}),
            ...(spec.minLength !== undefined ? { minLength: spec.minLength } : {}),
            ...(spec.maxLength !== undefined ? { maxLength: spec.maxLength } : {}),
          },
        }
      : {}),
  };
}

/**
 * Build an engine `FormSchema` from a `defineType` handle — keeps the zod
 * shape, so validation is precise (email/url/enum/length checks run).
 */
export function toFormSchema<T extends AnyType>(schema: T): FormSchema {
  const def = schema.definition;
  const fields: FormFieldConfig[] = def.fields.map(fieldConfigFromSpec);

  return {
    typeName: def['@id'].replace('trellis:', ''),
    fields,
    zod: schema.zod.shape ? { shape: schema.zod.shape } : undefined,
    titleKey: fields.find((f) => f.isTitle)?.name,
  };
}

/**
 * Build an engine `FormSchema` from a headless `FormDescriptor` — no zod
 * shape; validation runs against lifted field metadata (required, min/max,
 * pattern, lengths, select options).
 */
export function formSchemaFromDescriptor(
  descriptor: FormDescriptor,
): FormSchema {
  const fields: FormFieldConfig[] = descriptor.fields.map((f) => ({
    name: f.name,
    valueType: f.valueType,
    required: f.required,
    ...(f.options && f.options.length > 0
      ? { selectOptions: f.options.map((o) => o.value) }
      : {}),
    ...(f.relation && f.relation.targetSchema && f.relation.cardinality
      ? {
          relation: {
            targetSchema: f.relation.targetSchema,
            cardinality: f.relation.cardinality,
          },
        }
      : {}),
    computed: f.readonly,
    isTitle: f.name === descriptor.titleField,
    ...(f.validation ? { validation: f.validation } : {}),
  }));

  return {
    typeName: descriptor.entityType,
    fields,
    titleKey: descriptor.titleField,
  };
}

/**
 * Accept either input for the framework adapters — a `TrellisType` handle
 * (in-process, zod validation) or a headless `FormDescriptor` (remote-safe,
 * metadata validation).
 */
export function formSchemaFrom(
  input: AnyType | FormDescriptor,
): FormSchema {
  return 'definition' in input
    ? toFormSchema(input as AnyType)
    : formSchemaFromDescriptor(input as FormDescriptor);
}
