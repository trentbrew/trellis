# Spec: Registry Versioning & Dependency Resolution

**Status:** draft · **Parent:** unified-agent-ontology.md · **Issues:** N/A

## Context

The `@trellis.computer` registry will publish ontology packages (workflows, agents, ontologies, adapters, themes, projections, affordances). Without a robust versioning and resolution system, registry dependencies become a source of breakage and incompatibility.

The core problem: ontologies change over time. A workflow built against `core:WorkflowStep v1.0.0` may break if the schema adds a new required field. A pipeline that depends on multiple workflows needs to resolve compatible versions of all transitive dependencies simultaneously.

This spec addresses versioning, resolution, and lockfiles — borrowing from Nix's approach to content-addressed, reproducible dependency management.

---

## What We Can Learn from Nix

### 1. Content-addressed identity

Nix identifies packages by the cryptographic hash of their **content**, not by their name+version string. This means:

- A package that hasn't changed gets the same identity across machines
- A single byte change produces a completely different identity
- No "semver drift" — the version string is metadata; the hash is the truth

**Applied to our registry:** Each package JSON is hashed (SHA-256). The hash becomes part of the package's identity. When `trellis add` resolves a dependency, it records the content hash in the lockfile, not just the version range.

### 2. Lockfile as source of truth

Nix's `flake.lock` records the exact content hash, revision, and input path for **every transitive dependency**. This means:

- Two developers on the same repo get identical dependency trees
- CI uses the lockfile, never re-resolves
- Updating a dependency requires an explicit `trellis update` (analogous to `nix flake update`)

**Applied to our registry:** A lockfile (`.trellis/deps.json`) pins exact package content hashes, revisions, and resolved paths. The lockfile is committed to git. `trellis add` modifies the lockfile. `trellis update` re-resolves constraints.

### 3. Constraint-based resolution with content verification

Nix flakes declare inputs with constraints (`nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.11"`). The resolver picks the latest matching revision. When fetched, the content hash is compared against the lockfile (or recalculated if uncached).

**Applied to our registry:** Registry dependencies declare semver ranges (`>=1.0.0 <2.0.0`). The resolver finds the latest published package satisfying the range. The lockfile records the exact version + content hash. On install, the content hash is verified against the registry.

### 4. Closure deduplication

Nix's closure is the set of all transitive dependencies, deduplicated by content hash. Two flakes that depend on the same version of `nixpkgs` share a single copy in the store.

**Applied to our registry:** The graph stores each unique package content once. Multiple workflows/agents/pipelines that reference the same schema share the same graph entities. The resolver never installs duplicate content.

### 5. Input-addressed derivation (bonus)

Nix's experimental content-addressed derivations compute the store path from a hash of the build output — the output name is derived from its content, not from the build recipe. This is the strongest form of reproducibility.

**Applied to our registry:** Package content hashes serve as derivation identifiers. If a package's JSON-LD content changes, its hash changes, and the graph treats it as a new entity. This makes the registry content-addressed end-to-end.

---

## Design

### 1. Package Identity

Each package in `@trellis.computer` is identified by a content hash derived from its JSON-LD body:

```
@trellis.computer/workflows/feature-development@1.2.0
  → content hash: sha256:abc123...
  → store path: @trellis/workflows/feature-development/1.2.0/sha256-abc123
```

The hash is computed over the canonicalized JSON-LD package (sorted keys, no whitespace). This makes the identity deterministic and independent of serialization format.

### 2. Package Manifest

Each package `package.json` declares:

```json
{
  "name": "@trellis.computer/workflows",
  "version": "1.2.0",
  "content": "sha256:abc123...",
  "schemas": [
    {
      "@id": "core:WorkflowStep",
      "@type": "trellis:Schema",
      "version": "1.2.0",
      "depends": {
        "core:Workflow": ">=1.0.0"
      }
    }
  ],
  "depends": {
    "core:Workflow": ">=1.0.0",
    "@trellis.computer/ontologies": ">=2.0.0"
  }
}
```

#### Manifest fields

| Field | Purpose |
|-------|---------|
| `name` | Registry origin + package name |
| `version` | Semver — human-readable version string |
| `content` | SHA-256 hash of the canonicalized package body — the true identity |
| `schemas` | List of ontology schemas this package contributes, each with their own `depends` |
| `depends` | Top-level dependency constraints |

#### Schema-level dependencies

Individual schemas within a package can declare their own constraints:

