# Spec: Schema → surface derivation (forms, table, code)

**Status:** Draft\
**Date:** 2026-08-02\
**Builds on:** ADR 0034 (headless UI convention), ADR 0033 (`trellis/forms`), `src/forms/derive.ts`\
**Blocks:** `code-core`, schema-derived table columns, EQL query-builder parity\
**Amends:** nothing yet — first spec for the shared generator

---

## 1. Intent

Forms already derive a headless `FormDescriptor` from `SchemaDefinition` (`deriveFormDescriptor`). Table and code-core need the **same ontology input** with **different surface outputs**:

| Consumer | Surface | Purpose |
| -------- | ------- | ------- |
| `trellis/forms` | `FormDescriptor` | create/edit/view controls |
| `trellis/table` | `TableColumnDescriptor[]` | grid columns + inline editor hints |
| `trellis/code` | `CompletionSourceDescriptor[]` | EQL-S / formula autocomplete |
| Future (`flow-core`) | `FlowNodeDescriptor[]` | canvas node shape |

Without a shared derivation layer, each wedge will invent its own property→affordance mapping. Code-core's schema-aware completions and table's schema-derived columns will drift within one release cycle.

**Goal:** one pure derivation module, three (eventually four) projection functions, one ordering/humanization source of truth.

---

## 2. Non-goals

- Graph override resolution (`trellis:Form` entities) — stays in `forms/resolve.ts`; table/code get their own override paths later
- Visual rendering, registry anatomy, or framework adapters
- Live entity data (rows, completion values) — descriptors describe *shape*, not instances
- Full EQL-S parser or query execution

---

## 3. Module layout

```
src/surface/
  index.ts           # public exports
  types.ts           # shared + per-surface descriptor types
  derive.ts          # SchemaDefinition → SurfaceField[] (canonical intermediate)
  project-form.ts    # SurfaceField[] → FormDescriptor (moves logic from forms/derive.ts)
  project-table.ts   # SurfaceField[] → TableColumnDescriptor[]
  project-code.ts    # ontologies + context → CompletionSourceDescriptor[]
  ordering.ts        # propertyFieldIds, title-first (shared with forms today)
  humanize.ts        # humanize() (lift from forms/derive.ts)
```

**Migration:** `src/forms/derive.ts` becomes a thin re-export / delegate to `project-form.ts`. Existing `deriveFormDescriptor` signature and behavior unchanged — 31+ form tests stay green.

**Package exports:**

```json
"trellis/surface": "./dist/surface/index.js"
```

Browser-safe (no Node-only imports). Cores and MCP tools may import it.

---

## 4. Canonical intermediate: `SurfaceField`

Every projection starts from the same ordered field list. This is the **single mapping** from `PropertyValueSpecification` → affordance hints.

```ts
/** One schema attribute projected for any UI surface. Pure JSON. */
export interface SurfaceField {
  /** Attribute name (`PropertyValueSpecification.name`). */
  name: string;
  label: string;
  valueType: PropertyType;
  order: number;
  section: string;

  /** Interaction posture — shared semantics across surfaces. */
  readonly: boolean;
  required: boolean;
  modes: FormMode[]; // reuse existing type; table/code ignore or filter

  /** Primary affordance — surfaces specialize further. */
  affordance:
    | 'text'
    | 'textarea'
    | 'richtext'      // → editor-core in table cells / form fields
    | 'number'
    | 'boolean'
    | 'select'
    | 'multi_select'
    | 'date'
    | 'relation'
    | 'people'
    | 'files'
    | 'json'
    | 'code'          // → code-core (formula, json, EQL expressions)
    | 'readonly';

  relation?: { targetSchema?: string; cardinality?: 'one' | 'many' };
  options?: Array<{ value: Atom; label: string }>;
  validation?: FieldValidation; // reuse forms type
  formula?: string;               // when valueType === 'formula'
}
```

### 4.1 Affordance mapping (canonical)

Lifted from `forms/derive.ts` `controlFor` + extensions for table/code:

