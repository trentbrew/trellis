# ADR 0032: Identity-addressed repos — `trellis project` (create/clone/list/publish)

**Status:** Proposed
**Date:** 2026-07-31
**Context:** Trellis 3.4.1+
**Builds on:** ADR 0031 (`trellis clone` + project registry), ADR 0020 (Ed25519
identity + QR device pairing), ADR 0028 (empty remote bootstrap), `src/identity/*`
**Amends:** ADR 0031 §1 — clone target surface and CLI grouping
**Planning seed:** `docs/planning/vcs-oplog-sprite-backup.md`

## Problem Statement

ADR 0031 delivered `trellis clone <url>` and `trellis project list <url>`,
making the **sprite URL a user-facing address**. That feels incomplete next to
the identity layer, and it is architecturally wrong for Trellis:

1. **A URL is a transport handle, not an identity.** `https://sprite.host:8443/
   v0/ledger` says *where* state lives, not *who* owns it or *what* it is. It
   bakes host, port, and path into the graph's addressing scheme and couples it
   to one transport.
2. **`{peer}/{repo}` is the natural Trellis handle.** Every actor already is an
   Identity entity (`identity:${did}`, Ed25519 key pair — ADR 0020,
   `src/identity/identity.ts`). A clone should name a person and a repo, exactly
   as GitHub names `owner/repo`; the network layer is Trellis' job to resolve,
   not the user's.
3. **URLs leak network topology and invite a class of bugs** (SSRF/open-redirect
   in CLI parsing, mixed-content, keyed-vs-public confusion). If the user never
   composes a URL, the resolver owns transport strings and the surface shrinks.
4. **General principle:** Trellis avoids URLs as user-facing addresses. URLs
   belong in resolver *config* (an implementation detail), never in the command
   surface.
5. **Clone is one lifecycle verb, not the whole story.** A project has a
   lifecycle: **create** (init with identity + publish scaffolding), **clone**
   (bootstrap from a peer), **list** (discover), **publish** (make discoverable).
   They belong together under `trellis project`, and they assume a person-scoped
   identity that survives across machines.

## Decision

### 1. The `trellis project` command group

```bash
trellis project create                     # init + identity + publish scaffolding
trellis project clone {peer}/{repo} [dir]  # bootstrap a published project
trellis project list [{peer}]              # discovery, identity-scoped
trellis project publish                    # L1+: register + make discoverable
```

- `{peer}` is an **Ed25519 identity** — a DID (`did:key:…`), its `entityId`,
  or a name bound to one in the local resolver. The repo is a **slug scoped
  under that identity**. `{peer}/{repo}` is a stable human handle for a repo
  whose true identity is its **causal chain** (`repoId`).
- `trellis clone <url>` (ADR 0031) remains as an explicit **transport override**
  alias — never the documented path.
- `trellis init` stays the raw kernel primitive (a `.trellis/` with no project
  identity). `project create` is the identity-bound, publish-ready surface.

### 2. `trellis project create` — a project, not a code template

`project create` initializes a repo **and** a project:

- Binds the person's identity (creates or reuses `~/.trellis/identity.json`),
  records `owner`, and slugs the project.
- Writes the **genesis attestation** — the genesis op is signed by the owner:
  "I, `identity:…`, created ledger `repoId` named `{repo}`".
- **Onboarding REPL:** interactive prompts for project name and **kind**
  (code, knowledge base, notes, data, media, other). The kind is a graph fact,
  not a scaffold — **no code templates** (no `src/`, no test dirs). Scaffolding
  is identity + publish metadata only, so a Trellis project can be any kind of
  work. Non-goal: code-project generators.

### 3. Person identity is user-scoped and portable across VMs

Today identity lives per-repo (`.trellis/identity.json`); every machine is a
different person. Fix: **person identity lives at `~/.trellis/identity.json`**
and is shared by all repos on that machine.

- **New VM, same person** via two supported paths:
  1. **Export/import** the person key (`trellis identity export/import`),
     like SSH keys.
  2. **QR device pairing** — reuse ADR 0020's existing `pairStart/pairJoin/
     pairApprove` to enroll a new VM against the person's root identity.
- The genesis attestation and every op sign with the **person key**, so push-back
  from any VM verifies against the same identity. VMs know they are the same
  person because they hold the same root key (or a device key attested by it).

### 4. URLs become a resolver detail

- **Peer resolver** (`~/.trellis/peers.json` v0) maps `{peer}` → `{ did,
  spriteUrls[] }`. Clone resolves `{peer}` → sprite endpoint, then runs the
  ADR 0031 flow unchanged (tail → checkpoint → fresh `.trellis/` → adopt
  repoId → materialize).
- `remote add` targets `{peer}/{repo}`; the sprite URL is read from the
  resolver and stored in `.trellis/remote.json` as a *bound transport* — never
  re-composed by the user.

### 5. Discovery is identity-aware

`GET /v0/ledger/repos` entries gain `owner` (person `entityId`) and `name`:

```jsonc
[{ "owner": "identity:did:key:z6Mk…", "name": "trellis-node",
   "repoId": "…", "tailHash": "…", "byteLength": 0, "lineCount": 0,
   "updatedAt": "…" }]
