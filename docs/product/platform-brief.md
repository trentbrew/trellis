# Trellis Platform — product brief (sibling SKU)

**Status:** Draft  
**Date:** 2026-08-12  
**ADR:** [0040 — Lane boundary, OSS, hosted Platform](../adr/0040-lane-boundary-oss-and-hosted-platform.md)  
**Audience:** Internal product / GTM; informs docs and build order

## Elevator pitch

**Trellis Platform** is a hosted, browser-based **horizontal agent product** —
Rox-shaped UX without competing on developer BaaS. Teams get auditable agents,
workflow graphs, and integrations without running `trellis init` or operating
kernels. The **open `trellis` engine** stays the substrate; Platform is the
commercial operator layer.

**Not:** Convex alternative, Jazz killer, or `npm install trellis` in a tab.  
**Is:** "Auditable agent platform for any domain" — you host, you bill, engine stays OSS.

## Sibling SKUs

| | **Trellis Studio** | **Trellis Platform** |
| --- | --- | --- |
| **Tagline** | Local-first workspace for builders | Hosted agents for teams who won't run infra |
| **Primary user** | Developer / agent on a repo | Team lead, ops, knowledge workers |
| **Default mode** | `npx trellis studio` on device | Browser → Platform API |
| **Kernel location** | Local `.trellis` or Cloud sandbox VM | Server-side per tenant (`TenantPool`) |
| **Sovereignty** | Core promise — export, offline | Export offered; hosted-first |
| **Monetization** | Studio Cloud (E2B), open core | SaaS subscription / enterprise |
| **Competes with** | Cursor + git + issue tracker (integrated) | Rox-class agent products (horizontal) |
| **Does not compete with** | — | InstantDB, Jazz, Convex (refer out for app data) |

Same engine. Different GTM. Studio does not absorb Platform; they are siblings.

## Reference shape: Rox (horizontalized)

