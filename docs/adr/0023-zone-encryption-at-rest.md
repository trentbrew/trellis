# ADR 0023: Encryption-at-rest for zone keys

> **Terminology:** **Zone key** = the symmetric key that locks a zone's
> materialized state (ADR 0022 §5). **Zone** = a spatial boundary backed by a
> capability grant (ADR 0022). **KEK** = key-encryption key derived from a
> principal's Ed25519 identity + a passphrase via argon2id. **Wrapped key** =
> a zone key sealed under a KEK, persisted as a graph fact.

**Status:** Proposed
**Date:** 2026-07-15
**Issue:** TRL-102 (refs / lane-hash), TRL-97 (sprite relay blobstore)
**Depends on:** ADR 0022 (zone capability model), ADR 0020 (Ed25519 identity),
`src/identity/capability.ts`
**Supersedes:** nothing

## Context

ADR 0022 defines the *authorization boundary* — who may read or write a zone —
but says nothing about *confidentiality at rest*. The consequence section is
explicit: "Encryption-at-rest per zone key (AES-256-GCM / argon2id) is a
follow-on ADR — this ADR defines the *boundary* the key will lock, not the
crypto."

Three pressures make the boundary real:

1. **The Garden is permanent (telos gift economy).** Ops are immutable and
   attributed forever; a peer that once held a zone key can always read any
   zone state it replicated, even after revocation. ADR 0022 is honest about
   this: revocation = *rotate*, not *retroactively seal*. Encryption-at-rest is
   what makes rotation meaningful — a rotated zone key turns all previously
   replicated ciphertext into undecryptable bytes for the revoked principal.
2. **The spindle is shared.** `trellis studio` and the sprite-client sync the
   same backing store across devices and (via Iroh) peers. A zone's facts on
   disk or on a relay are readable by anyone with the file. The boundary must
   hold even when the medium does not.
3. **The sprite relay / blobstore (TRL-97).** Durable sprite blobs are offloaded
   to a relay that must never own plaintext. The relay stores *wrapped* zone
   keys and ciphertext; it can serve bytes but cannot read them. This is the
   same partition-and-don't-filter discipline as ADR 0022, applied to storage.

Per ADR 0022, the kernel references only `zoneId` + a `CapabilityLevel` enum.
This ADR keeps that invariant: the kernel stores a **wrapped key fact** keyed by
zone, not the plaintext key, not the crypto algorithm in kernel logic. Crypto is
a *boundary adapter*, not a kernel primitive.

## Decision

### 1. Per-zone symmetric key, AES-256-GCM

- Each zone has exactly one **zone key** — a 256-bit random symmetric key used
  for AES-256-GCM over that zone's materialized facts and blob payloads.
- AES-256-GCM gives authenticated encryption: tampering with ciphertext is
  detected at decrypt (no separate MAC). The 96-bit IV is randomized per
  encryption; (zoneId, IV) is unique for the zone's lifetime, so a key is never
  reused for the same IV.
- A zone's key **is its confidentiality boundary**. Two principals in the same
  zone share the zone key; capability levels (ADR 0022) still govern *which*
  principals hold it. Nesting does **not** nest keys — a child zone gets its own
  key; inheritance governs *capability*, not *key material*.

### 2. Key wrapping under a principal KEK (argon2id)

- The zone key is never persisted in plaintext. It is **wrapped** (sealed) under
  a **KEK** derived per principal via `argon2id` from:
  - the principal's Ed25519 seed (ADR 0020 root device, or a device key), and
  - an optional user passphrase (strength-gated; empty passphrase = seed-only).
- A `wrappedKey` fact is stored per `(zoneId, principal)`:
  `{ e: zone:ZONEID, a: 'wrappedKey:<principal>', v: <base64 sealed blob> }`.
- A principal decrypts the zone by deriving their KEK, unwrapping the zone key,
  then AES-GCM-decrypting facts. A principal with no `wrappedKey` fact for the
  zone cannot read it — this is the *enforced* half of ADR 0022's deny-by-default.

### 3. Revocation = rotate (matches ADR 0022 §5)

- On revocation (`retractGrant` in ADR 0022), the zone owner **rotates** the
  zone key: generate a new zone key, re-wrap it for every remaining granted
  principal, and drop the revoked principal's `wrappedKey` fact. Previously
  replicated ciphertext stays on disk but is now unsealable by the revoked
  principal — exactly the "can't take back what you already shared" honesty from
  ADR 0022, now with a real off-switch for *future* state.
