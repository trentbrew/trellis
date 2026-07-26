# ADR 0027: Realtime Full-State Sync

**Status**: Accepted  
**Date**: 2026-07-24  
**Context**: Trellis 3.4.1+

## Problem Statement

The existing sync infrastructure (`src/sync/`) provides CRDT reconciliation for op-level synchronization but lacks:

1. **Full graph state sync** - Only op logs are synchronized, not the complete EAV graph state
2. **Realtime transport** - No persistent WebSocket-based bidirectional sync
3. **Safety gates** - No environment-specific policies to block destructive operations
4. **Quarantine system** - Suspicious changes cannot be held for manual review
5. **Background daemon** - Sync requires manual push/pull commands

This limits Trellis to git-esque push/pull workflows rather than true realtime collaboration between environments.

## Decision

Extend the sync infrastructure with:

### 1. Protocol Extensions

Add new message types to `SyncMessage` union in `src/sync/types.ts`:

- `graph-snapshot`: SQLite DB snapshot for full-state transfer
- `lane-journal`: Lane-specific op journals
- `decision-trace`: Decision audit traces
- `entity-delta`: Incremental entity changes

### 2. WebSocket Transport

Implement `WebSocketTransport` class (`src/sync/websocket-transport.ts`) providing:

- Persistent bidirectional connection
- Automatic reconnection with exponential backoff
- Message sending and receiving
- Peer listing

### 3. Sync Daemon

Implement `SyncDaemon` class (`src/sync/sync-daemon.ts`) that:

- Maintains persistent WebSocket connection
- Periodically syncs full graph state using `SyncEngine`
- Integrates safety policy checks
- Quarantines suspicious changes
- Provides start/stop/status/quarantine management

### 4. Safety Gates

Implement `SyncPolicy` module (`src/vcs/sync-policy.ts`) with:

- Environment-specific policies (production, sandbox, development)
- Risk classification for message types
- Blocking rules for destructive ops, bulk deletes, system modifications
- Quarantine store with persistence and review capabilities

### 5. CLI Commands

Add `trellis realtime-sync` command group (`src/cli/sync-cli.ts`):

- `start` - Start sync daemon
- `status` - Check sync state
- `pause` - Pause automatic sync
- `quarantine list` - List quarantined changes
- `quarantine apply <id>` - Approve and apply quarantined change
- `quarantine reject <id>` - Reject and discard quarantined change

### 6. Environment Variable

`TRELLIS_SYNC_ENV` controls the sync policy environment (defaults to `development`).

## Consequences

### Positive

- **Realtime collaboration** - Environments stay in sync automatically
- **Safety by default** - Destructive ops blocked by policy
- **Human oversight** - Quarantine system provides manual review
- **Full state transfer** - Complete graph state synchronized, not just ops
- **Background operation** - No manual push/pull required

### Negative

- **Increased complexity** - More moving parts in sync infrastructure
- **WebSocket dependency** - Requires WebSocket server for remote sync
- **Policy configuration** - Teams must configure appropriate sync policies per environment

### Alternatives Considered

1. **Extend existing push/pull only** - Would not provide realtime sync
2. **Use existing HTTP transport** - Not suitable for persistent bidirectional sync
3. **No safety gates** - Would risk propagating destructive operations

## Implementation

See `src/sync/types.ts`, `src/sync/websocket-transport.ts`, `src/sync/sync-daemon.ts`, `src/vcs/sync-policy.ts`, and `src/cli/sync-cli.ts` for implementation details.

Tests added in `test/sync/sync-protocol-extensions.test.ts`, `test/sync/sync-daemon.test.ts`, and `test/vcs/sync-policy.test.ts`.