| `valueType` | `affordance` | Notes |
| ----------- | ------------ | ----- |
| `title` | `text` | title-first ordering |
| `rich_text` | `richtext` | **change from forms `textarea`** — forms may keep `textarea` until editor form control lands; table/code use `richtext` immediately |
| `number` | `number` | |
| `checkbox` | `boolean` | |
| `select`, `status` | `select` | |
| `multi_select` | `multi_select` | |
| `date` | `date` | |
| `url`, `email`, `phone_number` | `text` | + inputMode in form projection only |
| `relation` | `relation` | table → combobox-core; code → completion of target type ids |
| `people` | `people` | |
| `files` | `files` | upload-core |
| `json` | `json` | code-core (restricted JSON mode) |
| `formula` | `code` | single-line expression mode |
| `rollup`, `ai_generated` | `readonly` | |
| computed / `editable: false` | `readonly` | |

**Forms backward compat:** `project-form.ts` maps `richtext` → `control: 'textarea'` until the form renderer binds `editor-core`. Table and code projections use the semantic affordance directly.

### 4.2 Entry point

```ts
export function deriveSurfaceFields(
  schema: SchemaDefinition,
  opts?: { mode?: FormMode },
): SurfaceField[];
```

Uses the same ordering as `deriveFormDescriptor` today (`propertyFieldIds`, title first, section grouping metadata on each field).

---

## 5. Table projection

```ts
export interface TableColumnDescriptor {
  id: string;           // === SurfaceField.name
  header: string;       // === SurfaceField.label
  accessorKey: string;  // === SurfaceField.name (entity row key)
  editable: boolean;    // !readonly
  type: CellValueType;  // maps from affordance (existing table/core/types.ts)
  /** Which headless core renders the inline editor. */
  editor: TableCellEditor;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
}

export type TableCellEditor =
  | { kind: 'text' }
  | { kind: 'number' }
  | { kind: 'boolean' }
  | { kind: 'date' }
  | { kind: 'select'; options: FieldOption[] }
  | { kind: 'combobox'; relation: FieldRelation }
  | { kind: 'richtext'; schema?: EditorSchemaConfig }
  | { kind: 'code'; mode: 'json' | 'formula' | 'eql' };
```

```ts
export function deriveTableColumns(
  schema: SchemaDefinition,
): TableColumnDescriptor[];

/** Map descriptors → createTableCore({ columns }) shape (adapter in app or helper). */
export function tableColumnsToCoreConfig(
  descriptors: TableColumnDescriptor[],
): TableColumn<Record<string, unknown>>[];
```

### 5.1 Affordance → table editor

| `affordance` | `type` | `editor.kind` |
| ------------ | ------ | ------------- |
| `text` | `text` | `text` |
| `number` | `number` | `number` |
| `boolean` | `boolean` | `boolean` |
| `date` | `date` | `date` |
| `select`, `multi_select` | `text`* | `select` |
| `relation` | `text`* | `combobox` |
| `richtext` | `text`* | `richtext` |
| `json`, `code` | `text`* | `code` |
| `readonly` | — | column `editable: false` |

\*Cell *value* may be rich JSON; `type` is the commit/coercion hint for simple paths. Rich editors commit through their core's serialized shape.

### 5.2 Acceptance (table)

- [ ] `deriveTableColumns(taskSchema)` matches hand-authored columns in wedge-smoke table demo
- [ ] Gallery table entry uses `deriveTableColumns` for at least one entity type
- [ ] `pnpm test test/surface/table-projection.test.ts` — pure Node, zero DOM

---

## 6. Code projection (completions)

Code-core consumes **completion sources**, not a full document schema. Sources are derived from registered ontologies + an optional query context.

```ts
export interface CompletionItemDescriptor {
  label: string;
  detail?: string;
  /** Insert text (may differ from label — e.g. qualified name). */
  insert: string;
  kind: 'type' | 'property' | 'keyword' | 'literal' | 'snippet';
  /** Boost sort when filtering (higher = preferred). */
  boost?: number;
}

export interface CompletionSourceDescriptor {
  id: string;
  /** Human name for debug / inspector. */
  label: string;
  /** When this source applies. */
  scope: 'eql' | 'formula' | 'json' | 'plain';
  items: CompletionItemDescriptor[];
}

export interface DeriveCompletionOptions {
  /** Restrict to types reachable from this root (EQL `find ?e where type = …`). */
  rootType?: string;
  /** Include all registered schemas (default: true for EQL). */
  ontologies: Iterable<SchemaDefinition>;
}
```

