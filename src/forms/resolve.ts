/**
 * Form Resolution — the end-to-end path: schemas → derive → graph overrides.
 *
 * `resolveFormDescriptor` is the entry point UIs and tools should use: it
 * finds the schema for an entity type, derives the headless descriptor, and
 * layers any `trellis:Form` override entities on top.
 *
 * @module trellis/forms
 */

import { findSchemaForType } from '../core/ontology/sync-policy.js';
import type { SchemaDefinition } from '../core/ontology/types.js';
import { deriveFormDescriptor } from './derive.js';
import {
  applyFormOverride,
  formEntityToOverride,
  formMatchesMode,
} from './overrides.js';
import type {
  FormDescriptor,
  FormEntityLike,
  FormMode,
  FormOverride,
} from './types.js';

export interface ResolveFormOptions {
  /** Derive for one interaction mode (default: `create`). */
  mode?: FormMode;
  /** Graph `Form` override entities (pre-resolved relations). */
  forms?: Array<FormEntityLike | FormOverride>;
  /** Pre-normalized overrides (wins over `forms` for overlapping ids). */
  overrides?: FormOverride[];
}

function toOverride(
  entry: FormEntityLike | FormOverride,
): FormOverride {
  return 'type' in entry
    ? formEntityToOverride(entry as FormEntityLike)
    : (entry as FormOverride);
}

/**
 * Resolve the headless form descriptor for an entity type.
 *
 * Pure over kernel state — pass the registered schemas (`kernel.listOntologies()`)
 * and any `Form` entities read from the graph. Returns `undefined` when the
 * type has no registered schema.
 */
export function resolveFormDescriptor(
  ontologies: Iterable<SchemaDefinition>,
  type: string,
  opts: ResolveFormOptions = {},
): FormDescriptor | undefined {
  const mode = opts.mode ?? 'create';
  const schema = findSchemaForType(ontologies, type);
  if (!schema) return undefined;

  const descriptor = deriveFormDescriptor(schema, { mode });

  const overrides = [
    ...(opts.overrides ?? []),
    ...(opts.forms ?? []).map(toOverride),
  ];

  const matching = overrides.filter(
    (o) =>
      o.entityType === descriptor.entityType &&
      formMatchesMode(o, descriptor.mode),
  );
  if (matching.length > 0) {
    // Mode-scoped overrides win over mode-less ones for this mode.
    const scoped = matching.filter((o) => o.mode === mode);
    for (const ov of scoped.length > 0 ? scoped : matching) {
      applyFormOverride(descriptor, ov);
    }
  }

  return descriptor;
}

/** List entity types with registered schemas (form derivable). */
export function listFormableTypes(
  ontologies: Iterable<SchemaDefinition>,
): Array<{ entityType: string; schemaId: string; label: string }> {
  return Array.from(ontologies).map((schema) => {
    const id = schema['@id'];
    const idx = id.lastIndexOf(':');
    return {
      entityType: idx >= 0 ? id.slice(idx + 1) : id,
      schemaId: id,
      label: schema.label ?? id,
    };
  });
}
