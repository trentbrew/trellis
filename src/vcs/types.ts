/**
 * TrellisVCS Type Definitions
 *
 * VCS-specific operation kinds, payloads, and entity types
 * that extend the trellis-core kernel primitives.
 */

import type { KernelOp } from '../core/persist/backend.js';
import type { Fact, Link } from '../core/store/eav-store.js';

// ---------------------------------------------------------------------------
// VCS Operation Kinds
// ---------------------------------------------------------------------------

export type VcsOpKind =
  // Tier 0: File-level operations
  | 'vcs:fileAdd'
  | 'vcs:fileModify'
  | 'vcs:fileDelete'
  | 'vcs:fileRename'
  // Tier 1: Structural operations
  | 'vcs:dirAdd'
  | 'vcs:dirDelete'
  // VCS control operations
  | 'vcs:branchCreate'
  | 'vcs:branchDelete'
  | 'vcs:branchAdvance'
  | 'vcs:milestoneCreate'
  | 'vcs:checkpointCreate'
  | 'vcs:merge'
  // Tier 2: AST-level semantic patches (future)
  | 'vcs:symbolRename'
  | 'vcs:symbolMove'
  | 'vcs:symbolExtract'
  | 'vcs:signatureChange'
  // Issue tracking
  | 'vcs:issueCreate'
  | 'vcs:issueUpdate'
  | 'vcs:issueStart'
  | 'vcs:issuePause'
  | 'vcs:issueResume'
  | 'vcs:issueClose'
  | 'vcs:issueReopen'
  | 'vcs:issueClaim'
  | 'vcs:issueClaimRelease'
  | 'vcs:criterionAdd'
  | 'vcs:criterionUpdate'
  | 'vcs:criterionRemove'
  | 'vcs:testRun'
  // Zone capability model (ADR 0022). Authorization changes get their own kinds
  // rather than riding a generic storeAssert: a grant you cannot name in the log
  // is a grant you cannot audit.
  | 'vcs:zoneDefine'
  | 'vcs:zoneRename'
  | 'vcs:grantSet'
  | 'vcs:grantRetract'
  // Issue blocking
  | 'vcs:issueBlock'
  | 'vcs:issueUnblock'
  // Decision traces
  | 'vcs:decisionRecord'
  // Agent lanes (ADR 0001, ADR 0005)
  | 'vcs:laneCreate'
  | 'vcs:laneDrop'
  | 'vcs:lanePromoteStart'
  | 'vcs:lanePromoteComplete'
  | 'vcs:lanePromoteAbort'
  // Remote ledger peer (TRL-235)
  | 'vcs:remotePush'
  | 'vcs:remotePull'
  // EAV store (CMS / knowledge graph)
  | 'vcs:storeAssert'
  | 'vcs:storeRetract'
  | 'vcs:storeLink'
  | 'vcs:storeUnlink';

// ---------------------------------------------------------------------------
// VCS Operation Payload
// ---------------------------------------------------------------------------

/**
 * What kind of thing an issue is (ADR 0026).
 *
 * Bounded and enumerable on purpose: that is what lets `decompose` delete every
 * prior value exhaustively (ADR 0022 §2's safe-register test) instead of relying
 * on insertion order.
 */
export type IssueType = 'epic' | 'issue' | 'spike' | 'msg';

/** Every `IssueType`, for exhaustive delete-then-add in `decompose`. */
export const ISSUE_TYPES: readonly IssueType[] = [
  'epic',
  'issue',
  'spike',
  'msg',
] as const;

export interface VcsPayload {
  /**
   * Who asserted this op and over what surface (ADR 0021 §2).
   *
   * Lives inside `vcs` deliberately: `hashVcsOp` hashes the `vcs` payload
   * wholesale, so provenance is covered by the op hash with no preimage change
   * and no migration — ops minted before this field still verify, since their
   * payload simply lacks the key.
   */
  provenance?: import('../core/persist/canonical-op.js').OpProvenance;

  // File operations
  filePath?: string;
  oldFilePath?: string;
  contentHash?: string;
  oldContentHash?: string;
  size?: number;
  language?: string;

  // Branch operations
  branchName?: string;
  targetOpHash?: string;
  sourceBranch?: string;
  baseBranch?: string;
  baseOpHash?: string;

  // Milestone operations
  milestoneId?: string;
  message?: string;
  fromOpHash?: string;
  toOpHash?: string;

  // Checkpoint operations
  trigger?: 'green-build' | 'interval' | 'op-count' | 'manual';

  // Signature
  signature?: string;
  signedBy?: string;
  /** Device id that held the private key (`root` or paired deviceId). ADR 0020. */
  signedWith?: string;

