# Theme Contract — CSS Custom Properties for @trellis.computer/ui

**Status:** spec
**Date:** 2026-07-24
**Issue:** TRL-314
**Supersedes:** TRL-156 (unified theme contract proposal)
**References:** tweakcn (semantic groups), daisyUI (oklch, data-theme), iconic/font-vibes (registry)
**Target:** `tokens/design-tokens.css` in trellis-ui monorepo

## TL;DR

All `@trellis.computer/ui` components reference CSS custom properties — never
hardcoded values. Tokens are grouped semantically, use `oklch` color format, and
support `data-theme` switching (default, dark, nested). Products override by
setting their own values on `:root` or a scoped container.

## Color Format

All color tokens use `oklch`:

```css
--color-primary: oklch(0.5 0.2 240);
```

**Why oklch:** perceptual uniformity, wide gamut, intuitive lightness (L) +
chroma (C) + hue (H). Unlike HSL, oklch lightness is perceptually linear —
`oklch(0.5 …)` is visually halfway regardless of hue.

## Semantic Groups

### Base (background surfaces)

| Token | Default (light) | Default (dark) | Purpose |
|---|---|---|---|
| `--bg` | `oklch(1 0 0)` | `oklch(0.15 0.01 260)` | Page background |
| `--bg-surface` | `oklch(0.97 0.005 260)` | `oklch(0.2 0.015 260)` | Card/sheet surface |
| `--bg-elevated` | `oklch(0.95 0.008 260)` | `oklch(0.25 0.02 260)` | Modal/dropdown backdrop |
| `--bg-hover` | `oklch(0.9 0.01 260)` | `oklch(0.3 0.025 260)` | Hover state surface |

### Brand colors

| Token | Default (light) | Default (dark) | Purpose |
|---|---|---|---|
| `--primary` | `oklch(0.5 0.2 240)` | `oklch(0.6 0.2 240)` | Primary action, links |
| `--primary-content` | `oklch(1 0 0)` | `oklch(0.15 0.01 260)` | Text on primary |
| `--secondary` | `oklch(0.6 0.15 180)` | `oklch(0.7 0.15 180)` | Secondary action |
| `--secondary-content` | `oklch(1 0 0)` | `oklch(0.15 0.01 260)` | Text on secondary |
| `--accent` | `oklch(0.6 0.2 30)` | `oklch(0.7 0.2 30)` | Highlight, call-to-action |
| `--accent-content` | `oklch(1 0 0)` | `oklch(0.15 0.01 260)` | Text on accent |

### State colors

| Token | Default (light) | Default (dark) | Purpose |
|---|---|---|---|
| `--info` | `oklch(0.6 0.15 220)` | `oklch(0.7 0.15 220)` | Informational |
| `--info-content` | `oklch(1 0 0)` | `oklch(0.15 0.01 260)` | Text on info |
| `--success` | `oklch(0.55 0.2 150)` | `oklch(0.65 0.2 150)` | Success |
| `--success-content` | `oklch(1 0 0)` | `oklch(0.15 0.01 260)` | Text on success |
| `--warning` | `oklch(0.65 0.2 80)` | `oklch(0.75 0.2 80)` | Warning |
| `--warning-content` | `oklch(0.15 0.01 260)` | `oklch(0.15 0.01 260)` | Text on warning |
| `--destructive` | `oklch(0.5 0.25 25)` | `oklch(0.6 0.25 25)` | Error, danger |
| `--destructive-content` | `oklch(1 0 0)` | `oklch(1 0 0)` | Text on destructive |
| `--muted` | `oklch(0.85 0.01 260)` | `oklch(0.3 0.02 260)` | Muted background |
| `--muted-content` | `oklch(0.5 0.02 260)` | `oklch(0.6 0.02 260)` | Muted text |

### Entity-type colors

| Token | Default (light) | Default (dark) | Entity |
|---|---|---|---|
| `--color-issue` | `oklch(0.55 0.2 240)` | `oklch(0.65 0.2 240)` | Issue |
| `--color-lane` | `oklch(0.55 0.2 180)` | `oklch(0.65 0.2 180)` | Lane |
| `--color-project` | `oklch(0.55 0.2 30)` | `oklch(0.65 0.2 30)` | Project |
| `--color-person` | `oklch(0.55 0.2 120)` | `oklch(0.65 0.2 120)` | Person |
| `--color-note` | `oklch(0.55 0.15 80)` | `oklch(0.65 0.15 80)` | Note |
| `--color-doc` | `oklch(0.55 0.1 300)` | `oklch(0.65 0.1 300)` | Document |

### Status colors