[Rox](https://www.rox.com/) validates the **hosted agent SaaS** category:
browser workflows, @-context, integrations to external systems of record,
enterprise trust, operator-run infra.

| Rox (vertical) | Platform (horizontal) |
| -------------- | --------------------- |
| Revenue / pipeline native | Domain via ontology + connectors |
| Salesforce/HubSpot core | Integration registry (MCP, webhooks, git, APIs) |
| "Global 2000" sales GTM | Builders, agencies, internal tools → enterprise |
| Rox Tether (agentic UI) | Projections, fractal shells, TML |

**Positioning:** *"Rox built the revenue agent. Trellis Platform is the auditable agent layer for any domain."*

## Problem

Teams want AI agents that **act** and **explain themselves** — not black-box chat.
They do not want to operate SQLite kernels, sync daemons, or lane infrastructure.
They may already have app data on Jazz/Convex.

Trellis engine solves agent memory and audit; **Platform** solves hosted delivery
and browser UX.

## Solution

```
┌─────────────────────────────────────────────────────────┐
│  Browser — agent shell (chat, @-context, workflows)    │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTPS / WebSocket
┌───────────────────────────▼─────────────────────────────┐
│  Platform API (auth, tenancy, rate limits)                │
│    ├── Trellis kernel / tenant (lanes, traces, graph)     │
│    ├── Agent harness + MCP connector registry             │
│    └── Product shell DB (orgs, billing — e.g. InstantDB)  │
└───────────────────────────┬─────────────────────────────┘
                            │ integrations
┌───────────────────────────▼─────────────────────────────┐
│  External systems of record (git, APIs, CRM, email, …)    │
└─────────────────────────────────────────────────────────┘
```

**Principle:** Platform records **what agents decided**. Integrations read/write
external SoR. App-facing live rows stay on BaaS when the customer already uses one.

## Differentiation (moat)

| Capability | Black-box agents | Platform on Trellis |
| ---------- | ---------------- | ------------------- |
| Tool call history | Logs / chat | Signed ops in causal stream |
| "Why did it do that?" | Opaque | `trellis decision chain` |
| Multi-agent same repo | Collision risk | Lanes + handoff protocol |
| Replay / time travel | No | Op-log primitive |
| Domain model | Vendor schema | EAV + ontology + projections |
| Self-host / export | Vendor lock | Open engine + export path |

## Open source commitment

- **`trellis` packages remain open** — kernel, VCS, SDK, Studio CLI, self-host.
- **Platform** is commercial hosted product — multi-tenant ops, SLAs, managed connectors.
- Analogy: **git / GitHub** — not "close the repo to monetize."

Namespace: `@turtle.tech/*` for commercial layers (optional); engine stays unscoped `trellis`.

## MVP wedge options (pick one for v1)

Do not ship all three. Choose one GTM wedge:

| Wedge | Fit | Existing assets |
| ----- | --- | ----------------- |
| **A. Dev / agent coordination** | Closest to Studio; lanes, issues, traces | VCS, agent coordination guide, Cursor hooks |
| **B. Knowledge / workflow agents** | Graph-native RAG, decisions, wiki-links | Embeddings, decisions, garden |
| **C. Vertical templates** | Customer brings ontology + connectors | Schema `defineType`, MCP room |

**Recommendation for first launch:** **A** — dev/agent coordination — reuses
the most shipped surface and differentiates on audit vs generic agent wrappers.

## Build order (engineering)

| Phase | Deliverable | Code anchors |
| ----- | ----------- | ------------ |
| **P0** | ADR + docs (lane, BaaS guide, this brief) | `docs/adr/0040`, guides 20–21 |
| **P1** | Multi-tenant hosted API hardening | `src/server/tenancy.ts`, auth, `usage-meter.ts` |
| **P1** | Product shell — orgs, workspaces, billing hook | Trellis Cloud / InstantDB pattern |
| **P2** | Browser agent shell (chat, @-context, workflow panels) | `sprite-client`, Nuxt patterns |
| **P2** | Connector registry (MCP + webhooks) | `src/mcp/`, gateway |
| **P3** | Projection / agentic UI layer | fractal shells, TML |
| **P3** | Enterprise — export, audit export, SOC2 path | product/compliance, not kernel |

## Non-goals (v1)

- Consumer TurtleDB / developer BaaS SKU
- `@turtle.tech/starter-*` vendor `TrellisDbClient` wrappers
- Replacing customer CRM or app database inside op-log
- WASM full kernel in browser tab as primary path
- Competing with Jazz/Convex signup funnels

## Success metrics (draft)

- Time to first **audited** agent workflow (not just first chat message)
- % tool calls with decision trace + rationale
- Teams running ≥2 agents without lane collision incidents
- Export used (trust signal) — not required day one for all users
- **Not** optimizing for "signups per minute" vs BaaS incumbents

## GTM notes

- **Lead with audit + coordination**, not "database."
- **Refer BaaS** for app data — [Trellis and BaaS](https://trellis.computer/guides/trellis-and-baas).
- **Enterprise:** decision traces, export, integration to existing SoR.
- **Developer community:** Studio + OSS engine; Platform is upsell for teams.

## Open questions

- Final product name (`Trellis Platform` vs `@turtle.tech/platform` vs other)
- Pricing model (seats, agent runs, graph I/O, connector count)
- First connector pack (git-only vs MCP marketplace)
- Relationship to Studio Cloud — separate billing or bundle

## Related docs

- [ADR 0040](../adr/0040-lane-boundary-oss-and-hosted-platform.md)
- [ADR 0039](../adr/0039-no-vendor-kernel-backends-compatibility-bridge.md)
- [Shipping today](https://trellis.computer/guides/shipping-today)
- [Trellis and BaaS](https://trellis.computer/guides/trellis-and-baas)
- [Studio introduction](https://trellis.computer/studio/introduction)