```ts
export function deriveCompletionSources(
  opts: DeriveCompletionOptions,
): CompletionSourceDescriptor[];
```

### 6.1 What gets derived (v1)

For each `SchemaDefinition` in scope:

1. **Type names** — `entityType` → `{ label: 'Task', insert: 'Task', kind: 'type' }`
2. **Properties** — each `SurfaceField` → `{ label: humanize(name), insert: name, kind: 'property', detail: valueType }`
3. **EQL keywords** — static list: `find`, `where`, `and`, `or`, `not`, `order`, `limit`, `return`, …
4. **Select options** — when property has `selectOptions`, literal completions scoped to that property name in formula mode
5. **Relation targets** — when `affordance === 'relation'`, type-name completions for `targetSchema`

Formula mode (`valueType === 'formula'`) restricts to expression-safe properties (exclude `files`, `people`, `rich_text` bodies) and exposes numeric/select fields prominently.

### 6.2 Code-core integration

```ts
// code-core config (future)
interface CodeCoreConfig {
  mode: 'eql' | 'formula' | 'json' | 'plain';
  language?: string;           // lezer grammar id
  completionSources?: CompletionSourceDescriptor[];  // from deriveCompletionSources
  undoHistory?: UndoLike;
  initial?: string;
}
```

The core filters/ranks items as the user types (reuse `headless/fuzzy.ts`). **Descriptors are static per schema version**; the core owns query-time filtering.

### 6.3 Acceptance (code)

- [ ] `deriveCompletionSources({ ontologies })` includes Task + Issue types when registered
- [ ] Formula mode excludes `files` / `rich_text` properties
- [ ] Code-core behavior tests assert completion list matches derived descriptors for a fixture schema
- [ ] Same fixture used in table projection test (shared `SurfaceField[]` snapshot)

---

## 7. Form projection (migration)

```ts
export function deriveFormDescriptor(
  schema: SchemaDefinition,
  opts?: DeriveFormOptions,
): FormDescriptor {
  const fields = deriveSurfaceFields(schema, opts);
  return projectFormDescriptor(schema, fields, opts);
}
```

`projectFormDescriptor` maps `affordance` → existing `FieldControl` (`richtext` → `textarea` until form editor control ships). **No behavior change** on migration.

---

## 8. Override strategy (deferred)

Forms: `trellis:Form` graph entities → `applyFormOverride`. Table and code overrides are **not v1**:

- Table: future `trellis:TableView` entity (column hide/reorder/width)
- Code: future `trellis:QueryTemplate` entity

The derivation module stays pure; override layers wrap projections the same way `resolveFormDescriptor` wraps `deriveFormDescriptor` today.

---

## 9. Wedge-smoke demo

Add one gallery fixture:

```ts
import { deriveTableColumns } from 'trellis/surface';
import { TASK_SCHEMA_FIXTURE } from '../fixtures/task-schema.js';

const columns = deriveTableColumns(TASK_SCHEMA_FIXTURE);
// tableEntry.defaultConfig uses tableColumnsToCoreConfig(columns)
```

Proves schema→surface before code-core lands.

---

## 10. Implementation order

1. **`src/surface/` scaffold** — types, `deriveSurfaceFields`, lift `humanize` + ordering
2. **Migrate forms** — delegate `deriveFormDescriptor`; all form tests green
3. **`project-table.ts`** + table gallery wiring + tests
4. **`project-code.ts`** + fixture snapshots (no CodeMirror yet — descriptor-only tests)
5. **Export `trellis/surface`** in package.json + browser bundle

**Gate before `code-core` impl:** steps 1–4 complete; step 5 may land with code-core.

---

## 11. Open questions

- **`rich_text` in forms:** switch control to `richtext` + editor-core binding in forms wedge, or keep `textarea` alias until form `<Field>` renderer work lands? **Recommend:** alias in form projection only; surface field uses `richtext`.
- **Shared override entity vs per-surface overrides:** one `trellis:View` entity with sections, or separate Form/Table/Code override types? **Defer** — forms override path is sufficient until a second surface needs overrides in product.
- **Location:** `src/surface/` vs `src/schema/surface/`. **Recommend:** `src/surface/` — not JSON-schema; it's UI surface derivation.
