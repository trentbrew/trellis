/**
 * Form field validation — the dual-path validator.
 *
 * When the form schema carries a zod shape (`toFormSchema` path), the field's
 * zod schema executes — precise, schema-authored checks (email, url, enums,
 * lengths). When the form came from a descriptor (remote or runtime-registered
 * schemas), validation runs against the lifted metadata instead.
 *
 * @module trellis/forms/core
 */

import { z, type ZodTypeAny } from 'zod';
import type { FormFieldConfig } from './types.js';

// ---------------------------------------------------------------------------
// Zod path
// ---------------------------------------------------------------------------

async function validateWithZod(
  fieldSchema: ZodTypeAny,
  value: unknown,
): Promise<string | null> {
  try {
    await fieldSchema.parseAsync(value);
    return null;
  } catch (err) {
    if (err instanceof z.ZodError) {
      return err.errors[0]?.message ?? 'Invalid value';
    }
    return 'Validation failed';
  }
}

// ---------------------------------------------------------------------------
// Metadata path
// ---------------------------------------------------------------------------

function isEmpty(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0)
  );
}

function validateWithMetadata(
  field: FormFieldConfig,
  value: unknown,
): string | null {
  if (field.computed) return null;

  if (field.required && isEmpty(value)) {
    return 'Required';
  }
  if (isEmpty(value)) return null;

  const v = field.validation;
  if (typeof value === 'number') {
    if (v?.min !== undefined && value < v.min) {
      return `Must be at least ${v.min}`;
    }
    if (v?.max !== undefined && value > v.max) {
      return `Must be at most ${v.max}`;
    }
  }

  if (typeof value === 'string') {
    if (v?.minLength !== undefined && value.length < v.minLength) {
      return `Must be at least ${v.minLength} characters`;
    }
    if (v?.maxLength !== undefined && value.length > v.maxLength) {
      return `Must be at most ${v.maxLength} characters`;
    }
    if (v?.pattern !== undefined && !new RegExp(v.pattern).test(value)) {
      return 'Invalid format';
    }
  }

  if (
    field.selectOptions &&
    field.selectOptions.length > 0 &&
    !field.selectOptions.includes(value as never)
  ) {
    return 'Invalid option';
  }

  return null;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/** Validate one field value against the schema's zod shape or metadata. */
export async function validateFieldValue(
  field: FormFieldConfig,
  value: unknown,
  zodShape?: Record<string, ZodTypeAny | undefined>,
): Promise<string | null> {
  const fieldSchema = zodShape?.[field.name];
  if (fieldSchema) return validateWithZod(fieldSchema, value);
  return validateWithMetadata(field, value);
}
