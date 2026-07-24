# Spec: Budgeted agent context pack (v0)

**Status:** Spec · **Date:** 2026-07-16\
**Proposal:** TRL-125 · **Informed by:** ADR 0015 (`whereami`), `src/context/*`
stubs, `src/mcp/graph-summary.ts`, strategist intake

> **Query, don't paste.** Session boot and mid-task orientation must be a
> token-budgeted projection of graph state — handles first, bodies on demand.

---

## 1. Problem

Agents re-ingest state that already lives in Trellis:

- Full skill / AGENTS walls on every turn
- Large active-issue lists for orientation
- Whole-file reads when a symbol handle would do
- Chat transcript replay instead of milestone + decision memory

`whereami` is the right _shape_ (WAITING / ACTIVE / MOVED) but is not budgeted,
not machine-first JSON, and not wired as the default boot packet.

## 2. Goals

1. Ship **`trellis context pack`** — budgeted, vantage-scoped projection.
2. Mirror it as MCP **`trellis_context_pack`** (same JSON shape).
3. Ref-first: IDs + short summaries; no skill/rule prose in the pack.
4. Provide a **hook-consumable** text/JSON path so desk session-context can
   replace dump-style orientation (kernel ships the CLI; desk hook is a thin
   caller).
5. Grow `src/context/` into a real assembler — do not invent a parallel module
   tree.

## 3. Non-goals (v0)

- Skill-as-graph migration / policy entity runtime
- AST surgical-edit protocol
- Replacing `trellis ask --rag` (pack is graph/VCS-first, not vector-first)
- Lane engine rewrite (TRL-117 stays separate)
- Rewriting global Cursor `hooks_context` coordination manifesto (Manager /
  `~/.cursor` follow-up — note only in this wedge)

## 4. Surfaces

| Surface | Contract                                                                                                                        |
| ------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Library | `src/context/pack.ts` — `assembleContextPack(engine, opts) → ContextPack`                                                       |
| Types   | Extend `src/context/types.ts` with `ContextPack`, `ContextPackOptions`, `ContextVantage`                                        |
| CLI     | `trellis context pack [options]` under new `context` command group in `src/cli/` (register like `protocol.ts`)                  |
| MCP     | `trellis_context_pack` on VCS MCP (`src/mcp/server.ts`)                                                                         |
| Hook    | Document + optional desk snippet: call `trellis context pack --vantage boot --format text` from session-context / briefing path |

`whereami` remains unchanged human prose. Pack may _reuse_ helpers from
`src/protocol/whereami.ts` (`getActiveContext`, `findWaitingOnYou`, checkpoint)
but must not break its format.

## 5. Data contract

```ts
type ContextVantage = "boot" | "edit" | "review";

interface ContextPackRef {
  kind: "issue" | "file" | "entity" | "decision" | "milestone" | "policy";
  id: string;
  summary?: string; // ≤ ~120 chars; never full body
}

interface ContextPack {
  version: 1;
  vantage: ContextVantage;
  budgetTokens: number;
  estimatedTokens: number; // ceil(serialized.length / 4) after clamp
  truncated: boolean;
  generatedAt: string; // ISO
  lane: {
    id: string | null;
    worktreePath: string | null;
    editRoot: string;
  };
  focus: null | {
    issueId: string;
    title: string;
    status: string;
    priority?: string;
    labels?: string[];
    ac: Array<{
      description: string; // may be truncated
      status: string; // pending | passed | failed | …
    }>;
  };
  waitingOnYou: Array<{
    issueId: string;
    from: string;
    to: string;
    status: string;
    re: string;
    preview: string; // first line, ≤ 80 chars
  }>;
  milestone: null | { id: string; message: string; at: string };
  decisions: ContextPackRef[]; // decision ids + one-line preview
  links: ContextPackRef[]; // file/issue/entity handles only
  policyRefs: ContextPackRef[]; // empty array in v0 OK if no policy entities
}
```

### 5.1 CLI

```
trellis context pack
  --budget <n>          default 4000 (tokens, chars/4 estimator)
  --vantage <name>      boot | edit | review (default: boot)
  --issue <id>          focus issue (default: sole in_progress on lane, else error if ambiguous)
  --format <fmt>        json (default) | text
  -p, --path <path>
```

