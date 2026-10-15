# ADR 0060: Iroh as the peer transport — pairwise-pull-first, rendezvous deferred

**Status:** Proposed
**Date:** 2026-10-15
**Related:** [0025](./0025-dsl-first-then-sync.md) (DSL-first, then sync transport — this concludes its bounded Iroh spike), [0039](./0039-no-vendor-kernel-backends-compatibility-bridge.md) (compatibility bridge — a transport moves ops, it does not own semantics), [0022](./0022-zone-capability-model.md) (zone capability + per-writer refs), [0023](./0023-zone-encryption-at-rest.md) (encryption at rest holds under Iroh), [0017](./0017-blob-gc-thermal-decay.md) (blob GC — the `iroh-blobs` peer tier), [0036](./0036-peer-aware-identity-resolution.md) (peer-aware identity resolution — the revocation floor a pulled op must clear)
**Consumers:** kernel `src/sync/`, the `sandbox` desk (`omarchy-sandbox`), the turtleOS successor transport

## Context

ADR 0025 deferred the full sync transport until the query/projection DSL froze, and kept Iroh as a time-boxed feasibility spike (TRL-111: NAT traversal + op-streaming against the frozen v1 subset). That spike has now produced a working artifact: `src/sync/iroh-transport.ts` implements the existing `SyncTransport` interface over `@number0/iroh` (QUIC + relay), is wired into `trellis realtime-sync --transport iroh`, and is exercised by `test/sync/iroh-smoke.ts` and `test/sync/iroh-integration.ts` (two engines, ops flowing over the real have→want→ops→ack protocol).

The first concrete demand comes from the sandbox desk. Disposable Omarchy guests sync their per-machine graph to the Mac world repo only by **SSH pull**, so an agent inside a guest cannot cross-reference or verify anything against a shared ground truth — the "vacuum." Isolation was a *write* decision (untrusted agents must not mutate shared state); verification and cross-reference are *reads*. Pulling a peer's signed ops over Iroh closes that gap without weakening write isolation, and it is the same move the successor topology needs (a machine is a *peer*, not a guest).

## Decision

1. **Iroh is the peer transport for Trellis.** `SyncTransport` (`src/sync/types.ts`) stays the seam; Iroh is one implementation, not a new wire protocol. The message set and `PROTOCOL_VERSION` are unchanged.

2. **Pairwise pull ships first.** One peer initiates, pulls, integrates, and returns; daemon/room topologies come later. This matches the actual demand (a verification/cross-reference pull) and avoids coupling the transport to a long-lived host model before the pairwise path is proven.

3. **Stable endpoint identity.** A caller that wants a durable endpoint id MUST pass a deterministic `secretKey` (derived from the machine/device identity) to `IrohSyncTransport.create()`. The default mints a fresh key per run, which makes every previously shared ticket stale on the next boot; sandbox callers must pass the key.

4. **Rendezvous is deferred and named.** v0 discovery is manual ticket exchange, brokered host-side in the sandbox prototype. A rendezvous (Iroh discovery/DISCO, or the identity-addressed-clone path in ADR 0032) is the explicit next step. Manual ticket-passing is a stopgap and MUST NOT harden into the architecture.

5. **Integration is policy-gated.** Ops pulled from a peer pass through the existing `SyncEngine` gates (quarantine, `destructive-op`, `bulk-delete`, rate-limit) before they enter a local graph. The default posture for a cross-sandbox pull is a **read-only mirror** — integrate and verify; no automatic merge or promote.

6. **Verification is by content and signature.** A pulled op is validated by its hash and by the signing device key resolved under the person identity (ADR 0021 / 0022 / 0036). "Verify" is a query over already-pulled ops — not a new subsystem.

7. **CLI surface: `trellis wire <ticket|serve|pull>`.** `sync`, `peer`, and `pull` are already taken at the top level (`sync` = path-based repo sync, `peer` = the person resolver, `pull` = remote workspaces), so the peer transport gets its own verb, `wire`. `ticket` prints this repo's stable endpoint id + ticket; `serve` binds and serves ops; `pull --ticket <t>` connects and pulls. Implemented in `src/cli/peer-sync-cli.ts`, consuming the engine + `SyncEngine` (not the daemon's raw-append path), so integration is gated and the EAV store updates.

