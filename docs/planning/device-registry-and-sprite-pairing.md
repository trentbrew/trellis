# Device registry + sprite pairing — scoped plan

**Status:** Scope (pre-implementation)
**Date:** 2026-08-02
**Related:** ADR 0020 (QR device pairing), ADR 0032 (person identity),
ADR 0036 (peer-aware identity resolution), ADR 0027 (realtime sync),
`docs/planning/vcs-oplog-sprite-backup.md` (sprite = peer #2), TRL-371+ (peer system)

---

## 1. Current state audit

| Surface | What exists | Gap |
| ------- | ----------- | --- |
| Pairing root | `pairStart`/`pairApprove` read `loadIdentity(trellisDir)` — **repo scope only** | Contradicts person-authoritative model (ADR 0032 §3); `trellis identity init` (person default) does not satisfy pairing's error message |
| Device registry | Per-repo `.trellis/devices/` (`registry.json` + key files) | Clone-local; a paired device is invisible to the identity's other clones |
| Device signing | `getSigningMaterial` (device-first, root fallback) — **no consumer** | Engine signs from `resolveRepoIdentity` (root only); device keys never sign ops |
| Device management | `trellis pair list` / `revoke` (CLI only) | No metadata (kind, lastSeen, sync state); revocation is local-only, no propagation; no UI affordance |
| Sprite identity | Sprites are HTTP remotes (`remote.json`, ledger sprite) | No identity relationship; not a device; no realtime device-signed op flow |
| Sync status | `trellis remote status`, `sync-audit.jsonl`, daemon status | Per-repo remote status; not per-device, not surfaced in a device view |

## 2. Direction

The **device registry is the unit of "where my identity runs."** Devices and
sprites are both *device entries*: local CLI/desktop instances and cloud
sprites differ in transport, not in kind. A user should see one list —
"devices paired with my identity" — with per-entry state (last seen, last sync,
sync status, revoked), and a sprite provisioned via `trellis` should
automatically pair, sign ops, and sync in realtime through the existing
daemon/room path.

## 3. Scoped slices

### Slice A — Onboarding-first identity + person-first pairing + device-signed ops (do first)

Small, self-contained, unblocks the person model immediately.

**A.0 Onboarding gate (first-run identity, "Apple ID" model).**
Identity is created once, at first device/workstation setup — long before any
pairing. `trellis init` first-run detection (no person identity + no profile)
enters an onboarding branch:

- **New user** → `ensurePersonIdentity()` (displayName prompt) + profile;
  ops minted from op #1 are signed with the person root
  (`getSigningMaterial`), closing the unsigned-prefix gap.
- **Existing user** → prompted to pair: QR flow (Slice A.1) adopts the
  identity from an already-onboarded device; person identity is written from
  the challenge, device key installed locally.
- **Non-interactive** → deterministic default: new-user path (auto-create),
  with `--identity new|existing|skip` override (existing expects a pairing
  payload; skip leaves the repo anonymous, dev-only warning). This is the
  hook Slice D's sprite provisioning uses.

**A.1** `pairStart`/`pairApprove` resolve the root via `resolveRepoIdentity`
(person `~/.trellis/identity.json` ?? repo) instead of `loadIdentity`.
→ `trellis identity init` (person) then satisfies pairing; error message
corrected to mention both scopes. No auto-create in pair — onboarding owns
creation.

**A.2** Engine `signingMaterial` resolves via `getSigningMaterial(trellisDir)`
(device key first, `signedWith: <deviceId>`, root fallback) instead of
`resolveRepoIdentity` root-only.
→ device keys become real at mint; `resolveDevicePublicKey` in the
resolver (ADR 0036) gets something to verify; ADR 0035's signature gate
verifies device-signed ops end-to-end.

**A.3 Tests:** onboarding new-user round-trip (init → identity exists → ops
signed); onboarding existing-user (init → pair → identity adopted); person-
scope pairing round-trip; device-signed op verification via
`peerKeyResolver`; `--no-interactive` defaults; regression: repo-scope
identity still pairs.

**Files:** `src/identity/pairing.ts`, `src/engine.ts`, `src/cli/index.ts`
(init onboarding), `test/p4/`, `test/cli/`.

### Slice B — Person-scoped device registry (devices follow the person) ✅ done

Move the registry from `.trellis/devices` to `~/.trellis/devices` (keyed by
identity), so a paired device is recognized by every clone of the identity.

1. Registry path resolution: `personDevicesDir()` (`~/.trellis/devices`) —
   person scope primary, repo-scope fallback (read both; write person).
   `loadRegistry`/`loadLocalDevice` read person first; `saveRegistry`/
   `saveLocalDevice` write person, and keep a legacy repo copy in sync when
   one exists for the same identity.
2. `pairingResolver`/`peerKeyResolver` resolve device keys person-first via
   the registries (a registry is identity-keyed, so no per-deviceId dedupe
   needed).
3. Migration: `migrateUp` — on read, if the person-scoped store is empty but
   a legacy repo-scoped file exists, copy it up once (raw bytes, one-way
   ratchet). Repo copies remain as stale snapshots.
4. **`pairingResolver` is no longer null-gated on local identity** — a machine
   with no identity still verifies remote ops signed by identities it knows
   through pairing (fail-closed: unknown identities resolve to nothing). The
   gate requires this: identity-less peers must see the device registry.
5. Back-compat: old repos keep working (repo registry still read + migrated);
   all pairing/signing/ingest tests gained hermetic HOME sandboxes (they
   previously wrote to the real `~/.trellis` once pairing became
   person-scoped).

**Files:** `src/identity/pairing.ts`, `src/identity/peer-key-resolver.ts`,
`src/cli/index.ts` (pair list/revoke read person scope), `test/p4/`,
`test/p7/`.

### Slice C — Device management surface (list, state, metadata, UI) 🔶 data + CLI + daemon done

1. `DeviceRecord`/`LocalDeviceKey` gain: `kind: 'desktop' | 'cli' |
   'cloud-sprite'`, `transport?: 'ws' | 'http' | 'iroh'`, `lastSeenAt?`,
   `lastSyncOpHash?`, `syncState?: 'idle' | 'syncing' | 'behind' | 'diverged' |
   'offline'` ✅.
2. **State feed** ✅ — `markDeviceSeen` (self: local.json + mirrored registry
   record) and `updateDeviceState` (arbitrary record, skips revoked), both in
   `src/identity/pairing.ts`; the sync daemon stamps `idle`/`offline` +
   last-synced op hash after each push/pull cycle (`src/sync/sync-daemon.ts`).
   Presence (ADR 0024) feed deferred — daemon heartbeats cover the sprite case.
3. CLI ✅ — `trellis pair list` shows kind/transport/sync-state/last-seen;
   new `trellis pair show <deviceId>` (full record incl. last sync op hash);
   `pair join` accepts `--kind`/`--transport` (Sprite D stamps `cloud-sprite`).
   `pair revoke` stays (Slice D adds propagation).
4. Studio UI — **remaining sub-task**: devices pane in the admin shell
   (list, state, revoke; `/api/devices` route + admin.html view, same data as
   CLI). Scoped, not yet built — admin shell is a large SPA; do as its own
   focused pass.

**Files:** `src/identity/pairing.ts` (types + state helpers), `src/sync/sync-daemon.ts`
(state feed), `src/cli/index.ts` (list/show/--kind/--transport), `test/p4/slice-c-*`.

### Slice D — Sprite as paired device + realtime sync 🔶 provisioning + revocation done

1. **Provisioning** ✅ — `provisionSpriteDeviceKey` (`src/identity/sprite-device.ts`):
   `trellis vm create` mints a cloud-sprite device key under the person identity
   (never the root key), registers it in the person-scoped registry
   (`registerDevice`, kind `cloud-sprite`, transport `ws`), and installs
   `.trellis/devices/local.json` on the sprite VM
   (`installSpriteDeviceKey`, `src/server/deploy.ts`) — the sprite signs as the
   identity via `getSigningMaterial` (device-first). Idempotent re-provisioning;
   skipped with a warning when no identity exists.
2. **Device list** ✅ — the sprite appears in `trellis pair list` / `pair show`
   with kind/transport; sync state fed by the daemon's `markDeviceSeen`.
3. **Sprite-side op signing** 🔶 — the sprite runs the kernel room server
   (TenantPool, not a VCS engine), so device-signed *VcsOp* minting on the
   sprite awaits a VCS-engine room backend; the key material is already
   installed, so the moment the sprite runs an engine it signs correctly.
4. **Realtime sync** ✅ — rides the existing daemon/room path (ADR 0027), no
   new transport; daemon stamps device state per cycle.
5. **Revocation propagation** ✅ — `device-revoked` `SyncMessage` (types.ts);
   `SyncEngine.onDeviceRevoked` routes it; the sync daemon handler revokes in
   the person registry (fails closed, ADR 0036 §2); `trellis pair revoke
   --push <ws-url>` sends the signal one-shot. Room-core passes it through to
   the daemon side.

**Files:** `src/identity/sprite-device.ts` (new), `src/identity/pairing.ts`
(`registerDevice`), `src/server/deploy.ts` (`installSpriteDeviceKey`),
`src/sync/types.ts` (`device-revoked`), `src/sync/sync-engine.ts`
(`onDeviceRevoked`), `src/sync/room-core.ts`, `src/sync/sync-daemon.ts`,
`src/cli/index.ts` (vm create hook, `pair revoke --push`),
`test/p4/slice-d-*`.

## 4. Sequencing

1. **Slice A** — onboarding-first identity + pairing + device-signed ops;
   prerequisite for everything; small diff; makes fresh repos signed from
   op #1 and pairing person-scope-correct.
2. **Slice B** — registry follows the person before devices gain state
   (otherwise Slice C's metadata is stranded per-clone).
3. **Slice C** — management surface; feeds the sprite story's visibility.
4. **Slice D** — sprite pairing + realtime sync + revocation propagation;
   depends on A (onboarding/new-user default for headless provisioning, B
   (device follows person), and the ADR 0035/0036 gate being verifiable for
   device-signed ops.

A and B are independent of the TRL-371+ peer-system issues. C and D
cross-reference them: `peer-formalization` TRL-372 (ADR 0032 update) should
note the device model; TRL-383/384/385 (attestation, trust, revocation)
depend on C's metadata + D's revocation propagation.

## 5. Out of scope (noted, not planned)

- Iroh transport for devices (future mesh — sprite doc's "peer #3")
- Global/cloud device directory (contradicts local-first + witness model;
  revocation propagates socially via sync, never via a registry of record)
- Per-device authn beyond the signing model (capability scopes stay
  ADR 0022 territory)