```json
{
  "@id": "core:WorkflowStep",
  "version": "1.2.0",
  "depends": {
    "core:Workflow": ">=1.0.0",
    "core:WorkflowEdge": ">=1.0.0"
  }
}
```

This means `WorkflowStep v1.2.0` requires `Workflow v1.0.0+` and `WorkflowEdge v1.0.0+`. The resolver checks all schema-level constraints transitively.

### 3. Lockfile

`.trellis/deps.json` (or `.trellis/lock.json`) records the resolved, pinned dependency tree:

```json
{
  "version": 1,
  "lockfileVersion": "1.0.0",
  "resolved": {
    "@trellis.computer/workflows": {
      "version": "1.2.0",
      "content": "sha256:abc123...",
      "revision": "refs/tags/v1.2.0",
      "schemas": {
        "core:WorkflowStep": {
          "version": "1.2.0",
          "content": "sha256:def456...",
          "@id": "core:WorkflowStep"
        }
      }
    },
    "@trellis.computer/ontologies": {
      "version": "2.1.0",
      "content": "sha256:789ghi...",
      "revision": "refs/tags/v2.1.0",
      "schemas": { ... }
    }
  },
  "root": {
    "depends": {
      "@trellis.computer/workflows": ">=1.0.0"
    }
  }
}
```

#### Lockfile properties

- **Content-addressed:** The `content` hash is the authoritative identity
- **Immutable:** Once committed, the lockfile pins the exact dependency tree
- **Transitive:** Records all transitive dependencies, not just direct ones
- **Committed to git:** The lockfile is part of the repo, ensuring reproducibility

### 4. Resolution Algorithm

When `trellis add workflow feature-development` runs:

```
1. Parse the request: @trellis.computer/workflows feature-development
2. Check lockfile:
   - If already present and content hash matches → skip (satisfies cache/substitution)
   - If present but constraint is stale → re-resolve
   - If absent → resolve
3. Fetch package metadata from registry:
   - List all published versions of the package
   - Filter by constraint (semver range from depends)
   - Pick the latest matching version
4. Verify each schema's internal dependencies:
   - For each schema in the package, check its `depends` constraints
   - Recursively resolve and verify all transitive schema dependencies
   - Build the full closure (all transitive packages and schemas)
5. Check for conflicts:
   - If two packages require incompatible versions of the same schema (e.g., Workflow >=2.0.0 vs <1.5.0), fail with a clear error
6. Record in lockfile:
   - Pin exact version + content hash + revision for every resolved package
   - Write .trellis/deps.json
7. Register schemas in the graph:
   - For each schema in each package, create/update graph entities
   - Skip if the content hash already exists in the graph (Deduplication)
8. Update agent-manifest.json if applicable:
   - Add/update references in the unified manifest
```

#### Conflict resolution

If constraints are unsatisfiable, the resolver reports exactly which schemas conflict:

```
CONFLICT: Cannot resolve dependencies for workflow feature-development:
  - @trellis.computer/workflows/feature-development requires core:WorkflowStep >=1.1.0
  - @trellis.computer/workflows/quality-gate requires core:WorkflowStep >=1.2.0
  - @trellis.computer/workflows/core has core:WorkflowStep 1.1.0 (locked)
  
Resolution: Update locked core:WorkflowStep to >=1.2.0, or pin quality-gate to an older version.
```

#### The `follows` mechanism

Like Nix's `.follows`, the lockfile can instruct the resolver to share a single instance of a dependency across multiple consumers:

```json
{
  "resolved": {
    "core:Workflow": {
      "version": "1.0.0",
      "content": "sha256:xyz...",
      "follows": ["pipeline:feature-dev", "pipeline:bug-fix"]
    }
  }
}
```

This means both the feature-dev pipeline and bug-fix pipeline share the same `core:Workflow` entity in the graph — no duplication.

### 5. Update Mechanism

`trellis update` re-runs resolution with constraints and writes a new lockfile:

```bash
trellis update                    # update all direct deps
trellis update workflow           # update only workflows package
trellis update --locked           # only update if lockfile exists (CI-safe)
```

`trellis update` verifies content hashes against the registry before writing the lockfile — it never trusts a remote registry without verification.

### 6. Registry Index

The registry exposes a lightweight index at a known URL:

```
GET https://registry.trellis.computer/@trellis.computer/workflows
```

Response:

```json
{
  "name": "@trellis.computer/workflows",
  "latest": "1.2.0",
  "versions": {
    "1.0.0": {
      "content": "sha256:aaa...",
      "revision": "refs/tags/v1.0.0",
      "schemas": ["core:Workflow", "core:WorkflowStep", "core:WorkflowEdge"]
    },
    "1.2.0": {
      "content": "sha256:abc...",
      "revision": "refs/tags/v1.2.0",
      "schemas": ["core:Workflow", "core:WorkflowStep", "core:WorkflowEdge", "core:WorkflowGate"]
    }
  }
}
```

The index is a flat manifest of versions, not a dependency graph. The resolver builds the dependency graph locally.

### 7. Compatibility Model

Since we're working with JSON-LD schemas (not compiled code), compatibility means:

| Change | Compatible? | Reason |
|--------|-------------|--------|
| Adding optional field | ✅ Yes | Existing consumers ignore it |
| Adding new schema | ✅ Yes | Independent from existing schemas |
| Adding required field to existing schema | ❌ No | Existing consumers can't satisfy it |
| Removing field from existing schema | ❌ No | Consumers may depend on it |
| Changing field type | ❌ No | Breaks validation |
| Adding new relation to existing entity | ⚠️ Depends | If the relation is optional (0..1 or 0..*), existing entities without it are still valid |

The `depends` field in each schema lets the resolver enforce these rules at install time, not at runtime.

### 8. Relationship to `core:Workflow` and `trellis:Pipeline`

The existing `core:Workflow` schema (tier: core, immutable) acts as the **anchor** — it's the oldest, most stable schema in the system. All new schemas depend on it. The versioning system ensures that:

- `core:Workflow` never breaks the graph — it's `tier: 'core'`, so the kernel rejects runtime mutations
- Newer schemas (`core:WorkflowStep`, etc.) can extend it safely by adding optional fields
- If `core:WorkflowStep` adds a required field in v2.0.0, the resolver enforces that all consumers upgrade simultaneously (via the `depends` constraint)

---

## Implementation Scope

The versioning system covers:

1. **`trellis add <type> <name>`** — fetch from registry, resolve constraints, verify hashes, write lockfile, register in graph
2. **`trellis update [--scope <type>]`** — re-resolve constraints, verify hashes, update lockfile
3. **`trellis list`** — show installed packages with versions and content hashes from lockfile
4. **`trellis remove <type> <name>`** — remove from lockfile, check if dependent schemas remain, unregister from graph
5. **Lockfile management** — `.trellis/deps.json` with all resolution metadata
6. **Registry index client** — fetch and parse registry manifests
7. **Constraint solver** — semver range matching with transitive closure and conflict detection

### What's deferred

- Registry hosting — the `@trellis.computer` npm org serves as the registry today
- Authentication for publishing — not needed for the initial implementation
- Binary artifact support — ontologies are JSON-LD, no binary dependencies
- Content-addressed store (Nix store analog) — the graph serves as the content-addressable store

---

## Versioning Commands

```bash
trellis add workflow feature-development     # install from @trellis.computer/workflows
trellis add agent strategist                 # install from @trellis.computer/agents
trellis add ontology design-system           # install from @trellis.computer/ontologies
trellis add adapter cursor                    # install from @trellis.computer/adapters
trellis add projection kanban                 # install from @trellis.computer/projections
trellis add theme trellis-dark                # install from @trellis.computer/themes
trellis add affordance trellis-admin          # install from @trellis.computer/affordance

trellis list workflows                        # show installed + versions from lockfile
trellis list agents
trellis list ontologies
trellis list themes
trellis list projections
trellis list affordances

trellis update                                # update all deps
trellis update workflow                       # update workflow deps only
trellis update --locked                       # only update if lockfile exists

trellis remove workflow feature-development   # uninstall
```

---

## Success Criteria

- [ ] `trellis add` resolves constraints and writes lockfile
- [ ] Content hashes verified on every install
- [ ] Lockfile is committed to git (`.trellis/deps.json`)
- [ ] `trellis update` re-resolves and updates lockfile
- [ ] Transitive closure is computed correctly
- [ ] Conflicts are detected and reported clearly
- [ ] Deduplication works (shared schemas not re-installed)
- [ ] `trellis list` shows versions and content hashes
- [ ] `trellis remove` checks dependents before uninstalling
- [ ] No regression in existing `trellis add` behavior
- [ ] `trellis agent migrate` handles schema version upgrades