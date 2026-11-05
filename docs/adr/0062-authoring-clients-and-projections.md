# ADR 0062: Authoring clients and generated projections; the lexicon is the contract

**Status:** Proposed
**Date:** 2026-10-27
**Issues:** TBD
**Depends on:** [0061](./0061-lexicons.md) (lexicons; a lexicon exports as a graph-ontology extension, §5)
**Related:** [0048](./0048-types-relations-objects.md), [0045](./0045-user-defined-collections.md), [`graph-ontology/registry.json`](../../../graph-ontology/registry.json); Shablon ADRs [0001](../../../../lab/oss/shablon/docs/adr/0001-shablon-ui-kit-ui-thing-parity.md), [0003](../../../../lab/oss/shablon/docs/adr/0003-trellis-cms-pb-adapter.md), [0004](../../../../lab/oss/shablon/docs/adr/0004-system-collections-and-ontology-mapping.md), [0007](../../../../lab/oss/shablon/docs/adr/0007-graph-ontology-core-interchange.md), [0008](../../../../lab/oss/shablon/docs/adr/0008-shablon-generated-project-cms.md); turtlenote ADRs [0001](../../../../lab/apps/note/turtlenote/docs/adr/0001-workspace-ontology-navigation.md), [0004](../../../../lab/apps/note/turtlenote/docs/adr/0004-dual-plane-shell-sdk-distribution.md), [0005](../../../../lab/apps/note/turtlenote/docs/adr/0005-universal-entity-dialog.md)
**Supersedes:** nothing
**Superseded by:** : 

## Context

Two kinds of UI sit on a Trellis graph:

- **Authoring clients** edit schema and data live through the kernel: turtlenote (Svelte; its
  `app-sdk` / `app-svelte` / `apps` packages are the declared shell SDK, turtlenote ADR 0004),
  Trellis Studio (Solid), Nodebook (Vue).
- **Projections** render a compiled ontology for a project's own users. Shablon ADR 0008 makes
  Shablon this: a graph document compiles to metas, `publish:cms` turns them into PocketBase
  collections plus `schema.json`, and a pinned ~8KB renderer shows read and light-edit views.
  Heavy admin stays in the PocketBase admin.

The two have grown into each other:

| Concept | Authoring side | Shablon |
| ------- | -------------- | ------- |
| Schema editor | turtlenote type dialog, a PocketBase-style field list (campus TRL-488) | PocketBase `fieldSettings` over Trellis CMS, with schema writes for CMS user types (Shablon 0003, 0004 §4) |
| Grouping types in navigation | turtlenote ADR 0001 ontology sections | Shablon ADR 0006 |
| Entity dialog | turtlenote ADR 0005 and its dialog stack; Studio `entity-dialog-stack.tsx`; Nodebook `EntityDialog.vue` | `playground/universal-dialog` (Shablon 0001) |
| Component kit | shadcn-svelte | Shablon 0001's UI Thing catalog (Proposed) |

Each copy drifts on its own. Shablon's read path already goes through a public package
(`trellis/cms`, Shablon 0003), and Shablon 0007 already treats the graph-ontology document as
interchange rather than runtime truth, so the boundary below mostly writes down where things
were heading.

## Decision

### 1. Two roles

- An **authoring client** edits a graph live through the kernel: lexicons, types, relations and
  records. **Schema is authored only in authoring clients.**
- A **projection** renders a compiled lexicon for a project's users: reading, and light record
  edits. It never authors schema. Heavy admin stays in the target's own console (Shablon 0008 §1).

### 2. The lexicon is the contract

A projection consumes a lexicon exported as a graph-ontology extension document (ADR 0061 §5;
exporter TRL-498), compiled into its own runtime's metas. It does not depend on kernel internals.
Shablon's current read path through `trellis/cms` is a public API and can stay while the exporter
lands; new projection features target the document.

### 3. The PocketBase slice's schema writes are a validation surface

The write path in Shablon 0003 and 0004 (record writes, schema `PATCH` for CMS user types) proved
the adapter. It is not a product surface for editing a graph's schema; that happens in authoring
clients.

### 4. Share shapes, not components

Concepts both sides render (the entity dialog shape of turtlenote ADR 0005, navigation sections,
field kinds and catalogs) are defined once, either as framework-free modules (today turtlenote's
`app-sdk`, per turtlenote ADR 0004 §2) or in the graph-ontology document. Each runtime renders them
its own way. Components are not shared across frameworks.

### 5. Shablon's component kit serves the renderer

Shablon 0001's UI Thing catalog shrinks to what the generated CMS renderer needs. A full catalog
would duplicate the authoring side's kit and grow the fork of an upstream its author marks
experimental.

## Alternatives considered

| Option | Pros | Cons | Why not |
| ------ | ---- | ---- | ------- |
| A; two roles, lexicon contract (chosen) | One place to author; projections stay small and generated | The exporter (TRL-498) becomes load-bearing |: |
| B; Shablon as a second authoring client | Reuses PocketBase's mature admin UI | Two schema editors over one graph; PocketBase's model can't express lexicons or shared relations | Drift |
| C; one renderer for both | One codebase | Projections need a tiny, no-build, pinned runtime (Shablon 0008 §3); authoring needs a rich live client | Fits neither |
| D; leave as is | No work | The duplicates in the table keep drifting |: |

## Consequences

### Positive

- One place to author schema; projections stay small, generated and replaceable.
- The lexicon export (ADR 0061 §5, TRL-498) gets a concrete consumer, which makes a good forcing
  function.

### Negative / tradeoffs

- Shablon's PocketBase slice stops being a path to product schema editing.
- New projection features wait on the exporter, or use `trellis/cms` until it lands.
- The shared shape modules must stay framework-free.

### Not decided here

Which first-party authoring client is canonical (turtlenote, Studio, Nodebook). They share role 1,
so the same duplication exists among them (three entity dialogs in three frameworks). That needs its
own decision.

### Follow-ups

- [ ] Shablon ADR 0001: addendum narrowing the kit to the renderer
- [ ] Shablon ADRs 0003 and 0004: addendum pointing at §3
- [ ] TRL-498: export a lexicon as a document a projection can compile
- [ ] Decide the canonical authoring client (separate ADR)
- [x] Update `docs/adr/README.md` index

## Addenda

<!-- Append dated notes here. Do not rewrite accepted decision text above. -->
