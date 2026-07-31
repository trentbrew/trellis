# ADR 0033: Headless forms ontology — schema-derived form descriptors

**Status:** Proposed
**Date:** 2026-07-31
**Context:** Trellis 3.4.2+
**Builds on:** `src/schema/define.ts` (`defineType`), ADR 0018 (field sync
tiers), ontology registry packages (`ontology/workflow`, `ontology/pipeline`,
TRL-355/358)
**Planning seed:** sprite `omen`/`orchestrator` lineage — a form layer
prototyped in a sprite that died; rebuilt in-tree as a framework-free
contract.

## Problem Statement

Every Trellis client that creates or edits entities needs a form, and every
one of them has to re-derive the same information from the same source: the
entity schema. Today:

1. **Forms are invented per client.** The Vue sprite, Studio, and any future
   client each hand-write forms for `Task`, `Note`, `Agent`, and every
   `defineType` schema a user ships — duplicating field controls, options,
   requiredness, and validation forever, drifting the moment a schema
   changes.
2. **The schema already *is* a form spec, half-expressed.**
   `PropertyValueSpecification` carries `valueType` (18 Notion-compatible
   types), `required`, `selectOptions`, `relation` (target + cardinality),
   `group`, `display`, `modes`, `defaultValue`, `min/max`, `pattern`,
   `minLength/maxLength`, `editable`, and `computed`. No client reads any of
   it.
3. **UI work was driving ontology work backwards.** ADR 0001 (trellis-ui)
   noted affordances should be deferred "until UI work drives the need" — but
   the need is not per-component, it is a *derived contract*.
4. **A lost sprite.** The first implementation lived in a sprite that crashed
   mid-push; the work vanished. Rebuilding it in `trellis-node` makes the
   contract a published library surface instead of throwaway app code.

## Decision

### 1. `trellis/forms` — a headless form descriptor engine

A new `src/forms/` module derives a pure, JSON-serializable
`FormDescriptor` from a `SchemaDefinition`. It binds to nothing — no
framework, no components, no store. Any client renders it; new clients stop
hand-writing forms.

- **`deriveFormDescriptor(schema, { mode })`** — pure function (no kernel, no
  graph): maps every field's `valueType` to a `FieldControl` (`text`,
  `textarea`, `number`, `checkbox`, `select`, `multi_select`, `date`,
  `relation`, `people`, `files`, `json`, `readonly`), lifts validation
  (`required`, `min/max`, `pattern`, `minLength/maxLength`), options, default
  values, relation targets, and input hints (`inputMode` for url/email/tel).
- **Mode-scoped output.** A descriptor is derived for one of `create` /
  `edit` / `view`. Computed fields (`rollup`/`formula`/`ai_generated`) are
  `readonly` and view-only; per-field `modes` (schema `modes` or the computed
  default) drive visibility. Each field retains its full `modes` list so UIs
  can show view-only hints in edit forms.
- **Sections + ordering.** Fields group by the schema's `group` hint
  (default section `Properties`); order follows `propertyFieldIds` with
  declaration-order fallback; the `title` field always sorts first. Field
  labels are humanized from attribute names.
- **Browser-safe.** The derive/resolve path has no Node imports; it ships via
  `trellis/forms` and is re-exported from `trellis/browser`.

### 2. The graph is the override surface — `trellis:Form` / `trellis:FormField`

Derivation is the default; the exception is a first-class graph entity:

- `trellis:Form` — `entityType`, optional `mode` (undefined = all modes),
  optional `title`/`description`, relation `fields → trellis:FormField`.
- `trellis:FormField` — keyed by `fieldName` (must match a schema attribute);
  can set `label`, `control`, `required`, `readonly`, `hidden`, `order`,
  `section` (move across sections), `options`, `defaultValue`, `placeholder`,
  `description`.
- **Precedence:** mode-scoped `Form` entities win over mode-less ones for
  that mode. Nothing can add a field that the schema does not have — the
  schema is the field universe; the graph rearranges it.
- **`resolveFormDescriptor(ontologies, type, { mode, forms | overrides })`**
  is the end-to-end entry point: find schema → derive → apply overrides.
  `readFormOverrides(kernel)` adapts kernel entities for it.

