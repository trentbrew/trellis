# Proposal: Realtime Full-State Sync with Safety Layers

**TRL-333** (Proposal) · **Parent:** ADR 0027  
**Status:** Proposal  
**Date:** 2026-07-30  
**Related:** `src/sync/sync-daemon.ts`, `src/sync/types.ts`, `src/vcs/sync-policy.ts`

---

## 1. Current State Audit

ADR 0027 defined the architecture. Parts are implemented; the core full-state message handlers are not.

### Implemented
| Component | File | Status |
|-----------|------|--------|
| Protocol types | `src/sync/types.ts` | ✅ 4 new message types defined |
| WebSocket transport | `src/sync/websocket-transport.ts` | ✅ Auto-reconnect, rate limiting, TLS, auth |
| Sync daemon scaffold | `src/sync/sync-daemon.ts` | ✅ Starts, connects, periodic push/pull of ops |
| Risk classification | `src/vcs/sync-policy.ts` | ✅ All 4 types classified |
| Safety gates | `src/vcs/sync-policy.ts` | ✅ Block, quarantine, policy profiles |
| Audit trail | `src/sync/audit-trail.ts` | ✅ JSONL log |
| Rate limiter | `src/sync/rate-limiter.ts` | ✅ Token bucket |
| Quarantine store | `src/vcs/sync-policy.ts` | ✅ AES-256 encrypted |
| CLI commands | `src/cli/sync-cli.ts` | ✅ start/status/pause/quarantine |
| Sync policy tests | `test/vcs/sync-policy.test.ts` | ✅ Risk + block + quarantine tests |

### Not Implemented (Gap)
| Component | Status |
|-----------|--------|
| Daemon: `handleGraphSnapshot()` | ❌ Not wired — room core returns `[]` |
| Daemon: `handleLaneJournal()` | ❌ Not wired |
| Daemon: `handleDecisionTrace()` | ❌ Not wired |
| Daemon: `handleEntityDelta()` | ❌ Not wired |
| Graph snapshot generation | ❌ No method to export SQLite snapshot |
| Graph snapshot apply/import | ❌ No method to import SQLite snapshot |
| Lane journal export | ❌ No lane journal serialization |
| Lane journal import | ❌ No lane journal deserialization |
| Entity delta computation | ❌ No diff/generation logic |
| Entity delta apply | ❌ No patch/apply logic |
| Bootstrap flow (full state) | ❌ Only op-level bootstrap exists |
| Integration tests | ❌ No roundtrip tests for full-state sync |

---

## 2. Message Flow Design

Each full-state message type flows through the daemon independently, bypassing `SyncRoomCore` and `SyncEngine`.

### 2.1 `graph-snapshot` — Full DB Transfer

**Purpose:** Transfer the complete SQLite database to bootstrap or recover a peer.

**Flow:**
```
Sender                            Receiver
  │                                  │
  ├─ generate SQLite snapshot ──────►│
  │   (VACUUM INTO + base64)        ├─ validate snapshotHash
  │   snapshotHash = SHA256(data)   ├─ decode + write to temp
  │   entityCount = count(*)        ├─ verify hash
  │                                  ├─ backup current DB
  │                                  ├─ swap snapshot in
  │                                  ├─ replay retained ops
  │                                  └─ send ack/nack
  ◄──── ack/nack ───────────────────│
```

**Design decisions:**
- Snapshots are full DB exports, not incremental — safe for initial bootstrap
- `VACUUM INTO` ensures a consistent, compact snapshot
- Backup-before-swap provides rollback
- Post-swap op replay catches up to any ops received during transfer
- Size limit: reject snapshots > 100 MB (configurable)

**Handler interface:**
```typescript
// On daemon (receiver side, called from transport.onMessage)
async handleGraphSnapshot(msg: SyncGraphSnapshotMessage): Promise<void> {
  if (msg.snapshotData.length > MAX_SNAPSHOT_SIZE) return nack('snapshot-too-large');
  const hash = sha256(msg.snapshotData);
  if (hash !== msg.snapshotHash) return nack('hash-mismatch');
  await this.backupCurrentDb();
  await this.applySnapshot(msg.snapshotData);
  await this.replayPendingOps();
  await this.acknowledge();
}
```

