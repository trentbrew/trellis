# Spec: Session-context → context pack (hook consumer v0)

**Status:** Spec · **Date:** 2026-07-16\
**Proposal:** TRL-136 · **Parent pack:**
[context-pack-v0.md](./context-pack-v0.md) · **Issue:** TRL-138

> Desk session boot must emit a **budgeted** VCS orientation pack — not rely on
> agents to discover `trellis context pack` after a fat dump.

---

## 1. Problem

TRL-129 shipped `trellis context pack` (CLI + MCP). Desk `session-context.sh`
still only prints trail + graph-briefing + docs-drift + lane edit root. Agents
never see the pack unless they opt in — so the token win does not land on the
default boot path.

## 2. Goals

1. When a Trellis-VCS root is detected at session start, print a boot pack under
   a fixed token budget.
2. Prefer a **local** CLI so global npm `trellis` lag cannot break boot.
3. Pack failure must **never** fail session start (`exit 0` preserved).
4. Document budget default + override + fallback for operators.

## 3. Non-goals

- Rewriting global `~/.cursor` `hooks_context` manifesto (Manager follow-up)
- Replacing or deleting graph-briefing (different domain — see §5)
- Changing pack clamp algorithm / library API (already shipped)
- RAG, lane engine, pipeline-benchmark gate (optional note only)

## 4. Surfaces (write paths)

| Path                                                            | Role                                                                                 |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `Projects/TRELLIS/.cursor/hooks/session-context.sh`             | **Required** — invoke pack when VCS root known                                       |
| `Projects/TRELLIS/.cursor/hooks/trellis-harness/trellis-cli.sh` | **Preferred** — add `trellis_harness_context_pack` helper (CLI resolution + capture) |
| `trellis-node/docs/specs/context-pack-hook-v0.md`               | This contract                                                                        |
| `trellis-node/docs/specs/context-pack-v0.md` §8                 | Point at this consumer spec (one-paragraph link)                                     |

Kernel library/CLI code under `src/context/` is **out of scope** for this wedge
unless a missing flag blocks the hook (then CLARIFY back to Architect).

## 5. Locked decisions

| #  | Decision                                                       | Rationale                                                                                                                                 |
| -- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| D1 | **Supplement** graph-briefing; do not remove it                | Pack = Trellis-**VCS** orientation (issues/lane/waiting). Briefing = campus **CMS** projects/milestones from SQLite cache. Not redundant. |
| D2 | Pack section **after** trail marker, **before** graph-briefing | Trail is agent-local resume; pack is shared VCS orientation; briefing is desk-wide projects.                                              |
| D3 | Default budget **2000** tokens                                 | Boot should stay smaller than interactive default (4000). Override: `TRELLIS_CONTEXT_PACK_BUDGET`.                                        |
| D4 | Format **`text`**                                              | Hook stdout is human/agent readable; JSON reserved for MCP/tools.                                                                         |
| D5 | Vantage **`boot`**                                             | Empty focus OK; waitingOnYou + lane emphasized.                                                                                           |
| D6 | CLI resolution order (fail soft)                               | See §6.                                                                                                                                   |

## 6. CLI resolution

Implement in harness helper (preferred) or inline in `session-context.sh`:

```
1. If "$VCS_ROOT/src/cli/index.ts" exists AND command -v bun:
     bun "$VCS_ROOT/src/cli/index.ts" context pack -p "$VCS_ROOT" ...
2. Else if command -v trellis:
     trellis context pack -p "$VCS_ROOT" ...
3. Else: omit pack (no error)
```

Always pass:

```
--vantage boot
--budget "${TRELLIS_CONTEXT_PACK_BUDGET:-2000}"
--format text
-p "$VCS_ROOT"
```

Capture stdout only on success. On any failure: print nothing for the pack
section (optional one-line `[context-pack] skipped` only when `TRELLIS_DEBUG` is
set). Never propagate non-zero to session-context.

**`set -euo pipefail`:** pack must run in a subshell or under `|| true` so a
failed pack cannot abort the hook.

## 7. Suggested stdout shape

```text
## Context pack (boot, budget=2000)
<text format from trellis context pack>
```

Header is fixed (helps agents recognize the section). Body is pack text as-is
(already budget-clamped by the CLI).

## 8. VCS root detection

Reuse the same detection already used for the lane-edit-root block in
`session-context.sh`:

1. `${PWD}/.trellis/config.json` → `VCS_ROOT=$PWD`
2. Else `${TRELLIS_VCS_ROOT}/.trellis/config.json` if set
3. Else: **skip pack** (no VCS repo in scope)

Do not invent a third detection path.

## 9. Documentation requirements

1. This file (contract).
2. Hook-top comment block in `session-context.sh` stating:
   - default budget 2000
   - `TRELLIS_CONTEXT_PACK_BUDGET` override
   - failure omits pack; session start still succeeds
3. `context-pack-v0.md` §8 — replace the “optional desk snippet” with a link to
   this consumer spec and note that desk wiring is TRL-136 / TRL-138.

## 10. Acceptance criteria

```
test:test -f docs/specs/context-pack-hook-v0.md
test:rg -q "context pack" Projects/TRELLIS/.cursor/hooks/session-context.sh
test:rg -q "TRELLIS_CONTEXT_PACK_BUDGET|budget 2000|--budget" \
  session-context.sh trellis-harness/trellis-cli.sh
test:bash -n session-context.sh
Pack call is non-fatal under set -e (|| true / subshell) — manual read
test:pnpm check   # trellis-node; docs-only change must stay green
```

Mirror on issue TRL-138.

## 11. Executor notes

- Prefer adding `trellis_harness_context_pack` to `trellis-cli.sh`, then call it
  from `session-context.sh` after sourcing the harness (same pattern as lane
  edit root).
- Do not change `graph-briefing.sh` in this wedge.
- Do not edit `~/.cursor` global hooks.
- Desk hooks are **outside** the trellis-node git spoke — commit on the desk /
  lab tree that owns `.cursor/hooks` if tracked; otherwise land and note path in
  impl SUMMARY.
- Smoke (recommended, not hard AC): from a VCS cwd,
  `bash .cursor/hooks/session-context.sh | head` shows `## Context pack`.

## 12. Deps map

| Need           | Source                                                          |
| -------------- | --------------------------------------------------------------- |
| Pack CLI       | TRL-129 (`src/cli/context.ts`, `assembleContextPack`)           |
| VCS root       | Existing session-context detection                              |
| Harness source | `trellis-harness/trellis-cli.sh` already sourced for lane block |

No new kernel primitives.
