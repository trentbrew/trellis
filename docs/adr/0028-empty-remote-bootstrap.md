# ADR 0028: Empty Remote Bootstrap

**Status**: Proposed  
**Date**: 2026-07-24  
**Context**: Trellis 3.4.1+

## Problem Statement

The `realtime-sync` daemon (ADR 0027) assumes both sides have existing data. When initializing a new remote environment:

1. Remote has 0 ops, 0 tracked files (empty)
2. Local has 40K+ ops, 11K+ tracked files
3. `pullAllFrom('server')` sends `want` with empty hashes
4. Remote responds with nothing (has no ops)
5. No mechanism to detect "remote is empty, push everything"

This blocks first-time sync between environments.

## Decision

### 1. Bootstrap Detection

Add a `bootstrap` phase to `SyncDaemon.start()`:

```typescript
async start(): Promise<void> {
  await this.transport.connect();
  
  // Check if remote is empty
  const remoteState = await this.checkRemoteState();
  
  if (remoteState.opCount === 0) {
    console.log('Remote is empty - initiating bootstrap');
    await this.bootstrapRemote();
  } else {
    await this.engine.pullAllFrom('server');
  }
  
  // Start periodic sync
  this.interval = setInterval(...);
}
```

### 2. Remote State Check

Add `checkRemoteState()` method:

```typescript
private async checkRemoteState(): Promise<{ opCount: number }> {
  // Send a ping/have message to get remote op count
  await this.transport.send('server', {
    version: PROTOCOL_VERSION,
    type: 'have',
    peerId: this.options.localPeerId,
    heads: {},
    opCount: this.getLocalOps().length,
  });
  
  // Wait for have response from server
  // Return opCount from response
}
```

### 3. Bootstrap Command

Add `trellis realtime-sync bootstrap` CLI command:

```bash
trellis realtime-sync bootstrap --remote <url>
```

This explicitly bootstraps a remote by:
1. Connecting to remote
2. Sending all local ops via `graph-snapshot` message
3. Sending blob store
4. Verifying receipt

### 4. Graph Snapshot Message

Implement the `graph-snapshot` message type (defined in ADR 0027 but not yet used):

```typescript
interface SyncGraphSnapshotMessage {
  version: number;
  type: 'graph-snapshot';
  peerId: string;
  snapshot: {
    ops: VcsOp[];
    blobs: Map<string, Buffer>;
    config: any;
  };
}
```

### 5. CLI Enhancement

Add `--bootstrap` flag to `realtime-sync start`:

```bash
trellis realtime-sync start --bootstrap
```

Automatically bootstraps remote if empty.

## Consequences

### Positive

- **First-time sync works** - Empty remotes can be initialized
- **Explicit control** - Bootstrap command for manual control
- **Automatic detection** - Daemon detects and bootstraps automatically
- **Full state transfer** - Uses graph-snapshot for complete state

### Negative

- **Large initial transfer** - 40K ops + blobs may be slow
- **No progress indication** - Need progress reporting for large bootstraps
- **Collision risk** - If remote has partial data, bootstrap could overwrite

### Security Considerations

- Bootstrap should require explicit confirmation in production
- Should verify remote identity before sending full state
- Should encrypt sensitive data in transit (TLS)

## Implementation

1. Add `checkRemoteState()` to `SyncDaemon`
2. Add `bootstrapRemote()` to `SyncDaemon`
3. Implement `graph-snapshot` message handling
4. Add `bootstrap` CLI command
5. Add `--bootstrap` flag to `start` command
6. Add progress reporting for large transfers