## Consequences

**Positive**
- Concludes ADR 0025's spike with a **go**, and promotes Iroh from experiment to the peer transport.
- One transport seam serves kernel, desk, and successor.
- The vacuum is answerable pairwise before any rendezvous, room, or hub is built.
- Because ops are content-addressed and signed, verification needs no new machinery — only a fetcher and a signature check.

**Negative / cost**
- Manual ticket exchange is a stopgap with real ergonomics cost until rendezvous lands.
- A second Iroh endpoint per guest complicates the sandbox idle-suspend model: the endpoint freezes with the VM, so a pull must be opportunistic (on wake / on demand) or the peer pinned with `--idle 0`.
- Pairwise is O(n²) if it ever becomes the only path; rooms/relays stay on the roadmap for that reason.

**Neutral**
- Does not replace the WebSocket / HTTP / PartyKit transports; they remain for hosted and room contexts.
- Not a claim that the CLI is daemon-first; the daemon is one host of the transport, not its shape.

## Risks to verify (not decisions)

| Risk | Why it gates | How to resolve |
| ---- | ------------ | -------------- |
| `@number0/iroh` native binding loads in an Arch-ARM64 guest | `recipes/agent/setup.sh` installs trellis with `--omit=optional`, and the platform binary (`@number0/iroh-linux-arm64-gnu`) is an optionalDependency | `sandbox exec <name> -- node -e "import('@number0/iroh')"`; if it fails, install without `--omit=optional` or pin the platform binary |
| Bidirectional response over the n0 relay | The accepting peer must resolve the initiator's address to reply; `test/sync/iroh-smoke.ts` notes this gap | Extend the integration test to drive a reply over the public relay |
| Published `trellis@4.0.5` ships `iroh-transport.ts` + the CLI path | Otherwise the sandbox base needs a vendored tarball | Check the published tarball contents |

Status flips to **accepted** once the first two risks clear.

**Verification log (2026-10-15).**
- **Risk 1 — green.** In the `dev` guest, `@number0/iroh` is present nested under the global trellis and loads with the full API (`Endpoint`, `EndpointTicket`, `EndpointAddr`, `presetN0`, `SecretKey`, …). Caveat: the guest ran **trellis 4.0.12**, not the `4.0.5` pinned in `recipes/agent/config.env` — reconcile the pin.
- **Risk 2 — green (cross-sandbox, public n0 relay).** Two running sandboxes (`dev` = A, `ontology` = B) each bound an Iroh endpoint with a machine-id-derived stable key. Tickets exchanged host-side; both connected over the public relay; B ran a **pairwise pull** and A served the ops in response. Result: `integrated applied 6 rejected 0`, B's op count `6 → 12`, and B's graph now contains A's `System` entity (`system:fb7ba198…`, the `dev` sandbox) alongside its own. No SSH-from-Mac in the path.
- **Finding (not a risk).** The consumer must call `engine.open()` before `getOpCount()`/sync — the constructor does not load the op log. A successor caller that skips this syncs `0` ops silently.
- **CLI verb `trellis wire` — built + tested (one-way).** From the `dev` desk source build (`bun src/cli/index.ts wire …`): `serve` on the sandbox graph (6 ops) + `pull --ticket <t>` into a fresh repo (1 op) → `applied 6 rejected 0`, `ops 1 -> 7`. Crucially **one-way** — the puller only connects; the server resolves the puller's address over the relay and replies, so no second connection is required.
- **Risk 3 — open.** Confirm the published `trellis` version ships `iroh-transport.ts` + the CLI path (the guest's 4.0.12 does).

Status: with risks 1–2 cleared, this flips to **accepted** on risk 3.

## Alternatives considered

| Alternative | Why rejected |
| ----------- | ------------ |
| WebSocket / PartyKit as the peer transport | Both require a server/room to relay; Iroh gives serverless pairwise. Kept for hosted rooms. |
| Embed or port a second sync protocol | Violates ADR 0039 — a transport may move ops, it must not own semantics. |
| Daemon-first / room-first | Defers the simplest useful shape to serve a topology nobody asked for yet; conflicts with the sandbox idle model. |
| Build rendezvous now, skip manual tickets | Premature — couples the transport to a discovery mechanism before pairwise pull is proven. |

