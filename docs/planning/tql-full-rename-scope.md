# TQL full-rename scope (reference — NOT approved work)

**Status:** Backlog / reference only
**Date:** 2026-07-15
**Depends on:** `docs/adr/0025-dsl-first-then-sync.md` (Naming section), the lighter pass already shipped (docs + CLI display strings say `TQL`; internal `eql` codename preserved).

## Why this exists

The lighter pass deliberately created an **external/internal split**: everything
user-facing says **TQL**, while source keeps the historical `eql` codename
(`src/schema/eql.ts`, `EqlQuery`, `eqlLiteral`, `WHERE_OP_TO_EQL`,
`formatEqlLiteral`, `examples.eql`, the `<eql...>` CLI arg). That split is
intentional and documented in ADR 0025. This doc is a **reference scope** for the
day we decide to collapse the split and rename the codename too. It is not
scheduled.

## What "full rename" means

Rename the internal identifiers and module name `eql` → `tql` across source,
tests, SDK exports, and every downstream consumer — so the code matches the brand.

## Inventory of change sites

### 1. Module rename (git mv)
- `src/schema/eql.ts` → `src/schema/tql.ts`
- Any other `eql`-named file (none currently beyond the above).

### 2. Identifiers (token-bounded codemod; never touch `html`/`stylesheet`)
- `EqlQuery` → `TqlQuery` (≈11 sites, incl. test types)
- `EqlLiteral` → `TqlLiteral` (≈7), `eqlLiteral` → `tqlLiteral` (≈4)
- `WHERE_OP_TO_EQL` → `WHERE_OP_TO_TQL`
- `formatEqlLiteral` → `formatTqlLiteral`
- `eql()` builder (typed read adapter) → `tql()`
- `examples.eql` property → `examples.tql` (in `src/cli/examples.ts` + consumer at
  `src/cli/index.ts:4027`)
- CLI commander arg `<eql...>` → `<tql...>` and its action param `eql` → `tql`
  (`src/cli/index.ts:4748,4751,4754`)

### 3. Public API / SDK surface (the real risk)
- `src/schema/index.ts` re-exports from `./eql.js` → `./tql.js`
  (`WhereFilter`, `WhereInput`, `WhereOp`, `WhereValue`, `formatEqlLiteral`, …).
- Consumers import these: `src/react/schema-hooks.ts`, `src/vue/schema-hooks.ts`,
  `src/svelte/schema-hooks.ts`, `src/react/hooks.ts`.
- **Downstream breakage:** external SDK users + `trellis-docs/www` `app/` (if it
  imports the builder), `demo/realtime-app` (fractal shells / hooks).
- **Required:** semver **major** bump + a deprecation alias (`eql` re-export) for
  one major version, plus a short migration note.

### 4. Core query engine (already brand-neutral in logic)
- `src/core/query/{types,parser,engine,index}.ts` — identifiers like
  `EqlLiteral`/internal names; the syntax strings are unchanged (language is
  TQL regardless).
- `src/core/kernel/{trellis-kernel,logic-middleware}.ts`,
  `src/server/{server,realtime}.ts`, `src/mcp/{room,docs}.ts`,
  `src/client/{sdk,sdk.browser}.ts`, `src/browser/index.ts`,
  `src/plugins/agent-memory/graph-context-manager.ts` — `eql` token sites.
- Comments referencing "EQL bindings" (e.g. `src/schema/entity-projection.ts:2`)
  become "TQL bindings".

### 5. Tests
- `test/schema/eql.test.ts` → `test/schema/tql.test.ts` (git mv).
- `EqlQuery`/`EqlLiteral` references in `test/core/query-engine.test.ts` and
  other test files.

### 6. Docs already done (no change needed)
- `docs/` and `trellis-docs/www` already say `TQL`. ADR 0025 Naming section's
  "deliberate split" note would be **retired/updated** once the split is gone.
- The `trellis-graph` skill already says `TQL` — unaffected.

## Sequencing (if ever approved)
1. `git mv` the module + codemod identifiers (token-bounded) in `trellis-node`.
2. `tsc --noEmit` + full `bun test` green.
3. Add deprecation aliases for the old `eql` exports; cut a **major** release.
4. Bump downstream repos (`trellis-docs/www`, `demo/realtime-app`) to the new
   major; remove aliases next major.

## Open question
Do we *want* this? The lighter pass's whole point was to avoid it (SDK breakage,
codemod risk, semver decision). The split is fine indefinitely if TQL is the
brand and `eql` the internal codename. Only pursue if the split proves confusing
to contributors *despite* the ADR 0025 note.

## Out of scope (separate workstream)
- **TML** (the markup language: `tml-query`/`tml-projection`/`tml-swap`) is
  net-new and not part of this rename — see ADR 0025 Naming note. Tracked
  separately as a design spike against `demo/realtime-app/src/lib/fractal/shells.ts`.
