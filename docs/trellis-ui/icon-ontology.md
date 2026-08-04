# Icon Registry & Ontology — @trellis.computer/icons

**Status:** spec
**Date:** 2026-07-24 (rev 2026-08-02)
**Issue:** TRL-315
**References:** ui-thing Icon (detection model), iconic (registry pattern), Iconify (icon sets + JSON collections), TRL-314 (theme contract — `--icon-pack` token), SemType (URL-identified types)
**Target:** `packages/icons/` in trellis-ui monorepo

## TL;DR

`@trellis.computer/icons` is a **detection + resolution model**, not a
hand-authored SVG library. `<trellis-icon name="home">` names an icon **without
a pack prefix**; the **active theme's `--icon-pack` token** decides which
Iconify set resolves it. The component also auto-detects **emojis** and
**image URLs**, and resolves **semantic aliases** (`entity-issue`,
`status-done`) from Trellis's own ontology.

Pack choice is a **theme concern** — the same markup renders Lucide under one
theme and Tabler under another, with zero component changes.

Local-first: a curated set of Iconify JSON collections ships in the package, so
the common icon sets resolve with **no network at runtime**; the long tail loads
on demand from Iconify and caches.

## Theme-Decided Pack

The icon pack is a CSS custom property on the theme contract (TRL-314):

```css
:root {
  --icon-pack: lucide;              /* default */
}
[data-theme="uithing"] {
  --icon-pack: lucide;
}
[data-theme="minimal"] {
  --icon-pack: tabler;
}
```

`<trellis-icon>` reads `getComputedStyle(this).getPropertyValue('--icon-pack')`,
falls back to `lucide` when unset, and resolves bare names against that set.
Nested themes inherit pack like any other token.

## Detection Model

The component classifies `name` on every render:

```ts
type IconKind = 'bare' | 'iconify' | 'emoji' | 'image' | 'alias'

function detectKind(name: string): IconKind {
  if (isEmoji(name)) return 'emoji'                          // \p{Extended_Pictographic}
  if (/^https?:\/\//i.test(name)) return 'image'             // URL scheme
  if (/^[a-z0-9-]+:[a-z0-9-]+$/i.test(name)) return 'iconify' // set:icon escape hatch
  if (registry.hasAlias(name)) return 'alias'                // semantic name
  return 'bare'                                               // pack:name via --icon-pack
}
```

| Kind | Example input | Resolves to |
|---|---|---|
| `bare` | `home`, `settings` | `var(--icon-pack):home` → SVG from bundled/on-demand set |
| `iconify` | `mdi:github` (explicit escape hatch) | exact set:icon, bypasses theme pack |
| `emoji` | `🚀`, `🎨` | text node, sized via `font-size` |
| `image` | `https://example.com/icon.png` | `<img>` |
| `alias` | `entity-issue`, `status-in-progress` | semantic alias → pack-aware resolution |

**Bare-name resolution:** the icon name is looked up **within the active pack
first**; if the pack lacks that name, resolution falls back through the alias
table, then to the registered fallback glyph — never a broken box.

## Semantic Alias Table

The Trellis ontology survives as a **thin alias layer** mapping semantic names
to concrete icons. Aliases are **per-pack aware**: the table stores a preferred
icon for each known pack, with a Lucide-pinned default.

```ts
type AliasEntry = { default: string; packs?: Partial<Record<string, string>> }

const ALIASES: Record<string, AliasEntry> = {
  // entity
  'entity-issue': { default: 'lucide:git-issue', packs: { tabler: 'tabler:git-issue' } },
  'entity-lane': { default: 'lucide:git-branch' },
  'entity-project': { default: 'lucide:folder-kanban' },
  'entity-person': { default: 'lucide:user' },
  'entity-note': { default: 'lucide:file-text' },
  'entity-doc': { default: 'lucide:file' },
  // action
  'action-create': { default: 'lucide:plus' },
  'action-edit': { default: 'lucide:pencil' },
  'action-delete': { default: 'lucide:trash-2' },
  'action-duplicate': { default: 'lucide:copy' },
  'action-move': { default: 'lucide:arrow-right' },
  // status
  'status-todo': { default: 'lucide:circle' },
  'status-in-progress': { default: 'lucide:loader-circle' },
  'status-done': { default: 'lucide:check-circle-2' },
  'status-blocked': { default: 'lucide:octagon-x' },
  'status-cancelled': { default: 'lucide:ban' },
  // chrome (core)
  'core-chevron-down': { default: 'lucide:chevron-down' },
  'core-menu': { default: 'lucide:menu' },
  'core-close': { default: 'lucide:x' },
  'core-search': { default: 'lucide:search' },
  'core-plus': { default: 'lucide:plus' },
}
```

