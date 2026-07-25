# Architecture Decisions — Kernel vs UI vs Types

**Status:** spec
**Date:** 2026-07-24
**Issue:** TRL-317
**References:** TRL-311, ONTOLOGY.md, trellis-ui-webcomponents.md, SemType spec

## TL;DR

Trellis has three distinct layers: the kernel (`trellis`), the UI library
(`@trellis.computer/ui`), and ontology types (`@trellis.computer/types/*`).
Each has different ownership, distribution, and lifecycle. This document records
the architectural decisions governing their boundaries.

## Layer Boundaries

| Aspect | Kernel (trellis) | UI Library (@trellis.computer/ui) | Ontology Types (@trellis.computer/types/*) |
|---|---|---|---|
| **Package** | `trellis` (standalone) | `@trellis.computer/ui` | `@trellis.computer/types/*` |
| **Purpose** | Data layer, op-log, sync, SDK | Web Components, projection | Entity type schemas |
| **Distribution** | npm dependency | Shadcn (source copy) | URL reference (SemType) |
| **Ownership** | turtle.tech | Product (after copy) | turtle.tech (mutable at URL) |
| **Modification** | Published releases | Free to modify copy | Extend, cannot modify |
| **Framework** | TypeScript | Lit (Web Components) | JSON Schema / SemType |
| **Versioning** | npm SemVer | npm SemVer + project fork | URL SemVer |

## Decision 1: Kernel Stays Pure Data Layer

**Context:** Earlier attempts bundled UI primitives or framework adapters into
the kernel. This created coupling — kernel releases required UI coordination,
and UI changes blocked kernel patches.

**Decision:** The kernel (`trellis`) exports only the data layer: schema,
op-log, sync, queries, Signal primitives, and browser entry points. It has zero
DOM dependencies, zero component definitions. UI is a consumer of the kernel
SDK, not part of it.

**Consequences:**
- Kernel can release independently of UI
- UI can have its own release cadence
- Framework adapters stay outside the kernel
- Kernel size stays small (no component bundle)

## Decision 2: UI Uses Shadcn Distribution

**Context:** Traditional npm dependencies create version skew between 5 products
in 4 frameworks. Products couldn't customize components without forking the
package.

**Decision:** `@trellis.computer/ui` follows the shadcn pattern — the npm
package is the registry source of truth, but `trellis add` copies source into
projects. Products own their code. No runtime dependency on the npm package
after copy.

**Consequences:**
- Products can patch components without waiting for upstream
- No stale node_modules for UI
- Framework-specific variants per project
- Duplication across projects is acceptable
- Community contributions via PR to registry

## Decision 3: Ontology Types Are Referenced, Not Copied

**Context:** Earlier approach treated types like code — copied into projects,
modified locally, drift inevitable. SemType introduced URL-identified types with
immutable versioning.

**Decision:** `trellis add <type>` adds a reference to the graph schema, not a
file copy. Types live at versioned URLs (e.g.,
`https://types.trellis.computer/issue/v1`). The graph resolution fetches the
schema at query time, not build time.

**Consequences:**
- Type updates propagate without code changes
- Projects can extend types (subtype), cannot modify originals
- Version negotiation at query time
- Network fetch required for first resolution (cacheable)

## Decision 4: CLI Auto-Detect Replaces Subcommands

**Context:** Early designs used `trellis add ui button` / `trellis add type
person` subcommands. This required users to know the category before adding.

**Decision:** `trellis add <name>` auto-detects category from the registry:
check UI components first, then ontology types. The registry response tells the
CLI what it is. No flags needed.

**Consequences:**
- Single command for both operations
- Ambiguous names resolved by registry priority (UI first)
- Explicit path still available: `trellis add @trellis.computer/ui/button`
- Registry must respond with category metadata

## Decision 5: Web Components Over Framework Components

**Context:** Framework-specific components (Svelte, Vue, React, Solid) would
require either a per-framework registry or a cross-framework DSL. Both add
complexity and maintenance burden.

**Decision:** The UI library builds on Lit (Web Components). Web Components are
consumable from any framework without adapters. Products may optionally create
framework-specific wrappers in their own code.

**Consequences:**
- Universal framework consumption
- Lit-specific patterns (reactive properties, lifecycle, slots)
- Products that need deep framework integration write wrappers locally
- No DSL layer — just HTML custom elements

## Decision 6: CSS Custom Properties Over Design Tokens Build Step

**Context:** Design token systems typically involve a build step (Style
Dictionary, Theo) that generates platform-specific output. This adds complexity
and a compile step for what is fundamentally a CSS contract.

**Decision:** Theme tokens are CSS custom properties, authored directly in CSS,
with no build-time token transformation. Products override by setting properties
on `:root` or scoped containers. Token documentation is the source of truth, not
a JSON config file.

**Consequences:**
- Zero build step for tokens
- Runtime theme switching via `data-theme` attribute
- Products can override at any granularity (global, container, component)
- No Style Dictionary dependency
- Token names ARE the API contract

## Acceptance Criteria

1. `docs/trellis-ui/architecture-decisions.md` documents all 6 decisions above
2. Each decision records context, decision, and consequences
3. `ONTOLOGY.md` references this document from the UI Library layer
4. `docs/planning/trellis-ui-webcomponents.md` links to this document
5. Any future architecture decision adds a new numbered section (Decision 7+)
