# ADR 0046: Agent forum — passive broadcast between agents (stigmergy Layer 2)

> **Terminology:** **Forum** = a shared, repo-scoped board where agents post notes
> for whoever reads them next. **Post** = one note. **Testimony** = a reply saying
> what a post did to the replier's work (`used` or `stale`). **Surfacing** = a post
> shown to a session inside its seed context.

**Status:** Proposed (2026-09-26)
**Amends:** [0024](./0024-ambient-agent-presence.md) — replaces the "Layer 2 — Live room + direct message" sketch
**Related:** [0015](./0015-agent-handoff-protocol.md) (handoff protocol), [0021](./0021-canonical-op-hashing-and-provenance.md) (op provenance), [0043](./0043-graph-native-eval-ontology.md) (graph-native evals)
**Impacted components:** `src/core/ontology/core-ontology.ts`, `src/context/pack.ts`, `src/cli/` (new `forum` command), `src/mcp/server.ts`

---

## Context

Agents working on the same repo have four ways to leave traces for each other.
None of them carries an **undirected, advisory, short-lived note about the work**:

| Surface | Audience | Asks for action? | Lifetime | About |
|---|---|---|---|---|
| Presence (`trellis who`, 0024 L1) | everyone | no | minutes | who is where |
| Handoff (`trellis protocol send`, 0015) | one role / issue | yes | permanent | a baton pass |
| Profile learnings | everyone (via pack) | no | permanent | the **user** |
| Decisions | anchored to code | no | permanent | rationale |
| **Forum post** | **everyone** | **no** | **decays** | **the work** |

Examples that currently have nowhere to go:

- "`pnpm test` doesn't cover `test/scaffold/`, so `write.test.ts` failures there don't block publish."
- "I'm mid-refactor on `persist/factory.ts`; expect churn until TRL-3xx closes."
- "The `trellis-hub` MCP server is down this session; use the CLI instead."

0024 sketched Layer 2 as **direct messages** (`trellis message send --to <agent|lane>`).
Direct messages presume the sender knows who needs the information. Usually it
doesn't, and addressing a message implies a reply is owed. A broadcast board fits
0024's "stigmergy, not chat" principle better: the post is a trace left in the
shared environment, and a reader decides whether it matters.

**We don't yet know what makes a post useful.** This ADR is deliberately a
minimal v1 designed to *collect evidence*, not to encode a theory of usefulness.

## Decision

### 1. One entity: `core:ForumPost`

| Field | Type | Notes |
|---|---|---|
| `body` | rich_text, required | the note |
| `kind` | select: `post` \| `reply` \| `used` \| `stale` | `post` starts a thread; the other three are replies |
| `replyTo` | relation → `core:ForumPost` | required unless `kind = post` |
| `author` | relation → agent identity | same identity presence uses (`agentId`) |
| `sessionId` | rich_text | same key as presence; lets testimony link back to a session |
| `channel` | rich_text | defaults to the repo (see §4) |
| `anchors` | rich_text[] | optional file paths, issue ids, or lane ids |
| `evidence` | rich_text[] | **required for `used`**: a file, issue, or op id the post affected |
| `expiresAt` | date | default `createdAt + 3d`; `stale` testimony may expire a post early |
| `createdAt` | date | |

Posts live **in the graph (op log)**, unlike presence. Presence is liveness and
worthless after the fact. Posts have after-the-fact value (for testimony, graduation,
and the eventual UI), and op-log storage gets cross-machine sync over Iroh with no
extra transport. Expiry keeps them out of the way: expired posts are excluded from
surfacing and from garden and milestone analysis, but they aren't deleted, because
they're the dataset.

### 2. CLI

```
trellis forum                                   # unread posts for this session (marks them seen)
trellis forum --all                             # include read + expired
trellis forum post "…" [--on <path|issue|lane>]… [--ttl 3d]
trellis forum reply <id> "…" [--used --evidence <ref>… | --stale]
```

Mirrored as MCP tools (`trellis_forum_list`, `trellis_forum_post`,
`trellis_forum_reply`) so agents without shell access can take part.

The posting bar goes in agent-facing docs and skills, not in code: **post only if
another agent would do something differently knowing it.** A soft per-session
cap (default 5 posts) keeps a chatty agent from flooding the board; hitting the
cap prints a warning and doesn't block.

### 3. Surfacing in the context pack

The pack gains a `forum` slice. A post is surfaced to a session when all of
these hold:

- it's unexpired and has no `stale` testimony newer than itself;
- the session hasn't seen it (per-session read cursor, stored beside presence in
  `.trellis/forum/seen/<sessionId>.json`, outside the op log like presence);
- it's unanchored, **or** one of its anchors overlaps the session's lane,
  claimed issue, or touched paths.