### 2.2 `lane-journal` — Multi-Agent Isolation Sync

**Purpose:** Sync lane-specific op journals so lane state is available across environments.

**Flow:**
```
Sender                            Receiver
  │                                  │
  ├─ serialize lane journal ────────►│
  │   (JSONL of ops since           ├─ check lane exists
  │    last known head)              ├─ verify headHash chain
  │   headHash = last op hash        ├─ merge into local lane journal
  │   opCount = total ops            ├─ update lane head
  │                                  └─ send ack/nack
  ◄──── ack/nack ───────────────────│
```

**Design decisions:**
- Lane journals are independent of integration ops — synced separately
- `headHash` enables causal integrity check
- Merge is fast-forward only (linear lane policy)
- If lane doesn't exist locally, create it

### 2.3 `decision-trace` — Audit Trail Replication

**Purpose:** Sync decision traces so audit/history is available on all environments.

**Flow:**
```
Sender                            Receiver
  │                                  │
  ├─ serialize decision trace ──────►│
  │                                 ├─ dedup by traceId
  │                                 ├─ store in decision store
  │                                 └─ send ack
  ◄──── ack ────────────────────────│
```

**Design decisions:**
- Decision traces are idempotent (dedup by `traceId`)
- No conflict resolution needed — traces are append-only
- `relatedOpId` links to specific operations for cross-referencing

### 2.4 `entity-delta` — Incremental Graph Sync

**Purpose:** Efficiently transfer only changed entities (add/modify/delete) rather than full snapshots.

**Flow:**
```
Sender                            Receiver
  │                                  │
  ├─ compute delta ─────────────────►│
  │   (diff current state           ├─ validate baseSnapshotHash
  │    vs last known snapshot)       ├─ for each entity:
  │   deltaHash = SHA256(data)       │   add    → create entity
  │   changeTypes = [add,modify,...] │   modify → update entity
  │   entityCount = N               │   delete → remove entity
  │                                  ├─ update tracking
  │                                  └─ send ack/nack
  ◄──── ack/nack ───────────────────│
```

**Design decisions:**
- Deltas reference a `baseSnapshotHash` — receiver must have that snapshot or request it
- Deletes are classified as destructive by `sync-policy.ts` and may be quarantined
- Large deltas (>1000 entities) should be chunked
- Apply is wrapped in a transaction for atomicity

---

## 3. Bootstrap and Recovery Flow

```
Cold Start:
  ┌─────────────┐     ┌────────────────┐
  │  Peer A     │     │  Peer B        │
  │  (empty)    │     │  (has state)   │
  └──────┬──────┘     └───────┬────────┘
         │                    │
         │  sync-snapshot     │
         │───────────────────►│
         │                    │
         │  graph-snapshot    │
         │◄───────────────────│
         │                    │
         │  (apply snapshot)  │
         │                    │
         │  lane-journal(s)   │
         │◄───────────────────│
         │                    │
         │  decision-trace(s) │
         │◄───────────────────│
         │                    │
         │  ops (catch-up)    │
         │◄───────────────────│
         │                    │
```

**Recovery from snapshot failure:**
1. Backup current DB before applying
2. If apply fails → restore backup, send nack
3. If hash mismatch → request re-send
4. If partial apply (crash) → on restart, detect stale snapshot and re-request

---

## 4. Daemon Handler Integration

The daemon needs four handler methods and a routing switch in `onMessage`:

```typescript
// In SyncDaemon constructor or onMessage callback:
transport.onMessage(async (message) => {
  switch (message.type) {
    case 'graph-snapshot':  return this.handleGraphSnapshot(message);
    case 'lane-journal':    return this.handleLaneJournal(message);
    case 'decision-trace':  return this.handleDecisionTrace(message);
    case 'entity-delta':    return this.handleEntityDelta(message);
    default:                // forward to SyncEngine (have/want/ops/etc)
  }
});
```