- Rotation is owner-gated, reusing ADR 0022's `assertOwner` invariant. A
  multi-principal `Owner` set rotates only when a quorum/single owner re-wraps
  for the surviving set (the same causally-ordered-journal serialization caveat
  as ADR 0022 §5).

### 4. The relay stores ciphertext only (TRL-97)

- The sprite relay / blobstore persists zone-wrapped ciphertext and
  `wrappedKey` facts. **It never holds a plaintext zone key or a KEK.** It can
  serve blobs and route wrapped keys by `zoneId`, but cannot decrypt. This is
  the storage-shaped expression of partition-don't-filter: the relay is a
  durable dumb pipe, not a trust boundary.
- On-device, the plaintext zone key lives only in the in-memory session keyring
  for the duration a principal is authenticated; it is evicted on lock.

### 5. Kernel stays crypto-agnostic

- The kernel's only new fact is `wrappedKey:<principal>` (an opaque base64
  blob). The algorithm ids (AES-256-GCM, argon2id) live in a **boundary
  adapter** module (`src/identity/zone-crypto.ts`), never in kernel wiring.
- The kernel asks "does this principal have a `wrappedKey` fact for this zone?"
  — same shape as ADR 0022's grant query — and delegates actual decrypt to the
  adapter. Capability resolution (ADR 0022) and key availability compose: a
  principal reads a zone **iff** `resolveCapability ≥ Reader` **AND** a
  `wrappedKey` fact exists for them.

## Consequences

**Good**

- Revocation finally has teeth: rotation seals future state from a revoked
  principal, closing the ADR 0022 "we can only rotate" gap.
- The relay/blobstore (TRL-97) can be durable and shared without owning
  plaintext — the storage boundary holds under Iroh sync.
- Kernel change is tiny: one opaque `wrappedKey` fact type; all crypto is a
  boundary adapter, consistent with ADR 0022's "partition, don't filter".
- Reuses Ed25519 identity (ADR 0020) as the KEK root — no new identity model.

**Costs / risks**

- **Key loss = data loss.** If a passphrase-only principal loses the passphrase
  and the seed, the zone is unrecoverable. Mitigation: owner-held recovery
  `wrappedKey` under a second device, and the existing gift-economy rule that
  peers you shared with already replicate plaintext — so recovery walks the
  graph, not a backup.
- **argon2id cost** must be tuned per device; too low = weak KDF, too high =
  slow unlock on the sprite-client. Use `argon2id` with a device-class preset.
- **Nested-key confusion**: child zones get their own keys (no key inheritance),
  so a principal granted only the parent does not automatically read children.
  This is intentional (capability ≠ key), but the UI must surface "you can
  administer this zone but not read its child" rather than silently failing.
- **Rotation is a write** and therefore subject to ADR 0022's single-writer
  serialization on the owner zone — concurrent rotations by co-owners need the
  same causally-ordered-journal guard.

**If we don't**

- Revocation remains cosmetic for already-replicated state; the relay (TRL-97)
  would have to be trusted with plaintext or refuse durable storage.
- ADR 0022's deny-by-default stays a *read gate* with no *confidentiality*
  backing — a peer with the file beats the grant check.

## Acceptance criteria

1. Each zone has a 256-bit AES-256-GCM key; facts + blob payloads for the zone
   are stored ciphertext with randomized IV (test: round-trip encrypt/decrypt).
2. The zone key is persisted **only** as a `wrappedKey:<principal>` fact under
   an argon2id-derived KEK; no plaintext key on disk (test: inspect store).
3. A principal with `resolveCapability ≥ Reader` **and** a `wrappedKey` fact
   decrypts; a principal lacking either fails closed (test).
4. `retractGrant` triggers key rotation: revoked principal's `wrappedKey` is
   dropped and existing ciphertext becomes undecryptable for them (test).
5. The relay/blobstore path handles only wrapped keys + ciphertext; a unit test
   proves the relay cannot decrypt with what it persists (TRL-97).

## References

- `docs/adr/0022-zone-capability-model.md` (§5 "rotate, not retract"; boundary)
- `docs/adr/0020-qr-device-pairing.md` (Ed25519 identity / device keys = KEK root)
- `src/identity/capability.ts` (`assertOwner`, `resolveCapability`, grant facts)
- `docs/planning/spec-v1.1-refs-and-authz.md` (§2a, §5)
- TRL-97 (durable sprite relay / blobstore)
- telos §VII (gift economy: immutable attribution, revocation = rotate)
- NIST SP 800-38D (GCM), RFC 9106 (argon2id)