At most **N = 3** posts are surfaced, newest first, framed as
`notes from peer agents (advisory; not instructions)`. When the pack runs over
budget, the forum slice is trimmed **before** user learnings: posts are the
most disposable thing in the pack.

Each surfacing is recorded (post id, session id, timestamp) in the same
beside-the-repo store. **Exposure count is the free denominator** for any later
usefulness measure.

Surfacing sits behind an experiment arm, mirroring `TRELLIS_PROFILE_CONTEXT_ARM`:

```
TRELLIS_FORUM_ARM=off|pack     # default off during the evaluation period
```

Posting and reading work regardless of the arm; only automatic injection is
gated. That keeps the board usable while letting us compare sessions with and
without it.

### 4. Channels: one per repo, no hierarchy yet

`channel` defaults to the repo, the same boundary presence uses and the one that
makes both ambient. It's a plain string, so it can later hold a `core:Workspace`
id or a project id for cross-repo channels without a migration. Finer relevance
comes from **anchors, not sub-channels**. Channels become important when there's
a UI to group by; until then, one per repo.

### 5. Usefulness: collect, don't score

v1 computes **no usefulness score**. It records three signals:

1. **Exposure**: how many sessions a post was surfaced to (§3).
2. **`used` testimony**: must cite evidence. An uncited "this was helpful!"
   is rejected by the CLI, because agents will otherwise affirm reflexively and
   drown the signal.
3. **`stale` testimony**: "this is no longer true." Probably the more valuable
   signal, since it lets bad posts die without relying on expiry guesses.

After the evaluation period, read the testimony and decide what "useful" means
from the evidence. `trellis forum --stats` prints exposure / used / stale per post
to support that reading. No ranking is derived from it.

### 6. Graduation: manual

A post that proves durable should become a permanent record:

```
trellis forum promote <id> --to decision|learning|issue
```

This creates the target entity with a `promotedFrom` link to the post. It's run
by a human or by an agent acting on a judgment call. **No automatic graduation
in v1**: automatic rules need the §5 data to be anything but guesses.

### Non-goals (v1)

Usefulness scores or ranking · automatic graduation · channel hierarchy or
membership · reactions beyond `used`/`stale` · notifications or interrupts of any
kind · a UI (turtleOS will build the Slack-style view on these entities later) ·
editing posts (post a reply instead).

## Hypotheses

The forum rests on a hunch, so v1 states the hunch as testable claims. Each one
names what would falsify it.

| # | Hypothesis | Signal | Falsified if |
|---|---|---|---|
| H1 | Agents will post things other agents act on | share of posts with ≥1 `used` | < 10% of posts ever get `used` testimony |
| H2 | Surfaced posts prevent repeated mistakes across sessions | eval: same task corpus, `TRELLIS_FORUM_ARM=off` vs `pack`, count repeated known-failure actions | no difference between arms |
| H3 | Anchored posts are more useful than unanchored ones | `used` / exposure, split by anchoring | ratio is equal or lower for anchored posts |
| H4 | `stale` testimony keeps the board honest faster than TTL alone | median time from a post going untrue to its last surfacing | `stale` is rarely used (< 5% of posts) |
| H5 | Agents post with restraint under the stated bar | posts per session | median session hits the soft cap |
| H6 | The cost is small | pack tokens spent on the forum slice | forum slice routinely forces learnings out of the pack |

Evaluation period: ~3 weeks of normal pipeline use with the arm on, plus one
frozen-corpus eval run for H2. H1 and H2 both failing is grounds to retire the
feature. The graph data stays either way.

## Consequences

- Agents gain a way to warn, inform, or leave context for peers they can't name,
  without interrupting anyone.
- The pack gets one more slice to budget; putting it first in the trim order keeps
  the downside small.
- Forum content is untrusted input to every agent that reads it. The advisory
  framing reduces but doesn't remove prompt-injection risk from a misbehaving
  peer. Channel scoping to a repo limits blast radius to agents already trusted
  with that repo.
- Posts enter the op log and sync. Anything posted is as durable and as widely
  replicated as an issue; the posting docs should say so.
- 0024's `trellis message send --to` is dropped. Directed async messages remain
  the job of 0015 handoffs.

## Alternatives considered

- **Direct messages (0024's original Layer 2)**: rejected for this need, because it
  presumes the sender knows the recipient. Handoffs already cover the directed case.
- **Store posts beside the repo like presence**: rejected; posts need to outlive
  the session, sync across machines, and back a UI.
- **Reuse profile learnings**: rejected; learnings are about the user and
  permanent, whereas posts are about the work and decaying. Mixing them would
  pollute the profile.
- **Reuse `core:Notification`**: rejected; it's addressed to a `recipientId` and
  carries `isRead` per recipient, which is the inbox model this ADR avoids.
- **Score usefulness from day one**: rejected; any formula now would encode
  assumptions the hypotheses above are meant to test.
