# The `.trellis` journal format — op envelope & hashing spec

> **Status:** v0.1 draft (2026-10-10). Freeze target for independent
> reimplementation and for the proposed `v2` envelope (`parents[]`).
> Written against the canonical checkout at `2bc2804` (trellis 4.0.x).
> **Conformance:** [`conformance/`](./conformance/README.md) — fixtures + a
> zero-dependency validator implementing the rules in §3.

## 1. Scope

Two op families exist in the kernel today:

| Family | Storage | Preimage | Status |
| --- | --- | --- | --- |
| **Journal (VCS) ops** | `.trellis/ops.json` (JSONL) | §3 — `hashVcsOp` | **Current; specified here** |
| Kernel graph ops | SQLite `payload` column | §5 — ADR 0021 (`canonical-op`) | Referenced for completeness |

This document specifies the journal envelope precisely enough that a reader
without the source can (a) recompute every op's hash, (b) verify signatures,
and (c) decide chain admissibility. §6 proposes the `v2` envelope the format
freeze should adopt.

## 2. Store layout

```text
.trellis/
  config.json                # repo config (sample fields in §2.1)
  ops.json                   # append-only JSONL journal — one op per line
  blobs/                     # content-addressed file bodies
  agents/AGENTS.md           # generated agent context
  devices/local.json         # delegated device key (ADR 0020), if paired
  integration-snapshot.json  # integration ref cache
  tests.json                 # acceptance-test cache
```

`ops.json` is **append-only**: ops are never rewritten, reordered, or deleted.
A journal is a single causal sequence (§3.4 step 3).

### 2.1 `config.json` (observed fields)

```json
{
  "rootPath": "…",
  "ignorePatterns": ["node_modules", ".git", ".trellis", "dist", "…"],
  "debounceMs": 300,
  "defaultBranch": "main",
  "indexWorkspace": false,
  "issuePrefix": "TRL",
  "lanes": { "worktreeBind": true },
  "git": { "syncOnPromote": true, "remote": "origin" },
  "agentId": "agent:<name>",
  "createdAt": "2026-10-10T20:44:14.995Z"
}
```

## 3. Journal op envelope (v1 — implemented)

A journal op is a single JSON object. Its fields split into **hashed** and
**unhashed** (envelope) groups (the split is deliberate — TRL-102):

| Field | Hashed? | Notes |
| --- | --- | --- |
| `kind` | yes | namespaced, e.g. `vcs:branchCreate`, `vcs:fileWrite` |
| `timestamp` | yes | ISO-8601 string |
| `agentId` | yes | self-asserted writer label; **not** proof of authorship |
| `previousHash` | yes | causal parent; **omitted entirely** on genesis |
| `vcs` | yes | the payload — key order is significant (see §3.1) |
| `hash` | no | content address; derived (§3.2) |
| `facts`, `links` | no | envelope annotations on ops we did not mint (TRL-102) |
| `laneId` | no | ambient mint context; not identity (see §3.5) |

Signature fields live **inside `vcs`**: `signedBy`, `signedWith`, `signature`.

### 3.1 Canonical preimage (normative)

```js
JSON.stringify({ kind, timestamp, agentId, previousHash, vcs })
```

- Built as an object literal in exactly that key order.
- `previousHash` is **omitted** when absent (JS `undefined` values are dropped
  by `JSON.stringify`). Genesis ops must not carry the key at all.
- `vcs` is embedded **verbatim**: its key insertion order is part of the
  preimage. JSON escaping is part of the format; it replaces the legacy
  `${kind}|${timestamp}|${agentId}|${previousHash}|${payload}` join, which was
  ambiguous (any `|` inside a field shifted the boundary).
- **Known interop hazard (freeze item):** because `vcs` key order is
  mint-order-dependent, two semantically identical ops written by different
  implementations can hash differently. §6 proposes canonical key order.

### 3.2 Hash (normative)

```text
hash = "trellis:op:" + hex(sha256(utf8(preimage)))   # lowercase hex
```

### 3.3 Signing (normative)

Signing happens **after** the initial hash and **inside the payload**:

1. Compute the **body hash**: the §3.1 preimage with `signature`, `signedBy`,
   and `signedWith` removed from `vcs` (remaining key order preserved):
   `bodyHash = "trellis:op:" + hex(sha256(utf8(preimage({…, vcs: rest}))))`
2. `signature = Ed25519_sign(privateKey, utf8(bodyHash))` — base64.
   Keys: private = **PKCS#8 DER, base64**; public = **SPKI DER, base64**.
3. Stamp `vcs.signedBy` (identity entity id, e.g. `identity:did:key:…`),
   `vcs.signedWith` (device id, optional, ADR 0020), `vcs.signature`.
4. **Recompute `op.hash`** over the full op including the signature fields, so
   `hash` covers the signature and a signed op still passes §3.2 unchanged.