```

The ledger records its owner+name at `project create` time. `trellis project
list {peer}` filters by owner; `clone {peer}/{repo}` selects by the pair. The
L2 "public ledger index" becomes an **identity-indexed** index.

### 6. Attestation, not trust-in-URL

Because the target is an identity, clone can verify instead of assuming:

- The **genesis op carries the owner's signature** (self-attestation). A sprite
  serving a ledger must present it; the cloner **verifies the signature against
  the person's public key** before accepting the checkpoint (mirrors ADR 0028's
  "verify remote identity before sending full state" — here, before *accepting*
  state).
- Person resolution itself (learning a person's sprite) is **L1+** (graph-indexed
  identities, Iroh rendezvous). v0 resolves persons already known locally via
  `peers.json`.

### 7. No private projects — only unpublished vs published

There is no "private" bit. A project is either:

- **local** (default) — never pushed to a sprite, not discoverable anywhere, or
- **published** — pushed to a sprite and listed in its `/v0/ledger/repos` index.

"Private" is just *unpublished*. Access control is **not a project property** —
it is a **ledger policy** on the sprite (keyed read/push, ADR 0028), orthogonal
to publishing. `trellis project publish` (L1+) is the wrapper that turns a local
project into a published one (remote add + push + index registration).

### 8. What does NOT change

- Sprite transport (`/v0/ledger/tail`, `/checkpoints`, keyed push), the repoId
  persistence contract (ADR 0031 §2), blob story (ADR 0031 §4), and
  `src/registry/*` = packages (ADR 0031 §5) all stand. ADR 0032 replaces only
  the **user-facing address space and CLI grouping** of ADR 0031 §1.

## Consequences

### Positive

- **Projects name people, not hosts** — `trellis project clone
  trent/trellis-node`, matching the identity-first mental model of the graph.
- **Lifecycle in one place** — create/clone/list/publish under `trellis
  project`; a project is a first-class object, not an afterthought of init.
- **Portable identity** — one person key across VMs via export/import or the
  existing QR pairing; same signature, same person, any machine.
- **Transport freedom** — the resolver can later point a peer at a sprite, an
  Iroh peer, or a relay with no CLI change.
- **Verifiable provenance** — a clone proves the chain belongs to the named
  identity instead of trusting a URL.
- **No URL parsing in the command surface** — smaller attack surface.

### Negative

- **v0 needs `peers.json`** — a peer's projects are only cloneable if their
  sprite is already in the resolver (L1 discovery fills this later).
- **Two namespaces to reconcile** (`{peer}/{repo}` handle vs content-addressed
  `repoId`) — the binding lives in `remote.default` + the genesis attestation
  and must stay consistent.
- **Person-key migration cost** — repos with an old per-repo identity need to
  re-attest or adopt the person key.
- **`project create` REPL is a new interactive surface** to build and test.

### Security Considerations

- Clone verifies the genesis attestation against the person's public key;
  mismatched or unsigned genesis → refuse.
- `peers.json` and `identity.json` are local config (mode 0600), never synced.
- Person key is the root of authority: export/import and QR pairing must
  require explicit user action; lost key = lost identity (documented, mirrors
  ADR 0020).
- No user-facing URL ⇒ no SSRF/open-redirect class of input in the CLI.

## Implementation sketch

1. Person identity: move identity storage to `~/.trellis/identity.json`;
   `trellis identity export/import`; wire QR pairing (ADR 0020) for VM
   enrollment.
2. Resolver: `src/vcs/peer-resolver.ts` — `resolvePeer(peer)` → `{ did,
   spriteUrls[] }` from `~/.trellis/peers.json`; `peer` may be a name, DID,
   or `entityId`.
3. CLI: `trellis project create|clone|list` (restructure `src/cli/clone-cli.ts`);
   `clone {peer}/{repo} [dir]` resolves the peer then delegates to the ADR 0031
   clone flow; persist `remote.default = { peer, repo, repoId, spriteUrl }`.
   Keep `trellis clone <url>` as transport-override alias.
4. Server: `src/server/ledger-store.ts` stores `owner` + `name` per ledger;
   `GET /v0/ledger/repos` includes them; `project create` records owner (person
   identity) + name.
5. Attestation: genesis op gains an owner-signature block; `cloneRemoteLedger`
   verifies before accepting the checkpoint.
6. Tests: `test/vcs/peer-resolver.test.ts` (resolve by name/DID/entityId,
   unknown peer); clone by `{peer}/{repo}` round-trip; mismatched attestation
   refused; URL override still works; `project create` REPL smoke test.

## Acceptance sketch

- [ ] `trellis project create` initials a repo + project identity, records
      owner/name/kind, writes a signed genesis
- [ ] `trellis project clone alice/trellis-node` resolves alice via `peers.json`
      and clones from the attested sprite
- [ ] Cloned project records `remote.default = { peer, repo }`; push-back hits
      the same ledger (same repoId) from a *different machine* using the same
      person key
- [ ] `trellis project list alice` lists alice's projects from `/v0/ledger/repos`
      (owner-scoped)
- [ ] Clone verifies the genesis attestation; mismatch or unsigned → refused
- [ ] A local (unpublished) project is invisible to discovery; publishing makes
      it discoverable — no "private" state anywhere
- [ ] `trellis clone <url>` still works as the explicit transport override

## Open questions

- `peers.json` location: `~/.trellis/peers.json` (global) vs per-repo
  `.trellis/peers.json` — or both (global default, repo override)?
- Should `{peer}` accept a bare `did:key:…` as the unambiguous form (yes for
  v0?) with names as convenience aliases?
- Attestation placement: owner signature in the genesis op vs a signed
  `META.json` sidecar the sprite forwards? (Prefer genesis op: part of the
  causal chain, survives any transport.)
- Is `{peer}/{repo}` a repo *canonical name* stored as graph facts, or only
  ledger config metadata for v0? (Graph facts unlock L3 forks and the social
  layer later.)
- Does `project publish` require a `--peer`/remote at create time, or is it a
  later, explicit step (default: later — local-first means nothing leaves the
  machine unless asked)?