### 3. Surface

- **SDK:** `client.formDescriptor(type, { mode })` and `client.listForms()`
  — in-process in local mode, `GET /forms/:type?mode=…` / `GET /forms` in
  remote mode.
- **HTTP:** `GET /forms` (derivable types) and `GET /forms/:type?mode=…`
  (descriptor, 404 when the type has no schema, 400 on bad mode).
- **MCP:** `trellis_form_descriptor` and `trellis_form_list` on the room
  server, so agents render forms too.
- **Registry:** `Form`/`FormField` ship as `defineType` schemas in
  `src/forms/ontology.ts`, mirroring how `ontology/workflow` +
  `ontology/pipeline` were published (TRL-355/358). They are ordinary
  `client.registerType`-able schemas; `registerFormOverrides` needs no kernel
  special-casing.

### 4. The engine and framework adapters — `trellis/forms/core` and friends

The descriptor answers *what a form is*; the engine answers *how a form
behaves*. Both ship, so clients get a complete headless stack:

- **`trellis/forms/core`** — `createFormCore(formSchema, initialValues?)`, a
  framework-free state machine holding `values`, `errors`, `dirty`,
  `touched`, `isSubmitting`, computed `isValid`/`isDirty`. Actions:
  `setValue`/`setValues`, `setError`/`setErrors`, `setTouched`, `setDirty`,
  `validate` (whole form), `validateField`, `reset`, `submit`. A subscriber
  set (`subscribe(→ unsubscribe)`) is the framework bridge; `field(name)`
  returns a `FieldBinding` (`value/error/dirty/touched/onChange/onBlur`).
- **Dual-path validation.** `formSchemaFrom(input)` accepts either a
  `defineType` handle (keeps the zod shape → exact `email`/`url`/`enum`/
  length checks) or a headless `FormDescriptor` (lifts required/min/max/
  pattern/minLength/maxLength/select-options metadata → same contract
  over HTTP). Computed fields are skipped by validation.
- **Adapters** (`trellis/forms/react`, `/vue`, `/svelte`, `/vanilla`) bind
  the core to frameworks with idiomatic surfaces: React `useForm` +
  `<Form>/<Field>` (context-based, `useSyncExternalStore`), Vue
  `useFormVue` (reactive state), Svelte `createFormStore` (store contract
  only — no svelte package dependency, works in 4 and 5), vanilla
  `createVanillaForm` + `bindFormToDOM` (two-way DOM sync, submit handling,
  `data-error-for` error text).
- **No renderer ships** in the sense of a component library — the adapters
  are *state bindings*, and the UI still belongs to each client.

### 5. What does NOT change

- Schemas stay the single source of truth. No form-specific fields are added
  to `SchemaDefinition` — the vocabulary it already carries is sufficient.
- The kernel does not learn about forms. Derivation is a pure read path over
  `listOntologies()` + the graph; no new middleware, no new op kinds.
