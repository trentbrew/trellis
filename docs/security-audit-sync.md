# Security Audit: Realtime Sync Infrastructure

**Date**: 2026-07-24  
**Scope**: `src/sync/`, `src/vcs/sync-policy.ts`, `src/cli/sync-cli.ts`  
**Version**: Trellis 3.4.1+

## Executive Summary

The realtime sync infrastructure (ADR 0027) implements safety gates for destructive operations but lacks critical security controls for authentication, authorization, and encryption. The system assumes trusted peers and does not verify peer identity or enforce secure transport.

**Risk Level**: HIGH  
**Recommendation**: Address before production deployment

---

## Critical Findings

### 1. No Peer Authentication

**Severity**: CRITICAL  
**Location**: `src/sync/websocket-transport.ts`, `src/sync/sync-engine.ts`

**Issue**: WebSocket connections accept any peer without authentication. The `localPeerId` is self-provided and not verified.

```typescript
// websocket-transport.ts - no authentication
async connect(): Promise<void> {
  this.ws = new WebSocket(this.options.url); // No auth token
  // ...
}
```

**Impact**: 
- Unauthorized peers can connect and inject malicious ops
- Impersonation attacks possible
- No audit trail of actual peer identity

**Mitigation**:
- Add JWT or API key authentication to WebSocket handshake
- Verify peer identity via signature on first message
- Implement peer allowlist/denylist

---

### 2. No Encryption Enforcement

**Severity**: CRITICAL  
**Location**: `src/sync/websocket-transport.ts`

**Issue**: WebSocket URL can be `ws://` (unencrypted) - no enforcement of `wss://`.

```typescript
export interface WebSocketTransportOptions {
  url: string; // Can be ws:// or wss:// - no validation
  // ...
}
```

**Impact**:
- Ops transmitted in plaintext
- Sensitive data (decision traces, issue content) exposed
- Man-in-the-middle attacks possible

**Mitigation**:
- Enforce `wss://` in production environments
- Add TLS certificate validation
- Reject `ws://` in non-development environments

---

### 3. No Authorization Controls

**Severity**: HIGH  
**Location**: `src/sync/sync-engine.ts`, `src/sync/sync-daemon.ts`

**Issue**: Any connected peer can send ops to any branch. No authorization checks for:
- Branch write permissions
- Lane ownership
- Agent identity

**Impact**:
- Unauthorized writes to protected branches
- Cross-lane contamination
- Privilege escalation

**Mitigation**:
- Implement branch-level authorization
- Enforce lane ownership (ADR 0015)
- Check agent identity against governance policies

---

### 4. Plaintext Quarantine Storage

**Severity**: MEDIUM  
**Location**: `src/vcs/sync-policy.ts`

**Issue**: Quarantine entries stored in plaintext JSON at `.trellis/quarantine.json`.

```typescript
private save(): void {
  const data = JSON.stringify(Array.from(this.entries.values()), null, 2);
  require('fs').writeFileSync(this.storagePath, data); // Plaintext
}
```

**Impact**:
- Sensitive quarantined ops readable by anyone with file access
- No integrity protection
- No audit trail of quarantine modifications

**Mitigation**:
- Encrypt quarantine store at rest
- Add HMAC for integrity verification
- Log all quarantine operations to audit trail

---

### 5. No Rate Limiting

**Severity**: MEDIUM  
**Location**: `src/sync/sync-engine.ts`, `src/sync/websocket-transport.ts`

**Issue**: No limits on:
- Message frequency
- Op batch size
- Connection attempts

**Impact**:
- DoS via message flood
- Memory exhaustion from large op batches
- Resource exhaustion from reconnection storms

**Mitigation**:
- Add rate limiting per peer
- Enforce maximum op batch size
- Implement exponential backoff for reconnections

---

### 6. No Message Size Limits

**Severity**: MEDIUM  
**Location**: `src/sync/websocket-transport.ts`

**Issue**: WebSocket messages can be arbitrarily large (graph-snapshot with 40K ops).

