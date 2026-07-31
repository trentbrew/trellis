/**
 * Form Derivation — entity schema → headless FormDescriptor.
 *
 * The derivation is a pure function of a {@link SchemaDefinition}: every
 * `PropertyValueSpecification` maps to a {@link FormFieldDescriptor} (control,
 * options, validation, mode visibility), fields group into sections via the
 * schema's `group` hints, and ordering follows `propertyFieldIds` (falling
 * back to declaration order, title first).
 *
 * Nothing here touches the kernel, the graph, or a UI framework — see
 * `./resolve.ts` for the graph-override path and `./ontology.ts` for the
 * `trellis:Form` override entities.
 *
 * @module trellis/forms
 */

import type {
  PropertyType,
  PropertyValueSpecification,
  SchemaDefinition,
} from '../core/ontology/types.js';
import type {
  FieldControl,
  FieldOption,
  FieldValidation,
  FormDescriptor,
  FormFieldDescriptor,
  FormMode,
  FormSectionDescriptor,
} from './types.js';

// ---------------------------------------------------------------------------
// ValueType → control mapping
// ---------------------------------------------------------------------------

function controlFor(
  spec: PropertyValueSpecification,
  readonly: boolean,
): FieldControl {
  if (readonly) return 'readonly';
  switch (spec.valueType) {
    case 'title':
      return 'text';
    case 'rich_text':
      return 'textarea';
    case 'number':
      return 'number';
    case 'checkbox':
      return 'checkbox';
    case 'select':
    case 'status':
      return 'select';
    case 'multi_select':
      return 'multi_select';
    case 'date':
      return 'date';
    case 'url':
    case 'email':
    case 'phone_number':
      return 'text';
    case 'relation':
      return 'relation';
    case 'people':
      return 'people';
    case 'files':
      return 'files';
    case 'json':
      return 'json';
    case 'rollup':
    case 'formula':
    case 'ai_generated':
      return 'readonly';
  }
}

function inputModeFor(spec: PropertyValueSpecification):
  | FormFieldDescriptor['inputMode']
  | undefined {
  switch (spec.valueType) {
    case 'url':
      return 'url';
    case 'email':
      return 'email';
    case 'phone_number':
      return 'tel';
    case 'number':
      return 'numeric';
    default:
      return undefined;
  }
}

// ---------------------------------------------------------------------------
// Humanization
// ---------------------------------------------------------------------------

/** `camelCaseName` → `Camel Case Name`; `snake_case` and `kebab-case` too. */
export function humanize(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(' ');
}

// ---------------------------------------------------------------------------
// Field derivation
// ---------------------------------------------------------------------------

function optionsFor(
  spec: PropertyValueSpecification,
): FieldOption[] | undefined {
  const raw = spec.selectOptions;
  if (!raw || raw.length === 0) return undefined;
  return raw.map((value) => ({ value, label: String(value) }));
}

function validationFor(
  spec: PropertyValueSpecification,
): FieldValidation | undefined {
  const v: FieldValidation = {};
  if (spec.required) v.required = true;
  if (spec.min !== undefined) v.min = spec.min;
  if (spec.max !== undefined) v.max = spec.max;
  if (spec.pattern !== undefined) v.pattern = spec.pattern;
  if (spec.minLength !== undefined) v.minLength = spec.minLength;
  if (spec.maxLength !== undefined) v.maxLength = spec.maxLength;
  return Object.keys(v).length > 0 ? v : undefined;
}

function modesFor(spec: PropertyValueSpecification): FormMode[] {
  const computed =
    spec.computed === true ||
    spec.valueType === 'rollup' ||
    spec.valueType === 'formula' ||
    spec.valueType === 'ai_generated' ||
    spec.editable === false;
  if (spec.modes && spec.modes.length > 0) {
    const modes = spec.modes.slice() as FormMode[];
    if (computed && !modes.includes('view')) modes.push('view');
    return modes;
  }
  return computed ? ['view'] : ['create', 'edit', 'view'];
}

function fieldFromSpec(
  spec: PropertyValueSpecification,
  order: number,
): FormFieldDescriptor {
  const readonly =
    spec.computed === true ||
    spec.valueType === 'rollup' ||
    spec.valueType === 'formula' ||
    spec.valueType === 'ai_generated' ||
    spec.editable === false;

  const field: FormFieldDescriptor = {
    name: spec.name,
    label: humanize(spec.name),
    control: controlFor(spec, readonly),
    valueType: spec.valueType,
    required: (spec.required ?? false) && !readonly,
    readonly,
    modes: modesFor(spec),
    order,
    section: spec.group ?? 'properties',
  };

  if (spec.description) field.description = spec.description;
  const options = optionsFor(spec);
  if (options) field.options = options;
  if (spec.defaultValue !== undefined) field.defaultValue = spec.defaultValue;
  if (spec.display) field.display = spec.display;
  if (spec.relation) {
    field.relation = {
      targetSchema: spec.relation.targetSchema,
      cardinality: spec.relation.cardinality,
    };
  }
  const inputMode = inputModeFor(spec);
  if (inputMode) field.inputMode = inputMode;
  const validation = validationFor(spec);
  if (validation) field.validation = validation;

  return field;
}