| Token | Default (light) | Default (dark) | Status |
|---|---|---|---|
| `--status-todo` | `oklch(0.6 0.15 220)` | `oklch(0.7 0.15 220)` | Pending / backlog |
| `--status-in-progress` | `oklch(0.6 0.2 80)` | `oklch(0.7 0.2 80)` | Active / doing |
| `--status-done` | `oklch(0.55 0.2 150)` | `oklch(0.65 0.2 150)` | Completed |
| `--status-blocked` | `oklch(0.5 0.25 25)` | `oklch(0.6 0.25 25)` | Blocked |
| `--status-cancelled` | `oklch(0.5 0.02 260)` | `oklch(0.5 0.02 260)` | Cancelled / abandoned |

### Structural tokens

| Token | Default | Purpose |
|---|---|---|
| `--border` | `oklch(0.85 0.01 260)` | Default border color |
| `--border-focus` | `var(--primary)` | Focus ring border |
| `--input-bg` | `var(--bg)` | Input background |
| `--input-border` | `var(--border)` | Input border |
| `--ring` | `var(--primary)` | Focus ring shadow |
| `--radius-sm` | `0.25rem` | Small border radius |
| `--radius-md` | `0.375rem` | Medium border radius |
| `--radius-lg` | `0.5rem` | Large border radius |
| `--radius-xl` | `0.75rem` | Extra large radius |
| `--radius-full` | `9999px` | Pill/circular radius |
| `--shadow-sm` | `0 1px 2px rgb(0 0 0 / 0.05)` | Small shadow |
| `--shadow-md` | `0 4px 6px rgb(0 0 0 / 0.1)` | Medium shadow |
| `--shadow-lg` | `0 10px 15px rgb(0 0 0 / 0.15)` | Large shadow |

### Spacing scale

| Token | Default | Purpose |
|---|---|---|
| `--space-1` | `0.25rem` | 4px |
| `--space-2` | `0.5rem` | 8px |
| `--space-3` | `0.75rem` | 12px |
| `--space-4` | `1rem` | 16px |
| `--space-6` | `1.5rem` | 24px |
| `--space-8` | `2rem` | 32px |
| `--space-12` | `3rem` | 48px |
| `--space-16` | `4rem` | 64px |

### Typography tokens

| Token | Default |
|---|---|
| `--font-sans` | `'Inter', system-ui, -apple-system, sans-serif` |
| `--font-mono` | `'JetBrains Mono', 'Fira Code', monospace` |
| `--font-serif` | `'Georgia', serif` |
| `--font-size-xs` | `0.75rem` |
| `--font-size-sm` | `0.875rem` |
| `--font-size-base` | `1rem` |
| `--font-size-lg` | `1.125rem` |
| `--font-size-xl` | `1.25rem` |
| `--font-size-2xl` | `1.5rem` |
| `--font-weight-normal` | `400` |
| `--font-weight-medium` | `500` |
| `--font-weight-semibold` | `600` |
| `--font-weight-bold` | `700` |
| `--line-height-tight` | `1.25` |
| `--line-height-normal` | `1.5` |
| `--line-height-relaxed` | `1.75` |

## Theme Switching

Themes are applied via `data-theme` attribute on any container element:

```css
:root {
  --bg: oklch(1 0 0);
  --primary: oklch(0.5 0.2 240);
  /* light theme defaults */
}

[data-theme="dark"] {
  --bg: oklch(0.15 0.01 260);
  --primary: oklch(0.6 0.2 240);
  /* all tokens override */
}

/* Nested overrides */
[data-theme="dark"] [data-theme="light"] {
  --bg: oklch(1 0 0);
  /* reset to light within a dark container */
}
```

Products ship one or more `[data-theme="..."]` blocks. Consumers pick:
```html
<html data-theme="dark">
```

### Theme names

- `default` — Light theme (aliased to `[data-theme]` omitted)
- `dark` — Dark theme
- `high-contrast` — Accessibility theme

Themes are additive: a dark theme block only overrides tokens that differ from
default. Nested themes inherit unset tokens from parent.

## Component Usage

Components reference tokens via `var()`. Example:

```css
trellis-entity {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--color-issue);
}
```

Components never hardcode values. Token names form the API contract — products
customize by overriding the CSS property, not by patching component styles.

## Token File Structure

```
tokens/
├── design-tokens.css      # All tokens, all groups (authoritative)
├── colors.css              # Color tokens only (for import by non-UI consumers)
├── typography.css          # Typography tokens only
├── spacing.css             # Spacing + radius tokens only
└── colors.less / .scss     # Generated from authoritative CSS (future)
```

`design-tokens.css` is the source of truth. The per-category files are generated
slices for consumers that need only a subset.

## Acceptance Criteria

1. `tokens/design-tokens.css` defines all semantic groups listed above
2. All color tokens use `oklch()` format
3. `[data-theme="dark"]` block overrides every token that differs from light
4. Entity-type tokens cover: issue, lane, project, person, note, doc
5. Status tokens cover: todo, in-progress, done, blocked, cancelled
6. No component CSS file hardcodes a color, spacing, or typography value
