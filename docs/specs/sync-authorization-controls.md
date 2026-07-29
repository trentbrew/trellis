# Spec: Sync Authorization Controls

**Status:** draft · **Parent:** TRL-336 (closed) · **Issues:** TRL-336 was security hardening for sync; authorization was deferred pending this scope document.

## Context

The realtime sync infrastructure (ADR 0027) implements TLS enforcement, auth tokens, rate limiting, and audit trails (TRL-336). It lacks **authorization controls** — any connected peer can send ops to any branch or lane. The security audit (`docs/security-audit-sync.md`) flags this as HIGH severity.

The governance engine (`src/identity/governance.ts`) already has a policy evaluation system (`evaluatePolicy`) with `PolicyRule` objects that gate `push`, `merge`, `createMilestone`, and `deleteBranch` actions on `branch`, `path`, and `entityType` targets using `requiredSigners` and `minSignatures`. This spec defines how to extend that model to sync transport.

## Goal

Gate sync writes by governance policy so that:
1. Peers can only push ops to lanes/branches they own or are authorized for
2. Cross-lane contamination is prevented
3. Privilege escalation via sync is blocked
4. Authorization decisions are auditable

## Scope

### In scope
- Branch-level write authorization via existing `PolicyRule` model
- Lane ownership enforcement (ADR 0015) mapping to sync peers
- Auth token claims propagation through sync pipeline
- Authorization checks in `SyncDaemon` and `WebSocketTransport` on op receipt
- Deny-by-default for ops that lack valid governance authorization
- Audit trail of authorization decisions (already has `SyncAuditTrail`)

### Out of scope
- Peer identity verification beyond auth tokens (TLS + auth token + peer signature covers this)
- Fine-grained entity-level authorization within a lane (future phase)
- Governance UI for sync policy management (deferred)
- Runtime policy evaluation middleware extraction (use existing `evaluatePolicy`)

## Design

### 1. Peer Identity Propagation

Each sync peer authenticates with an auth token (already in TRL-336). The token maps to an identity entity ID via the governance resolver.

```
WebSocket URL: wss://sync.trellis.com/sync?token=<jwt>
Auth token contains: { sub: <identityEntityId>, lanes: [<laneId>], branches: [<branch>] }
```

The `SyncDaemon` extracts the identity from the auth token and attaches it to the `onOpsReceived` pipeline.

### 2. Authorization Check Point

Authorization is evaluated in `SyncDaemon.onOpsReceived` (existing sync-daemon.ts line 96-124), after the quarantine policy check and before `this.options.onOpsReceived`:

```typescript
// TRL-336 deferred: authorization gate
const authResult = await evaluatePolicy(
  { kind: 'sync:push', laneId: op.laneId, branch: op.vcs, author: peerIdentity },
  policies,
  governanceResolver,
);

if (!authResult.allowed) {
  this.auditTrail.logAuthorizationDenied(peerIdentity, op, authResult.violations);
  return {
    rejections: ops.map((op) => ({
      hash: op.hash,
      reason: 'unauthorized',
    })),
  };
}
```

### 3. PolicyRule Extension for Sync

Extend `PolicyRule.target` to include `'lane'` and `PolicyRule.action` to include `'syncPush'`:

```typescript
export interface PolicyRule {
  // ...existing fields...
  target: 'branch' | 'path' | 'entityType' | 'lane';
  action: 'push' | 'merge' | 'createMilestone' | 'deleteBranch' | 'syncPush';
}
```

A `syncPush` policy rule gates whether a peer can push ops via the sync transport to a specific lane or branch.

### 4. Lane Ownership (ADR 0015)

A peer is the owner of a lane if its identity entity ID matches the lane's `ownerId` (stored as an EAV attribute on the lane entity). Ownership implies:
- `syncPush` authorization for that lane
- Ability to promote (merge) out of that lane

Non-owners can only receive sync ops into their own lanes; they cannot push to lanes they don't own.

### 5. Default Deny

If no applicable `PolicyRule` grants `syncPush` for the peer's identity and target lane/branch, the op is rejected. This is consistent with the existing `evaluatePolicy` behavior where absence of matching policies = allowed, so we need an explicit deny policy for sync:

```typescript
// If no syncPush policy exists for this lane/branch, deny by default
const hasSyncPolicy = policies.some(
  (p) => p.action === 'syncPush'
    && matchesTarget({ laneId }, p)
    && p.enabled,
);
if (!hasSyncPolicy) {
  // No policy defined → deny by default for sync
  return { rejections: [...], reason: 'no-sync-policy' };
}
```

### 6. Audit Trail Integration

Authorization decisions are logged via `SyncAuditTrail` (already created in TRL-336):

```typescript
this.auditTrail.logAuthorization(
  peerIdentity,
  op.hash,
  authResult.allowed,
  authResult.violations.map((v) => v.reason),
);
```

## Acceptance Criteria

1. Peer identity extracted from auth token is available to `SyncDaemon.onOpsReceived`
2. `evaluatePolicy` gates sync push ops against governance policies
3. Lane ownership (ADR 0015) determines `syncPush` authorization
4. Ops to lanes where peer lacks `syncPush` policy are rejected with audit entry
5. Deny-by-default when no sync policy exists for a lane/branch
6. Authorization decisions logged to audit trail
7. Existing non-sync operations (direct writes, local ops) unaffected
8. Type check passes (`pnpm check`)

## Dependencies

- ADR 0015 (lane ownership definition) must define the `ownerId` attribute
- PolicyRule type extension (`lane` target, `syncPush` action)
- Governance resolver must be accessible from sync daemon context

## Open Questions

1. Should `syncPush` be a separate action or should existing `push` action cover it?
   - Recommendation: separate action, since sync push has different semantics (remote peer vs local write)
2. Should the deny-by-default apply when NO policy exists, or only when an explicit deny policy exists?
   - Recommendation: deny-by-default for sync (safer default; explicit opt-in)
3. Should peer identity be verified by the sync server or by governance evaluation?
   - Recommendation: auth token carries claims, governance evaluates claims against policies