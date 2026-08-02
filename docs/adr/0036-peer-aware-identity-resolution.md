# ADR 0036: Peer-aware identity resolution — the `IdentityResolver` contract

**Status:** Proposed
**Date:** 2026-08-02
**Related:** [0020](./0020-qr-device-pairing.md) (device pairing),
[0021](./0021-canonical-op-hashing-and-provenance.md) (signed ops),
[0022](./0022-zone-capability-model.md) (zone capability),
[0032](./0032-identity-addressed-clone.md) (identity-addressed clones),
[0035](./0035-safety-gatekeeper-consensus-ops.md) (safety gatekeeper),
`docs/specs/peer-system-specification.md` (network-scoped handles, TRL-371+)

**Impacted components:** `src/identity/signing-middleware.ts`,
`src/identity/pairing.ts`, `src/identity/capability.ts`, `src/vcs/peer-resolver.ts`,
`src/engine.ts`, `src/sync/room-core.ts`, `src/sync/sync-engine.ts`

## Context

ADR 0035's gatekeeper (§5) requires that remote ops carry a verifiable
signature: `signedBy` must resolve to keys through an `IdentityResolver`, and
the gate fails when resolution fails. But the `IdentityResolver` interface
(`src/identity/signing-middleware.ts:87`) has exactly **one** implementation
today — `pairingResolver()` (`src/identity/pairing.ts:623`) — and it resolves
keys **only from the local identity directory** (`.trellis/devices` registry +
root key). It never consults `~/.trellis/peers.json`.

Consequence: identity in Trellis is socially witnessed — a `{peer}` handle
references a person *you know*, and the local peer graph is the trust data
(`docs/specs/peer-system-specification.md`). A remote op signed by a known
peer's identity is, to `pairingResolver`, an **unknown identity** — the entire
witness model is inert at the authenticity gate. The peer records *carry* the
public key (`PeerRecord.publicKey`) but nothing ever reads it back out for
verification.

Two further gaps, discovered in the audit:

1. **Revocation is unmodeled at the peer level.** Device revocation already
   exists (`devices[].revokedAt`, `pairing.ts:262`), but a peer's key can never
   be revoked: `PeerRecord` has no revocation field, and the resolver has no
   revocation lookup. ADR 0035 §5 says "a revoked key fails the gate" — there
   is nowhere to read that fact from.
2. **`verifyOpBatch` has two consumers with no shared resolver construction**
   (`capability.ts:408` attribution; `project.ts:95` genesis verification), and
   the remote-apply path (`room-core.ts` `handleOps`) has **no resolver at
   all** — only hash verification (`verifyVcsOpHash`, room-core.ts:308).

## Decision

### 1. One composed resolver: local identity ∪ peer graph

New `peerKeyResolver(trellisDir): IdentityResolver | null` in
`src/identity/peer-key-resolver.ts` — the **canonical resolver construction
site**, replacing direct `pairingResolver` use:

