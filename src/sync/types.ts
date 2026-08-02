/**
 * Peer Sync — Type Definitions
 *
 * DESIGN.md §3.5, §10.5 — Peer sync + CRDTs.
 * Types for peer identity, sync messages, causal DAG, and
 * branch concurrency modes.
 */

import type { VcsOp } from '../vcs/types.js';

// ---------------------------------------------------------------------------
// Peer Identity
// ---------------------------------------------------------------------------

export interface PeerId {
  /** Unique peer identifier (typically derived from identity DID). */
  id: string;
  /** Human-readable display name. */
  name: string;
  /** Last seen timestamp. */
  lastSeen?: string;
}

// ---------------------------------------------------------------------------
// Sync Messages
// ---------------------------------------------------------------------------

/**
 * Wire protocol version. Bumped when the message shape or semantics change
 * in a way that older peers cannot safely ignore. All outbound messages
 * carry this value; receivers reject anything outside the supported range
 * with a `protocol-version` nack.
 */
export const PROTOCOL_VERSION = 1 as const;
export const MIN_SUPPORTED_VERSION = 1 as const;
export const MAX_SUPPORTED_VERSION = 1 as const;

export type SyncMessage =
  | SyncHaveMessage
  | SyncWantMessage
  | SyncOpsMessage
  | SyncAckMessage
  | SyncNackMessage
  | SyncSnapshotRequestMessage
  | SyncSnapshotMessage
  | SyncGraphSnapshotMessage
  | SyncLaneJournalMessage
  | SyncDecisionTraceMessage
  | SyncEntityDeltaMessage
  | SyncDeviceRevokedMessage;

export type SyncMessageHandler = (message: SyncMessage) => void | Promise<void>;

/**
 * Categorical reasons a receiver may reject ops sent over the wire.
 *
 * Engine-level reasons (`invalid-kind`, `hash-mismatch`, `missing-dependency`,
 * `apply-failed`) mirror `IntegrateOpRejectReason` so engine rejections flow
 * back to the sender unchanged. Wire-level reasons (`protocol-version`)
 * describe failures detected by the sync layer itself. The union is kept
 * separate so the wire protocol does not drift with engine internals.
 */
export type NackReason =
  | 'invalid-kind'
  | 'hash-mismatch'
  | 'missing-dependency'
  | 'apply-failed'
  | 'protocol-version'
  | 'destructive-op'
  | 'bulk-delete'
  | 'system-modification'
  | 'quarantine-required'
  | 'rate_limited';

/** Advertise which op hashes we have. */
export interface SyncHaveMessage {
  version: number;
  type: 'have';
  peerId: string;
  /** Our head op hashes (one per branch). */
  heads: Record<string, string>;
  /** Total op count for quick comparison. */
  opCount: number;
}

/** Request ops we're missing. */
export interface SyncWantMessage {
  version: number;
  type: 'want';
  peerId: string;
  /** Op hashes we need (those the remote has but we don't). */
  wantHashes: string[];
  /** Alternatively: request all ops after a given hash. */
  afterHash?: string;
  /**
   * When set with empty `wantHashes` and no `afterHash`, request a truncated
   * tail snapshot instead of the full room log (late-joiner catch-up).
   */
  maxOps?: number;
}

/** Request a truncated tail snapshot from a room peer. */
export interface SyncSnapshotRequestMessage {
  version: number;
  type: 'sync-snapshot';
  peerId: string;
  /** Max ops in the tail. Default chosen by the room (usually 500). */
  maxOps?: number;
}

/**
 * Room response: recent tail of the canonical log plus metadata.
 * Clients integrate `ops` like a normal `ops` message.
 */
export interface SyncSnapshotMessage {
  version: number;
  type: 'snapshot';
  peerId: string;
  /** Head hash of the full room log (may be beyond the returned tail). */
  headHash?: string;
  /** Total ops in the room canonical log. */
  opCount: number;
  /** True when `ops` is a truncated tail, not the full log. */
  truncated: boolean;
  ops: VcsOp[];
}

/** Send a batch of ops. */
export interface SyncOpsMessage {
  version: number;
  type: 'ops';
  peerId: string;
  ops: VcsOp[];
}

/** Acknowledge receipt. */
export interface SyncAckMessage {
  version: number;
  type: 'ack';
  peerId: string;
  /** Hashes of ops we've integrated (or already had). */
  integrated: string[];
}

