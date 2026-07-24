# Spec: VCS op-log remote sprite peer (v0 / L2)

**Status:** Spec · **Date:** 2026-07-21  
**Proposal:** TRL-222 · **Depends on:** TRL-230 (local L0–L1d)  
**Planning seed:** `docs/planning/vcs-oplog-sprite-backup.md`

> **Two peers, or it isn’t truth.** Local mirror (`~/.trellis/oplog-mirror/`) is
> same-machine L0.5 — not a witness. This spec adds **peer #2**: default remote
> sprite holding append-only JSONL + immutable checkpoints.

---

## 1. Problem

TRL-230 closed the **single-peer wipe** footgun locally (ring bak, mirror,
destructive gates). A laptop-only ledger can still be lost (disk, bad CLI from
another machine, no Time Machine). Truth requires a **second attestation** of
the same tail hash.

## 2. Goals (v0)

1. **`trellis remote`** CLI group: `add`, `status`, `push`, `pull`, `install`.
2. Default remote entry in `.trellis/config.json` (sprite URL + repo id + auth ref).
3. **Push** integration journal (`ops.json` JSONL) since last ack; remote stores
   immutable checkpoints + advances tip only when `previousTail` matches.
4. **Pull + install** restores chain after simulated local wipe (with
   `.corrupted.<ts>` stamp; refuse if local newer unless `--force`).
5. **Repair gate extension:** `trellis repair` requires recent remote ack
   (configurable window, default 24h) **or** `--i-know` **or**
   `--confirm-destructive` (existing TRL-230 escape).
6. Emit **`vcs:remotePush`** / **`vcs:remotePull`** ops for audit (minimal payload:
   remote name, tail hash, byte length).

## 3. Non-goals (v0)

- Cloud owning primary write path
- Remote running Trellis engine / `repair` on bytes
- Lane journal sync (integration only — same scope as `oplog-mirror.ts`)
- Iroh mesh / multi-remote (L1)
- Public ledger index / social layer (L2+)
- Replacing `~/.trellis/oplog-mirror/` (keep both: mirror = local L0.5, sprite = L2)

## 4. Surfaces

| Surface | Path / command |
| ------- | -------------- |
| Config | `.trellis/config.json` → `remote.default` `{ url, repoId, lastAckHash?, lastAckAt? }` |
| Secrets | `.trellis/remote.json` (gitignored) → `{ apiKey }` or env `TRELLIS_REMOTE_KEY` |
| Client | `src/vcs/oplog-remote.ts` — push/pull protocol, tail meta, install |
| CLI | `src/cli/remote-cli.ts` — register on `program` from `index.ts` |
| HTTP | Sprite `POST /v0/ledger/push`, `GET /v0/ledger/tail`, `GET /v0/ledger/checkpoints/:hash` |
| Tests | `test/vcs/oplog-remote.test.ts` (mock HTTP); extend `op-log-repair.test.ts` for remote gate |
| **Server handler** | `docs/specs/sprite-ledger-handler-v0.md` — production Fly Sprite HTTP (TRL-222 L2) |

### CLI (v0)

```bash
trellis remote add <url> [--name default] [--repo-id <id>]
trellis remote status [-p .]              # local tail vs remote tail
trellis remote push [-p .] [--dry-run]
trellis remote pull [-p .] [--to <path>]  # default: .trellis/ops.json.pulled
trellis remote install [--from <path>] [--force]  # replace ops.json with stamp
```

### Push protocol (client → sprite)

1. Read local JSONL meta: `{ format: 'jsonl', tailHash, byteLength, lineCount }`.
2. Read remote tail via `GET /v0/ledger/tail?repoId=…`.
3. If remote behind: `POST /v0/ledger/push` body:
   `{ repoId, previousTail, tailHash, format, linesSince?, checkpoint? }`.
4. On `409` (tail mismatch): print diverged tails; exit 1 unless `--force` (v0: no force merge).
5. On success: update `config.remote.default.lastAckHash` + `lastAckAt`.

Remote stores bytes only — **never** parses ops into engine.

### Pull + install

1. `pull` writes JSONL to `--to` path (validate line-by-line parse).
2. `install` moves current `ops.json` → `.corrupted.<ts>`, pulled → `ops.json`.
3. Refuse install if local tail is **newer** (hash compare) unless `--force`.

### Repair gate (extends TRL-230)

Before `JsonOpLog.repair` rewrite path:

- If `remote.default` configured and `lastAckAt` older than window → throw unless
  `--i-know` or `--confirm-destructive`.
- Message cites `trellis remote push` first.

## 5. Acceptance criteria

### Static (spec issue — run now)

- `pnpm check` passes
- Spec file exists at `docs/specs/vcs-oplog-remote-sprite-v0.md`
- `pnpm exec vitest run test/vcs/oplog-mirror.test.ts` passes (local mirror foundation)

### Behavioral (impl issue — automated in `test/vcs/oplog-remote.test.ts`)

| # | Criterion | Test command |
| - | --------- | ------------ |
| 1 | Mock sprite push acks tail; config records lastAckHash | `pnpm exec vitest run test/vcs/oplog-remote.test.ts -t push` |
| 2 | Simulated wipe + pull + install restores identical tail hash | `pnpm exec vitest run test/vcs/oplog-remote.test.ts -t restore` |
| 3 | `remote status` reports diverged when mock remote ahead | `pnpm exec vitest run test/vcs/oplog-remote.test.ts -t status` |
| 4 | Repair refuses without recent remote ack when remote configured | `pnpm exec vitest run test/vcs/oplog-remote.test.ts -t repair-gate` |

## 6. Dependencies map

| File | Change |
| ---- | ------ |
| `src/vcs/oplog-mirror.ts` | Reuse meta/tail helpers; do not duplicate journal parsing |
| `src/vcs/op-log.ts` | Repair gate calls remote ack check |
| `src/vcs/destructive-guard.ts` | Document `--i-know` alongside `--confirm-destructive` |
| `src/cli/index.ts` | Register `remote-cli.ts` |
| `docs/planning/oplog-safety-mirror-and-destructive-guards.md` | Link L2 row to this spec |

## 7. Open questions (defer to impl CLARIFY if blocking)

- Auth: `.trellis/remote.json` apiKey vs env-only for v0 → **default env + file**
- One sprite per desk vs per-repo slug → **per-repo repoId in config**
- Checkpoint retention on sprite → **keep last 8** (mirror ring parity)
