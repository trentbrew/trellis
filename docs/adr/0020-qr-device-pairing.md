# ADR 0020: QR device pairing for Trellis identity

> **Terminology:** **Identity** = Ed25519 `did:key` actor (`identity:*`).
> **Device** = a paired key that may sign on behalf of an identity. **Pairing**
> = authorizing a new device under an existing identity. Distinct from hosted
> **account** login (magic email) and from future **passkey unlock** (biometric
> latch on local key material).

**Status:** Accepted  
**Date:** 2026-07-10  
**Issue:** TRL-87 (proposal), TRL-88 (spec), TRL-92 (impl)  
**Depends on:** `src/identity/` (Ed25519 + signing middleware)  
**Supersedes:** nothing

## Context

Each Trellis install stores private key material in `.trellis/identity.json`
(never synced). There is no first-class way to authorize a second machine under
the same identity. Magic email is appropriate for hosted Studio _accounts_; it
must not become the root of causal identity. Hardware/passkey unlock is a later
latch on key access, not a replacement for crypto identity.

## Decision

### Layer cake (locked)

| Layer          | Mechanism                                                     | Owns                                        |
| -------------- | ------------------------------------------------------------- | ------------------------------------------- |
| Root           | Ed25519 `did:key` identity                                    | Who ops are attributed to                   |
| Cross-device   | Payload / short-code **device pairing** (QR encode = Phase 1) | Which device keys may sign as that identity |
| Hosted account | Magic email (cloud only)                                      | Studio login, billing, invites              |
| Unlock (later) | Passkey / platform authenticator                              | Local unlock of key material — separate ADR |

### Key model: delegated device keys (not key copy)

**Do not** copy or sync the identity private key across devices.

- Each device generates its own Ed25519 keypair.
- Pairing emits a signed **DeviceAuthorization** binding `devicePublicKey` →
  `identityEntityId`, signed by an already-authorized key (bootstrap: the
  identity root key on Device A).
- Ops continue to set `vcs.signedBy` to the **identity** entity id.
- Ops **additionally** set `vcs.signedWith` to the **device id** (or `"root"`
  when signing with the bootstrap identity key).
- Verification: resolve the public key for `(signedBy, signedWith)` via the
  device registry; bootstrap identity key remains valid as `signedWith: "root"`.
- Extend `IdentityResolver` with `resolvePublicKeys(identityEntityId): string[]`
  (root + authorized devices) **or**
  `resolveDevicePublicKey(identityEntityId, deviceId): string | null`. Prefer
  the latter when `signedWith` is present; fall back to try-all
  `resolvePublicKeys` for legacy ops that only set `signedBy`.
- Agent lanes, CI, and headless processes keep using local root identity / env
  without QR or biometrics.

### On-disk layout (Phase 0)

Under `<repo>/.trellis/`:

| Path                    | Contents                                                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `identity.json`         | **Unchanged** — root identity keypair only. Never overwritten by pairing.                                              |
| `devices/registry.json` | Authorized devices for this install’s view: `{ identityEntityId, devices: DeviceRecord[] }`                            |
| `devices/local.json`    | This machine’s device keypair + `deviceId` + linked `identityEntityId` (created on join; absent on root-only installs) |
| `devices/challenges/`   | Ephemeral challenge files (or in-memory + single file); deleted on consume/expiry                                      |

**Forbidden:** writing a device private key into `identity.json`; exporting root
`privateKey` in any pairing payload.

### DeviceAuthorization schema (portable artifact)

Signed JSON (or CBOR later) returned **to Device B** after A approves — this is
how B learns approval on pure OOB:

```ts
type DeviceAuthorization = {
  v: 1;
  deviceId: string; // opaque id (ulid/uuid)
  identityEntityId: string; // identity:<did:key:…>
  did: string; // did:key of identity
  devicePublicKey: string; // base64 SPKI (or raw — document one)
  deviceLabel?: string;
  issuedAt: string; // ISO
  expiresAt?: string; // optional soft expiry; omit = no expiry
  issuerDeviceId: string; // "root" or authorizing deviceId
  challengeId: string; // consumed challenge
};
// signature: Ed25519 over canonical bytes of the above, by issuer's key
type SignedDeviceAuthorization = {
  authorization: DeviceAuthorization;
  signature: string; // base64
};
```

- **A** verifies B’s join response, prompts user to confirm B’s device pubkey
  fingerprint, writes `DeviceRecord` into A’s `registry.json`, and emits
  `SignedDeviceAuthorization` to B (stdout / QR / paste).