/**
 * Reject one or more ops. Grouped by `reason` so a single batch may produce
 * several nacks if rejections fall into multiple categories.
 */
export interface SyncNackMessage {
  version: number;
  type: 'nack';
  peerId: string;
  /** Hashes of ops that were rejected for this reason. */
  refs: string[];
  reason: NackReason;
  /** Optional human-readable detail for logs. */
  details?: string;
}

// ---------------------------------------------------------------------------
// Full-State Sync Messages (TRL-334)
// ---------------------------------------------------------------------------

/**
 * SQLite database snapshot for full graph state sync.
 * Contains the complete graph database as a binary snapshot.
 */
export interface SyncGraphSnapshotMessage {
  version: number;
  type: 'graph-snapshot';
  peerId: string;
  /** SHA-256 hash of the snapshot data. */
  snapshotHash: string;
  /** Base64-encoded SQLite database snapshot. */
  snapshotData: string;
  /** Total entity count in snapshot. */
  entityCount: number;
  /** Snapshot timestamp. */
  timestamp: string;
}

/**
 * Lane-specific op journal for multi-agent isolation.
 * Syncs lane journals separately from integration ops.
 */
export interface SyncLaneJournalMessage {
  version: number;
  type: 'lane-journal';
  peerId: string;
  /** Lane ID (UUID). */
  laneId: string;
  /** Head hash of this lane's journal. */
  headHash: string;
  /** JSONL-encoded lane journal ops. */
  journalData: string;
  /** Total ops in this lane. */
  opCount: number;
}

/**
 * Decision trace history for audit trail sync.
 * Syncs structured decision traces between environments.
 */
export interface SyncDecisionTraceMessage {
  version: number;
  type: 'decision-trace';
  peerId: string;
  /** Decision trace ID. */
  traceId: string;
  /** JSON-encoded decision trace data. */
  traceData: string;
  /** Associated issue/operation ID. */
  relatedOpId?: string;
}

/**
 * Incremental entity delta for efficient graph updates.
 * Contains only changed entities (add/modify/delete).
 */
export interface SyncEntityDeltaMessage {
  version: number;
  type: 'entity-delta';
  peerId: string;
  /** Delta hash for deduplication. */
  deltaHash: string;  /** Base snapshot hash this delta applies to. */
  baseSnapshotHash: string;
  /** JSON-encoded entity changes. */
  entityData: string;
  /** Number of entities in this delta. */
  entityCount: number;
  /** Change types present: add, modify, delete. */
  changeTypes: ('add' | 'modify' | 'delete')[];
}

/**
 * Device revocation signal (Slice D — docs/planning/device-registry-and-
 * sprite-pairing.md). Sent by the revoking machine so clones and sprites
 * update their local registries; the resolver then fails closed on the
 * revoked key (ADR 0036 §2).
 */
export interface SyncDeviceRevokedMessage {
  version: number;
  type: 'device-revoked';
  peerId: string;
  /** The revoked device id (as registered under the identity). */
  deviceId: string;
  /** Identity the device was paired under. */
  identityEntityId: string;
  /** Device id of the revoking machine (root for CLI revocation). */
  revokedBy: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Sync State
// ---------------------------------------------------------------------------

export interface SyncState {
  /** Our peer identity. */
  localPeerId: string;
  /** Known peers and their head hashes. */
  peerHeads: Map<string, Record<string, string>>;
  /** Ops we've sent but not yet acknowledged. */
  pendingAcks: Set<string>;
  /** Last sync timestamp per peer. */
  lastSync: Map<string, string>;
}

// ---------------------------------------------------------------------------
// Branch Concurrency Policy
// ---------------------------------------------------------------------------

export interface BranchPolicy {
  /** If true, only fast-forward appends (one writer). Default. */
  linear: boolean;
}

// ---------------------------------------------------------------------------
// Sync Transport (abstract interface)
// ---------------------------------------------------------------------------

export interface SyncTransport {
  /** Send a message to a specific peer. */
  send(peerId: string, message: SyncMessage): Promise<void>;
  /** Register a handler for incoming messages. */
  onMessage(handler: SyncMessageHandler): void;
  /** List connected peers. */
  peers(): PeerId[];
  /** Connect to the sync endpoint (or to a peer, for per-peer transports like the WebSocket one). */
  connect?(peerId?: string, url?: string): Promise<void>;
  /** Disconnect from the sync endpoint (or from a peer). */
  disconnect?(peerId?: string): Promise<void>;
}
