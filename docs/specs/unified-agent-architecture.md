# Spec: Unified Agent Architecture

**Status:** draft · **Parent:** N/A · **Issues:** N/A

## Context

The current agent infrastructure is fragmented across multiple directories and systems:

- **IDE-specific configs:** `.cursor/rules.md`, `.devin/workflows/`, `.claude-plugin/plugin.json`, `.claude/settings.local.json`
- **Skills duplication:** `skills/` (repo root) vs `.trellis/agents/skills/` (empty placeholder)
- **Workflows duplication:** `.devin/workflows/` (active) vs `.trellis/agents/workflows/` (empty placeholder)
- **Runtime-only hooks:** Decision hooks in `src/decisions/hooks.ts` are registered dynamically with no persistent storage
- **Fragmented context generation:** `src/scaffold/write.ts` and `seed.ts` generate different files per IDE

This fragmentation makes it difficult to:
- Clone agent setups between environments
- Deploy consistent agent configurations to Sprites/sandbox VMs
- Version control hook configurations
- Maintain a single source of truth for agent behavior

## Goal

Create a unified agent architecture with:

1. **Single source of truth** - One manifest drives all IDE configurations
2. **Portable hook registry** - Hook definitions are versioned and transferable
3. **Thin IDE adapters** - IDE directories contain only generated files
4. **Sprite-ready packaging** - One command bundles entire agent environment
5. **Environment cloning** - Reproduce agent setup across repos and Sprites

## Scope

### In scope
- `.trellis/agent-manifest.json` as single source of truth
- `.trellis/hooks/` for portable hook registry
- `.trellis/adapters/` for IDE-specific config generators
- `trellis sprite package` CLI for bundling agent environment
- `trellis agent clone` CLI for environment cloning
- Migration path from current fragmented setup

### Out of scope
- IDE-specific agent behavior beyond config generation (IDEs control their own runtime)
- Hook execution engine (use existing `src/decisions/hooks.ts`)
- Skills distribution (existing npm skills system works)
- Governance policy for agent configurations (deferred)

## Design

### 1. Single Source of Truth: `.trellis/agent-manifest.json`

```json
{
  "$schema": "https://trellis.dev/schemas/agent-manifest-v1.json",
  "version": "1.0",
  "project": {
    "name": "trellis",
    "domain": "web-app",
    "ecosystem": "node",
    "description": "The Agentic Framework",
    "fileCount": "~1008"
  },
  "skills": [
    {
      "id": "trellis-graph",
      "path": "skills/trellis-graph/SKILL.md",
      "enabled": true
    },
    {
      "id": "trellis-vcs",
      "path": "skills/trellis-vcs/SKILL.md",
      "enabled": true
    }
  ],
  "workflows": [
    {
      "id": "trellis",
      "path": ".devin/workflows/trellis.md",
      "enabled": true
    },
    {
      "id": "sprite",
      "path": ".devin/workflows/sprite.md",
      "enabled": true
    }
  ],
  "hooks": {
    "pre": [
      {
        "id": "checkpoint-large-batches",
        "toolPattern": "*",
        "handler": "plugins/sprite-tools/checkpoint-middleware",
        "config": {
          "threshold": 50
        },
        "enabled": true,
        "metadata": {
          "author": "trentbrew",
          "version": "1.0.0",
          "createdAt": "2026-07-26T00:00:00Z"
        }
      }
    ],
    "post": []
  },
  "ideAdapters": {
    "cursor": {
      "rulesPath": ".cursor/rules.md",
      "enabled": true,
      "template": "standard"
    },
    "devin": {
      "rulesPath": ".devin/rules.md",
      "enabled": true,
      "template": "standard"
    },
    "claude": {
      "settingsPath": ".claude/settings.local.json",
      "enabled": true,
      "template": "mcp"
    }
  },
  "generatedAt": "2026-07-26T00:00:00Z"
}
```

**Schema fields:**
- `version`: Manifest format version
- `project`: Project metadata (domain, ecosystem, description)
- `skills`: List of skill references with paths and enablement
- `workflows`: List of workflow references with paths and enablement
- `hooks`: Pre/post hook definitions with patterns, handlers, and config
- `ideAdapters`: IDE-specific adapter configurations
- `generatedAt`: Timestamp of last generation

### 2. Portable Hook Registry: `.trellis/hooks/`

Each hook definition stored as a separate JSON file:

```
.trellis/hooks/
  pre-checkpoint-large-batches.json
  post-decision-audit.json
```

**Hook schema:**

```json
{
  "$schema": "https://trellis.dev/schemas/hook-v1.json",
  "id": "checkpoint-large-batches",
  "type": "pre",
  "toolPattern": "*",
  "handler": "plugins/sprite-tools/checkpoint-middleware",
  "config": {
    "threshold": 50
  },
  "enabled": true,
  "metadata": {
    "author": "trentbrew",
    "version": "1.0.0",
    "createdAt": "2026-07-26T00:00:00Z",
    "description": "Auto-checkpoint before large mutation batches"
  }
}
```

