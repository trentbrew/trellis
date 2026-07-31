# ADR 0031: `trellis clone` + project registry (the GitHub analog)

**Status:** Proposed
**Date:** 2026-07-31
**Context:** Trellis 3.4.1+
**Planning seed:** `docs/planning/vcs-oplog-sprite-backup.md`
**Builds on:** TRL-222 / TRL-235 (`trellis remote`), `src/registry/*` (package registry), ADR 0028 (empty remote bootstrap)

## Problem Statement

The remote-sprite **peer layer** (L0) is implemented and working: `trellis remote
add/status/push/pull/install`, `deployLedgerSprite`, repair hard-gate, auth in
`.trellis/remote.json`. What is missing is the **user-facing git analogue**:

1. **No `trellis clone`.** A fresh machine cannot bootstrap a working Trellis
   repo from a remote in one command. The documented clone shape
   (`trellis init --remote <url>` or "import op chain") does not exist in code
   (`init` has no `--remote`; grep confirms no clone command anywhere).
2. **repoId is checkout-derived, not ledger-derived.** `repoKeyFromRoot`
   (`src/vcs/oplog-remote.ts`) hashes the local **absolute path**. Two machines
   checking out the same repo get different repoIds → they cannot address the
   same remote ledger. Clone is impossible until repoId becomes a property of
   the ledger, not of the checkout.
3. **No discovery surface.** `GET /v0/ledger/tail` requires knowing `repoId`
   up front. There is no way to enumerate what ledgers a sprite holds — the
   L2 "public ledger index" is a documented roadmap row, not an endpoint.
4. **Blobs are out of protocol by design.** The sprite stores ops only
   (`vcs-oplog-remote-sprite-v0.md` non-goal: blob/file-content sync). A clone
   that restores the chain but no bytes is semantics-only. Git-backed blob
   tier (`docs/specs/git-backed-blob-tier-v0.md`) already gives us the byte
   path for git repos; clone must orchestrate it, not reinvent it.

## Decision

### 1. `trellis clone <url> [dir]` — one-command bootstrap

A clone connects to a sprite, discovers the repo, fetches the latest immutable
checkpoint, initializes a fresh `.trellis/` at `dir`, installs the ops, and
materializes bytes. It is the composition of existing pieces plus two new
server endpoints.

```bash
trellis clone <url> [dir] [--repo <slug|repoId>] [--git <git-url>]
trellis project list <url>        # discovery: repos/ledgers a sprite holds
```

Flow:

1. `GET <url>/v0/ledger/repos` → `[{ repoId, slug, tailHash, byteLength,
   lineCount, updatedAt }]`. Select via `--repo` or the sole entry. (New
   endpoint, §3.)
2. `GET <url>/v0/ledger/tail?repoId=<id>` → journal meta.
3. `GET <url>/v0/ledger/checkpoints/<tailHash>` → ops JSONL (existing).
4. Init fresh `.trellis/config.json` at `dir` with
   `remote.default = { url, repoId, lastAckHash: tailHash, lastAckAt: now }` —
   **the clone is a peer from second zero** and pushes to the *same* ledger.
5. Install ops (existing `installPulledOps` path), validate JSONL.
6. Bytes: if `--git <git-url>` → `git clone` then `trellis open`
   (materialize resolves bytes from git via the git-backed blob tier). If no
   git URL, materialize semantics-only and warn missing bytes (matches sprite
   v0 restore semantics). `--ops-only` skips materialization.
7. Verify local tail hash equals remote tail hash.

`trellis init --remote <url>` stays distinct: **empty** new repo provisioned
with a second peer from day one (the planning-doc row), no pull.

### 2. repoId is a property of the ledger, not of the checkout

The path-derived `repoKeyFromRoot` is the clone blocker. Change the identity
contract:

- **On clone/import:** the local repo adopts the **source repoId** — never
  re-derives from its own path. This is what makes push-back after clone target
  the same ledger.
- **On `trellis init`:** persist a stable repoId in `.trellis/config.json` at
  init time (generated once, genesis-derived or random ulid), independent of
  checkout path.
- **Backward compatibility:** `repoKeyFromRoot` remains as a fallback for
  pre-existing repos that lack a persisted repoId; it is no longer the source
  of truth for identity.
- **Invariant:** same causal chain ⇒ same repoId, regardless of machine or path.

### 3. Discovery surface: `GET /v0/ledger/repos`

The L2 "public ledger index" seed is a **read** endpoint on the sprite, not a
new product:

