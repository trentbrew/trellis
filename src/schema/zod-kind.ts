/**
 * Zod type checks that work across copies of zod.
 *
 * `instanceof z.ZodNumber` is only true for schemas built with *this* bundle's zod.
 * An app that imports its own `zod` (the normal case — dist/ bundles a copy) builds
 * schemas whose classes are different objects, so `instanceof` silently fails and
 * every field falls through to a default. Zod stamps each schema with its kind in
 * `_def.typeName` (`ZodFirstPartyTypeKind`), which is identical in every copy.
 */

export type ZodKind =
  | 'ZodString'
  | 'ZodNumber'
  | 'ZodBoolean'
  | 'ZodDate'
  | 'ZodEnum'
  | 'ZodNativeEnum'
  | 'ZodArray'
  | 'ZodObject'
  | 'ZodOptional'
  | 'ZodNullable'
  | 'ZodDefault'
  | (string & {});

/** The schema's zod kind, or undefined for non-zod values. */
export function zodKind(schema: unknown): ZodKind | undefined {
  const typeName = (schema as { _def?: { typeName?: unknown } } | null | undefined)?._def?.typeName;
  return typeof typeName === 'string' ? (typeName as ZodKind) : undefined;
}

/** Is this a ZodError from any copy of zod? */
export function isZodError(
  error: unknown,
): error is Error & { issues: Array<{ message: string }>; errors: Array<{ message: string }> } {
  return (
    error instanceof Error &&
    error.name === 'ZodError' &&
    Array.isArray((error as { issues?: unknown }).issues)
  );
}
