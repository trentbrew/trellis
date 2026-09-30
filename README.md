<div align="center">
  <img src="./logo.svg" alt="Trellis" width="88" height="88" />
  <h1>Trellis</h1>
  <p><strong>The Agentic Framework</strong> — a local-first, event-sourced graph engine for code, agents, and decisions.</p>
  <p>
    <a href="https://trellis.computer">Docs</a> ·
    <a href="https://studio.trellis.computer">Studio</a> ·
    <a href="https://github.com/trentbrew/trellis">GitHub</a>
  </p>
</div>

---

Most agent frameworks pour everything into the reasoning engine and treat state
as an afterthought. Trellis inverts that. It is the **system of record for
decisions**: a persistent, queryable, auditable memory where every thought, tool
call, and file change is an immutable operation in a causal graph. It runs fully
offline — servers may relay, accelerate, or back up, but never own your state.

- **Durable memory** — every op is content-addressed and never rewritten or
  deleted.
- **Explainable by default** — decision traces record not just _what_ happened,
  but _why_.
- **Safe to explore** — branch state to try multiple paths, then merge or
  discard.
- **Realtime** — one write updates current state, durable history, and every
  live subscriber.

## Install

```bash
npm install -g trellis
```

## Quick start

```bash
mkdir my-project && cd my-project
trellis init      # guided or one-shot setup
trellis ui        # live graph explorer
trellis studio    # full Studio UI in the browser, bridged to this repo
trellis code      # start an agent coding session
```

Track work as graph-native entities instead of text commits:

```bash
trellis issue create -t "Bootstrap viz"
trellis issue start TRL-1          # branch + lane; worktree when lanes.worktreeBind
trellis protocol send --parent TRL-1 --from executor --to reviewer \
  --re TRL-1 --status HANDOFF      # graph-backed handoff (3.2.3+)
trellis whereami                   # re-entry orientation
trellis milestone create -m "Initial release"
trellis garden                          # discover & revive abandoned work
trellis query 'find ?e where type = "Task"'
```

Run the operator surface when you need the derived picture rather than raw ops:

```bash
trellis note add "try lazy eviction for the chunk cache"   # commitment-free capture
trellis wip                 # active / queue / shipped / next / cycles / notes
trellis cycle create sept-sprint --target 2026-09-30
trellis cadence             # due-check: overdue cycles, note debt, stale mirrors
trellis mirror --write      # deterministic graph index; --check fails on drift
trellis report              # derived worklog + epic→telos rollup
```

## Build a realtime app

Scaffold a typed, live-graph app — React, Vue, or Svelte — backed by Trellis:

```bash
npm create trellis@latest
```

```ts
import { defineType } from 'trellis/schema';
import { z } from 'zod';

export const Task = defineType('Task', {
  title: z.string(),
  done: z.boolean(),
});
```

```svelte
<script>
  import { entitiesStore, mutations } from 'trellis/svelte/typed';
  const tasks = entitiesStore(client, Task);  // re-renders live, across every client
  const task = mutations(client, Task);
</script>
```

A single mutation produces current state, durable history, and a realtime push
to every subscriber — the same write path.

## API surface

The `trellis` package exposes focused subpaths.

**Runtime & data**

| Import                             | Purpose                                            |
| ---------------------------------- | -------------------------------------------------- |
| `trellis`                          | Top-level engine, kernel, scaffold helpers         |
| `trellis/core`                     | `TrellisKernel` — graph CRUD, no VCS dependency    |
| `trellis/vcs`                      | Ops, branches, milestones, semantic diff           |
| `trellis/sync`                     | Peer sync + bounded op-log readers                 |
| `trellis/client`                   | Local + remote client SDK                          |
| `trellis/schema`                   | `defineType`, typed entities, EQL-S queries        |
| `trellis/{react,vue,svelte}/typed` | Live, schema-typed reads + mutations               |
| `trellis/realtime`                 | Presence, chat, CRDT text                          |
| `trellis/presence`                 | Agent presence ledger + live liveness census       |
| `trellis/operator`                 | Derived operator reads (`wip`)                     |
| `trellis/decisions`                | Decision traces, query, hook registry              |
| `trellis/reasoning`                | Argumentation: attack graphs + grounded extensions |
| `trellis/links`                    | Wiki-link parsing + graph link resolution          |
| `trellis/ai`                       | Embeddings, chunker, vector store                  |
| `trellis/cms`                      | Read content collections over HTTP                 |
| `trellis/server`                   | HTTP + WebSocket DB server                         |
| `trellis/db`                       | Low-level EAV store APIs                           |
| `trellis/format`                   | Shared terminal formatters for CLI + shells        |

**UI primitives** — each ships `/core`, `/react`, `/vue`, `/svelte`, and `/vanilla` entries:

| Import             | Purpose                         |
| ------------------ | ------------------------------- |
| `trellis/forms`    | Schema-typed, validated forms   |
| `trellis/palette`  | Command palette                 |
| `trellis/dialog`   | Modal dialogs                   |
| `trellis/timeline` | Timeline views                  |
| `trellis/combobox` | Searchable select               |
| `trellis/view`     | View state: columns, sort, mode |
| `trellis/headless` | Unstyled behavior + registry    |

**Persistence & plugins**

| Import                              | Purpose                               |
| ----------------------------------- | ------------------------------------- |
| `trellis/persist/better-sqlite`     | better-sqlite3 backend                |
| `trellis/persist/sqljs`             | sql.js (browser) backend              |
| `trellis/persist/factory`           | Runtime backend selection             |
| `trellis/plugins/cron`              | Scheduler-fed facts (`builtin:clock`) |
| `trellis/plugins/idea-garden`       | Abandoned-work detection              |
| `trellis/plugins/plan-approval`     | Plan gate for agent harnesses         |
| `trellis/plugins/agent-memory`      | Durable agent memory                  |
| `trellis/plugins/proactive-watcher` | Graph-change reactions                |

## Status

Actively maintained. Issues are triaged and PRs reviewed; see
[What's Open, What's Sold](./docs/OPEN-SOURCE-STRATEGY.md) for how the
ecosystem is positioned.

## Documentation

- **[trellis.computer](https://trellis.computer)** — full documentation
- **[What's Open, What's Sold](./docs/OPEN-SOURCE-STRATEGY.md)** — the open-/closed-source line
- **[The Story](./docs/THE-STORY.md)** — why Trellis exists
- **[Architecture](./docs/ARCHITECTURE.md)** ·
  **[Design spec](./docs/DESIGN.md)** · **[Roadmap](./docs/ROADMAP.md)**

## Develop

```bash
bun install   # requires Bun ≥ 1.0
bun test
bun run build
```

**In this checkout, prefer `just trellis …` over bare `trellis`.** Global npm
may lag (format skew: array-era CLI + JSONL journal can wipe `ops.json` via
`trellis repair`). Agents are blocked from bare `trellis` here by the Cursor
shell guard; escape hatch: `TRELLIS_ALLOW_GLOBAL_CLI=1`.

```bash
just trellis status              # source CLI (bun src/cli) — default
just trellis-dev status          # dist CLI after just build
just alias-cli install           # adds `trellis-dev` alias; keeps global intact
just link-cli                    # make global `trellis` → this checkout
just unlink-cli                  # restore published trellis@latest
```

## License

[AGPL-3.0-or-later](./LICENSE) © Turtle Labs LLC