- `GET /v0/ledger/repos` → list of ledgers the sprite holds (see §1). This is
  what `trellis project list <url>` queries, and what makes a sprite a "room"
  (the planning-doc GitHub.com row: `Room / org / public ledger index`).
- `GET /v0/ledger/tail`/`checkpoints` remain unchanged; `push` stays keyed.
- Read endpoints are **public or keyed by policy** (ADR 0028's "verify remote
  identity before sending full state" applies to sending; clone is receiving).
  Private ledgers simply 401 repos listing / tail without a key.

### 4. Blob story for clone

Bytes are **not** in the sprite protocol for v0 — no protocol change here.
Clone composes what exists:

| Repo type | Clone byte path |
| --------- | --------------- |
| Git-backed | `--git <git-url>` → `git clone` + `trellis open` (git-backed blob tier resolves bytes) |
| Non-git | Semantics-only; warn "blobs not on sprite (v0)"; bytes must exist locally or via future blob sync |
| `--ops-only` | Chain only, no materialization |

A blob-sync endpoint (`/v0/ledger/blobs/<hash>`, push blobs alongside ops) is a
documented follow-on, matching `vcs-oplog-remote-sprite-v0.md` non-goal "Blob
sync (L1+)". No scope creep into clone v0.

### 5. Naming: the existing `src/registry/*` is packages, not projects

`src/registry/*` (`client`, `resolver`, `publish`, `lockfile`, `version-utils`)
is an npm-style **package** registry (version resolution, tarballs, publish
with `-r/--registry`). It is a different object from the **project/ledger**
index. Do not overload it:

- Package registry → `src/registry/*` (unchanged, packages only).
- Project/ledger registry → sprite `GET /v0/ledger/repos` + `trellis project
  list` (this ADR). L3 "fork" = clone + record `upstream` named remote
  (existing `--name` support in `remote add`).

## Consequences

### Positive

- **One command restores a repo on a fresh machine** — the wipe-recovery story
  graduates from `git clone` + 4 manual steps to `trellis clone`.
- **repoId stability across machines** unblocks fork, multi-device push-back,
  and the eventual social layer.
- **Sprites become discoverable rooms** without a new product surface.
- Reuses existing machinery (`pull`, `install`, git-backed blob tier,
  ADR 0028 bootstrap); no new transport.

### Negative

- **Non-git clones are semantics-only** until blob sync ships — clone must
  say so loudly rather than silently drop bytes.
- **Legacy repos** keep path-derived repoId until they adopt a persisted id
  (migration is lazy/optional).
- **repoId change touches identity-sensitive code** (`addRemote`, push ack
  bookkeeping) — must not break the repair gate's `lastAckHash` contract.

### Security Considerations

- Read endpoints public-or-keyed by policy; `push` remains keyed.
- Clone over HTTPS; verify remote identity before accepting checkpoints
  (mirrors ADR 0028 §Security).
- Validate JSONL before install; never trust remote bytes unparsed.

## Implementation sketch

1. Server: `GET /v0/ledger/repos` in `src/server/ledger-handler.ts` +
   `LedgerStore.listRepos()` + `MemoryRemoteSprite` test parity.
2. Client: `src/vcs/oplog-remote.ts` — `listRemoteRepos()`, persist adopted
   repoId on install; keep `repoKeyFromRoot` as fallback only.
3. CLI: `trellis clone <url> [dir]` (new `src/cli/clone-cli.ts`), `trellis
   project list <url>`; wire into `src/cli/index.ts`.
4. Init: persist stable repoId in `.trellis/config.json`.
5. Tests: `test/vcs/oplog-clone.test.ts` — mock sprite round-trip to a fresh
   dir on a *different* path (assert same repoId + tail), git-backed
   materialize round-trip, ops-only, repos listing.

## Acceptance sketch

- [ ] `trellis clone <url>` on a fresh path produces identical tail hash + same repoId
- [ ] Cloned repo pushes to the same remote ledger (no 409, same repoId)
- [ ] `GET /v0/ledger/repos` lists ledgers; `trellis project list` renders it
- [ ] Git-backed clone with `--git` materializes a working tree; non-git clone warns
- [ ] `trellis init --remote <url>` provisions empty repo with default peer
- [ ] Existing repos with path-derived repoId still push (fallback preserved)

## Open questions

- repoId format: genesis-hash-derived vs random ulid persisted at init?
- Should `--git` be auto-discovered from a future `META.json` `gitRemote` field?
- Public read default vs explicit `--public` flag on `deployLedgerSprite`?
