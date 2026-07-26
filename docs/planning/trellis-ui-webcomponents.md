# @trellis.computer/ui — Web Component Library

**Status:** planned (scaffold pending)
**Date:** 2026-07-24
**Updated:** 2026-07-24 (scoping session — package name, CLI, icons/fonts, theme contract)
**Depends on:** `trellis/browser` (existing), `trellis` >= 3.4.0
**Supersedes:** `trellis-ui-dsl.md` (DSL approach, now archived)
**See also:** TRL-311 (this issue), TRL-313 (CLI), TRL-314 (theme), TRL-315 (icons), TRL-316 (fonts), TRL-317 (arch decisions)

---

## TL;DR

`@trellis.computer/ui` is a **separate npm package** under the
`@trellis.computer` scope that provides Web Components built on Lit. It
consumes `trellis/browser` primitives (Signal, live queries, schema, realtime)
and renders them as custom elements usable in **any framework** — Svelte, Vue,
React, Solid, or vanilla HTML.

This is the **projection layer**, not the authoring DSL. The kernel stays
focused on the data layer; `@trellis.computer/ui` is a consumer of the SDK, not
part of it.

**Distribution:** Shadcn pattern — `trellis add` copies source into projects.
Products own their code. No runtime dependency on the npm package.

---



## Architecture Decision: Separate Package

`@trellis.computer/ui` lives **outside the kernel** at
`/Users/trentbrew/TURTLE/Projects/trellis/trellis-ui/`.

**Why:**

- The kernel is the data layer (schema, op-log, sync, queries)
- Web Components are a projection layer — they render data, they don't own it
- Separate package enables independent versioning
- Community can fork/extend without touching the kernel
- Follows the same pattern as any framework adapter, but universal

**Package name:** `@trellis.computer/ui` (scope owned by turtle.tech)
**Sibling packages:** `@trellis.computer/icons`, `@trellis.computer/fonts`
**Peer dependency:** `trellis` >= 3.4.0
**Import path:** `@trellis.computer/ui` (main)

**Why** `@trellis.computer/`* **and not** `trellis-ui` **or** `@trellis-ui`**:**

- `trellis` npm name was transferred from original owner — kernel stays there
- `@trellis-ui` scope was registered by a third party 2 days before this session
- `@trellis.computer` is owned by turtle.tech — no抢注 risk
- Unified namespace for all ecosystem packages (ui, icons, fonts, adapters)
- Kernel stays standalone `trellis`; ecosystem lives under `@trellis.computer/*`

---



## Distribution Model: Shadcn Pattern

`@trellis.computer/ui` follows the shadcn distribution model, not the
traditional npm dependency model. The npm registry is the **source of truth**;
the CLI copies source into projects; products own their code.

**Why shadcn, not npm dependency:**

- Products own their code — no runtime dependency on the package
- Framework adapters can be copied per-framework (Svelte, Vue, React, Solid)
- Community can contribute via PRs to the registry
- No "which version am I on?" problem
- 5 products in 4 frameworks — duplication is acceptable, each project is
independent

**The command (see TRL-313):**

```bash
trellis add button                      # auto-detect: UI component
trellis add person                      # auto-detect: ontology type
trellis add @trellis.computer/ui/button # explicit: UI component
trellis add @trellis.computer/types/person # explicit: ontology type
```

**Auto-detect:** The registry tells you what it is. No flags needed.
`trellis add button` checks the UI registry first, then the type registry.
The package path (`@trellis.computer/ui/*` vs `@trellis.computer/types/*`)
determines the category.

**What** `trellis add` **does:**

1. Resolves the package from the registry
2. Copies source files into the project (not `node_modules`)
3. Updates project-specific configuration if needed
4. The product now owns the code — free to modify

---



## @trellis.computer Package Scope

The `@trellis.computer` npm scope hosts the registry packages:


| Package                     | Purpose                  | Example              |
| --------------------------- | ------------------------ | -------------------- |
| `@trellis.computer/ui`      | Web Components (Lit)     | `trellis add button` |
| `@trellis.computer/icons`   | Icon packs               | `trellis add icons`  |
| `@trellis.computer/fonts`   | Font packs               | `trellis add fonts`  |
| `@trellis.computer/types/*` | Ontology types (SemType) | `trellis add person` |


