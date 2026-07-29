# Scope: Registry Versioning & Dependency Resolution **Implementation**

**≥Parent:** registry-versioning.md
**Estimates:** TBD

## Phase 1: Lockfile & Package Management

1. **`trellis add <type> <name>`** (new file: `src/cli/registry-cli.ts`)

   - Resolves package from `@trellis.computer` registry index
   - Checks lockfile for cached resolution
   - Verifies content hash of downloaded package
   - Registers schemas in the graph via `kernel.createOntology()`
   - Updates `.trellis/deps.json` lockfile
1. **`trellis list [type]`** (new command in `registry-cli.ts`)

   - Reads lockfile and displays installed packages with versions + content hashes
   - If `type` specified, filters to that category
1. **`trellis remove <type> <name>`** (new command in `registry-cli.ts`)

   - Removes from lockfile
   - Checks dependents before uninstalling
   - Unregisters schemas from graph
1. **Lockfile format** (new file: `src/registry/lockfile.ts`)

   - Reads/writes `.trellis/deps.json`
   - Structure: `{ version, lockfileVersion, resolved: { [package]: { version, content, revision, schemas } }, root: { depends } }`
   - Validation on read (content hash verification)
1. **Registry index client** (new file: `src/registry/client.ts`)

   - Fetches `@trellis.computer/<scope>` index from registry
   - Parses manifest (name, versions, schemas, dependency constraints)
   - Caches responses locally
1. **Constraint solver** (new file: `src/registry/resolver.ts`)

   - Takes: dependency constraints (semver ranges), registry index, lockfile state
   - Returns: resolved versions with content hashes for all transitive dependencies
   - Detects conflicts and reports which schemas are incompatible
   - Handles deduplication (shared schemas across consumers)

## Phase 2: Update & Migration

7. **`trellis update [--scope <type>]`** (registry-cli.ts)

   - Re-runs resolution for all direct deps (or scoped type)
   - Verifies content hashes against registry
   - Updates lockfile
   - Migrates graph entities if schema versions changed (`treviso agent migrate`)
8. **`trellis agent migrate`** (extend existing migration CLI from unified-agent-architecture.md)

   - Reads current schemas in the graph
   - Compares against lockfile-pinned versions
   - Applies schema migrations (field additions, relation changes)
   - Old fields remain for backward compatibility during migration

## Phase 3: Integration

9. **`trellis agent sync` integration** (extend existing)

   - Reads lockfile to determine which ontologies are active
   - Generates IDE configs with correct schema versions
   - Reports any pending updates
10. **Agent manifest update** (extend unified-agent-architecture.md manifest)

    - Add `dependencies` field listing lockfile-pinned packages
    - Manifest references now include content hashes from lockfile

## Files to create

| File                       | Purpose                                    |
| -------------------------- | ------------------------------------------ |
| `src/cli/registry-cli.ts`  | CLI commands: add, list, remove, update    |
| `src/registry/lockfile.ts` | Lockfile read/write/validation             |
| `src/registry/client.ts`   | Registry index fetching and parsing        |
| `src/registry/resolver.ts` | Constraint solving and closure computation |
| `src/registry/migrate.ts`  | Schema version migration logic             |

## Files to modify

| File                                 | Change                                             |
| ------------------------------------ | -------------------------------------------------- |
| `src/cli/index.ts`                   | Register `trellis add/list/remove/update` commands |
| `src/core/ontology/core-ontology.ts` | Already done: new schemas added                    |
| `src/core/kernel/trellis-kernel.ts`  | Expose `listOntologies()` for version reporting    |

## Testing

- Unit tests: resolver (constraint matching, conflict detection, deduplication)
- Unit tests: lockfile (read/write/validation)
- Unit tests: registry client (fetching, parsing, caching)
- Integration test: `trellis add` with mock registry
- Integration test: `trellis update` with version bump
- Integration test: conflict detection with incompatible constraints
