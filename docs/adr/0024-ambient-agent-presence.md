# ADR 0024: Ambient agent presence (stigmergy layer)

> **Terminology:** **Presence** = a live heartbeat recording that an agent
> session is working in a repo. **Stigmergy** = coordination through the shared
> environment (traces others perceive) rather than direct messaging.
> **Client** = the agent runtime: `opencode` | `claude` | `gemini` | `codex`.

**Status:** Accepted
**Date:** 2026-07-15
**Issue:** (proposed — ambient presence) · Layer 1 implemented in `src/cli/presence.ts` + `trellis who` / `trellis presence`
**Depends on:** `src/realtime/` (heartbeat presence model), `src/vcs/lane.ts` (lanes), `src/identity/` (identity), ADR 0015 (agent handoff)
**Supersedes:** nothing

## Context

Trellis already isolates concurrent agent work in **lanes** and records **claims**
(lane → issue). But presence is *not ambient*: a CLI agent working in a repo has
no realtime awareness of other agents working beside it. The failure mode is
concrete — one agent can see another's uncommitted files (via `git status`) with
no idea *who* produced them or *what* they were doing. Lanes are queryable in
principle, but nothing surfaces "who is here, right now."

Two facts make this tractable without new infrastructure:

1. `src/realtime/room.ts:14` already defines heartbeat-based presence
   (peers re-announce on an interval, pruned when stale). The web UIs
   (`src/svelte/stores.ts`, `src/vue/hooks.ts`) already consume it. Only the
   **agent/CLI surface** is blind to it.
2. The shared repo environment (`.trellis`) is already the coordination medium.
   Presence can ride *beside* it without entering the causal op log.

## Decision

Model ambient presence as a **file-backed heartbeat ledger**, deliberately
outside the op log so liveness never pollutes milestones, the garden, or sync.

### Layer 1 — Presence ledger (implemented)

- Each session writes `.trellis/presence/<sessionId>.json` on announce.
- `<sessionId>` = `TRELLIS_SESSION_ID` || `TRELLIS_LANE_ID` || generated uuid.
  Falling back to the lane id is intentional: a lane *is* a session's work scope,
  so presence keys naturally collapse to one entry per working lane.
- Record shape (`PresenceInfo`): `sessionId, agentId, displayName, client,
  laneId?, branch?, claimedIssueId?, claimedIssueTitle?, status, startedAt,
  lastHeartbeat`.
- `trellis who [--stale <ms>] [--json]` reads all non-stale records (default
  window 5 min), newest first, excluding self. It also **refreshes the caller's
  own heartbeat** when a lane/session is set, so running `who` makes you visible.
- `trellis presence announce [--client X] [--status active|idle|away]` writes the
  current session's heartbeat; `trellis presence clear` removes it.
- `issue start` auto-announces (best-effort, wrapped so it can never block the
  start) — the canonical "heads down" moment becomes ambient.
- Staleness is pruned by `lastHeartbeat` age; no GC job needed.

This is **stigmergy, not chat**: *what* an agent is doing is perceived from its
lane + claim + branch, never sent as a message. Zero-cost, always-current.

### Layer 2 — Live room + direct message (future)

- Long-running sessions join `RealtimeRoom` so awareness is instantaneous and
  `room.broadcast` enables `trellis message send --to <agent|lane>`.
- Direct messages stay **async and graph-backed**, extending ADR 0015's handoff
  protocol (`trellis protocol send` / `whereami`) rather than a live chat socket.
- Presence is keyed to the *repo* (shared ledger / repo room), not a per-feature
  room, so every session in a repo sees every other — that is what makes it
  *ambient* rather than opt-in-per-channel.

## Consequences

- `trellis who` gives any agent instant awareness of peer count, client, identity,
  lane, branch, and claimed issue — preventing the blind-spot that let one agent
  mistake another's concurrent work for stray changes.
- Presence is local-first and server-free; it lives under `.trellis` (gitignored
  via `/.trellis/*`), so it never enters git or sync accidentally.
- Ephemeral CLI agents are represented by "last activity" heartbeats rather than
  long-lived sockets; this is sufficient for same-repo / same-machine awareness
  and matches the stigmergy model. Cross-machine awareness arrives with Layer 2
  (Iroh presence).
- Risk: a session that crashes without `presence clear` leaves a stale record —
  acceptable, since `who` prunes by age.

## Alternatives considered

- **Reuse only the web realtime room** — rejected: the CLI agent never joins it,
  so it would not fix the agent-blind-spot that motivated this.
- **Put presence in the op log** — rejected: liveness is ephemeral and would
  pollute milestones, the garden's "abandoned cluster" detection, and Iroh sync.
- **Build a chat-first protocol** — rejected: heavier than needed; stigmergy
  covers the immediate pain, and ADR 0015 already seeds async messaging.