**UI components** — Copy source into project. Product owns the code.
**Ontology types** — Add reference to graph schema. Type lives at URL.
**Icons** — Semantic icon registry (TRL-315). Components reference by name, not path.
**Fonts** — Semantic font registry (TRL-316). Components reference by role, not family.
**Theme** — CSS custom properties (TRL-314). All tokens use oklch, data-theme switching.

This mirrors how SemType works: types are identified by versioned URLs, not
copied into projects. Your graph references types, it doesn't own them.

---



## Relationship to Ontology Types

The `trellis add` command handles both UI components and ontology types, but
the semantics are fundamentally different:


|                  | UI Component               | Ontology Type                   |
| ---------------- | -------------------------- | ------------------------------- |
| **Command**      | `trellis add button`       | `trellis add person`            |
| **What happens** | Source copied into project | Reference added to graph schema |
| **Ownership**    | Product owns the code      | Type lives at URL               |
| **Modification** | Free to modify source      | Cannot modify, can extend       |
| **Versioning**   | npm package version        | SemVer URL versioning           |


**CLI structure:**

```bash
trellis add
├── <name>                                # auto-detect from registry
│   ├── button                            # UI component
│   ├── person                            # ontology type
│   └── @scope/package                    # explicit
├── --help                                # show all options
```

No subcommands needed. Auto-detect is sufficient. The registry tells you
what it is.

---



## Product Independence

Trellis products are independent projects, each owning their code:


| Product             | Framework | Notes |
| ------------------- | --------- | ----- |
| Playlab             | Svelte    |       |
| Nodebook            | Vue       |       |
| Studio              | Solid     |       |
| Filegraph           | React     |       |
| Fractals Playground | React     |       |


**Duplication is acceptable.** Each project copies the components it needs
from the registry and owns the code. Cross-pollination happens via PRs to
the registry, not shared runtime dependencies.

**Framework adapters** can be copied per-framework. The registry may contain
framework-specific variants:

- `@trellis.computer/ui/button` — vanilla Web Component
- `@trellis.computer/ui/button.svelte` — Svelte wrapper
- `@trellis.computer/ui/button.vue` — Vue wrapper

Or the products adapt the vanilla components themselves.

---



## Naming: TQL (not EQL)

Per ADR 0025:

- **TQL** = public/brand name (used in CLI, docs, component attributes)
- **EQL-S** = full expansion (Entity Query Language - Structured), used in JSDoc
- **eql** = internal codename (source files, parameter names, import paths)

The `<trellis-query>` component uses `tql` attribute:

```html
<trellis-query tql="find ?e where type = 'Issue'"></trellis-query>
```

Not `eql`. ADR 0025 says: *"This is a deliberate external/internal split, not
a half-finished rename."*

---



## Component API



### `<trellis-provider>` — Context provider

Sets up `TrellisDb` client context for child components. Child components
discover the provider via `el.closest('trellis-provider')` traversal.

```html
<trellis-provider url="http://localhost:8231" api-key="...">
  <trellis-entity-list type="Issue"></trellis-entity-list>
</trellis-provider>
```

**Attributes:**

- `url` (required) — Trellis server URL
- `api-key` (optional) — Authentication key
- `tenant-id` (optional) — Multi-tenant identifier

**Programmatic access:**

```ts
import { getTrellisClient } from '@trellis.computer/ui';
const client = getTrellisClient(document.querySelector('trellis-provider'));
```

---



### `<trellis-entity>` — Universal entity renderer

Renders a single entity with vantage-driven shell switching. Translates the
existing `Thing.svelte` pattern to Web Components.

```html
<trellis-entity id="TRL-1" type="Issue" vantage="8" lane="main" editable></trellis-entity>
```

**Attributes:**

- `id` (required) — Entity ID
- `type` (required) — Entity type name
- `vantage` (0-13, default 8) — Continuous focal depth
- `lane` (default "main") — Lane identifier
- `editable` (boolean) — Show edit affordance in card shell

**Shell mapping (from** `shells.ts`**):**


| Vantage | Shell  | Layout                       |
| ------- | ------ | ---------------------------- |
| 0-4     | `node` | Compact pill                 |
| 5-7     | `row`  | List row                     |
| 8-13    | `card` | Expanded card with edit form |


**CSS custom properties:**

- `--vantage` — Set on host, drives `clamp()` transitions
- `data-shell` — Attribute for shell-specific styling

**Events:**

- `trellis-entity-update` — Dispatched on mutation