**Benefits:**
- Version control individual hooks
- Share hooks via npm or git
- Import/export hook configurations
- Enable/disable hooks without editing code

### 3. IDE Adapter Generators: `.trellis/adapters/`

Adapters are **generators only** - they read the manifest and write IDE-specific configs.

```
.trellis/adapters/
  cursor.ts      # Generates .cursor/rules.md
  devin.ts       # Generates .devin/rules.md
  claude.ts      # Generates .claude/settings.local.json
```

**Adapter interface:**

```typescript
interface IdeAdapter {
  id: string;
  name: string;
  generate(manifest: AgentManifest, context: ProjectContext): Promise<GeneratedFile[]>;
}

interface GeneratedFile {
  path: string;
  content: string;
  encoding?: 'utf-8' | 'binary';
}
```

**Example: cursor.ts**

```typescript
import type { IdeAdapter } from './types.js';
import type { AgentManifest, ProjectContext } from '../scaffold/types.js';

export const cursorAdapter: IdeAdapter = {
  id: 'cursor',
  name: 'Cursor IDE',

  async generate(manifest: AgentManifest, context: ProjectContext) {
    const content = `# Cursor Rules for ${manifest.project.name}

> Generated by trellis agent sync on ${manifest.generatedAt}

## Project Context
- **Domain**: ${manifest.project.domain}
- **Ecosystem**: ${manifest.project.ecosystem}
- **File count**: ${manifest.project.fileCount}
- **Confidence**: ${context.confidence}

## Agent Instructions
You are working in a Trellis-tracked repository. See \`.trellis/agents/AGENTS.md\` for full context.

## Commands
- \`trellis status\` — Check repo state
- \`trellis agent sync\` — Refresh this context file
- \`trellis log\` — View causal history

---
*Auto-generated by Trellis. Run \`trellis agent sync\` to refresh.*
`;

    return [
      {
        path: '.cursor/rules.md',
        content,
        encoding: 'utf-8',
      },
    ];
  },
};
```

### 4. Sprite Packaging System

**Package structure:**

```bash
trellis-agent-package.tar.gz
├── .trellis/
│   ├── agent-manifest.json       # Single source of truth
│   ├── hooks/                    # Portable hook registry
│   │   ├── pre-checkpoint-large-batches.json
│   │   └── post-decision-audit.json
│   ├── config.json               # Engine config
│   └── adapters/                 # IDE adapter generators
│       ├── cursor.ts
│       ├── devin.ts
│       └── claude.ts
├── skills/                       # Referenced skills
│   ├── trellis-graph/
│   └── trellis-vcs/
├── package.json                  # Dependencies
└── install.sh                    # Sprite installation script
```

**Installation script (install.sh):**

```bash
#!/bin/bash
# install.sh - Runs inside sprite after package upload

set -e

# 1. Install runtime dependencies
export PATH="$HOME/.bun/bin:$PATH"
if ! command -v bun >/dev/null 2>&1; then
  curl -fsSL https://bun.sh/install | bash
fi

# 2. Install Trellis CLI globally
bun install -g trellis

# 3. Extract package to /home/sprite/.trellis-agent
mkdir -p /home/sprite/.trellis-agent
tar -xzf trellis-agent-package.tar.gz -C /home/sprite/.trellis-agent

# 4. Generate IDE configs for sprite-local development
cd /home/sprite/.trellis-agent
trellis agent sync

# 5. Register hook middleware with kernel
trellis hook load --all

# 6. Start Trellis MCP server as service
ENV="/.sprite/bin/sprite-env"
$ENV services create trellis-mcp \
  --cmd "$(which bun)" \
  --args run,/home/sprite/.trellis-agent/src/mcp/server.ts \
  --dir /home/sprite/.trellis-agent \
  --http-port 3000

