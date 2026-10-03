# ADR 0049: git-bug compatibility adapter — Trellis-canonical import bridge

**Status:** Proposed
**Date:** 2026-09-28
**Related:** [0038](./0038-git-authoritative-file-tier.md) (git bridge — file tier),
[0039](./0039-no-vendor-kernel-backends-compatibility-bridge.md) (compatibility bridge, not vendor backend),
[0025](./0025-dsl-first-then-sync.md) (DSL-first, transport-second),
[0021](./0021-canonical-op-hashing-and-provenance.md) (op hashing + provenance),
[0026](./0026-intent-vocabulary-issue-types-and-cycles.md) (issue types, criteria),
[git-bug data model](https://github.com/git-bug/git-bug/blob/trunk/doc/design/data-model.md)
**Depends on:** SPEC-v1.1 signed op envelope; transport-adapter interface (Iroh spike follow-on)

**Impacted components (planned):** `src/git/` (new `git-bug-importer.ts`),
`src/vcs/issue.ts`, `src/vcs/types.ts`, `src/cli/index.ts` (`trellis import git-bug`),
`.trellis/config.json` integration surface

## Context

[git-bug](https://github.com/git-bug/git-bug) is a distributed, offline-first
issue tracker stored entirely in git objects — bugs live under `refs/bugs/*` as
commit chains of JSON operation packs, not as files in the working tree. It is a
mature reference for "issue data over git transport" with bridges to GitHub,
GitLab, Jira, and Launchpad.

TrellisVCS already owns issue semantics: `vcs:issueCreate`, lifecycle ops,
acceptance criteria, lanes, protocol handoff messages, and rich graph links
(ADR 0026). Trellis's thesis (ADR 0039) is that **the causal op-log on your
device is the system of record** — servers and external formats may relay or
mirror, but must not own semantics.

Three integration approaches were evaluated:

| Approach | What it means | Verdict |
| -------- | ------------- | ------- |
| **A. Embed** | Ship the git-bug Go binary/library, or port its code, as TrellisVCS's issue backend | ❌ Breaks core rules |
| **B. Adapter** | Read/write git-bug's `refs/bugs/*` format from TS; map ops to/from Trellis entities | ✅ Recommended |
| **C. Sidecar** | Run git-bug as a separate process; sync through its GraphQL API | ⚠️ Prototype only |

### Why embedding (A) is rejected

1. **Two sources of truth.** git-bug has its own op DAG, Lamport clocks, identity
   entities, and merge rules. Every issue would exist in two op-logs with
   different ordering and conflict semantics — violating "Trellis owns semantics."
2. **Identity and signing split.** git-bug's identity model (optional PGP keys)
   conflicts with the signed `KernelOp` envelope work (SPEC-v1.1 / ADR 0021).
   Either map between two identity systems or give up guarantees.
3. **Fixed schema meets EAV.** git-bug entities have fixed fields (title,
   comments, labels, status). Trellis-native concepts — criteria, lanes, blocks,
   epic links, custom attributes — have nowhere to live on the git-bug side and
   would be lost on sync or kept in a side table outside the op log.
4. **Tied to git and Go.** git-bug requires a real git repo and a native binary.
   That rules out browser/WebContainer paths and adds per-platform builds to
   `npx trellis studio`. It also ties semantics to git when the transport rule
   is "Iroh moves bytes."
5. **Upstream format churn.** git-bug's on-disk format has changed across
   versions; embedding absorbs their migration burden.
6. **Licensing.** git-bug is GPLv3. The open kernel is AGPL-3.0-or-later (compatible
   for combination), but embedded GPL code you don't own closes dual-license or
   commercial exception paths for `@turtle.tech/*` packages if they pull it in.
7. **Duplicate product surface.** TrellisVCS already tracks issues; embedding runs
   two trackers in one tool.

### Why adapter (B) fits

- **Interop.** Teams already using git-bug can point Trellis at their repo and
  see issues as graph entities. git-bug's GitHub/GitLab/Jira bridges come along
  for free on their side.
- **Clean boundary.** Import/export sync adapter — same slot as the git file
  bridge (ADR 0038), not a second kernel. Trellis stays canonical; git-bug is
  transport + format.
- **No code taken.** Implement the ref/op format in clean-room TS (e.g.
  isomorphic-git for object access). Reading a data format is not a derivative
  work; do not port Go code.
- **Proof of thesis.** "Trellis syncs semantics over any transport, even git
  refs" is a strong pitch line and a cheap demo before the Iroh adapter.

Sidecar (C) is acceptable for a spike ("does GraphQL match our mapping?") but
not for shipping — it adds process management without simplifying ordering,
identity, or dedup.

## git-bug format (what the adapter reads)

Per [git-bug's data model](https://github.com/git-bug/git-bug/blob/trunk/doc/design/data-model.md):

```text
refs/bugs/<entity-id>
  └── commit chain (may merge into DAG)
        └── tree
              ├── ops          → blob: JSON OperationPack { author, ops[] }
              ├── edit-clock-N → Lamport logical time
              ├── create-clock-N (first commit only)
              └── media/*      → attached blobs (optional)
```

Entities are **compiled** by applying ordered operations to an empty snapshot —
operation-based CRDT pattern, not stored state.

**Bug operation types** (from `entities/bug/operation.go`):

| Type ID | Name | Payload |
| ------: | ---- | ------- |
| 1 | `CreateOp` | `title`, `message`, `files[]` |
| 2 | `SetTitleOp` | `title` |
| 3 | `AddCommentOp` | `message`, `files[]` |
| 4 | `SetStatusOp` | `status` (1=open, 2=closed) |
| 5 | `LabelChangeOp` | `added[]`, `removed[]` |
| 6 | `EditCommentOp` | targets prior comment by combined id |
| 7 | `NoOpOp` | — |
| 8 | `SetMetadataOp` | key/value on op |

Each op includes `OpBase`: author identity ref, unix timestamp, nonce.
Op id = `hash(json(op))`. Entity id = hash of first `CreateOp`.

**Ordering algorithm** (must replicate for deterministic import):

1. Load all commits and associated `OperationPack`s from the bug DAG.
2. Validate Lamport clocks respect DAG structure (parent clock < child).
3. Sort individual ops: Lamport clock first; on ties, lexicographic pack id.

Unix timestamps are for display only — not used for merge order.

## Decision

**Approach B — compatibility adapter.** Trellis graph is canonical. git-bug is
an import/export transport and on-disk format, not a second issue kernel.

### Authority model

```text
┌─────────────────────────────────────────────────────────┐
│  Trellis kernel (canonical)                             │
│  vcs:issue* · criteria · lanes · graph entities         │
└────────────────────────▲────────────────────────────────┘
                         │ import adapter (TS)
                         │  - read refs/bugs/* via isomorphic-git
                         │  - parse OperationPack JSON
                         │  - map ops → vcs:* + provenance
┌────────────────────────┴────────────────────────────────┐
│  git repo (.git)                                        │
│  refs/bugs/* · refs/identities/*                        │
└─────────────────────────────────────────────────────────┘
```

Same architectural slot as ADR 0038's git file bridge — different ref namespace,
same "git is a tier, not the semantic model" rule.

### Target Trellis shape

Imported bugs become TrellisVCS issues with provenance facts:

```yaml
id: issue:gitbug:<git-bug-entity-id>
title: ...
description: ...              # from CreateOp.message
status: open | closed | ...
labels: [...]
source: git-bug
gitBugId: "<full hash>"
gitBugShortId: "<7-char display>"
```

**Sync bookkeeping** (reuse integration pattern from trellis-client):

```yaml
type: integration_connection
integrationId: git-bug
repoPath: /path/to/.git
lastImportedRef: refs/bugs/...
# imported op hashes tracked for dedup (cursor entity or sync metadata)
```

## Op mapping

### Phase 1 — read-only import (first ship)

| git-bug op | Trellis op(s) | Field mapping | Notes |
| ---------- | ------------- | ------------- | ----- |
| `CreateOp` | `vcs:issueCreate` | `title` → title; `message` → description | Sets `gitBugId`. Entity id from CreateOp hash. |
| `SetTitleOp` | `vcs:issueUpdate` | `title` → title | Only if compiled title differs. |
| `SetStatusOp` open | `vcs:issueReopen` | — | git-bug only has open/closed. |
| `SetStatusOp` closed | `vcs:issueClose` | — | No Trellis `paused` equivalent. |
| `LabelChangeOp` | `vcs:issueUpdate` | `added`/`removed` → label set diff | Apply cumulatively. |
| `AddCommentOp` | `graph:createNode` + link | `Comment` entity linked to issue | No native `vcs:issueComment` today. Do not use `vcs:chatMessage` (local-only per sync policy). |
| `EditCommentOp` | `graph:updateNode` | patch comment body | Match by `gitBugCommentId` (combined id). |
| `SetMetadataOp` | skip or extension facts | `gitBugMeta:<key>` | Don't collide with Trellis-native fields. |
| `NoOpOp` | — | — | Ignored. |

**Provenance on every emitted Trellis op:**

```json
{
  "importSource": "git-bug",
  "gitBugOpId": "<hash>",
  "gitBugPackId": "<commit-tree-hash>",
  "gitBugLamport": 154,
  "gitBugAuthorId": "<identity-hash>"
}
```

**Dedup rule:** never re-import an op whose `gitBugOpId` is already recorded in
the sync cursor.

### Phase 2 — optional export (on demand only)

| Trellis op | git-bug op | Constraint |
| ---------- | ---------- | ---------- |
| `vcs:issueCreate` | `CreateOp` | Only issues with `origin: trellis` or explicit export flag |
| `vcs:issueUpdate` (title) | `SetTitleOp` | |
| `vcs:issueClose` | `SetStatusOp` closed | |
| `vcs:issueReopen` | `SetStatusOp` open | |
| `vcs:issueUpdate` (labels) | `LabelChangeOp` | Diff against last exported snapshot |
| Comment create | `AddCommentOp` | Requires identity mapping |

Export ops must carry `trellisOpHash` in git-bug metadata to prevent re-import
loops. Two-way sync is not a default — build only if someone asks.

### Explicit non-mapping (Trellis-native, no git-bug home)

| Trellis concept | Adapter behavior |
| --------------- | ---------------- |
| `vcs:criterionAdd` / test runs | Stays Trellis-only |
| `vcs:issueClaim` / lanes | Stays Trellis-only |
| `vcs:issueBlock` | Stays Trellis-only |
| `issueType: epic/spike/msg` | Default `issue`; store original in metadata if needed |
| Protocol handoff messages (ADR 0015) | Trellis-only |
| Parent/child epic links | Trellis-only unless manually backfilled |

## Identity mapping

git-bug identities are separate entities (`refs/identities/<id>`) with optional
PGP keys.

| git-bug | Trellis |
| ------- | ------- |
| `identity.id` (64-char hash) | `entity:gitbug-identity-<hash>` bridge node |
| `identity.name` + `identity.email` | Link to `Member` / `Person` if email matches; else display-only |
| Signed ops | Verify optionally; do **not** adopt git-bug signing as Trellis auth |

Map once; persist as graph entities. Never re-derive from display name alone.

## Ordering and determinism

1. Load full bug DAG from `refs/bugs/<id>`.
2. Compute git-bug's canonical op order (Lamport + pack id tiebreak).
3. Emit Trellis ops **in that order** within a single import batch.
4. Set Trellis display timestamps from git-bug unix time; causal order comes
   from append sequence.

Two importers of the same ref must produce identical Trellis fact sets
(content-addressed ops help). Idempotent re-import: same ref, zero new ops.

## Risks and mitigations

| Risk | Mitigation |
| ---- | ---------- |
| Re-import loops (two-way) | Phase 1 one-way only; tag ops by hash |
| Comment model mismatch | Linked `Comment` graph entities, not harness chat |
| Label semantics differ | Flat string labels; Trellis conventions are additive |
| Concurrent edits on both sides | Phase 1: Trellis wins after import; git-bug is read-only mirror |
| Upstream format migration | Pin supported git-bug spec version; adapter version field |
| GPL concerns | Clean-room TS reader; no Go code import |

## Sequencing

1. **After SPEC-v1.1** — signed op envelope stable.
2. **Read-only importer** — `trellis import git-bug --repo .`
3. **Transport adapter interface test** — git refs before Iroh (inspectable, debuggable).
4. **Identity + comment entities** — minimal graph types if not already present.
5. **Export** — only on demand.
6. **Interop win** — imported Trellis issues visible to git-bug users via their
   existing GitHub/Jira bridges (piggyback, not Trellis-owned).

## Acceptance criteria (Phase 1)

- [ ] Import all bugs from a repo with existing git-bug data.
- [ ] Deterministic: same ref → same Trellis op sequence; re-run is idempotent.
- [ ] `trellis issue list` shows imported issues with correct title/status/labels.
- [ ] Comments preserved as linked entities.
- [ ] Trellis-native fields (criteria, lanes, blocks) untouched on import.
- [ ] No git-bug binary required.
- [ ] Provenance queryable: "which git-bug op produced this fact?"

## Alternatives considered

| Alternative | Why rejected |
| ----------- | ------------ |
| Embed git-bug Go binary | Dual op-log, dual identity, GPL bundling, browser-incompatible |
| GraphQL sidecar as shipping path | Extra process; doesn't simplify hard parts |
| Map git-bug bugs to git files in working tree | git-bug doesn't use the working tree; wrong abstraction |
| Skip git-bug; build GitHub bridge only | Loses offline/git-native interop story and transport-adapter proof |

## Consequences

**Positive:**

- Teams with existing git-bug data get Trellis semantics without migration pain.
- First concrete transport adapter before Iroh — debuggable via `git cat-file`.
- Reinforces ADR 0039 compatibility-bridge pattern with a non-vendor example.

**Negative:**

- Comment and identity mapping add graph entity types the importer must maintain.
- Two-way sync, if ever built, is inherently conflict-prone; default stays one-way.
- Adapter must track git-bug format version independently of upstream releases.

**Neutral:**

- Does not replace TrellisVCS; complements it for repos that already chose git-bug.
- Does not require git-bug installed; only reads `.git` object database.

## Addendum — 2026-10-02: `Integration` is the bookkeeping slot; forge-direct is a sibling path

**Reconciles with turtleOS [ADR-0036](../../../os-sandbox/docs/adr/0036-repo-and-thin-project.md) §3.**

1. **Bookkeeping.** The "sync bookkeeping" sketch above (`type: integration_connection, integrationId: git-bug, repoPath, lastImportedRef`) is superseded by the core **`Integration`** platform type (FIN-0051 shape), shipped in TRL-197 (`core-ontology.ts`, commit `efcd7c0`). A git-bug connection is an `Integration` row: `provider: git-bug`, `externalId: <repo identity>`, `credentialRef` (if a secret is ever needed — a local `.git` needs none), `status`, `lastSyncedAt`. Imported issues link `syncedVia → Integration`. The dedup cursor (imported `gitBugOpId`s) stays adapter-local metadata, not a new type.
2. **Sibling path.** ADR-0036 §3 describes a **forge-direct** bridge (GitHub REST → `Issue` + `Integration`). That is a *different source* with the same target: both map into `vcs:issue*` and use `Integration`. Ordering decided: **this adapter (local git-bug refs) ships first** — no auth, no network, debuggable via `git cat-file` — then forge-direct as a later bridge. The adapter's "Interop win" note already anticipates piggybacking on git-bug's own GitHub/Jira bridges.
3. **No competing model.** There must not be a `integration_connection` type *and* `Integration`; the former is retired in favour of the latter.

**Implementation note (current repo):** `src/git/git-reader.ts` shells out to `git` (no libgit2). Prefer `git cat-file`/`git for-each-ref` for `refs/bugs/*` over adding `isomorphic-git`; either is acceptable if object access stays read-only.
