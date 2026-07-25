# Primitive — richtext (mentions + slash)

**Status:** scope / proposal (pre-spec)  
**Date:** 2026-07-24  
**Pair:** [`primitive-stacked-dialog.md`](./primitive-stacked-dialog.md)  
**North star:** [`tml-shell-dsl.md`](./tml-shell-dsl.md) §0  
**UX north star:** Notion  
**Public references:**
- [Plate](https://github.com/udecode/plate) — Notion-like kits, slash, shadcn registry (React)
- [Slate richtext example](https://www.slatejs.org/examples/richtext) — headless engine Plate sits on; good for low-level tinkering
**Test bed:** **trellis-node admin** — same as stacked dialog; first editor spike mounts here  
**Existing adapters elsewhere:** TipTap in trellis-client / turtlecode (leave alone in v0)

## Problem

Mentions and references should work on (almost) all human text. Without a shared richtext primitive + mark IR, each surface invents chips, plain `@id` strings, or dead links — and slash commands never meet the op registry.

## Goal

One **richtext primitive** contract:

1. **Durable doc** — structured body with entity-ref marks (and a small block set)  
2. **Mentions** — in-flow mention-density shells; **activate → stacked dialog** (#1)  
3. **Slash** — Notion-like command menu → insert blocks and/or allowlisted ops  
4. **Adapters** — Slate/Plate / TipTap / TUI map to the same IR; kernel does not depend on them  

**Default:** any text field that should support meaning-via-links uses this primitive. Plain text remains for ids, enums, status.

## Decisions (locked)

| # | Decision |
| - | -------- |
| D1 | **Admin is the test bed** for the first editor + TrellisDoc round-trip |
| D2 | Activate mention → admin `InspectHost.push` only |
| D3 | **Own** the Notion-class editor as Trellis primitive (Plate/Slate = reference + optional starting code; not “don’t reinvent”) |

## Slate / Plate — reference, not the product

**Yes: reinventing (owning) the Notion-class editor *is* the point** for Trellis — a richtext primitive that speaks TrellisDoc, mention→InspectHost, slash→op registry, and pack/theme. That is product surface, not a vendor wrapper.

| Role | What it means |
| ---- | ------------- |
| **[Slate examples](https://www.slatejs.org/examples/richtext)** | Engine literacy + spike substrate (nodes, marks, mentions, JSON). Fine to fork and reshape. |
| **[Plate](https://github.com/udecode/plate)** | Best public **reference** for Notion-like UX, slash, block kits, shadcn-style copy-in — study and steal patterns; same posture as Trellis packs |
| **Trellis `primitive richtext`** | **Owned** admin/Studio implementation — durable IR + host bindings are ours |

What to avoid is only **accidental** reinvention: shipping Slate demo chrome as “done” without Trellis contracts (IR, activate→stack, slash→ops). Intentional ownership with those contracts = correct.

**Lean v0 path:** TrellisDoc + small owned editor island in admin (Slate- or Plate-derived code you keep) → mention activate → stack → grow slash/blocks toward Notion parity under Trellis naming/theme.

## Scope (v0)

### Mark / doc IR (own this early)

```ts
type TrellisDoc = {
  version: 1
  blocks: TrellisBlock[]
}

type TrellisBlock =
  | { type: 'paragraph'; children: Inline[] }
  | { type: 'heading'; level: 1 | 2 | 3; children: Inline[] }

type Inline =
  | { type: 'text'; text: string; marks?: TextMark[] }
  | { type: 'mention'; entityId: string; kind?: string }
```

- Mentions = **refs**; labels live-bound from graph  
- Insert mention → ensure graph link  
- Persist as JSON fact (lean) or blob later — decide at impl, prefer JSON fact for admin spike  

### Mentions UX

1. `@` → suggester  
2. Insert mark + link  
3. Render mention-density shell  
4. Activate → `InspectHost.push(entityId)`  

### Slash UX (Notion-like)

1. `/` → command menu (blocks + ops)  
2. Blocks grow over time; v0 can be paragraph/heading only  
3. Ops from shared UI allowlist / capability registry  

### Adapter policy

| Host | Adapter |
| ---- | ------- |
| **Admin (test bed)** | Slate spike OK; Plate when slash/Notion chrome needed |
| React + shadcn (Studio) | Plate preferred |
| Vue (trellis-client, Raster) | TipTap stays; map to TrellisDoc |
| TUI / AI / export | IR only |

### Bind to #1

No ad-hoc popovers — inspect host only.

## Non-goals (v0)

- Full Notion parity  
- Plate AI kits  
- Collaboration/CRDT  
- Rewriting Vue TipTap apps  
- Kernel depending on `slate` / `platejs`  
- Browse (#3) scope  

## Acceptance (scope lock)

- [x] Doc IR v0 sketched  
- [x] First impl target: **admin**  
- [x] Mention activate → #1  
- [x] Own editor surface (Plate/Slate as reference; Trellis contracts are the product)  
- [ ] Round-trip: edit → persist → reload → mention opens stack  
- [ ] Slash v0 (even if blocks-only)  
- [ ] Default-field rule (plain vs richtext) written into admin field list  

## Open questions

1. IR storage: JSON fact vs blob? (Lean: JSON fact on admin spike.)  
2. Slash mutating ops in v0 or insert-only?  
3. Issue title: plain or richtext?  

## Sequencing

1. Admin InspectHost (#1) stub  
2. TrellisDoc + Slate/Plate island: paragraph + mention  
3. Persist + mention → push  
4. Slash + block growth toward Notion  
