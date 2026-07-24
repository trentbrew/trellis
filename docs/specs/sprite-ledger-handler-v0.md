# Spec: Sprite ledger HTTP handler (v0 / production peer)

**Status:** Spec · **Date:** 2026-07-21  
**Proposal:** TRL-222 · **Depends on:** TRL-234/235 (client protocol) · TRL-230 (local guards)  
**Client contract:** `docs/specs/vcs-oplog-remote-sprite-v0.md`  
**Planning seed:** `docs/planning/vcs-oplog-sprite-backup.md`

> **Client shipped; server missing.** TRL-235 implemented `trellis remote` +
> `oplog-remote.ts` against `MemoryRemoteSprite`. This spec adds the **production
> HTTP handler** deployed to a Fly Sprite — bytes-only, no Trellis engine.

---

## 1. Problem

TRL-222 proposal AC requires **live push/pull against a sprite**, not just mock
HTTP. The client protocol is frozen; the sprite must implement the same three
routes the client already calls.

## 2. Goals (v0)

1. **HTTP handler** implementing client contract:
   - `GET /v0/ledger/tail?repoId=…`
   - `POST /v0/ledger/push`
   - `GET /v0/ledger/checkpoints/:tailHash`
2. **Filesystem store** on sprite — immutable checkpoints + advancing tip.
3. **Bearer auth** — reject unauthenticated writes/reads when `LEDGER_API_KEY` set.
4. **Checkpoint retention** — ring of last **8** checkpoints per `repoId` (mirror parity).
5. **`trellis ledger-sprite deploy`** — bundle handler to Sprites (reuse `deploy-gateway` pattern).
6. **`trellis remote provision`** — deploy + `remote add` + print URL/key for desk.
7. **Contract tests** — handler must pass same scenarios as `MemoryRemoteSprite`.

## 3. Non-goals (v0)

- Parsing ops into EAV / running `repair` on server
- Multi-remote / org index (L1)
- Cloud broker auto-provision (defer — manual `remote provision` OK)
- Replacing local mirror (`~/.trellis/oplog-mirror/`)

## 4. HTTP contract (must match client)

### `GET /v0/ledger/tail?repoId=<id>`

**200** body:

```json
{ "format": "jsonl", "tailHash": "trellis:op:…", "byteLength": 1234, "lineCount": 42 }
```

**404** when repo has no tip yet.

### `POST /v0/ledger/push`

Body (client sends):

```json
{
  "repoId": "…",
  "previousTail": "trellis:op:…",
  "tailHash": "trellis:op:…",
  "format": "jsonl",
  "byteLength": 1234,
  "lineCount": 42,
  "checkpoint": "<full jsonl bytes>"
}
```

Rules:

1. If remote tip exists and `previousTail !== remote.tipHash` → **409** (no merge).
2. Validate `checkpoint` is parseable JSONL line-by-line.
3. Store checkpoint immutably at `checkpoints/<tailHash>`.
4. Advance tip meta; trim retention ring (keep last 8 checkpoints).
5. **200** `{ "ok": true }`.

### `GET /v0/ledger/checkpoints/:tailHash`

**200** — raw JSONL body (same bytes pushed), or JSON wrapper `{ "checkpoint": "…" }` (client accepts both).

**404** — unknown hash.

### Auth

- Header: `Authorization: Bearer <key>`
- Server env: `LEDGER_API_KEY` (required in production deploy)
- Client env: `TRELLIS_REMOTE_KEY` or `.trellis/remote.json` (existing)

## 5. Storage layout (sprite VM)

```text
/home/sprite/trellis-ledger/
  data/
    <repoId>/
      tip.json          # JournalMeta
      checkpoints/
        <tailHash>.jsonl
```

No SQLite, no engine — filesystem only.

## 6. Surfaces

| Surface | Path |
| ------- | ---- |
| Handler + store | `src/server/ledger-handler.ts`, `src/server/ledger-store.ts` |
| Deploy | `src/server/deploy-ledger.ts` (mirrors `deploy-gateway.ts`) |
| CLI | `src/cli/ledger-sprite-cli.ts` — `ledger-sprite deploy`; extend `remote-cli.ts` with `remote provision` |
| Tests | `test/server/ledger-handler.test.ts` (contract); `test/server/ledger-integration.test.ts` (client ↔ handler) |
| Entrypoint | Generated Bun bundle → `/home/sprite/trellis-ledger/server.mjs` |

## 7. Deploy (v0)

```bash
trellis ledger-sprite deploy --name <slug> [--port 8080]
# → https://<slug>-<org>.sprites.app
# → writes LEDGER_API_KEY to stdout (once) + optional .trellis/ledger-sprite.json locally

trellis remote provision --name <slug> [-p .]
# → deploy + remote add + store apiKey in .trellis/remote.json
```

Service name: `trellis-ledger`. HTTP port: `8080` (Sprites public port).

## 8. Acceptance criteria

### Static (spec issue)

- `pnpm check` passes
- Spec file exists at `docs/specs/sprite-ledger-handler-v0.md`
- Client spec exists at `docs/specs/vcs-oplog-remote-sprite-v0.md`

### Behavioral (impl issue — `test/server/ledger-*.test.ts`)

| # | Criterion | Test command |
| - | --------- | ------------ |
| 1 | Handler push acks tail; stores checkpoint | `pnpm exec vitest run test/server/ledger-handler.test.ts -t push` |
| 2 | Handler 409 on previousTail mismatch | `pnpm exec vitest run test/server/ledger-handler.test.ts -t mismatch` |
| 3 | Pull checkpoint restores identical tail hash | `pnpm exec vitest run test/server/ledger-handler.test.ts -t restore` |
| 4 | Client `pushRemoteLedger` + `pullRemoteLedger` against in-process handler | `pnpm exec vitest run test/server/ledger-integration.test.ts -t roundtrip` |
| 5 | `pnpm check` passes | `pnpm check` |

### Maps to TRL-222 proposal AC (close epic when impl green + manual smoke)

| Proposal AC | Satisfied by |
| ----------- | ------------ |
| backup push uploads tip+checkpoint to sprite | #1 + #4 (+ optional live `trellis remote push` smoke) |
| pull+install restores prior tip hash after simulated wipe | #3 + #4 |

## 9. Dependencies map

| File | Change |
| ---- | ------ |
| `src/server/sprites.ts` | Reuse `ensureSprite`, `runSpriteCopy`, service lifecycle |
| `src/server/deploy-meta.ts` | Reuse name validation + URL helpers |
| `src/vcs/oplog-remote.ts` | No protocol change — handler must match `MemoryRemoteSprite` |
| `src/cli/remote-cli.ts` | Add `remote provision` |
| `docs/specs/vcs-oplog-remote-sprite-v0.md` | Cross-link server spec §4 |

## 10. Open questions (resolved for v0)

| Question | Decision |
| -------- | -------- |
| Separate sprite vs room server? | **Yes** — dedicated ledger handler service |
| Live Fly in CI? | **No** — in-process handler tests; optional `TRELLIS_LEDGER_SMOKE=1` manual |
| Checkpoint retention | **8** (ring parity with local `.bak`) |
