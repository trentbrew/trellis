# Icon Registry & Ontology — @trellis.computer/icons

**Status:** spec
**Date:** 2026-07-24
**Issue:** TRL-315
**References:** iconic (existing icon data model), font-vibes (registry pattern), SemType (URL-identified types)
**Target:** `packages/icons/` in trellis-ui monorepo

## TL;DR

`@trellis.computer/icons` provides a semantic icon registry where icons are
identified by name (not path or URL), tagged for discoverability, and consumed
via a `<trellis-icon>` web component. The registry is the source of truth;
products copy icon SVGs into their project via `trellis add icons`.

## Registry Model

Icons live in a typed registry:

```ts
interface Icon {
  name: string
  category: 'core' | 'entity' | 'action' | 'status' | 'brand'
  tags: string[]
  svg: string
  variant?: 'filled' | 'outline' | 'duotone'
  author?: string
  license?: 'MIT' | 'CC0' | 'custom'
}
```

Categories:

| Category | Purpose | Examples |
|---|---|---|
| `core` | Navigation, UI chrome | `chevron-down`, `menu`, `close`, `search` |
| `entity` | Entity type icons (mirror entity-type colors) | `issue`, `lane`, `project`, `person` |
| `action` | Verb-based actions | `create`, `edit`, `delete`, `duplicate` |
| `status` | Status indicators (mirror status colors) | `in-progress`, `done`, `blocked`, `pending` |
| `brand` | Third-party brands | `github`, `slack`, `discord` |

## Icon Components

### `<trellis-icon>` — Web Component

```html
<trellis-icon name="issue"></trellis-icon>
<trellis-icon name="chevron-down" size="sm"></trellis-icon>
<trellis-icon name="edit" color="var(--primary)"></trellis-icon>
```

**Attributes:**
- `name` (required) — Icon identifier from registry
- `size` (optional) — `xs` | `sm` | `md` | `lg` | `xl` (default: `md`)
- `color` (optional) — CSS color value (default: `currentColor`)

**Size map:**
- `xs`: 12px
- `sm`: 16px
- `md`: 20px
- `lg`: 24px
- `xl`: 32px

## Naming Convention

```
<category>-<descriptive-name>[-variant]
```

Examples: `entity-issue`, `action-create`, `status-in-progress`, `core-chevron-down`.

## Registry API

```ts
import { registry } from '@trellis.computer/icons'

// Lookup
registry.get('issue')                    // Icon | undefined
registry.findByTag('action')             // Icon[]
registry.findByCategory('entity')        // Icon[]
registry.search('chevron')               // Icon[] (name + tag match)

// Registration (packs)
registry.register(pack: Icon[])
```

## Pack System

Icons are organized into packs. Core icons ship with the registry. Community
packs extend it via `trellis add icons --pack <name>`:

```
packages/icons/
├── src/
│   ├── registry.ts        # Registry class
│   ├── core/               # Built-in icons (MIT)
│   │   ├── index.ts
│   │   ├── core.ts         # nav/chrome icons
│   │   ├── entity.ts       # entity type icons
│   │   ├── action.ts       # action icons
│   │   └── status.ts       # status icons
│   ├── packs/              # Community add-on packs
│   │   └── lucide/         # Example: Lucide icon pack adapter
│   └── index.ts            # Public API
└── package.json
```

## Theme Integration

Entity icons inherit their color from `var(--color-<type>)`. Status icons
inherit `var(--status-<name>)`. This links the icon registry to the theme
contract (TRL-314):

```css
trellis-icon[name="issue"] {
  color: var(--color-issue);
}
trellis-icon[name="done"] {
  color: var(--status-done);
}
```

## Icon Pack Registration

A pack is a directory with an `index.ts` that exports `Icon[]`:

```ts
// my-pack/index.ts
import { registry } from '@trellis.computer/icons'

registry.register([
  { name: 'my-custom-icon', category: 'core', tags: ['custom'], svg: '...' }
])
```

## Build Process

- Icons are optimized via SVGO at build time
- Source SVGs live in `src/core/*.svg` (hand-authored or from a base set)
- `registry.ts` reads optimized SVGs and builds the icon map
- Bundle: `dist/index.mjs` + `dist/index.d.ts`
- Individual icon access: `import iconIssue from '@trellis.computer/icons/entity/issue'`

## Distribution

- `trellis add icons` copies all core icons (or a selected subset) into the
  project
- `trellis add icons --pack <name>` copies a community pack
- The `<trellis-icon>` component resolves from the local copy

## Acceptance Criteria

1. `packages/icons/src/registry.ts` implements `get`, `findByTag`, `findByCategory`, `search`
2. Core pack ships entity icons: `issue`, `lane`, `project`, `person`, `note`, `doc`
3. Core pack ships status icons: `in-progress`, `done`, `blocked`, `pending`, `cancelled`
4. Core pack ships action icons: `create`, `edit`, `delete`, `duplicate`, `move`
5. Core pack ships core icons: `chevron-down`, `menu`, `close`, `search`, `plus`
6. `<trellis-icon>` resolves colors via `var(--color-<entity>)` and `var(--status-<name>)`
7. `trellis add icons` copies icon SVGs into the project
8. SVGO optimization runs as a build step
