# Font Registry & Ontology — @trellis.computer/fonts

**Status:** spec
**Date:** 2026-07-24
**Issue:** TRL-316
**References:** font-vibes (Google Fonts client, typed API, CSS URL builder), iconic (registry pattern)
**Target:** `packages/fonts/` in trellis-ui monorepo

## TL;DR

`@trellis.computer/fonts` provides a semantic font registry where fonts are
identified by role (not family name), resolved to CSS `@font-face` declarations,
and served via Google Fonts or self-hosted URLs. Components reference fonts via
`var(--font-<role>)` CSS custom properties linked to the theme contract.

## Registry Model

```ts
interface FontEntry {
  role: string
  family: string
  category: 'sans' | 'serif' | 'mono' | 'display' | 'handwriting'
  weights: number[]
  styles: ('normal' | 'italic')[]
  source: 'google' | 'self-hosted' | 'system'
  url?: string         // Google Fonts CSS URL or self-hosted path
  fallback: string[]   // System font stack fallback
}
```

## Predefined Roles

| Role | Default Family | Category | Fallback Stack | Purpose |
|---|---|---|---|---|
| `sans` | Inter | sans | `system-ui, -apple-system, sans-serif` | UI text |
| `mono` | JetBrains Mono | mono | `'Fira Code', 'Cascadia Code', monospace` | Code |
| `serif` | Georgia | serif | `'Times New Roman', serif` | Long-form |
| `display` | Cabinet Grotesk | display | `sans-serif` | Headings |
| `handwriting` | N/A | — | `cursive` | Notes (optional) |

## Base Font Specs

### Inter (sans)

- Source: Google Fonts
- Weights: 400, 500, 600, 700
- Styles: normal
- CSS URL: `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700`

### JetBrains Mono (mono)

- Source: Google Fonts
- Weights: 400, 500, 600
- Styles: normal, italic
- CSS URL: `https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap`

### Cabinet Grotesk (display)

- Source: Google Fonts
- Weights: 500, 700, 800
- Styles: normal
- CSS URL: `https://fonts.googleapis.com/css2?family=Cabinet+Grotesk:wght@500;700;800`

## Registry API

```ts
import { registry } from '@trellis.computer/fonts'

// Lookup
registry.get('sans')              // FontEntry | undefined
registry.resolve('sans')          // Resolved CSS @font-face string
registry.load('sans')             // Inject <link> into document head
```

## Theme Integration

Font roles map to CSS custom properties defined in the theme contract (TRL-314):

```css
:root {
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --font-serif: 'Georgia', serif;
  --font-display: 'Cabinet Grotesk', sans-serif;
}
```

Products can override by resetting the custom property:

```css
:root {
  --font-sans: 'SF Pro', system-ui, sans-serif;
}
```

## Component Integration

Components reference font roles via the theme tokens:

```css
trellis-entity {
  font-family: var(--font-sans);
}

trellis-entity-list h3 {
  font-family: var(--font-display);
}

code, pre {
  font-family: var(--font-mono);
}
```

## Pack System

Similar to icons, fonts are organized into packs:

```
packages/fonts/
├── src/
│   ├── registry.ts        # Registry class
│   ├── core/               # Built-in font entries
│   │   ├── sans.ts         # Inter
│   │   ├── mono.ts         # JetBrains Mono
│   │   └── display.ts      # Cabinet Grotesk
│   ├── packs/              # Community add-on packs
│   │   └── geist/          # Example: Geist font pack
│   └── index.ts            # Public API
└── package.json
```

## Font Loading

- `registry.load(role)` injects a `<link>` tag for Google Fonts CSS
- Self-hosted fonts use `@font-face` declarations in the project
- Font-display strategy: `swap` (default), configurable per entry
- Preload hint: registry emits `<link rel="preload">` for critical fonts

## Distribution

- `trellis add fonts` copies font config + loads Google Fonts link
- `trellis add fonts --self-hosted` copies font files and generates
  `@font-face` CSS
- The registry resolves at build time or runtime (for Google Fonts)

## Acceptance Criteria

1. `packages/fonts/src/registry.ts` implements `get`, `resolve`, `load`
2. Core pack defines entries for `sans`, `mono`, `serif`, `display` roles
3. Inter (400, 500, 600, 700) is the default `sans` font
4. JetBrains Mono (400, 500, 600) is the default `mono` font
5. `registry.resolve('sans')` returns a valid CSS `@font-face` or `@import` string
6. `registry.load('sans')` injects a `<link>` element into the document head
