# ADR 0040: Lane boundary, open engine, and hosted agent platform

**Status:** Accepted  
**Date:** 2026-08-12  
**Depends on:** [0039](./0039-no-vendor-kernel-backends-compatibility-bridge.md) (no vendor `KernelBackend`),  
[0038](./0038-git-authoritative-file-tier.md) (git bridge),  
[0011](./0011-app-shell-three-bands.md) (projections),  
[ADR 0025](./0025-dsl-first-then-sync.md) (DSL-first)  
**Related:** [Vision — design principles](https://trellis.computer/architecture/vision),  
[Shipping today](https://trellis.computer/guides/shipping-today),  
[Rox](https://www.rox.com/) (reference product shape — hosted agent SaaS, not developer BaaS)

## Context

ADR 0039 settled that the **open `trellis` engine** will not implement vendor
`KernelBackend` adapters (Convex, Firebase, Neon, Jazz as op-log substitute).
That decision stands.

Follow-on questions exposed a broader product-strategy gap:

1. **Lane confusion** — Trellis is compared to InstantDB, Jazz, and Convex on
   live app data, but does not intend to compete in the developer-BaaS lane.
2. **The awkward middle** — teams need a fast path for browser apps and
   multiplayer UX without adopting the full sovereignty model on day one.
3. **Browser monetization** — the browser SDK is remote-only
   (`src/client/sdk.browser.ts`); a monetizable browser product requires a
   hosted stack, not `npm install trellis` alone.
4. **Reference products** — hosted agent products such as Rox (browser UX,
   enterprise SaaS, external integrations) are a different category from
   developer BaaS, but Trellis had no ADR naming how we play there.
5. **Open source** — commercial hosted offerings must not be read as "close the
   repo." The namespace split (`trellis` open vs `@turtle.tech/*` commercial)
   was implicit, not recorded.

This ADR records **lane boundaries**, the **OSS commitment**, how we **refer out**
to BaaS vendors, and the **sibling SKU** model: open engine + Studio (builder)
+ Platform (hosted horizontal agents).

## Decision

### 1. Lane boundary — we do not compete on developer BaaS

| Lane | Owner | Trellis role |
| ---- | ----- | ------------ |
| **Live app state** (rows, auth, signup-in-minutes) | Vendor BaaS | **Refer out** — InstantDB, Jazz, Convex, Firebase |
| **Causal agent / VCS graph** (op-log, lanes, traces) | Trellis (open engine) | **Own** — `.trellis`, issues, decisions, semantic graph |
| **Product metadata** (orgs, billing, workspace status) | Vendor OK inside Trellis products | InstantDB on Trellis Cloud today — precedent, not customer graph kernel |

Trellis docs and examples **must not** position the open engine as an
InstantDB/Convex alternative. Use vendor BaaS for app-facing live data when that
is the job. Use Trellis for auditable agent memory, coordination, and causal
history.

**Non-goals (in addition to ADR 0039):**

- Consumer-facing **TurtleDB** as a developer hosted-DB SKU competing with Jazz
- `@turtle.tech/starter-*` packages wrapping vendors as `TrellisDbClient` shims
- Marketing or docs implying `npm install trellis` alone ships a monetizable
  browser SaaS without hosted product investment

### 2. Open-source commitment — engine stays open

The **Trellis engine remains open source** under the existing `trellis` /
`trellis-*` packages:

- Local-first kernel, `.trellis` op-log, export, lanes, decision traces
- `trellis init`, self-host (`db serve`), Sprites deploy for operators
- No feature gate that removes sovereignty from the OSS tree

**Commercial layers** (hosted product, enterprise support, managed connectors)
may live under `@turtle.tech/*` or separate product brands. They **build on**
the open engine; they do not replace or fork it behind a paywall.

Analogy: git / GitHub — not "close git because GitHub makes money."

### 3. Refer-out and thin-bridge policy

When app builders need BaaS-speed onboarding:

1. **Recommend a vendor** for app UI state (docs decision table).
2. **Recommend Trellis** for agent audit, repo semantics, and coordination.
3. **Document sidecar patterns** — two stores, explicit boundary; no live
   dual-write between vendor DB and op-log.

**Thin bridges (in scope):**

| Bridge | Direction | Notes |
| ------ | --------- | ----- |
| Export / import | Trellis ↔ JSON / files | One-way or batch; analytics, migration |
| MCP room | Remote agents → Trellis graph | Agent access without app DB merge |
| Git bridge | Files ↔ semantics | ADR 0038; git owns bytes |
| Integration connectors | External SoR → agent tools | Read/write via API; Trellis records decisions |

**Out of scope:** vendor `KernelBackend`, `TrellisDbClient` vendor impls in core.

Guide: [Shipping today](https://trellis.computer/guides/shipping-today).  
Guide: [Trellis and BaaS](https://trellis.computer/guides/trellis-and-baas) (decision table, sidecar anti-patterns).  
Product brief: [Platform sibling SKU](../product/platform-brief.md).

### 4. Sibling SKUs — Studio vs Platform

Two product surfaces share one engine; different GTM and invariants:

| SKU | Audience | Primary mode | Monetization |
| --- | -------- | ------------ | ------------ |
| **Trellis Studio** | Builders, agents-on-repo | Local-first (`npx trellis studio`); Cloud sandbox optional | Studio Cloud (E2B), open core |
| **Trellis Platform** (working name) | Teams wanting hosted agents without running infra | Hosted-first; browser agent shell | SaaS subscription / enterprise |

**Studio** is a **projection** over the graph — no storage privilege (vision).
**Platform** is a **hosted product** you operate: multi-tenant API, auth/billing
shell, browser UX. Platform does not change the OSS thesis; it is the commercial
operator path.

Neither SKU competes with Convex/Jazz as a **developer database**. Platform
competes on **auditable horizontal agents** (domain-agnostic workflows,
integrations, projections).

### 5. Hosted Platform architecture (Rox-shaped, horizontal)

Reference: [Rox](https://www.rox.com/) — browser agent product, hosted infra,
external integrations (CRM, email), enterprise trust. Rox is **vertical**
(revenue); Trellis Platform is **horizontal** (any domain via ontology +
connectors + projections).

```
Browser SPA (agent UI, projections, @-context)
    → Product API (HTTPS / WebSocket)
        → Trellis kernel per tenant (TenantPool, lanes, traces, graph)
        → Agent harness + MCP connector registry
        → Product shell DB (InstantDB or similar: users, orgs, billing)
    → External systems of record (per integration: git, APIs, CRM, etc.)
```

**Platform records what agents decided; integrations read/write external SoR.**
Do not replicate Salesforce or arbitrary app schemas inside the op-log as a
default product design.

**Trellis differentiation vs black-box agents:**

- Signed ops, lanes, decision traces (`trellis decision chain`)
- Causal memory and time-travel on agent actions
- Domain-agnostic EAV + TQL + typed SDK on **platform-persisted** workflow graph
- Multi-agent isolation and handoff protocol (ADR 0015)
- Projections / agentic UI layer (fractal shells, TML — Rox "Tether" analogue)

**Browser constraint:** Platform clients use remote API (`TrellisDb({ url })` or
product API). Kernel runs server-side on operator infra — not WASM-in-tab as the
primary path.

**Existing code anchors:**

- `src/server/tenancy.ts` — `TenantPool`, per-tenant SQLite kernels
- `src/mcp/room.ts`, `src/server/sprites.ts` — deployed rooms, MCP
- `src/server/usage-meter.ts` — metering stub for hosted rooms
- Trellis Cloud — InstantDB for control plane; E2B for Studio sandboxes

### 6. TurtleDB naming — agent rooms, not consumer BaaS brand

Internal name **TurtleDB** (deploy URLs, room MCP) means **deployed Trellis room
for agents and tooling** — not a public developer database product competing
with Jazz.

- `*.sprites.app` — MCP + typed API over a Trellis kernel
- Self-host `db serve` — power-user / operator path
- **No** TurtleDB pricing page or BaaS GTM funnel

### 7. Browser monetization — allowed architectures

| Architecture | Product | Load-bearing cloud? |
| ------------ | ------- | ------------------- |
| Studio Cloud | Browser → E2B VM → `trellis studio` in sandbox | Yes — compute you provision |
| Platform | Browser → your API → server-side kernel | Yes — you operate Platform |
| Hybrid sidecar | Browser → vendor BaaS; Trellis on dev machine or worker | Partial — app on vendor |
| Local / desktop | Full kernel on device | No — sovereignty path |

Do not promise browser SaaS revenue without picking an operator model above.

### 8. Namespace and positioning

| Package / brand | Role |
| --------------- | ---- |
| `trellis`, `trellis-*` | Open engine, SDK, Studio CLI |
| `@turtle.tech/*` | Commercial hosted product, connectors, enterprise (optional) |
| Platform (name TBD) | Hosted horizontal agent SaaS |

**Positioning line:** *"Trellis is the auditable agent engine. Platform is the
hosted product for teams who won't run infra. Use Jazz or Convex for your app
data when that's the job."*

## Consequences

### Positive

- **Clear lanes** — stops BaaS comparison thrash in engine design reviews.
- **OSS trust** — commercial Platform explicitly builds on open Trellis.
- **Actionable browser GTM** — Rox-shaped Platform is a product bet, not a
  kernel feature.
- **Honest integrator story** — sidecar + export instead of fake adapters.

### Negative

- **Platform requires ops investment** — hosting, auth, billing, SLAs.
- **Two-store products** need documentation discipline (sidecar pattern).
- **Horizontal Platform** is broad — MVP wedge must be chosen separately
  (dev/agent coordination vs knowledge workflows vs vertical templates).

### Neutral

- ADR 0039 unchanged for `KernelBackend`; this ADR extends product strategy only.
- Studio Cloud remains valid; Platform is a sibling, not a Studio replacement.
- WASM browser-local kernel remains a future technical option, not Platform GTM.

## Alternatives considered

| Alternative | Why rejected |
| ----------- | ------------ |
| Compete on BaaS (TurtleDB consumer SKU) | Wrong lane; dilutes thesis; loses to incumbents on onboarding |
| Vendor `TrellisDbClient` in `@turtle.tech/starter` | Hidden dual-write; markets as Trellis, behaves as vendor lock-in |
| Close source for monetization | Violates community, namespace plan, and sovereignty story |
| Rox-vertical only (revenue agents) | Valid product; user chose **horizontal** platform instead |
| Docs-only (no Platform SKU) | Leaves browser+money gap unowned |

## Implementation

No engine code required for acceptance. Follow-up work (separate issues):

| Priority | Work |
| -------- | ---- |
| P0 | Cross-ref ADR 0039 ↔ this ADR; vision + shipping-today updates |
| P0 | Guide: [Trellis and BaaS](https://trellis.computer/guides/trellis-and-baas) |
| P0 | Product brief: [Platform sibling SKU](../product/platform-brief.md) |
| P2 | Platform MVP wedge selection + hosted API spike on `TenantPool` |
| P2 | Soften "Jazz-competitive" schema docs → "same DX shape on Trellis graph" |
| P3 | Local embedded-kernel live reads (OSS gap; not Platform blocker) |
| P3 | ADR 0028 bootstrap — operator/self-host only, not BaaS parity |

## Supersedes

Nothing. Extends [0039](./0039-no-vendor-kernel-backends-compatibility-bridge.md)
with lane boundary, OSS commitment, Platform sibling SKU, and refer-out policy.
