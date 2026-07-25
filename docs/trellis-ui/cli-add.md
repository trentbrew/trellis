# CLI Spec: trellis add — UI Components & Ontology Types

**Status:** spec
**Date:** 2026-07-24
**Issue:** TRL-313
**Parent:** TRL-311
**References:** shadcn (distribution model), SemType (ontology type resolution), TRL-314 (theme), TRL-315 (icons), TRL-316 (fonts)

## TL;DR

`trellis add <name>` is a single command that handles both UI components and
ontology types. It auto-detects the category by checking the UI registry first,
then the type registry. No flags or subcommands needed. UI components are copied
into the project; ontology types are referenced in the graph schema.

## Command Interface

```bash
# Auto-detect (check UI first, then types)
trellis add button                      # UI component
trellis add person                      # Ontology type
trellis add @trellis.computer/ui/button # Explicit: UI component
trellis add @trellis.computer/types/person # Explicit: ontology type
trellis add icons                       # Icon pack
trellis add fonts                       # Font pack

# Flags
trellis add button --dry-run            # Show what would be copied
trellis add person --path src/types     # Custom output path
trellis add icons --pack lucide         # Specific icon pack
trellis add fonts --self-hosted         # Self-hosted font variant
trellis add --list                      # List available add-ons
trellis add --help                      # Show help
```

## Resolution Order

1. Parse input: is it a scoped name (`@scope/...`) or bare name?
2. If scoped: check scope → `@trellis.computer/ui/*` (UI) or
   `@trellis.computer/types/*` (ontology) or special (`icons`, `fonts`)
3. If bare: check the UI registry cache first, then the type registry cache
4. Response includes `category: 'ui' | 'type' | 'icons' | 'fonts'` metadata
5. Register commands based on category

## Registry Protocol

The registry responds with:

```json
{
  "name": "button",
  "category": "ui",
  "source": "@trellis.computer/ui@latest",
  "files": ["button.ts", "button.css"],
  "description": "Button web component"
}
```

For ontology types:

```json
{
  "name": "person",
  "category": "type",
  "url": "https://types.trellis.computer/person/v1",
  "description": "Person entity type"
}
```

## UI Component Copy (Shadcn Pattern)

When resolving an `category: "ui"` response:

1. Resolve npm package to find source files (`@trellis.computer/ui/button`)
2. Copy matched files into project (default: `src/lib/trellis/ui/`)
3. Update project configuration if needed (tailwind, tsconfig paths)
4. Print summary of copied files
5. The project now owns the code — free to modify

## Ontology Type Reference

When resolving an `category: "type"` response:

1. Fetch schema from the versioned URL
2. Register the type reference in the project's graph schema config
3. Add import/resolution path to project configuration
4. Print summary with type URL
5. The type remains hosted at the URL — project references it

## Icon & Font Commands

```bash
trellis add icons                     # Copy core icon set
trellis add icons --pack lucide       # Copy a specific icon pack
trellis add fonts                     # Copy font config + load Google Fonts
trellis add fonts --self-hosted       # Copy font files + @font-face CSS
```

- Icons are copied as SVG files + registry config into the project
- Fonts are registered in the project's font config (not copied as binary files
  unless `--self-hosted`)
- The `<trellis-icon>` component resolves from the local copy

## Output Paths

| Category | Default Output Path | Configurable |
|---|---|---|
| UI component | `src/lib/trellis/ui/<name>/` | `--path` |
| Ontology type | Schema config (no file copy) | `--path` (config location) |
| Icons | `src/lib/trellis/icons/` | `--path` |
| Fonts | `src/lib/trellis/fonts/` | `--path` |

## Config File

`trellis add` creates/updates `trellis.config.json` in the project root:

```json
{
  "add": {
    "ui": {
      "path": "src/lib/trellis/ui",
      "source": "@trellis.computer/ui"
    },
    "types": {
      "registry": "https://types.trellis.computer"
    },
    "fonts": {
      "path": "src/lib/trellis/fonts",
      "selfHosted": false
    }
  }
}
```

## --list Output

```
Available components:
  button         trellis add button       Button web component
  entity         trellis add entity       Entity renderer
  entity-list    trellis add entity-list  Entity list component
  query          trellis add query        TQL query component
  ...

Available types:
  issue          trellis add issue        Issue entity type
  person         trellis add person       Person entity type
  project        trellis add project      Project entity type
  ...

Available packs:
  icons          trellis add icons        Core icon pack
  fonts          trellis add fonts        Core font pack
```

## Acceptance Criteria

1. `trellis add button` copies UI component files into the project
2. `trellis add person` adds an ontology type reference to the graph schema
3. `trellis add` auto-detects UI components before ontology types on name match
4. `trellis add icons` copies core icons into the project
5. `trellis add fonts` registers font configuration in the project
6. `trellis add --list` shows available UI components, types, and packs
7. `trellis add <name> --dry-run` prints intended action without modifying files
8. Resolution order: scoped names are deterministic, bare names check UI first