```typescript
this.ws.onmessage = (event) => {
  const message = JSON.parse(event.data.toString()); // No size check
  // ...
}
```

**Impact**:
- Memory exhaustion from large messages
- DoS via oversized messages
- Slow transfer of large snapshots

**Mitigation**:
- Enforce maximum message size (e.g., 10MB)
- Stream large snapshots in chunks
- Add progress reporting for large transfers

---

### 7. API Key Not Used by Sync Daemon

**Severity**: MEDIUM  
**Location**: `src/cli/sync-cli.ts`, `.trellis-db.json`

**Issue**: API key exists in `.trellis-db.json` but sync daemon doesn't read or use it.

**Impact**:
- False sense of security
- Inconsistent with other CLI commands
- No authentication for sync operations

**Mitigation**:
- Integrate API key into WebSocket authentication
- Use API key for peer identity verification
- Document API key purpose clearly

---

## Medium Priority Findings

### 8. No Audit Trail for Sync Operations

**Location**: `src/sync/sync-daemon.ts`

**Issue**: Sync operations not logged to audit trail. Only console logging.

**Mitigation**:
- Add structured logging to `.trellis/sync-audit.jsonl`
- Log all sync operations with timestamps, peer IDs, op counts
- Include quarantine decisions in audit trail

---

### 9. No Peer Reputation System

**Location**: `src/sync/sync-engine.ts`

**Issue**: No tracking of peer behavior (nacks, rejections, quarantine events).

**Mitigation**:
- Track peer reputation scores
- Auto-block malicious peers
- Require manual approval for new peers

---

### 10. No Environment-Specific Security Policies

**Location**: `src/vcs/sync-policy.ts`

**Issue**: Security policies don't vary by environment (production vs sandbox).

**Mitigation**:
- Enforce stricter policies in production
- Require manual approval for all remote ops in production
- Disable auto-sync in production environments

---

## Recommendations

### Immediate (Before Production)

1. **Add WebSocket Authentication**
   - Implement JWT-based authentication
   - Verify peer identity on connection
   - Integrate with existing API key system

2. **Enforce TLS**
   - Reject `ws://` in production
   - Add certificate validation
   - Document TLS requirements

3. **Add Authorization**
   - Implement branch-level write permissions
   - Enforce lane ownership
   - Check agent identity against governance

### Short Term (Next Release)

4. **Encrypt Quarantine Store**
   - Use AES-256-GCM for encryption
   - Add HMAC for integrity
   - Rotate encryption keys

5. **Add Rate Limiting**
   - Per-peer rate limits
   - Maximum batch size enforcement
   - Connection attempt limits

6. **Implement Audit Trail**
   - Structured logging to `.trellis/sync-audit.jsonl`
   - Include all sync operations
   - Add quarantine decisions

### Long Term (Future Enhancements)

7. **Peer Reputation System**
   - Track peer behavior
   - Auto-block malicious peers
   - Require approval for new peers

8. **Environment-Specific Policies**
   - Stricter production policies
   - Manual approval requirements
   - Disable auto-sync in production

---

## Testing Recommendations

1. **Authentication Tests**
   - Test connection without credentials (should fail)
   - Test connection with invalid credentials (should fail)
   - Test connection with valid credentials (should succeed)

2. **Authorization Tests**
   - Test unauthorized branch write (should fail)
   - Test cross-lane write (should fail)
   - Test authorized write (should succeed)

3. **Encryption Tests**
   - Test `ws://` connection in production (should fail)
   - Test `wss://` connection (should succeed)
   - Test MITM attack (should fail)

4. **Rate Limiting Tests**
   - Test message flood (should be rate-limited)
   - Test oversized message (should be rejected)
   - Test reconnection storm (should be rate-limited)

---

## Compliance Notes

- **SOC 2**: Requires audit trail, access controls, encryption at rest/in transit
- **GDPR**: Requires encryption of personal data, access controls
- **HIPAA**: Requires encryption, audit trail, access controls (if handling PHI)

Current implementation does not meet these compliance requirements.
