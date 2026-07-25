# trellis-node

Local-first semantic graph OS — EAV kernel, EQL-S, SQLite op-log, Iroh peer sync.

## What this repo is

The Node.js implementation of Trellis. Contains the graph runtime, VCS engine, MCP server, client SDK, and Studio UI.

## How to work here

1. **Check active work first:** `trellis issue active` or `trellis issue list`
2. **Start from your inbox:** the coordination rules tell you which queries to run for your role
3. **Lane writes only:** all file edits go through your assigned lane (`TRELLIS_LANE` env var)
4. **Milestone before context-switch:** `trellis milestone create -m "..."`
5. **Close with acceptance criteria:** `trellis issue check` then `trellis issue close --confirm`

## Key paths

- `src/` — runtime source (graph kernel, VCS, MCP, SDK)
- `demo/` — demo apps (realtime-app uses Svelte)
- `docs/` — framework guide (`docs/AGENTS.md`)
- `.trellis/` — VCS metadata (never edit directly)

## Testing

```bash
pnpm test          # unit tests
pnpm check         # typecheck + lint
pnpm test:e2e      # playwright e2e
```

## conventions

- TypeScript, ESM, Bun runtime for scripts
- Markdown docs (not docx)
- Graph writes use the Trellis CLI or MCP tools — never modify `.trellis/` by hand