### Required Kernel/SDK APIs
| API | Needed For | Status |
|-----|-----------|--------|
| `kernel.exportSnapshot(): Buffer` | graph-snapshot send | ❌ Missing |
| `kernel.importSnapshot(data: Buffer): void` | graph-snapshot receive | ❌ Missing |
| `kernel.getEntityDeltas(baseSnapshot: string): EntityDelta[]` | entity-delta send | ❌ Missing |
| `kernel.applyEntityDelta(delta: EntityDelta): void` | entity-delta receive | ❌ Missing |
| `engine.exportLaneJournal(laneId: string): string` | lane-journal send | ❌ Missing |
| `engine.importLaneJournal(laneId: string, data: string): void` | lane-journal receive | ❌ Missing |
| `decisions.exportTraces(): DecisionTrace[]` | decision-trace send | ❌ Missing |
| `decisions.importTrace(trace: DecisionTrace): void` | decision-trace receive | ❌ Missing |

---

## 5. Safety and Validation

### Per-Message Checks

| Message Type | Validation | Risk |
|-------------|-----------|------|
| `graph-snapshot` | Size limit, hash verification, schema version | Elevated |
| `lane-journal` | headHash chain continuity, lane exists | Safe |
| `decision-trace` | Dedup by traceId, trace schema | Safe |
| `entity-delta` | baseSnapshotHash known, per-entity validation, transaction atomicity | Elevated (destructive if deletes) |

### Cross-Cutting Safety

All four message types pass through the existing safety pipeline:
1. **Rate limiter** — token bucket check
2. **Risk classification** — `classifyChangeRisk()` per type
3. **Policy check** — `shouldBlockMessage()` with env-specific policy
4. **Quarantine** — encrypted store if blocked

---

## 6. Open Questions

1. **Snapshot compression** — Should `graph-snapshot` data be gzip-compressed before base64 encoding? 100 MB base64 = ~75 MB raw SQLite. Proposal: yes, compress.

2. **Chunking** — Should `entity-delta` messages > 1000 entities be auto-chunked by the sender? Proposal: yes, with sequence numbers for reassembly.

3. **Conflict resolution for deltas** — If two peers send entity-deltas concurrently, how do we resolve? Proposal: last-writer-wins with `updatedAt` timestamp comparison, logged to audit trail.

4. **Lane journal pruning** — Lane journals grow unbounded. Should we snapshot + truncate after sync? Proposal: yes, with a `lane-snapshot` sub-message type.

5. **Snapshot scheduling** — Should `graph-snapshot` be sent on a schedule (e.g., daily) in addition to bootstrap? Proposal: not for MVP; only on bootstrap or explicit request.

---

## 7. Implementation Order

| Phase | What | Depends On |
|-------|------|-----------|
| P1 | Kernel snapshot export/import APIs | Kernel |
| P2 | Daemon: `handleGraphSnapshot()` | P1 |
| P3 | Entity delta computation + apply | Kernel |
| P4 | Daemon: `handleEntityDelta()` | P3 |
| P5 | Lane journal export/import APIs | VCS engine |
| P6 | Daemon: `handleLaneJournal()` | P5 |
| P7 | Decision trace export/import APIs | Decisions module |
| P8 | Daemon: `handleDecisionTrace()` | P7 |
| P9 | Integration tests (full roundtrip) | P2, P4, P6, P8 |
| P10 | Bootstrap flow (orchestrated snapshot + deltas) | P2 |

---

## 8. Acceptance Criteria

- [ ] Daemon receives `graph-snapshot` and applies it to local DB
- [ ] Daemon generates and sends `graph-snapshot` on request
- [ ] Entity deltas are computed, sent, received, and applied incrementally
- [ ] Lane journals sync independently of integration ops
- [ ] Decision traces replicate across environments with dedup
- [ ] All four message types pass through rate limiter, risk classification, policy check, and quarantine
- [ ] Bootstrap flow: empty peer requests snapshot, receives full state, catches up with deltas
- [ ] Snapshot apply failure rolls back safely
- [ ] Integration test covers full roundtrip: connect → snapshot → deltas → verify equality