**Exit codes:** `0` success; `1` ambiguous/missing focus when required for
`edit`/`review` without `--issue`; `0` with empty focus for `boot` if no active
issue (still emits lane + waitingOnYou).

**Text format:** compact markdown-ish sections mirroring JSON keys (for hooks).
Must stay under budget by the same clamp rules.

### 5.2 MCP

Tool name: `trellis_context_pack`

Inputs: `path`, `budget`, `vantage`, `issue` (optional) — same semantics as CLI.
Returns: JSON text of `ContextPack` (pretty or compact; estimator uses returned
payload).

### 5.3 Vantage behavior

| Vantage  | Focus default                                | Extra emphasis                                                      |
| -------- | -------------------------------------------- | ------------------------------------------------------------------- |
| `boot`   | Optional (lane-scoped in_progress if unique) | waitingOnYou, lane, last milestone                                  |
| `edit`   | Required (flag or unique in_progress)        | AC list, links (files touched / linked), recent decisions for issue |
| `review` | Required                                     | AC statuses, decision chain for issue, open REJECT/CLARIFY children |

## 6. Budget clamp algorithm

Estimator: `ceil(utf8Length(serialized) / 4)` — match existing
`BaseContextManager` / `ask --rag` convention.

**Priority (keep higher first; drop from bottom when over budget):**

1. `version`, `vantage`, `budgetTokens`, `generatedAt`, `lane`,
   `focus.issueId/title/status`
2. `waitingOnYou` (cap 5 entries)
3. `focus.ac` (truncate each description to 80 chars; drop lowest-priority AC
   last)
4. `milestone`
5. `decisions` (cap 5)
6. `links` (cap 12)
7. `policyRefs` (cap 4)
8. Extra focus fields (`labels`, long titles)

When anything is dropped or truncated beyond summary limits → `truncated: true`.
After clamp, `estimatedTokens` must be `<= budgetTokens`.

Empty optional sections are `[]` / `null`, not omitted (stable schema for
hooks).

## 7. Assembly sources (deps map)

| Field        | Source                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------- |
| lane         | `engine.getActiveLaneId()`, `getLaneMeta`, `getActiveContext`                            |
| focus issue  | `engine.getIssue` / listIssues; AC from issue criteria API                               |
| waitingOnYou | `findWaitingOnYou` (`protocol/whereami.ts`)                                              |
| milestone    | latest milestone from engine milestone list (or issue-linked if available)               |
| decisions    | `getDecisionChain(issueId)` / decision list — `src/decisions`                            |
| links        | Issue description wiki-links if cheap; else empty — **do not** full-repo file walk in v0 |
| policyRefs   | Always `[]` in v0 unless an existing entity type is trivial to query                     |

## 8. Hook consumer (desk)

Kernel pack CLI/MCP shipped under TRL-129. **Desk wiring** (session-context →
boot pack) is specified in
[context-pack-hook-v0.md](./context-pack-hook-v0.md) (TRL-136 / TRL-138).

Summary: `session-context.sh` calls
`trellis context pack --vantage boot --budget 2000 --format text` (prefer local
`bun ./src/cli`) when a VCS root is detected; failure is non-fatal; graph-briefing
stays (different domain).

Optional follow-up (Manager): replace coordination dump in Cursor global
`hooks_context` with pack output.

Pipeline-benchmark chars/turn remains **recommended verification**, not a hard
kernel test gate.

## 9. Tests

| Test                                      | Asserts                                                                                                                                   |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `test/context/pack.test.ts`               | Assembles pack; clamp forces `truncated` and `estimatedTokens <= budget`; vantage `edit` without issue fails; boot with no issue succeeds |
| CLI smoke (optional in same file via API) | `context pack --format json` parses as `version: 1`                                                                                       |

No `needs-e2e` — CLI/library wedge.

## 10. Executor notes

- Prefer new files: `src/context/pack.ts`, `src/cli/context.ts`,
  `test/context/pack.test.ts`; thin MCP registration in `server.ts`.
- Reuse whereami helpers; do not change `formatWhereami` output.
- Do not migrate heat-map LLM history into pack v0 — pack is **orientation**,
  not chat memory.
- Global npm `trellis` may lag local `bun ./src/cli` — tests use local CLI/API.

## 11. Out of scope reminders

TRL-117 lane coherence, skill graph, RAG replacement, Cursor global hook dump
removal.