**Uses:** `liveEntity()` from `trellis/browser`

---



### `<trellis-entity-list>` — Live entity list

Renders a live list of entities of a given type, with optional filtering.

```html
<trellis-entity-list type="Issue" where='{"status": "open"}'></trellis-entity-list>
```

**Attributes:**

- `type` (required) — Entity type name
- `where` (JSON string, optional) — Where filter
- `resolve` (JSON string, optional) — Relation expansion spec

**Default rendering:** `<trellis-entity>` per item
**Custom rendering:** Use `<template slot="item">` or CSS parts

**Uses:** `liveEntities()` from `trellis/browser`

---



### `<trellis-query>` — Live TQL query

Renders results of a live TQL query string.

```html
<trellis-query tql="find ?e where type = 'Issue' and status = 'open'"></trellis-query>
```

**Attribute:**

- `tql` (required) — TQL query string

**Rendering:** Slot-based for custom templates

**Uses:** `liveQuery()` from `trellis/browser`

---



### `<trellis-live>` — Connection status badge

Shows online/offline/connecting status for the Trellis connection.

```html
<trellis-live></trellis-live>
```

**No attributes needed.** Reads connection state from nearest `<trellis-provider>`.

**Uses:** `TrellisDb` connection state

---



### `<trellis-presence>` — Peer presence avatars

Shows live peer presence for a realtime room.

```html
<trellis-presence room="doc:42" transport="broadcast"></trellis-presence>
```

**Attributes:**

- `room` (required) — Room identifier
- `transport` (default "broadcast") — `broadcast` | `websocket` | `memory`

**Rendering:** Slot-based peer customization

**Uses:** `joinPresence()` from `trellis/browser`

---



## Signal-to-DOM Utilities

Standalone utilities for binding `Signal<T>` to DOM elements without a
framework. Available at `@trellis.computer/ui/signal-utils`.

```ts
import { bindText, bindClass, bindAttr, bindVisible, bindList } from '@trellis.computer/ui/signal-utils';
import { Signal } from 'trellis/browser';

const signal = new Signal('hello');
bindText(signal, document.getElementById('output')); // Updates textContent

bindClass(signal, document.body, {
  active: 'active',
  idle: 'idle',
  error: 'error-state',
});

bindAttr(signal, document.getElementById('input'), 'disabled');
bindVisible(signal, document.getElementById('spinner'));
bindList(signal, container, (item) => `<div>${item.name}</div>`);
```

**Functions:**

- `bindText(signal, element)` — Bind to `textContent`
- `bindClass(signal, element, map)` — Bind to class list via value→className map
- `bindAttr(signal, element, name)` — Bind to attribute
- `bindVisible(signal, element)` — Bind to `display: none` toggle
- `bindList(signal, container, renderItem)` — Bind array to child elements

---



## Usage Examples



### Vanilla HTML

```html
<script type="module" src="@trellis.computer/ui/index.js"></script>

<trellis-provider url="http://localhost:8231">
  <trellis-entity-list type="Issue" where='{"status": "open"}'></trellis-entity-list>
</trellis-provider>
```



### Svelte

```svelte
<script>
  import '@trellis.computer/ui';
</script>

<trellis-provider {url}>
  <trellis-entity {id} {vantage} lane="main"></trellis-entity>
</trellis-provider>
```



### React

```tsx
import '@trellis.computer/ui';

function App() {
  return (
    <trellis-provider url={url}>
      <trellis-entity-list type="Issue" />
    </trellis-provider>
  );
}
```



### Vue

```vue
<script setup>
import '@trellis.computer/ui';
</script>

<trellis-provider :url="url">
  <trellis-entity-list type="Issue" />
</trellis-provider>
```

---



## Package Structure

```
/Users/trentbrew/TURTLE/Projects/trellis/trellis-ui/
├── packages/
│   ├── core/                 # @trellis.computer/ui — Web Components
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── provider.ts
│   │   │   ├── context.ts
│   │   │   ├── entity.ts
│   │   │   ├── entity-list.ts
│   │   │   ├── query.ts
│   │   │   ├── live.ts
│   │   │   ├── presence.ts
│   │   │   ├── signal-utils.ts
│   │   │   └── types.ts
│   │   ├── package.json      # name: @trellis.computer/ui
│   │   └── README.md
│   ├── icons/                # @trellis.computer/icons (TRL-315)
│   │   ├── src/
│   │   │   ├── registry.ts
│   │   │   ├── core/         # built-in icons
│   │   │   └── packs/        # community packs
│   │   └── package.json
│   └── fonts/                # @trellis.computer/fonts (TRL-316)
│       ├── src/
│       │   ├── registry.ts
│       │   ├── core/         # built-in fonts
│       │   └── packs/        # community packs
│       └── package.json
├── tokens/
│   ├── design-tokens.css      # CSS custom properties (TRL-314)
│   ├── colors.css
│   ├── typography.css
│   └── icons.css
└── README.md
```

