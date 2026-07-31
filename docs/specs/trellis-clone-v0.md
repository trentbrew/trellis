# Spec: trellis clone (ADR 0031)

**Status:** Implemented · **Date:** 2026-07-31
**ADR:** 0031
**Depends on:** TRL-222 remote sprite (L0 push/pull/install), TRL-230 remote ack gate

---

## 1. What `trellis clone` does

One-command bootstrap from a remote sprite: discovers ledgers, pulls the latest
immutable checkpoint, writes a fresh `.trellis/` (ops + full persisted config
with adopted repoId + remote), verifies the tail hash, and optionally
materializes file bytes via `git clone`.

```bash
trellis clone <url> [dir] [--repo <repoId>] [--git <git-url>] [--ops-only]
trellis project list <url> [--api-key <key>]
```

## 2. Server protocol

### `GET /v0/ledger/repos`

Returns the ledgers hosted by this sprite. Used for discovery before cloning.
**Auth:** public or keyed (consistent with tail endpoint).

**200** body: `RemoteRepoInfo[]`

```json
[
  {
    "repoId": "repo-source",
    "tailHash": "trellis:op:65242ab1...",
    "byteLength": 1234,
    "lineCount": 42
  }
]
```

### `GET /v0/ledger/tail?repoId=…` — unchanged (existing).
### `GET /v0/ledger/checkpoints/<tailHash>` — unchanged (existing).
### `POST /v0/ledger/push` — unchanged (existing).

## 3. Clone flow

1. `GET <url>/v0/ledger/repos` → list; pick by `--repo <repoId>` or sole
   entry (errors if multiple and no `--repo`).
2. `GET <url>/v0/ledger/tail?repoId=` → journal meta.
3. `GET <url>/v0/ledger/checkpoints/<tailHash>` → ops JSONL.
4. Create `<dir>/.trellis/config.json` — full persisted shape (rootPath,
   ignorePatterns, debounceMs, defaultBranch, indexWorkspace, repoId,
   agentId, createdAt) plus `remote.default = { url, repoId, lastAckHash,
   lastAckAt }`. This mirrors what `writePersistedConfig` produces in the
   engine so `engine.open()` works without additional repair.
5. `<dir>/.trellis/ops.json` ← checkpoint content (JSONL, validated).
6. If `--git <url>`: `git clone <url> <dir>` runs first (bytes = byte tier B),
   then `.trellis/` written. If no `--git`: semantics-only; warn on missing
   blobs.
7. Verify installed ops tail hash equals remote tail hash. Refuse if mismatch.

## 4. repoId persistence (ADR 0031 §2)

`repoId` is a property of the ledger, not of the checkout path. Implemented by:

- Generating a stable `repoId` at `trellis init` time and persisting it in
  `.trellis/config.json`.
- `addRemote` prefers `config.repoId` over the path-derived `repoKeyFromRoot`
  fallback.
- `trellis clone` adopts the source repoId from the remote so push-back
  targets the same ledger as the origin.

## 5. CLI surface

```
trellis clone <url> [dir]
  --repo <repoId>    Required when sprite hosts multiple ledgers.
  --api-key <key>    Bearer token; stored in .trellis/remote.json.
  --git <git-url>    Byte tier: git clone into dest before ops install.
  --ops-only         Skip materialization — chain + config only.

trellis project list <url>
  --api-key <key>    Bearer token for the discovery endpoint.
```

Exit codes: `0` on success, `1` on divergence / checksum mismatch / network
error. Error messages cite the failing step.

## 6. Acceptance criteria

- `trellis clone http://sprite/repos --repo <id>` produces a fresh dir with
  identical tail hash and matching repoId.
- Cloned repo pushes to the same remote ledger (no 409 divergence).
- `trellis project list <url>` lists hosted ledgers.
- `GET /v0/ledger/repos` returns repo info; guarded by auth when keyed.
- Git-backed clone with `--git` materializes a working tree (bytes resolve via
  git-backed blob tier on `trellis open`).
- Existing repos with path-derived repoId still push unchanged (fallback
  preserved).

## 7. Non-goals (v0)

- Blob sync over sprite protocol (L1+, separate ADR).
- Fork tracking (clone + record upstream remote = L3, uses existing `--name`
  support in `trellis remote add`).
- `trellis init --remote <url>` bootstrap (separate from clone; empty chain).
- Public ledger index / social discovery (L2, separate ADR).

## 8. Related

| Doc | Role |
| --- | ---- |
| `docs/adr/0031-trellis-clone-and-project-registry.md` | Design decision record |
| `docs/planning/vcs-oplog-sprite-backup.md` | L0/L1/L2/L3 roadmap |
| `docs/specs/vcs-oplog-remote-sprite-v0.md` | Push/pull protocol spec |
| `docs/specs/git-backed-blob-tier-v0.md` | Byte tier for materialize |
| `docs/adr/0028-empty-remote-bootstrap.md` | Sync daemon bootstrap (different transport) |