Resolution order for an alias: `packs[activePack]` → `default` → fallback glyph.
Alias values may also be emoji or image URLs — resolution recurses through the
same detector.

## `<trellis-icon>` — Web Component

```html
<trellis-icon name="home"></trellis-icon>            <!-- bare → --icon-pack -->
<trellis-icon name="entity-issue"></trellis-icon>    <!-- alias -->
<trellis-icon name="🚀" size="24"></trellis-icon>     <!-- emoji -->
<trellis-icon name="mdi:github"></trellis-icon>      <!-- explicit escape hatch -->
```

**Attributes:**
- `name` (required) — bare icon name, `set:icon`, emoji, image URL, or alias
- `size` (optional) — number (px) or token string; default `md`
  - tokens: `xs` 12, `sm` 16, `md` 20, `lg` 24, `xl` 32
- `color` (optional) — CSS color; default `currentColor`

**Styling:** inherits `currentColor` from context. Tailwind-style utility classes
on the host work (`class="text-red-500"`). Entity/status aliases default to
theme colors via CSS:

```css
trellis-icon[name^="entity-"] { color: var(--color-issue, currentColor); }
trellis-icon[name^="status-"] { color: var(--status-done, currentColor); }
```

## Registry API

```ts
import { registry } from '@trellis.computer/icons'

registry.hasAlias('entity-issue')        // boolean
registry.resolve('entity-issue', 'lucide') // 'lucide:git-issue' (pack-aware)
registry.resolve('home', 'lucide')       // 'lucide:home' (bare + pack)
registry.detect('🚀')                    // 'emoji'
registry.findByKind('entity')            // Icon[] — all entity aliases
registry.register(aliases)               // extend the alias table
registry.activePack(el?)                 // resolved --icon-pack (computed style)
registry.iconify('lucide:home')          // SVG markup (from cache/local set)
```

## Bundled Collections (local-first)

Ship these JSON collections in the package (from `@iconify-json/*`):

| Set | Prefix | Notes |
|---|---|---|
| Lucide | `lucide` | default pack (aliases fall back here) |
| Heroicons | `heroicons` | outline + solid |
| Material Design | `mdi` | large general set |
| Tabler | `tabler` | alternative outline set |
| Simple Icons | `simple-icons` | brand marks |

Any set not bundled loads on demand from Iconify and caches for repeat renders.
Offline behavior: bundled sets always resolve; unbundled sets fall back to the
registered fallback glyph.

## Naming Convention

```
<name>                  — bare      (home → --icon-pack:home)
<set>:<icon>            — iconify   (mdi:github — escape hatch)
<emoji>                 — emoji     (🚀)
<scheme>://…            — image     (https://…)
<semantic-name>         — alias     (entity-issue, status-done)
```

Semantic names follow `<category>-<descriptive-name>` for the built-in ontology:
`entity-*`, `action-*`, `status-*`, `core-*`.

## Pack System

Packs extend the alias table and/or add Iconify collections:

```ts
// my-pack/index.ts
import { registry } from '@trellis.computer/icons'

registry.register({ 'entity-widget': { default: 'lucide:box' } })
```

## Build Process

- `@iconify-json/*` collections are bundled into the dist (tree-shaken by prefix).
- Alias table is a plain data module — no build step needed.
- Bundle: `dist/index.mjs` + `dist/index.d.ts`; web component self-registers.

## Distribution

- `trellis add icons` installs `@trellis.computer/icons` + bundles the curated
  collections.
- The `<trellis-icon>` web component resolves locally; network only for
  unbundled long-tail icons (cache-backed).

## Acceptance Criteria

1. `<trellis-icon name>` detects all five kinds: bare, iconify, emoji, image
   URL, alias.
2. Bare names resolve through `--icon-pack` (theme token); changing
   `--icon-pack` re-renders the same markup with the new set.
3. Alias table ships the entity/action/status/core names above; aliases resolve
   per-pack with a Lucide default fallback.
4. Entity/status aliases inherit theme colors via `var(--color-*)`/`var(--status-*)`.
5. Bundled collections (Lucide, Heroicons, MDI, Tabler, Simple Icons) resolve
   with **zero network requests** in the demo.
6. `size` accepts number + token string; `xs`–`xl` map to 12–32px.
7. Unbundled Iconify names load on demand and cache; offline fallback shows a
   registered glyph, never a broken box.
8. `registry` exposes `hasAlias`, `resolve`, `detect`, `findByKind`, `register`,
   `activePack`, `iconify`.