### 3.4 Verification (normative order)

1. **Structure** — `hash` matches `^trellis:op:[0-9a-f]{64}$`; `kind`,
   `timestamp`, `agentId` are strings.
2. **Hash** — recompute §3.1–§3.2 over the op as stored; must equal `hash`.
3. **Chain** — the first op of a journal may omit `previousHash`; every later
   op must carry it and it must equal the previous op's `hash`.
4. **Signature**, when present — recompute the body hash (§3.3); resolve the
   key via a trusted keyring (`signedBy`; prefer `signedWith` device key when
   known); `verify(spkiPublicKey, signature, utf8(bodyHash))` must hold.
5. **Signing policy** — unsigned ops are admissible only **before** the first
   signed op (repo initialization precedes identity creation); an unsigned op
   after a signed one is a violation. A signature from an unknown identity is
   a violation (no silent downgrade).

Verification is per-journal and total: a single violation rejects from that
point on (consumers may keep the verified prefix — that is replica policy, not
format policy).

### 3.5 Envelope annotations (NOT hashed — by design)

- `facts`, `links` — added when pulling another peer's op
  (`{ e: 'op', a: 'remote', v: <name> }`), so we can annotate without
  invalidating their hash. Not to be confused with `vcs.facts`, which is
  payload and **is** hashed (`vcs:storeAssert`).
- `laneId` — the lane an op was minted in. Ambient context, not identity: the
  same semantic op minted in two lanes must hash identically, or dedup and
  cross-lane cherry-picking break (TRL-102).

## 4. Writer identity & branch refs (brief)

- `writerPrincipal(op) = op.vcs?.signedBy ?? op.agentId` — the signed principal
  when present, self-asserted `agentId` for unsigned ops (ADR 0022 §4).
- Per-writer branch heads: `branch:NAME@<principal>` for non-default branches;
  `defaultBranch` and `integration` collapse to the shared `branch:NAME`.
- Branch merge semantics are out of scope for this document.

## 5. Kernel graph ops (ADR 0021 — for reference, not refrozen here)

Kernel mutation ops use a different, stricter canonicalization
(`src/core/persist/canonical-op.ts`):

```js
JSON.stringify({ v: 2, kind, timestamp, agentId, previousHash: x ?? null,
                 body: { facts, links, deleteFacts, deleteLinks, provenance } })
```

- `previousHash` is normalized to **`null`** (present key), unlike journal v1
  where it is omitted — do not conflate the two.
- `body` keys are always present in a fixed order; fact/link/meta/source key
  order is canonicalized.
- `provenance: { actorType, origin, commandId? }` — `commandId` emitted only
  when present (ADR 0058) so older v2 ops keep verifying.
- Ops without `v` are legacy v1: **grandfathered opaque** (their preimages are
  unrecoverable by construction). `verifyOpHash` reports `{valid: true,
  legacy: true}` for them.

## 6. Proposed v2 envelope (freeze agenda — NOT implemented)

1. **`v: 2`** on journal ops — a version field so migration is explicit
   (today only kernel ops carry `v`).
2. **`parents: string[]`** replacing `previousHash` — the DAG required for
   concurrent agents/devices and lineage merges. Keep `previousHash` as an
   alias for `parents[0]` for one version, then retire it.
3. **Canonical `vcs` key order** — remove mint-order sensitivity (§3.1).
   Recommended: per-kind declared field order, hashed exactly as declared.
4. **Signature placement decision** — status quo (`hash` covers the signature;
   body hash excludes it) vs **envelope signature** (`hash` covers content
   only; signing/re-signing never changes the content address). Recommended:
   envelope signature — it makes `hash` stable under re-signing and keeps
   tamper evidence identical.
5. **`author`** — primary writer identity = DID (`signedBy`), with `agentId`
   demoted to a display label.
6. **Kind namespace registry + per-kind `schemaVersion`** where payload shape
   evolves independently of the envelope.
7. **Conformance corpus extension** — add a diverged-DAG fixture when v2
   lands; the validator's chain rule in §3.4.3 becomes a parents-set rule.

## 7. Non-goals

Per-kind payload schemas · blob format · merge algorithms · sync transport ·
storage backends.

## 8. References (code at `2bc2804`)

| Path | What |
| --- | --- |
| `src/vcs/ops.ts` | `hashVcsOp`, `verifyVcsOpHash`, `createVcsOp` |
| `src/identity/signing-middleware.ts` | `signOp`, `verifyOp`, `opBodyHash` |
| `src/identity/identity.ts` | `signMessage` / `verifySignature` (DER formats) |
| `src/core/persist/canonical-op.ts` | kernel op preimage v2 (ADR 0021) |
| `src/vcs/types.ts` | `VcsOp`, envelope/payload split (TRL-102), `writerPrincipal` |
| `omarchy-sandbox` `docs/architecture.md` | independent replica verifier (same rules) |
