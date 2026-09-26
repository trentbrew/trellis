# ADR 0044: Plan artifact capture

**Status:** Accepted  
**Date:** 2026-09-23  
**Issue:** ops (agent infrastructure)  
**Depends on:** [0015](./0015-agent-handoff-protocol.md) (issue-first graph links), [0043](./0043-graph-native-eval-ontology.md) (eval corpus pattern)  
**Supersedes:** nothing

## Context

Plan mode artifacts are **not portable** across agent IDEs:

| Runtime | Storage | Scope |
| ------- | ------- | ----- |
| Cursor | `~/.cursor/plans/*.plan.md` | User-global |
| Claude Code | `~/.claude/plans/*.md` | User-global |
| OpenCode | `{repo}/.opencode/plans/*.md` | Repo-local |
| Antigravity | `~/.gemini/antigravity-ide/brain/{uuid}/implementation_plan.md` | User-global |
| Gemini CLI | `~/.gemini/tmp/*/plans/` or configurable `.gemini/plans/` | Temp / repo |
| Codex | Session JSONL only (no canonical plan file) | Session |

There is **no vendor standard**. Trellis already has:

- `docs/adr/` — accepted architectural decisions
- `docs/issues/TRL-N/` — long-form issue docs (`trellis issue doc`)
- `PendingPlan` graph entity — **graph mutation buffering**, not prose plans
- `DecisionTrace` — tool-call micro-audit, not wedge planning

Plans produced in IDE plan mode drift outside the repo and never link to `issue:TRL-N` unless copied manually.

## Decision

### v1: Repo-canonical plan artifacts

1. **Canonical path:** `docs/plans/<issue-id>-plan.md`
2. **Shape:** ADR frontmatter union + markdown body (Context / Decision / Consequences / Verification)
3. **Graph link:** append `**Plan:** [[docs/plans/TRL-N-plan.md]]` to issue description (no new entity type in v1)
4. **CLI:** `trellis plan capture | link | scaffold | origins`
5. **Provenance:** YAML `source.tool`, `source.path`, `source.capturedAt` record ephemeral IDE path

Promotion Proposed → Accepted remains a **human gate** (edit frontmatter or move to `docs/adr/`).

### Origin resolution

| `--from` | Default resolution |
| -------- | ------------------ |
| `cursor` | Latest mtime under `~/.cursor/plans/*.plan.md` |
| `claude` | Latest under `~/.claude/plans/*.md` |
| `opencode` | Latest under `{repo}/.opencode/plans/*.md` |
| `antigravity` | `{brain}/{session}/implementation_plan.md` or latest brain |
| `gemini` | `{repo}/.gemini/plans/` then `~/.gemini/tmp/*/plans/` |
| `codex` | Extract best assistant markdown from rollout JSONL |
| `path` | Requires `--path` |

Override any origin with `--path` or `--session`.

### Out of scope (v1)

- Auto-capture hooks on IDE plan approval (Cursor / Antigravity stop hooks) — follow-on ops wedge
- `PlanDocument` graph entity (v1.5)
- Auto-promote to numbered ADR

## Consequences

**Positive**

- One queryable plan doc per wedge, wiki-linked from issues
- Cross-IDE desk works without waiting for vendor convergence
- Cursor YAML todos preserved in frontmatter when present

**Negative**

- Codex capture is heuristic (transcript parse), not file-native
- Global IDE plans require explicit `capture` — not automatic on plan approval
- Duplicate storage until user deletes ephemeral IDE copies

## Implementation

- Module: `src/plan/` (origins, frontmatter, capture, paths)
- CLI: `src/cli/plan-cli.ts`
- Convention: `docs/plans/README.md`

## Verification

```bash
bun test test/plan/capture.test.ts test/cli/plan.test.ts
trellis plan origins
trellis plan scaffold TRL-N --link
trellis plan capture --issue TRL-N --from path --path /path/to/plan.md
```