  // Issue tracking
  issueId?: string;
  issueTitle?: string;
  /**
   * What KIND of thing this issue is (ADR 0026). `epic` is a container of
   * intent; leaves roll up to one via `parentIssueId`, which is how an agent
   * walks from a task to the reason it exists.
   *
   * A real field rather than an `Epic:` title prefix — the same lesson ADR 0022
   * applied to zones: a name must not do the work of a type, or you cannot query
   * it and a rename breaks it. Absent ⇒ `issue`.
   */
  issueType?: IssueType;
  /** Prior type, so a change is delete-then-add over a bounded domain. */
  oldIssueType?: IssueType;
  issueStatus?: 'backlog' | 'queue' | 'in_progress' | 'paused' | 'closed';
  oldIssueStatus?: 'backlog' | 'queue' | 'in_progress' | 'paused' | 'closed';
  issuePriority?: 'critical' | 'high' | 'medium' | 'low';
  issueLabels?: string[];
  parentIssueId?: string;
  /** Previous parent when re-parenting or clearing via issueUpdate. */
  oldParentIssueId?: string;
  issueDescription?: string;
  issueAssignee?: string;
  pauseNote?: string;
  blockedByIssueId?: string;

  // Decision traces
  decisionId?: string;
  decisionContext?: string;
  decisionRationale?: string;
  decisionAlternatives?: string;
  decisionToolName?: string;
  decisionToolInput?: string;
  decisionToolOutput?: string;

  // Acceptance criteria
  criterionId?: string;
  criterionDescription?: string;
  criterionCommand?: string;
  /** Manifest suite id from `.trellis/tests.json` when command is omitted. */
  criterionSuite?: string;
  criterionStatus?: 'pending' | 'passed' | 'failed';
  criterionOutput?: string;

  // Test runs (vcs:testRun)
  testRunId?: string;
  testRunSuite?: string;
  testRunCommand?: string;
  testRunStatus?: 'passed' | 'failed';
  testRunOutput?: string;
  testRunExitCode?: number;
  testRunDurationMs?: number;
  testRunTrigger?:
    | 'manual'
    | 'watch'
    | 'pre-promote'
    | 'pre-close'
    | 'criterion';

  // Remote ledger peer (TRL-235)
  remoteName?: string;
  remoteRepoId?: string;
  remoteTailHash?: string;
  remoteByteLength?: number;

  // Agent lanes
  laneId?: string;
  laneStatus?: 'active' | 'promoting' | 'promoted' | 'dropped';
  targetBranch?: string;
  parentLaneId?: string;
  forkKind?: 'sibling' | 'child';
  virtualBaseOpHash?: string;
  sessionId?: string;
  claimedLaneId?: string;
  claimedSessionId?: string;
  claimedAt?: string;

  // Zone capability model (ADR 0022)
  /** Immutable, authority-bearing zone id: `turtle://<ownerDid>/zone/<uuid>`. */
  zoneId?: string;
  /** Mutable human name. Renaming edits only this — never the id or grants. */
  zoneAlias?: string;
  /** Prior alias, so rename is delete-then-add rather than an append. */
  oldZoneAlias?: string;
  /** Opaque parent zoneId for nesting → grant inheritance closure. */
  zoneParent?: string;
  /** Level granted to anon (Reader = public, None = private). */
  zoneDefaultVisibility?: number;
  /** Principal a grant applies to (Agent Ed25519 did:key entity id). */
  grantPrincipal?: string;
  /** Granted level. `None` is never persisted — retraction removes the fact. */
  grantLevel?: number;
  /** Prior level, so a grant change is delete-then-add over a bounded domain. */
  oldGrantLevel?: number;

  // EAV store (CMS / knowledge graph) — see ADR 0008
  facts?: Fact[];
  links?: Link[];
}

/**
 * A VcsOp mirrors KernelOp but widens `kind` to accept VCS-specific strings.
 * We don't extend KernelOp directly because the kernel types `kind` as a
 * narrow union; our VCS kinds are a superset.
 */
/**
 * A VCS operation.
 *
 * ENVELOPE vs PAYLOAD (TRL-102). `hashVcsOp` hashes exactly
 * `{kind, timestamp, agentId, previousHash, vcs}` — so `vcs` is the payload
 * (identity-bearing) and any other top-level field is envelope (not hashed).
 * That split was previously accidental; it is now deliberate. Do not add a
 * top-level field expecting it to be covered by the hash — put it in `vcs`.
 */
export interface VcsOp {
  hash: string;
  kind: VcsOpKind | string;
  timestamp: string;
  agentId: string;
  previousHash?: string;
  vcs?: VcsPayload;

  /**
   * Envelope: local annotations attached to an op we did not mint. NOT hashed.
   *
   * `RemoteManager.prefixOp` tags pulled ops with `{e:'op', a:'remote', v:<name>}`
   * so `trellis log --remote/--all` can filter them. Being outside the preimage
   * is the point: we annotate another peer's op without invalidating its hash.
   *
   * Not to be confused with `vcs.facts`, which IS payload — that is where
   * `vcs:storeAssert` puts graph facts, and it is hashed.
   */
  facts?: import('../core/store/eav-store.js').Fact[];
  links?: import('../core/store/eav-store.js').Link[];

