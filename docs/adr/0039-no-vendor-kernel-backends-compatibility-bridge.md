# ADR 0039: No vendor kernel backends — compatibility bridge instead

**Status:** Accepted
**Date:** 2026-08-12
**Related:** [0040](./0040-lane-boundary-oss-and-hosted-platform.md) (lane boundary, OSS, Platform sibling SKU),
[Vision § Design principles](https://trellis.computer/architecture/vision) (local-first, sovereignty),
[ADR 0025](./0025-dsl-first-then-sync.md) (DSL-first, transport-second),
[ADR 0016](./0016-relay-blob-serving.md) (relay blob serving),
[ADR 0038](./0038-git-authoritative-file-tier.md) (git bridge),
[Shipping today](/guides/shipping-today) (practitioner guide)

## Context

Trellis competes with hosted sync stacks — Jazz, InstantDB, Convex, Firebase,
ElectricSQL, etc. — on developer experience: typed rows, live lists, optimistic
UI, multiplayer. Those products also offer a fast path: sign up, npm install,
data is live in minutes.

Trellis's thesis is different: **the causal op-log on your device is the system
of record.** Servers may relay, accelerate, or back up; they must not own state.
That principle is explicit in the README and in vision principle #7 (local-first,
cloud-optional).

A recurring question — especially during the gap between "thesis-complete kernel"
and "market-complete onboarding" — is whether Trellis should ship **vendor
kernel backends**: `KernelBackend` implementations backed by Convex, Firebase,
Postgres/Neon, InstantDB, or similar, so teams can adopt Trellis semantics while
keeping an existing hosted database as source of truth.

This ADR records that question, the decision, and the **compatibility bridge**
that replaces backend adapters.

### What exists today (not vendor backends)

| Layer | Implementations | Role |
| ----- | --------------- | ---- |
| **Persistence** | `BetterSqliteKernelBackend`, `SqlJsKernelBackend` | Authoritative op log + snapshots |
| **Sync transport** | HTTP, WebSocket, PartyKit, Iroh | Move ops between Trellis kernels |
| **Realtime relay** | WS relay, DO relay, BroadcastChannel | Ephemeral presence/chat; optional blob relay |
| **Hosted Trellis** | Sprites (`*.sprites.app`), Studio sandboxes | Run the **same** kernel remotely |
| **Git bridge** | import / export / mirror sync | Coexist with existing file workflows |
| **Cloud control plane** | InstantDB (Trellis Cloud dashboard only) | Workspace provisioning, auth tokens, metering — **not** the graph kernel |

Third-party names appear in docs as **DX positioning** ("Jazz-style typed rows on
our EAV graph"), not as integration targets.

### The awkward middle

Several gaps are real and unrelated to missing Convex adapters:

1. **Onboarding** — Trellis still expects you to run or provision a kernel (local
   or Sprites), not a one-click BaaS dashboard.
2. **Local live reads** — typed `liveEntities` / framework hooks are remote-mode
   today; embedded-kernel live reads are planned.
3. **First sync** — empty-remote bootstrap (ADR 0028) is still proposed; cold
   start between environments is harder than vendor BaaS defaults.
4. **Mental model** — EAV graph + TQL + op-log vs document rows + vendor console.

Backend adapters would paper over (1)–(3) by making a vendor the write path,
which trades the awkward middle for architectural contradiction.

## Decision

### 1. No vendor `KernelBackend` adapters

Trellis will **not** implement `KernelBackend` (or equivalent write-path
adapters) on top of:

- Convex, Firebase, Supabase Realtime, InstantDB (as graph store)
- Postgres / Neon / PlanetScale / Turso (as op-log substitute)
- Jazz / Replicache / ElectricSQL (as causal stream substitute)

**Rationale:** Those systems own durability, conflict resolution, and tenancy.
Trellis's op-log, signing, lanes, and time-travel assume **local append-only
causal storage** under user control. A vendor backend either becomes the real
source of truth (violates sovereignty) or requires lossy dual-write (violates
declarative-over-imperative: hidden state outside the op log).

This is a **non-goal**, not a deferred roadmap item. Revisit only if the thesis
changes.

### 2. Compatibility bridge (what we build instead)

Meet teams in today's reality without making vendors load-bearing:

| Bridge | What it is | Load-bearing? |
| ------ | ---------- | ------------- |
| **Hosted Trellis** | Sprites, Studio sandboxes, `TrellisDb({ url })` | No — same kernel, you can export `.trellis` and leave |
| **Relay-only cloud** | PartyKit, DO, WebSocket as dumb pipes for ops/presence | No — relay does not author ops |
| **Git coexistence** | ADR 0038: git owns bytes, op-log owns semantics | No — git is optional mirror |
| **Export / analytics** | Read replicas, JSON/Parquet snapshots, warehouse ETL | No — one-way, async, never write path |
| **Typed SDK** | Jazz-competitive DX on persisted graph | N/A — competes on surface, not storage |

Order of preference for "I need to ship multiplayer this week":

1. **Remote Trellis server** (Sprites or self-hosted) + typed SDK
2. **Local kernel** + git bridge if the team is file-centric
3. **Relay-only** for ephemeral UI; sync for durable graph
4. **Export bridge** only for reporting/BI — never for app writes

### 3. InstantDB and similar in Trellis Cloud

Using InstantDB (or any vendor) for **Trellis product metadata** — workspace
status, billing, auth session tables — is in scope. Using the same vendor as the
**customer graph kernel** is out of scope per §1.

### 4. Documentation obligation

The practitioner path for the awkward middle must be explicit:

- Guide: [Shipping today](/guides/shipping-today)
- This ADR cited from architecture docs when "why no Convex adapter?" arises
- Product strategy (refer-out to BaaS, OSS + hosted Platform): [0040](./0040-lane-boundary-oss-and-hosted-platform.md)

## Consequences

### Positive

- **Thesis stays honest** — no silent sovereignty regression.
- **Clear integration surface** — transports and relays, not N× vendor backends.
- **Hosted Trellis is the answer** to "I don't want to run infra," not "plug into Neon."
- **Stops recurring design debates** — documented non-goal.

### Negative

- **No shortcut** for teams deeply invested in Convex/Firebase as primary store.
- **Onboarding gap** remains until hosted Trellis + local live reads mature.
- **Migration story** from BaaS → Trellis is export/import or parallel-run, not drop-in adapter.

### Neutral

- Vendor SDKs may still appear **beside** Trellis (e.g. Raster, billing) in the same
  product; they must not substitute for the graph kernel.
- Plugin system could theoretically add vendor backends; **core will not ship or
  support them** without a thesis revision ADR.

## Alternatives considered

| Alternative | Why rejected |
| ----------- | ------------ |
| **Postgres `KernelBackend`** | Ops become SQL rows; content-addressing, lane journals, and offline replay don't map cleanly; Postgres becomes SSoT |
| **Convex/Firebase as realtime + SQLite as cache** | Dual-write and conflict semantics; cache invalidation is the hidden state problem |
| **"Trellis Lite" on vendor BaaS** | Markets as Trellis, behaves as vendor lock-in; worst of both worlds |
| **Defer decision** | Every 6 months someone re-proposes adapters; costs design attention |

## Implementation

No code required for acceptance. Follow-up work (separate issues):

1. Practitioner guide (linked above) — **done with this ADR**
2. Local embedded-kernel live reads — closes typed SDK remote-only gap
3. ADR 0028 bootstrap — closes empty-remote cold start
4. Optional: `trellis export --format jsonl` polish for analytics bridge