// ---------------------------------------------------------------------------
// Ordering
// ---------------------------------------------------------------------------

/**
 * Render order for fields: `propertyFieldIds` (when present, surviving names
 * appended in declaration order), otherwise declaration order. The title
 * attribute always sorts to the top.
 */
function orderFields(
  specs: PropertyValueSpecification[],
  propertyFieldIds: string[] | undefined,
  titleField: string | undefined,
): PropertyValueSpecification[] {
  const sorted = propertyFieldIds && propertyFieldIds.length > 0
    ? [...propertyFieldIds.map((id) => specs.find((s) => s.name === id)).filter(
        (s): s is PropertyValueSpecification => s !== undefined,
      ),
      ...specs.filter((s) => !propertyFieldIds.includes(s.name)),
    ]
    : [...specs];

  if (!titleField) return sorted;
  const idx = sorted.findIndex((s) => s.name === titleField);
  if (idx > 0) {
    const [title] = sorted.splice(idx, 1);
    if (title) sorted.unshift(title);
  }
  return sorted;
}

// ---------------------------------------------------------------------------
// Section grouping
// ---------------------------------------------------------------------------

function sectionTitle(group: string): string {
  return humanize(group);
}

// ---------------------------------------------------------------------------
// Derivation entry points
// ---------------------------------------------------------------------------

export interface DeriveFormOptions {
  /** Derive for one interaction mode (default: `create`). */
  mode?: FormMode;
}

export function deriveTypeName(schema: SchemaDefinition): string {
  const id = schema['@id'];
  const idx = id.lastIndexOf(':');
  return idx >= 0 ? id.slice(idx + 1) : id;
}

/**
 * Derive a headless {@link FormDescriptor} from an entity schema.
 *
 * Pure — no kernel, no graph, no framework. For the graph-override path see
 * {@link resolveFormDescriptor} in `./resolve.ts`.
 */
export function deriveFormDescriptor(
  schema: SchemaDefinition,
  opts: DeriveFormOptions = {},
): FormDescriptor {
  const mode = opts.mode ?? 'create';
  const entityType = deriveTypeName(schema);
  const titleField = schema.fields.find((f) => f.valueType === 'title')?.name;

  const specs = orderFields(schema.fields, schema.propertyFieldIds, titleField);

  const sections = new Map<string, { id: string; title: string; specs: PropertyValueSpecification[] }>();
  for (const spec of specs) {
    const group = spec.group ?? '';
    const key = group || 'properties';
    let section = sections.get(key);
    if (!section) {
      section = {
        id: key,
        title: group ? sectionTitle(group) : 'Properties',
        specs: [],
      };
      sections.set(key, section);
    }
    section.specs.push(spec);
  }

  const sectionList: FormSectionDescriptor[] = [];
  const allFields: FormFieldDescriptor[] = [];
  let order = 0;

  for (const [key, section] of sections) {
    const fields = section.specs
      .map((spec) => fieldFromSpec(spec, order++))
      .filter((f) => f.modes.includes(mode));

    if (fields.length === 0) continue;
    sectionList.push({ id: key, title: section.title, fields });
    allFields.push(...fields);
  }

  return {
    formId: `${schema['@id']}:${mode}`,
    schemaId: schema['@id'],
    entityType,
    label: schema.label ?? entityType,
    ...(schema.labelPlural ? { labelPlural: schema.labelPlural } : {}),
    ...(schema.icon ? { icon: schema.icon } : {}),
    ...(titleField ? { titleField } : {}),
    mode,
    schemaVersion: schema.version,
    overridden: false,
    derived: true,
    sections: sectionList,
    fields: allFields,
  };
}

/** Derive the field descriptors for a schema across all modes (no filtering). */
export function deriveFormFields(schema: SchemaDefinition): FormFieldDescriptor[] {
  const titleField = schema.fields.find((f) => f.valueType === 'title')?.name;
  return orderFields(schema.fields, schema.propertyFieldIds, titleField).map(
    (spec, i) => fieldFromSpec(spec, i),
  );
}