echo "✓ Trellis agent environment installed"
echo "  MCP: http://$(sprite url -s $(hostname))/mcp"
```

### 5. CLI Commands

**`trellis agent sync`**
- Generate all IDE configs from manifest
- Usage: `trellis agent sync [--ide <cursor|devin|claude|all>]`

**`trellis hook add`**
- Add a hook to the registry
- Usage: `trellis hook add --type <pre|post> --pattern <glob> --handler <module-path> [--config <json>]`

**`trellis hook list`**
- List all registered hooks
- Usage: `trellis hook list [--type <pre|post>]`

**`trellis hook enable/disable`**
- Enable or disable a hook
- Usage: `trellis hook enable <hook-id>`

**`trellis hook export/import`**
- Export/import hook configurations
- Usage: `trellis hook export --output hooks-backup.json`

**`trellis sprite package`**
- Package current repo for sprite deployment
- Usage: `trellis sprite package --name <name> [--output <path>]`

**`trellis sprite deploy`**
- Deploy package to existing sprite
- Usage: `trellis sprite deploy --name <sprite-name> --package <path>`

**`trellis sprite up`**
- One-shot: package + deploy to new sprite
- Usage: `trellis sprite up --name <sprite-name>`

**`trellis agent clone`**
- Clone agent setup to another repo or sprite
- Usage: `trellis agent clone --source <path> --target <path|sprite:name>`

## Implementation Plan

### Phase 1: Core Infrastructure (TRL-XXX)

1. **Create manifest schema**
   - Define `AgentManifest` TypeScript interface
   - Create JSON schema validation
   - Add to `src/scaffold/types.ts`

2. **Implement hook registry**
   - Create `.trellis/hooks/` directory structure
   - Implement hook registry in `src/decisions/registry.ts`
   - Add hook loading from JSON files
   - Integrate with existing `HookRegistry`

3. **Build adapter system**
   - Create adapter interface in `src/scaffold/adapters/types.ts`
   - Implement cursor adapter in `src/scaffold/adapters/cursor.ts`
   - Implement devin adapter in `src/scaffold/adapters/devin.ts`
   - Implement claude adapter in `src/scaffold/adapters/claude.ts`

4. **Add CLI commands**
   - `trellis agent sync` in `src/cli/agent-cli.ts`
   - `trellis hook add/list/enable/disable` in `src/cli/hook-cli.ts`
   - Update `src/cli/index.ts` to register commands

### Phase 2: Sprite Packaging (TRL-XXX)

1. **Implement packaging**
   - Create `src/sprite/package.ts` for tarball creation
   - Implement `install.sh` template generation
   - Add dependency bundling

2. **Add sprite CLI commands**
   - `trellis sprite package` in `src/cli/sprite-cli.ts`
   - `trellis sprite deploy` in `src/cli/sprite-cli.ts`
   - `trellis sprite up` in `src/cli/sprite-cli.ts`
   - Integrate with existing `src/server/sprites.ts`

3. **Test sprite deployment**
   - Deploy to test sprite
   - Verify MCP server startup
   - Test hook middleware loading

### Phase 3: Migration (TRL-XXX)

1. **Migration tool**
   - `trellis agent migrate` in `src/cli/migrate-cli.ts`
   - Detect existing fragmented setup
   - Generate manifest from existing configs
   - Migrate hooks to registry
   - Backup old configs

2. **Documentation**
   - Update `AGENTS.md` with new workflow
   - Create migration guide
   - Update sprite documentation

3. **Deprecation**
   - Mark old scaffold paths as deprecated
   - Add warnings for direct IDE config edits
   - Plan removal in future version

## Migration Path

**Current state:**
- IDE configs in `.cursor/`, `.devin/`, `.claude/`
- Skills in `skills/` (repo root)
- Workflows in `.devin/workflows/`
- Hooks registered at runtime only

**Migration steps:**

1. Run `trellis agent migrate`
   - Scans existing IDE configs
   - Generates `.trellis/agent-manifest.json`
   - Migrates any discoverable hooks to `.trellis/hooks/`
   - Backs up old configs to `.trellis/backup/`

2. Run `trellis agent sync`
   - Regenerates IDE configs from manifest
   - IDE configs now become generated files

3. Update workflow
   - Edit `.trellis/agent-manifest.json` for changes
   - Run `trellis agent sync` to propagate
   - Never edit IDE configs directly

4. Optional: Clean up
   - Remove old `.cursor/`, `.devin/`, `.claude/` configs after verification
   - Remove `src/scaffold/write.ts` IDE-specific code

**Rollback:**
- Restore from `.trellis/backup/`
- Delete `.trellis/agent-manifest.json`
- Old workflow continues to work

## Testing Strategy

**Unit tests:**
- Manifest schema validation
- Hook registry CRUD operations
- Adapter generation for each IDE
- Package creation and extraction

**Integration tests:**
- `trellis agent sync` generates correct files
- `trellis hook add` registers and loads hooks
- `trellis sprite package` creates valid tarball
- Migration tool handles existing setups

**E2E tests:**
- Deploy to real sprite
- Verify MCP server accessible
- Test hook middleware execution
- Clone agent setup to new repo

## Open Questions

1. **Hook sharing:** Should hooks be shareable via npm packages?
   - Decision: Defer to future phase, focus on local registry first

2. **IDE adapter extensibility:** Should users be able to add custom adapters?
   - Decision: Yes, allow custom adapters in `.trellis/adapters/custom/`

3. **Manifest versioning:** How to handle manifest format changes?
   - Decision: Use semantic versioning, include migration logic in CLI

4. **Sprite service discovery:** How to discover MCP endpoints on deployed sprites?
   - Decision: Use existing `sprite url` command, document in deploy output

## Success Criteria

- [ ] Single manifest drives all IDE configurations
- [ ] Hooks are portable and versionable
- [ ] Sprite deployment is one command
- [ ] Environment cloning works across repos and sprites
- [ ] Migration tool successfully converts existing setups
- [ ] No regression in existing agent functionality
- [ ] Documentation updated with new workflow