- **B** verifies the signature against A’s known identity/root pubkey from the
  challenge, then persists `local.json` + the authorization into B’s
  `registry.json`.
- Phase 0: **both** A and B hold local copies. Peer/graph sync of registry =
  Phase 3. Do **not** invent graph writes in Phase 0.

### Pairing happy path (Phase 0)

1. **Device A** (`trellis pair start`) creates a short-lived challenge:
   `{ v: 1, challengeId, did, identityEntityId, exp, nonce }` and prints a
   **string payload** + human-readable Crockford code. (QR rendering = Phase 1
   over the same payload.)
2. **Device B** (`trellis pair join <payload|code>`) generates device keypair,
   builds a **JoinResponse**
   `{ challengeId, devicePublicKey, deviceLabel?, signature }` (signature over
   challenge bytes), prints response payload for A.
3. **Device A** (`trellis pair approve <joinResponse>`) verifies signature +
   expiry + one-time challenge, shows fingerprint, on confirm writes registry +
   prints `SignedDeviceAuthorization`.
4. **Device B** (`trellis pair accept <signedAuth>`) verifies auth, writes
   `local.json` + registry; subsequent `signOp` uses device key with
   `signedBy = identityEntityId` and `signedWith = deviceId`.
5. **List / revoke (local):** `trellis pair list` /
   `trellis pair revoke <deviceId>` update **this install’s** registry only.
   Cross-device revoke propagation = Phase 3.

### Transport

- **Phase 0:** pure OOB string payloads (start → join → approve → accept). No
  network required.
- **Phase 1:** QR encode/decode of the same payloads; optional local HTTP
  listener on A defaulting to **`127.0.0.1` only**; LAN bind requires explicit
  confirm. No cloud relay.
- Relay/cloud must not own identity state.

### Challenge / payload format

- Challenge string: `trellis:pair:v1:<base64url(json)>` (or documented compact
  form).
- Fields: `v`, `challengeId`, `did`, `identityEntityId`, `exp` (unix), `nonce`.
- TTL default: **5 minutes**; single use; reject replay.
- Human code: Crockford base32 short form of `challengeId`.

### Threat model (Phase 0–1)

| Threat                     | Mitigation                                                                  |
| -------------------------- | --------------------------------------------------------------------------- |
| Challenge replay           | TTL + one-time consume                                                      |
| Shoulder-surf QR/payload   | Approve step shows B fingerprint; user must confirm on A                    |
| MITM on Phase 1 listener   | Default bind `127.0.0.1`; LAN only with explicit flag + confirm             |
| Private key exfil via pair | Payloads never include private keys; layout forbids identity.json overwrite |
| Revoke confusion           | Phase 0 revoke is local-only; document until Phase 3                        |

### Lanes and agents

Pairing is **identity-scoped**, not lane-scoped. `TRELLIS_LANE_ID` / lane
journals unchanged. No QR or biometric gate on CLI agent entry. Root-key signing
without a device registry remains valid (`signedWith: "root"` or omit
`signedWith` for legacy).

### Explicitly deferred

- Passkey / Touch ID unlock of local keys (follow-on ADR).
- Full multi-device recovery if all devices lost (recovery codes / seed —
  follow-on).
- Graph-replicated device registry / cross-device revoke (Phase 3).
- Magic-email linking of hosted accounts to `did:key` (cloud surface).

## Consequences

**Positive**

- Cross-device identity without email-as-root or private-key sync
- Portable `SignedDeviceAuthorization` closes OOB approval gap
- Clear verify API evolution (`signedWith` + registry)
- Fits local-first + BraX / Framework ownership story

**Negative**

- Four-step CLI ceremony (start/join/approve/accept) before UX sugar
- Phase 0 revoke does not fan out to other devices
- Recovery story incomplete until follow-on

## Implementation phases

| Phase | Scope                                                                                                                                |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **0** | Types + on-disk layout + challenge/join/approve/accept + local registry + `signedWith` verify path + CLI + `test/p4/pairing.test.ts` |
| **1** | QR encode/decode helpers + optional `127.0.0.1` listener                                                                             |
| **2** | Studio / docs UI scan + approve surfaces                                                                                             |
| **3** | Graph-synced device registry + cross-device revoke                                                                                   |

## References

- Proposal TRL-87
- Spec TRL-88
- Spec-critic REJECT → patch (verify API, auth artifact, layout, threat model,
  Phase 0 vs QR)
- `src/identity/identity.ts`, `src/identity/signing-middleware.ts`
- Existing tests: `test/p4/identity.test.ts`, `test/p4/signing.test.ts`
