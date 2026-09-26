# Plan artifacts (`docs/plans/`)

Repo-durable, **ADR-shaped** planning docs normalized from IDE plan mode output.

| Piece | Path |
| ----- | ---- |
| ADR | [0044](../adr/0044-plan-artifact-capture.md) |
| CLI | `trellis plan origins \| scaffold \| capture \| link` |
| Target | `docs/plans/<issue-id>-plan.md` |
| Graph link | `**Plan:** [[docs/plans/TRL-N-plan.md]]` on issue description |

## Lifecycle

1. **Proposed** — captured from IDE plan mode (`status: proposed` in frontmatter)
2. **Accepted** — human approves; promote to `docs/adr/` or flip status after impl
3. **Superseded / rejected** — kept for Idea Garden / audit

## Capture by origin

```bash
# List IDE storage locations
trellis plan origins

# Empty ADR-shaped scaffold
trellis plan scaffold TRL-334 --link

# Latest Cursor plan → repo
trellis plan capture --issue TRL-334 --from cursor

# OpenCode plan already in repo — link only
trellis plan link --issue TRL-334 --plan .opencode/plans/1784092629804-calm-orchid.md

# Antigravity brain session
trellis plan capture --issue TRL-334 --from antigravity --session <brain-uuid>

# Codex session transcript (no plan file on disk)
trellis plan capture --issue TRL-334 --from codex --session ~/.codex/sessions/.../rollout-....jsonl

# Arbitrary markdown
trellis plan capture --issue TRL-334 --from path --path ~/path/to/plan.md
```

## Frontmatter (union schema)

```yaml
---
name: Short title
overview: One-line summary
status: proposed
issue: TRL-334
date: 2026-09-23
depends_on:
  - ADR-0015
source:
  tool: cursor
  path: /Users/.../.cursor/plans/foo.plan.md
  capturedAt: 2026-09-23T...
todos:
  - id: step-1
    content: First wedge
    status: pending
---
```

Body sections mirror ADRs: **Context · Decision · Consequences · Verification**.

## Recommended IDE config

**Gemini CLI** — repo-local plans (bucket A):

```json
// .gemini/settings.json
{
  "general": {
    "plan": {
      "directory": ".gemini/plans"
    }
  }
}
```

**OpenCode** — already repo-local at `.opencode/plans/`.

Cursor, Claude, Antigravity, and Codex require explicit `trellis plan capture` (global or session-only storage).