---



## Build Setup

- **Vite** in library mode (each package builds independently)
- **TypeScript** for type generation
- **Peer dependency:** `trellis` (not `trellis/browser` — lets consumer choose entry point)
- **Entry:** `dist/index.mjs` + `dist/index.d.ts` per package
- **Monorepo:** `trellis-ui/packages/`* with shared root config

---



## Implementation Phases



### Phase 1: Spec + Architecture (TRL-314, TRL-315, TRL-316, TRL-317)

- [ ] TRL-314 — Theme contract spec (CSS custom properties)
- [ ] TRL-315 — Icon ontology spec
- [ ] TRL-316 — Font ontology spec
- [ ] TRL-317 — Architecture decisions doc



### Phase 2: Scaffold + Provider

- [ ] Package scaffold (package.json, tsconfig, vite.config, monorepo)
- [ ] `<trellis-provider>` component
- [ ] Context traversal (Element.closest pattern)
- [ ] Signal-to-DOM utilities
- [ ] Theme tokens (CSS custom properties from TRL-314)



### Phase 3: Core Components

- [ ] `<trellis-entity>` (vantage/shell pattern from Thing.svelte)
- [ ] `<trellis-entity-list>` (live entity list)
- [ ] `<trellis-query>` (live TQL query)



### Phase 4: Realtime Components

- [ ] `<trellis-live>` (connection status)
- [ ] `<trellis-presence>` (peer presence)



### Phase 5: Icon & Font Registry (TRL-315, TRL-316)

- [ ] `@trellis.computer/icons` — core packs, registry API
- [ ] `@trellis.computer/fonts` — core packs, registry API



### Phase 6: CLI Integration (TRL-313)

- [ ] `trellis add` command (auto-detect UI vs ontology type)
- [ ] Registry resolution (npm package → source copy)
- [ ] Source copy into project



### Phase 7: Documentation + Publish

- [ ] README with usage examples
- [ ] TypeScript type documentation
- [ ] npm publish (registry source of truth)

---



## Relationship to Existing Work

- `trellis/browser` — The data layer this builds on (stays in kernel)
- `trellis-ui-dsl.md` — Superseded by TML-first direction; this is the projection layer, not the authoring DSL
- `Thing.svelte` — The reference implementation for `<trellis-entity>` vantage/shell pattern
- `shells.ts` — Pure function for vantage→shell resolution, reused directly
- **ADR 0025** — Naming: TQL (brand) vs eql (codename)
- **SemType** — Ontology types follow SemType spec (types identified by URLs, not copied)
- **Shadcn** — Distribution model: source copied into projects, products own code
- **TRL-311** — This issue: `@trellis.computer/ui` Web Component library
- **TRL-313** — CLI command: `trellis add` with auto-detect
- **TRL-314** — Theme contract: CSS custom properties
- **TRL-315** — Icon ontology: semantic registry
- **TRL-316** — Font ontology: semantic registry
- **TRL-317** — Architecture decisions: kernel vs UI vs types
- **ONTOLOGY.md** — Canonical ecosystem ontology now includes UI Library layer

---



## What This Is NOT

- **Not a cross-framework DSL** — We conceded that projections are community-driven, not owned by the kernel
- **Not part of the kernel** — Separate package, independent versioning
- **Not a replacement for framework adapters** — React/Vue/Svelte adapters stay in the kernel; this is the universal alternative
- **Not the authoring DSL** — TML-first direction (Thing → shell → primitive) is separate
- **Not an npm dependency** — Shadcn pattern: source is copied, products own their code
- **Not a shared runtime** — Each project is independent; duplication is acceptable
- **Not a monorepo for all UI** — `@trellis.computer/ui` is the canonical internal lib; products pick their framework for custom projections
- **Not** `@trellis-ui` — That scope was taken 2 days before this session; `@trellis.computer/`* is the owned alternative