  /**
   * Envelope: the lane this op was minted in. NOT hashed (TRL-102).
   *
   * Ambient context, not identity — the same semantic op minted in two lanes
   * must produce the same hash, or peers lose dedup and cherry-picking across
   * lanes rewrites op identity, which breaks set-reconciliation. Lane
   * membership is also already implied by the journal the op lives in.
   *
   * Distinct from `vcs.laneId`, which is *subject* data for `vcs:laneCreate` /
   * `vcs:laneDrop` / `vcs:testRun` — those ops are ABOUT a lane, pass laneId at
   * mint, and must keep it inside the preimage or `laneCreate lane-A` would
   * hash identically to `laneCreate lane-B`.
   */
  laneId?: string;
}

// ---------------------------------------------------------------------------
// File Change Events (from watcher)
// ---------------------------------------------------------------------------

export interface FileChangeEvent {
  type: 'add' | 'modify' | 'delete' | 'rename';
  path: string;
  oldPath?: string;
  contentHash?: string;
  oldContentHash?: string;
  size?: number;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Entity ID Helpers
// ---------------------------------------------------------------------------

/**
 * Writer identity for an op: the signed Ed25519 principal, falling back to the
 * self-asserted `agentId` for unsigned ops (ADR 0022 §4).
 *
 * Lives here, not in `branch.ts`, because it is a pure function of the op and
 * `decompose` needs it. `branch.ts` imports `fs`, so importing this from there
 * dragged Node's `fs`/`path` into every consumer of `decompose` — including a
 * browser peer, which cannot bundle it at all.
 */
export function writerPrincipal(op: VcsOp): string {
  return op.vcs?.signedBy ?? op.agentId;
}

/**
 * Entity id of a per-writer branch head ("ref zone", ADR 0022 §4). `integration`
 * and the default branch collapse to the shared `branch:NAME`; every other
 * branch gets `branch:NAME@<principal>` so two writers never share a pointer.
 */
export function branchHeadEntity(
  branchName: string,
  principal?: string,
  defaultBranch = 'main',
): string {
  if (
    !principal ||
    branchName === defaultBranch ||
    branchName === 'integration'
  ) {
    return `branch:${branchName}`;
  }
  return `branch:${branchName}@${principal}`;
}

export function fileEntityId(path: string): string {
  return `file:${path}`;
}

export function dirEntityId(path: string): string {
  return `dir:${path}`;
}

export function branchEntityId(name: string): string {
  return `branch:${name}`;
}

export function milestoneEntityId(hash: string): string {
  return `milestone:${hash}`;
}

export function checkpointEntityId(hash: string): string {
  return `checkpoint:${hash}`;
}

export function issueEntityId(id: string): string {
  return id.startsWith('issue:') ? id : `issue:${id}`;
}

export function criterionEntityId(issueId: string, index: number): string {
  const bare = issueId.replace(/^issue:/, '');
  return `criterion:${bare}:ac-${index}`;
}

export function testRunEntityId(id: string): string {
  return id.startsWith('testRun:') ? id : `testRun:${id}`;
}

export function decisionEntityId(id: string): string {
  return id.startsWith('decision:') ? id : `decision:${id}`;
}

export function laneEntityId(id: string): string {
  return id.startsWith('lane:') ? id : `lane:${id}`;
}

// ---------------------------------------------------------------------------
// Repository Config
// ---------------------------------------------------------------------------

export interface TrellisVcsConfig {
  /** Absolute path to the repository root. */
  rootPath: string;

  /** Glob patterns to ignore (e.g. ['node_modules', '.git', '*.log']). */
  ignorePatterns: string[];

  /** Debounce interval for file watcher in ms. */
  debounceMs: number;

  /** Name of the default branch. */
  defaultBranch: string;

  /** Path to the .trellis database file. */
  dbPath: string;

  /** Whether init/watch should reconcile existing workspace files by default. */
  indexWorkspace: boolean;

  /** Stable ledger identity (ADR 0031) — independent of checkout path. */
  repoId?: string;

  /** Agent lane filesystem bind (ADR 0014 Phase 2). */
  lanes?: {
    /** Provision git worktrees per lane; default true on init. */
    worktreeBind?: boolean;
    /** Auto-prune worktrees after N days of inactivity (default: 7). */
    worktreeRetentionDays?: number;
  };

  /** Git mirror adapter — sync integration to main at promote/close. */
  git?: {
    /** Auto-commit on lane promote (default true on init). */
    syncOnPromote?: boolean;
    /** Push on issue close when --push or this flag is set. */
    pushOnClose?: boolean;
    /** Remote name for push (default origin). */
    remote?: string;
    /** Branch to commit on (default defaultBranch). */
    branch?: string;
  };

  /** Milestone → git commit automation. */
  milestones?: {
    /** Auto-commit integration to git (with the milestone message) on create. */
    autoCommit?: boolean;
  };
}

export const DEFAULT_CONFIG: Omit<TrellisVcsConfig, 'rootPath'> = {
  ignorePatterns: [
    'node_modules',
    '.git',
    '.trellis',
    'dist',
    'build',
    '.DS_Store',
    '*.log',
    '.vercel',
    '.next',
    'coverage',
    'target/',
    '*.sqlite',
    '.turbo',
    '.output',
  ],
  debounceMs: 300,
  defaultBranch: 'main',
  dbPath: '.trellis/trellis.db',
  indexWorkspace: false,
};