- **Local path unchanged:** resolves the local identity's root + device keys
  exactly as `pairingResolver` does today (device-level revocation already
  handled by `resolveDevicePublicKey`'s `revokedAt` check).
- **Peer path (new):** when `entityId` / `did` matches a `PeerRecord` in
  `~/.trellis/peers.json` (`loadPeers()`), the record's `publicKey` joins the
  resolvable keys for that identity — **unless revoked** (§2).
- **Composition is additive and deterministic:** `resolvePublicKeys(entityId)`
  = local keys ∪ matching peer keys, deduped. Same peer graph in, same key set
  out — no environment dependence, satisfying ADR 0035 §4's determinism rule
  for the authenticity check.
- The local identity is also a peer graph member if the user registered
  themselves (`peers[name].entityId === local identity`); that is fine — keys
  dedupe.

### 2. Revocation is a local trust fact on the peer record

- `PeerRecord` gains `revokedKeys?: string[]` (`src/vcs/peer-resolver.ts`).
- Semantics: a key listed in `revokedKeys` **never resolves** — the resolver
  filters it out of every path. If a record's own `publicKey` is listed, the
  record resolves to **no keys** (the identity is effectively unknown →
  signature verification fails → gate fails closed).
- **Local-scoped by design:** revocation lives beside the handle that trusts
  it. There is no global revocation list — consistent with network-scoped
  handles; a revoked-key claim propagates socially (you update the record when
  you learn), not via a directory.
- **Rejected:** a separate global revocation store. Contradicts the
  socially-scoped witness model and buys nothing the per-record list doesn't.

### 3. All verification paths share the composed resolver

- `src/engine.ts:369` swaps `pairingResolver` → `peerKeyResolver`.
- `src/identity/capability.ts` attribution and `src/vcs/project.ts` genesis
  verification receive the composed resolver where they receive one today
  (callers unchanged — the interface is the seam).
- `room-core.ts` / `sync-engine.ts` remote-apply: the resolver is threaded in
  as the gatekeeper's authenticity check lands (ADR 0035 task 3). Until the
  gatekeeper exists, signature verification stays hash-only on the wire; the
  resolver is the readiness prerequisite, not a behavior change on its own.

### 4. Deferred

- **Attestation chains / trust levels** (peer system TRL-383/384) — future
  strengthening of `resolvePublicKeys`; the interface does not change.
- **Peer device registries** — peer records carry one root key today; per-peer
  device key lists are a peer-system extension, not this ADR's concern.
- **Capability preconditions** (ADR 0035 §8) — the resolver feeds attribution,
  not capability evaluation.

## Consequences

**Good**

- The witness model becomes operational: a known peer's signed op verifies;
  an unknown or revoked identity fails the gate by construction.
- Revocation exists at the trust boundary that needs it, with device-level
  precedent (`revokedAt`).
- One construction site for the resolver — capability, project genesis,
  gatekeeper, and remote apply all converge on the same trust data.

**Costs / risks**

- `peers.json` gains a field; old files without it behave unchanged (absent =
  no revoked keys). No migration.
- A stale peer record (wrong key, pre-rotation) fails verification → quarantine
  at the gate (safe-by-failure, per ADR 0035 §5). Rotating a peer key requires
  updating the record — documented in the peer system spec (§5).
- Peer key revocation is only as current as the local record; a revoked key
  can still verify against a *stale* record. Accepted: social propagation,
  matching the handle model. The gate's job is fail-closed, not
  freshness-enforcement.

**If we don't**

- The gatekeeper's authenticity check cannot verify any peer-signed op —
  TRL-334 ships a gate that quarantines everything remote, or we special-case
  peers out of the gate (contradicting ADR 0035).
- Revocation stays unmodeled at the peer level while TRL-385 depends on it.

## Implementation tasks

1. `PeerRecord.revokedKeys?` in `src/vcs/peer-resolver.ts`.
2. `peerKeyResolver()` in `src/identity/peer-key-resolver.ts` (composes
   `pairingResolver` semantics + `loadPeers()`, filters revoked keys);
   export from `src/identity/index.ts`.
3. Wire `src/engine.ts:369` to the composed resolver.
4. Tests: `test/identity/peer-key-resolver.test.ts` — peer resolution,
   revocation filtering (incl. self-revoked record → no keys), local ∪ peer
   dedupe, unknown identity → `null` keys.
5. Docs: resolver contract section in
   `docs/specs/peer-system-specification.md` (record → keys → gate mapping,
   revocation, rotation note); ADR 0035 task 3 names the composed resolver.

## Acceptance criteria

1. `peerKeyResolver(trellisDir)` resolves a `signedBy` whose `entityId` is a
   registered peer's `entityId` to that peer's `publicKey`.
2. A key in `revokedKeys` never appears in any resolution result; a record
   whose own `publicKey` is revoked resolves to an empty key set.
3. `resolvePublicKeys` returns local ∪ peer keys, deduped; local-only
   identities behave exactly as `pairingResolver` today (existing pairing
   tests green).
4. An unknown `signedBy` (no local identity, no peer record) resolves to no
   keys → `verifyOp` fails → gate fails closed.
5. `peers.json` files without `revokedKeys` load and resolve unchanged.
6. `pnpm check` green.