- No renderer ships in this ADR. Studio/cloud clients render the descriptor;
  a reference renderer is a follow-up (deliberately out of scope to keep the
  contract honest — headless means nobody's components leak in).

## Consequences

### Positive

- **One form definition per entity type, forever.** New clients render
  `FormDescriptor` instead of re-authoring forms; schema edits propagate
  automatically.
- **Ontology-driven UI for real.** `valueType`/`group`/`modes`/validation
  finally have a consumer, closing the loop ADR 0001 deferred.
- **Graph override means customization is data, not code.** Team leads (or
  agents) rename, hide, and regroup fields with `trellis issue`-style graph
  writes; no redeploy.
- **Survives sprites.** The contract now lives in the published library
  (`trellis/forms`) — the third incarnation of this work cannot vanish with
  an app. (First incarnation: sprite `omen`/`orchestrator`, lost to five
  crashes. Second: sprite `form-v1` branch `origin/form-v1`, recovered and
  ported — its engine became `src/forms/core`, its adapters were rewritten
  without the sprite's ESM `require()` hacks and svelte module shim.)

### Negative

- **Another subpath to maintain** (`trellis/forms` + `/core` + four adapter
  subpaths + browser re-export + build entries + MCP/HTTP/SDK wiring).
- **Adapters add framework deps** (`react`, `vue` as peer/optional deps —
  importing the root `trellis/forms` never touches them; only the adapter
  subpaths do). The Svelte adapter stays dependency-free by consuming only
  the store contract.
- **Humanized labels are a poor-man's i18n.** Real per-locale labels need the
  graph override (or a schema field) — deferred.
- **Overrides add an indirection** clients must query; two sources of truth
  (schema + graph) require the precedence rule above to stay documented.

### Security Considerations

- Forms are read-only derivations: `GET /forms*` honors existing permission
  checks (entity-type read). Override entities are ordinary graph writes,
  subject to the same auth/permissions as any `createEntity`.
- Descriptor JSON is derived from registered schemas only — no arbitrary
  code, no component names, no URLs from user input.

## Implementation sketch

1. `src/forms/types.ts` — `FormDescriptor`, `FormFieldDescriptor`,
   `FormSectionDescriptor`, `FormOverride`, `FieldControl` (12 kinds).
2. `src/forms/derive.ts` — `deriveFormDescriptor`, `deriveFormFields`,
   `humanize`; valueType→control map; section/order logic.
3. `src/forms/ontology.ts` — `defineType` `Form`/`FormField` + `FORMS_ONTOLOGY`.
4. `src/forms/overrides.ts` / `resolve.ts` / `kernel.ts` — merge, end-to-end
   resolve, kernel adapter.
5. Surface: `src/server/server.ts` (`/forms`), `src/client/sdk.ts`
   (`formDescriptor`/`listForms`), `src/mcp/forms.ts`
   (`trellis_form_descriptor`/`trellis_form_list`).
6. Packaging: `"./forms"` export + esbuild entry + `trellis/browser`
   re-export.
7. Tests: `test/core/forms.test.ts` (derive/override/resolve/kernel) +
   `test/server/forms-endpoint.test.ts` (HTTP surface).
8. Engine: `src/forms/core/{types,schema,validate,index}.ts` — ported from
   the `form-v1` sprite (`origin/form-v1`, commit `660d8b3`), rewritten:
   no `require()` in ESM, no svelte module shim, `submit` persists
   validation errors into state, dirty baseline = initialized state shape.
9. Adapters: `src/forms/{react,vue,svelte,vanilla}/index.ts` — React
   `useSyncExternalStore` + context; Vue reactive; Svelte store contract
   (mirrors `src/svelte/stores.ts`); vanilla DOM glue.
10. Engine tests: `test/core/forms-engine.test.ts` (state machine, dual-path
    validation, submit flow).

## Acceptance sketch

- [ ] `deriveFormDescriptor` maps all 18 property types to headless controls
      with correct required/validation/options/relation metadata
- [ ] Computed fields are readonly + view-only; `modes` drives create/edit/view
- [ ] `propertyFieldIds` ordering, `group` sections, title-first all hold
- [ ] A graph `Form` + `FormField` entity can rename/hide/reorder/regoup
      fields; mode-scoped entities win for their mode
- [ ] `client.formDescriptor('Task')` works local and remote
- [ ] `GET /forms/:type` returns the descriptor; 404 unknown type, 400 bad mode
- [ ] MCP `trellis_form_descriptor` / `trellis_form_list` respond on the room
      server
- [ ] `createFormCore` validates via zod shape when built from a
      `defineType` handle and via metadata when built from a descriptor
- [ ] `setValue`/`setTouched`/`reset`/`subscribe` state-machine semantics hold;
      `submit` runs validation, persists errors, toggles `isSubmitting`
- [ ] react/vue/svelte/vanilla adapter subpaths import cleanly and export
      their documented surfaces
- [ ] `pnpm check` passes for `src/forms/*`; `pnpm test` forms suites green

## Open questions

- Should `Form` overrides apply to fields *before* or *after* the section
  rebuild for ordering? (Current: order overrides then section rebuild, so a
  field moved across sections takes its new section's sort position.)
- Do people labels or per-locale labels warrant a schema field, or is graph
  override enough for v1?
- Does Studio want a component library *on top of* the adapters (a
  `trellis/ui`-style renderer set), or are the adapter state bindings enough?
  The headless contract stays renderer-free either way.
