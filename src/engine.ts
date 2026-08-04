/**
 * TrellisVCS Engine
 *
 * The composition root that ties together the trellis-core kernel,
 * the file watcher, the ingestion pipeline, and VCS middleware.
 *
 * Usage:
 *   const engine = new TrellisVcsEngine({ rootPath: '/path/to/repo' });
 *   await engine.init();    // scan + create initial ops
 *   engine.watch();         // start continuous monitoring
 *   engine.stop();          // stop watcher
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'fs';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { EAVStore } from './core/store/eav-store.js';
import type { Fact, Link } from './core/store/eav-store.js';
import { FileWatcher, type ScanProgress } from './watcher/fs-watcher.js';
import { Ingestion } from './watcher/ingestion.js';
import { decompose } from './vcs/decompose.js';
import { createVcsOp, isVcsOpKind, verifyVcsOpHash } from './vcs/ops.js';
import { enforceIngestAuthorization } from './identity/capability.js';
import { getSigningMaterial } from './identity/pairing.js';
import { peerKeyResolver } from './identity/peer-key-resolver.js';
import type { IdentityResolver } from './identity/signing-middleware.js';
import { PROVENANCE } from './core/persist/canonical-op.js';
import type { OpProvenance } from './core/persist/canonical-op.js';
import type { VcsOp, TrellisVcsConfig } from './vcs/types.js';
import { DEFAULT_CONFIG } from './vcs/types.js';
import { BlobStore } from './vcs/blob-store.js';
import { BlobResolver } from './vcs/blob-resolver.js';
import type { EngineContext, ApplyOpOptions } from './vcs/engine-context.js';
import * as branchMod from './vcs/branch.js';
import * as milestoneMod from './vcs/milestone.js';
import * as checkpointMod from './vcs/checkpoint.js';
import { writeCheckpoint, loadCheckpoint } from './protocol/whereami.js';
import type { ReentryCheckpoint } from './protocol/whereami.js';
import * as diffMod from './vcs/diff.js';
import * as mergeMod from './vcs/merge.js';
import * as issueMod from './vcs/issue.js';
import * as testRunnerMod from './vcs/test-runner.js';
import { ensureDefaultTestManifest } from './vcs/test-manifest.js';
import * as storeMod from './vcs/store.js';
import { createProjectAttestation } from './vcs/project.js';
import type { Atom } from './core/store/eav-store.js';
import type { EntityRecord } from './core/kernel/trellis-kernel.js';
import * as decisionMod from './decisions/index.js';
import * as transcriptMod from './vcs/transcript.js';
import { IdeaGarden, buildMilestonedOpHashes } from './garden/index.js';
import {
  typescriptParser,
  pythonParser,
  goParser,
  rustParser,
  rubyParser,
  javaParser,
  csharpParser,
} from './semantic/index.js';
import type {
  ParseResult,
  SemanticPatch,
  ParserAdapter,
} from './semantic/types.js';
import { inferProjectContext } from './scaffold/infer.js';
import { loadProfile } from './scaffold/profile.js';
import { writeAgentScaffold } from './scaffold/write.js';
import type { ProjectContext } from './scaffold/infer.js';

import { JsonOpLog, LaneOpLog } from './vcs/op-log.js';
import type { OpLog } from './vcs/op-log.js';
import * as laneMod from './vcs/lane.js';
import type { LaneMeta } from './vcs/lane.js';
import * as lanePromoteMod from './vcs/lane-promote.js';
import type { LanePromoteResult } from './vcs/lane-promote.js';
import * as materializeMod from './vcs/lane-materialize.js';
import type {
  IntegrationCache,
  MaterializationStats,
} from './vcs/lane-materialize.js';
import {
  integrationSnapshotPath,
  savePersistedSnapshot,
} from './vcs/integration-snapshot.js';
import * as laneWorktreeMod from './vcs/lane-worktree.js';
import * as laneOwnershipMod from './vcs/lane-ownership.js';
import * as laneCoherenceMod from './vcs/lane-coherence.js';
import * as issueClaimMod from './vcs/issue-claim.js';
import * as promoteLockMod from './vcs/promote-lock.js';
import {
  buildPromoteCommitMessage,
  syncIntegrationToGit,
  type GitSyncResult,
} from './git/git-sync.js';

/**
 * Parse an ignore file (.gitignore or .trellisignore) and return normalized
 * patterns. Strips comments, blank lines, and trailing slashes.
 */
function parseIgnoreFile(filePath: string): string[] {
  if (!existsSync(filePath)) return [];
  try {
    const content = readFileSync(filePath, 'utf-8');
    return content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'))
      .map((line) => line.replace(/\/$/, '')); // strip trailing slash
  } catch {
    return [];
  }
}

/**
 * Read ignore patterns from both .gitignore and .trellisignore.
 * .trellisignore allows ignoring paths that are tracked by Git but
 * should not be tracked by TrellisVCS (e.g. source-linked dependencies).
 */
function readIgnorePatterns(rootPath: string): string[] {
  return [
    ...parseIgnoreFile(join(rootPath, '.gitignore')),
    ...parseIgnoreFile(join(rootPath, '.trellisignore')),
  ];
}

const TRELLIS_GITIGNORE_ENTRY = '.trellis/';

function hasTrellisGitignoreEntry(content: string): boolean {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .some((line) => {
      const normalized = line.replace(/\/$/, '');
      return normalized === '.trellis' || normalized === '/.trellis';
    });
}

function ensureTrellisGitignoreEntry(rootPath: string): void {
  const gitignorePath = join(rootPath, '.gitignore');
  if (!existsSync(gitignorePath)) {
    writeFileSync(gitignorePath, `${TRELLIS_GITIGNORE_ENTRY}\n`);
    return;
  }

  const content = readFileSync(gitignorePath, 'utf-8');
  if (hasTrellisGitignoreEntry(content)) {
    return;
  }

  const separator = content.length === 0 || content.endsWith('\n') ? '' : '\n';
  writeFileSync(
    gitignorePath,
    `${content}${separator}${TRELLIS_GITIGNORE_ENTRY}\n`,
  );
}

// ---------------------------------------------------------------------------
// Config persistence
// ---------------------------------------------------------------------------

interface PersistedConfig {
  rootPath: string;
  ignorePatterns: string[];
  debounceMs: number;
  defaultBranch: string;
  indexWorkspace?: boolean;
  lanes?: TrellisVcsConfig['lanes'];
  git?: TrellisVcsConfig['git'];
  repoId?: string;
  project?: TrellisVcsConfig['project'];
  agentId: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export interface InitProgress {
  phase: 'discovering' | 'hashing' | 'recording' | 'scaffolding' | 'done';
  current: number;
  total: number;
  message: string;
}

export interface InitRepoOptions {
  onProgress?: (progress: InitProgress) => void;
  indexWorkspace?: boolean;
}

export interface InitRepoResult {
  opsCreated: number;
  filesIndexed: number;
  indexWorkspace: boolean;
  context: ProjectContext;
}

export interface IndexWorkspaceResult {
  opsCreated: number;
  filesIndexed: number;
}

/** Issue lifecycle + acceptance criteria land on integration; issueUpdate stays lane-local. */
const ISSUE_INTEGRATION_KINDS = new Set<string>([
  'vcs:issueCreate',
  'vcs:issueStart',
  'vcs:issuePause',
  'vcs:issueResume',
  'vcs:issueClose',
  'vcs:issueReopen',
  'vcs:issueClaim',
  'vcs:issueClaimRelease',
  'vcs:criterionAdd',
  'vcs:criterionUpdate',
  'vcs:criterionRemove',
  'vcs:issueBlock',
  'vcs:issueUnblock',
  // ADR 0022: zone/grant ops are repo-level authorization. A grant that stayed
  // lane-local would be invisible until promote — a boundary nobody can see.
  'vcs:zoneDefine',
  'vcs:zoneRename',
  'vcs:grantSet',
  'vcs:grantRetract',
  'vcs:remotePush',
  'vcs:remotePull',
]);

export type IntegrateOpRejectReason =
  | 'invalid-kind'
  | 'hash-mismatch'
  | 'unauthorized'
  | 'missing-dependency'
  | 'apply-failed';

export interface IntegrateOpRejection {
  op: VcsOp;
  reason: IntegrateOpRejectReason;
  message: string;
}

export interface IntegrateOpsResult {
  applied: number;
  skipped: number;
  rejected: IntegrateOpRejection[];
}

export class TrellisVcsEngine {
  private config: TrellisVcsConfig;
  /** Optional identity resolver for ingest-time signature verification (ADR 0022 Phase 3). */
  private identityResolver?: IdentityResolver;
  /** Local signing material; when present, the engine mints signed auth ops. */
  private signingMaterial?: {
    privateKey: string;
    identityEntityId: string;
    signedWith: string;
  };
  private store: EAVStore;
  private opLog: OpLog;
  private watcher: FileWatcher | null = null;
  private ingestion: Ingestion | null = null;
  private agentId: string;
  /** ADR 0021 §2 — stamped onto every op this engine mints. */
  private provenance: OpProvenance;
  private currentBranch: string = 'main';
  private checkpointOpCount: number = 0;
  private checkpointThreshold: number = 100;
  private _pendingAutoCheckpoint: boolean = false;
  private _blobStore: BlobStore | null = null;
  private _blobResolver: BlobResolver | null = null;
  private activeLaneId?: string;
  private activeLaneLog: LaneOpLog | null = null;
  private integrationCache: IntegrationCache | null = null;
  private materializationStats: MaterializationStats =
    materializeMod.emptyMaterializationStats();
  private watchReconcileOnRestart = false;

  constructor(
    opts: {
      rootPath: string;
      agentId?: string;
      /**
       * Optional custom op-log backend. Defaults to a filesystem-backed
       * {@link JsonOpLog} at `<rootPath>/.trellis/ops.json`. Browser hosts
       * can inject an {@link IdbOpLog} or other {@link OpLog} implementation.
       *
       * Callers that inject a non-filesystem backend are responsible for
       * awaiting `opLog.load()` before passing it in if their backend's
       * load is asynchronous.
       */
      opLog?: OpLog;
      /**
       * Provenance stamped onto every op this engine mints (ADR 0021 §2).
       * Set per construction site — the engine is built by the CLI, the MCP
       * server and the UI server, each of which knows its own surface.
       * Defaults to the honest `{ actorType: 'machine', origin: 'sdk' }`.
       */
      provenance?: OpProvenance;
      /**
       * Optional identity resolver used to cryptographically verify op
       * signatures at the ingest boundary (ADR 0022 Phase 3). When present,
       * authorization-bearing ops (grant/zone) must carry a valid signature;
       * when absent, the kernel still requires a signature envelope to exist
       * (deny-by-default for unattributable auth ops).
       */
      identityResolver?: IdentityResolver;
      /**
       * Local signing material (ADR 0022 Phase 3). When present, the engine
       * mints signed authorization ops so a peer's ingest boundary can verify
       * them. Constructed by hosts that have an identity; absent for
       * identity-less repos, where no resolver is wired either.
       */
      signingMaterial?: {
        privateKey: string;
        identityEntityId: string;
        signedWith: string;
      };
    } & Partial<TrellisVcsConfig>,
  ) {
    // Merge default ignore patterns with .gitignore if present
    const gitignorePatterns = readIgnorePatterns(opts.rootPath);
    const mergedIgnore = [
      ...new Set([
        ...(opts.ignorePatterns ?? DEFAULT_CONFIG.ignorePatterns),
        ...gitignorePatterns,
      ]),
    ];

    this.config = {
      rootPath: opts.rootPath,
      ignorePatterns: mergedIgnore,
      debounceMs: opts.debounceMs ?? DEFAULT_CONFIG.debounceMs,
      defaultBranch: opts.defaultBranch ?? DEFAULT_CONFIG.defaultBranch,
      dbPath: opts.dbPath ?? DEFAULT_CONFIG.dbPath,
      indexWorkspace: opts.indexWorkspace ?? DEFAULT_CONFIG.indexWorkspace,
      lanes: opts.lanes,
    };
    this.agentId = opts.agentId ?? `agent:${process.env.USER ?? 'unknown'}`;
    this.provenance = opts.provenance ?? PROVENANCE.sdk;
    this.identityResolver = opts.identityResolver;
    this.signingMaterial = opts.signingMaterial;

    // ADR 0022 Phase 3.2 — default BOTH halves from the local identity.
    //
    // These were opt-in, and nothing in src/ passed either, so in every real
    // repo the gate ran resolver-less: it required only that *some* signature
    // field exist and then trusted `signedBy` as a claimed identity. A forger
    // set two strings and was authorized as the zone owner. The mirror failure
    // was just as bad — local auth ops minted unsigned, so a peer's gate
    // rejected them and legitimate grants could never replicate.
    //
    // `pairingResolver` semantics live inside `peerKeyResolver`, which already
    // reads the same directory (ADR 0036: local identity ∪ peer graph).
    // Signing material resolves device-first (paired device signs as the
    // identity, ADR 0020), falling back to the identity root (ADR 0032 §3 —
    // person `~/.trellis/identity.json` authoritative, legacy per-repo key
    // fallback). A repo with no identity keeps both undefined and is unchanged.
    if (!this.signingMaterial) {
      const material = getSigningMaterial(this.trellisDir());
      if (material) this.signingMaterial = material;
    }
    if (!this.identityResolver) {
      this.identityResolver = peerKeyResolver(this.trellisDir());
    }
    this.store = new EAVStore();
    this.opLog =
      opts.opLog ??
      new JsonOpLog(join(this.config.rootPath, '.trellis', 'ops.json'));
  }

  private readPersistedConfig(): PersistedConfig | null {
    const configPath = join(this.config.rootPath, '.trellis', 'config.json');
    if (!existsSync(configPath)) return null;

    try {
      return JSON.parse(readFileSync(configPath, 'utf-8'));
    } catch {
      return null;
    }
  }

  private writePersistedConfig(createdAt?: string): PersistedConfig {
    const existing = this.readPersistedConfig();
    const persistedConfig: PersistedConfig = {
      // Preserve unknown/harness keys (e.g. `transcripts`) across re-inits —
      // re-initializing a repo must never clobber opt-in config.
      ...(existing ?? {}),
      rootPath: this.config.rootPath,
      ignorePatterns: this.config.ignorePatterns,
      debounceMs: this.config.debounceMs,
      defaultBranch: this.config.defaultBranch,
      indexWorkspace: this.config.indexWorkspace,
      lanes: this.config.lanes,
      git: this.config.git,
      agentId: this.agentId,
      createdAt: createdAt ?? existing?.createdAt ?? new Date().toISOString(),
    };

    const configPath = join(this.config.rootPath, '.trellis', 'config.json');
    writeFileSync(configPath, JSON.stringify(persistedConfig, null, 2));
    return persistedConfig;
  }

  private async indexExistingFiles(opts?: {
    onProgress?: (progress: InitProgress) => void;
  }): Promise<IndexWorkspaceResult> {
    if (!this._blobStore) {
      this._blobStore = new BlobStore(join(this.config.rootPath, '.trellis'));
    }

    const scanner = new FileWatcher({
      rootPath: this.config.rootPath,
      ignorePatterns: [...this.config.ignorePatterns, '.trellis'],
      debounceMs: this.config.debounceMs,
      onEvent: () => { },
    });
    const scanEvents = await scanner.scan({
      onProgress: (progress: ScanProgress) => {
        if (progress.phase === 'done') {
          return;
        }
        opts?.onProgress?.({
          phase: progress.phase,
          current: progress.current,
          total: progress.total,
          message: progress.message,
        });
      },
    });

    const trackedPaths = new Set(this.trackedFiles().map((f) => f.path));
    const events = scanEvents.filter((event) => !trackedPaths.has(event.path));

    opts?.onProgress?.({
      phase: 'recording',
      current: 0,
      total: events.length,
      message: `Scanning ${events.length} initial file operations…`,
    });

let opsCreated = 0;
     for (const event of events) {
       if (event.contentHash) {
         try {
           const absPath = join(this.config.rootPath, event.path);
           const content = await readFile(absPath);
           if (!this._blobResolver?.canSkipPut(event.path, event.contentHash)) {
             await this._blobStore.put(content);
           }
         } catch { }
       }

      const op = await createVcsOp('vcs:fileAdd', {
        agentId: this.agentId,
        previousHash: this.opLog.getLastOp()?.hash,
        vcs: {
          filePath: event.path,
          contentHash: event.contentHash,
          size: event.size,
        },
      });
      await this.applyOp(op, { skipOwnershipCheck: true });
      opsCreated++;
      if (opsCreated % 25 === 0 || opsCreated === events.length) {
        opts?.onProgress?.({
          phase: 'recording',
          current: opsCreated,
          total: events.length,
          message: `Scanned ${opsCreated}/${events.length} initial file ops`,
        });
      }
    }

    return {
      opsCreated,
      filesIndexed: events.length,
    };
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  /**
   * Initialize a new TrellisVCS repo. Creates .trellis/ directory and config.
   */
  async initRepo(opts?: InitRepoOptions): Promise<InitRepoResult> {
    const indexWorkspace = opts?.indexWorkspace ?? this.config.indexWorkspace;
    this.config.indexWorkspace = indexWorkspace;

    ensureTrellisGitignoreEntry(this.config.rootPath);

    // Agent coordination defaults — always persisted on init (git adapter no-ops without .git).
    this.config.lanes = {
      worktreeBind: true,
      ...this.config.lanes,
    };
    this.config.git = {
      syncOnPromote: true,
      remote: 'origin',
      ...this.config.git,
    };

    const trellisDir = join(this.config.rootPath, '.trellis');
    if (!existsSync(trellisDir)) {
      mkdirSync(trellisDir, { recursive: true });
    }

    // Initialize blob store + resolver
    this._blobStore = new BlobStore(trellisDir);
    this._blobResolver = new BlobResolver(this._blobStore, this.config.rootPath);

    // Write config
    this.writePersistedConfig();
    ensureDefaultTestManifest(this.config.rootPath);

    // Load existing ops (empty for new repo)
    this.opLog.load();

    // Create initial branch op
    const branchOp = await createVcsOp('vcs:branchCreate', {
      agentId: this.agentId,
      previousHash: this.opLog.getLastOp()?.hash,
      vcs: {
        branchName: this.config.defaultBranch,
      },
    });
    await this.applyOp(branchOp);

    let opsCreated = 1; // branch op
    let filesIndexed = 0;
    if (indexWorkspace) {
      const indexed = await this.indexExistingFiles(opts);
      opsCreated += indexed.opsCreated;
      filesIndexed = indexed.filesIndexed;
    }

    await this.flushAutoCheckpoint();

    // --- Agent scaffold ---
    opts?.onProgress?.({
      phase: 'scaffolding',
      current: 0,
      total: 1,
      message: 'Inferring project context…',
    });
    const context = await inferProjectContext(this.config.rootPath, {
      precomputedFileCount: filesIndexed,
    });
    const profile = loadProfile();
    writeAgentScaffold(this.config.rootPath, { profile, context });

    opts?.onProgress?.({
      phase: 'done',
      current: opsCreated,
      total: opsCreated,
      message: indexWorkspace
        ? `Initialized repository with ${opsCreated} operations`
        : 'Initialized minimal repository without workspace indexing',
    });
    return { opsCreated, filesIndexed, indexWorkspace, context };
  }

  /**
   * Open an existing TrellisVCS repo. Loads ops and replays into EAV store.
   */
  open(): { opsReplayed: number } {
    this.opLog.load();

    // Initialize blob store + resolver
    const trellisDir = join(this.config.rootPath, '.trellis');
    this._blobStore = new BlobStore(trellisDir);
    this._blobResolver = new BlobResolver(this._blobStore, this.config.rootPath);

    // Load config
    const persisted = this.readPersistedConfig();
    if (persisted) {
      this.agentId = persisted.agentId;
      // Re-merge persisted patterns with .gitignore + .trellisignore
      const filePatterns = readIgnorePatterns(this.config.rootPath);
      this.config.ignorePatterns = [
        ...new Set([...persisted.ignorePatterns, ...filePatterns]),
      ];
      this.config.debounceMs = persisted.debounceMs;
      this.config.defaultBranch = persisted.defaultBranch;
      this.config.indexWorkspace =
        persisted.indexWorkspace ?? DEFAULT_CONFIG.indexWorkspace;
      if (persisted.lanes) {
        this.config.lanes = persisted.lanes;
      }
      if (persisted.git) {
        this.config.git = persisted.git;
      }
      if (persisted.repoId) {
        this.config.repoId = persisted.repoId;
      }
      if (persisted.project) {
        this.config.project = persisted.project;
      }
    }

    // Load branch + lane session state
    this.loadCurrentBranch();

    const integrationOps = this.opLog.readAll();
    const laneOps = this.activeLaneLog
      ? this.activeLaneLog.readAll()
      : undefined;
    const activeMeta = this.activeLaneId
      ? this.getLaneMeta(this.activeLaneId)
      : undefined;
    this.refreshMaterializedStore(integrationOps, laneOps, activeMeta);

    const laneReplayed = this.materializationStats.laneOpsReplayed;
    return {
      opsReplayed:
        this.materializationStats.integrationOpsReplayed + laneReplayed,
    };
  }

  /**
   * Index all untracked files currently on disk into the Trellis graph.
   */
  async indexWorkspace(opts?: {
    onProgress?: (progress: InitProgress) => void;
  }): Promise<IndexWorkspaceResult> {
    if (!TrellisVcsEngine.isRepo(this.config.rootPath)) {
      throw new Error(
        `Not a Trellis workspace: ${this.config.rootPath}. Run trellis init first.`,
      );
    }

    if (this.getOpCount() === 0) {
      this.open();
    }

    const result = await this.indexExistingFiles(opts);
    await this.flushAutoCheckpoint();
    this.config.indexWorkspace = true;
    this.writePersistedConfig();

    return result;
  }

  /**
   * Start watching the filesystem for changes.
   */
  watch(opts?: { reconcileExisting?: boolean }): void {
    this.watchReconcileOnRestart =
      opts?.reconcileExisting ?? this.config.indexWorkspace;
    this.startWatcherAt(this.getWatcherRoot(), this.watchReconcileOnRestart);
  }

  private getWatcherRoot(): string {
    return this.getEditRoot();
  }

  /**
   * Directory where agents should run tests and edit files for a lane.
   * Uses the lane worktree when `lanes.worktreeBind` is enabled.
   */
  getEditRoot(laneId?: string): string {
    const id = laneId ?? this.activeLaneId;
    if (!id || !this.isWorktreeBindEnabled()) {
      return this.config.rootPath;
    }
    const meta = this.getLaneMeta(id);
    return meta?.worktreePath ?? this.config.rootPath;
  }

  private isWorktreeBindEnabled(): boolean {
    return this.config.lanes?.worktreeBind === true;
  }

  private rebindWatcher(rootPath: string): void {
    const wasRunning = this.watcher !== null;
    if (wasRunning) {
      this.stop();
      this.startWatcherAt(rootPath, false);
    }
  }

  private startWatcherAt(
    rootPath: string,
    reconcileExisting: boolean,
  ): void {
    this.ingestion = new Ingestion({
      agentId: this.agentId,
      lastOpHash: this.getActiveJournal().getLastOp()?.hash,
      onOp: (op) => this.applyOp(op),
    });

    this.watcher = new FileWatcher({
      rootPath,
      ignorePatterns: [...this.config.ignorePatterns, '.trellis'],
      debounceMs: this.config.debounceMs,
      onEvent: async (event) => {
        if (
          (event.type === 'add' || event.type === 'modify') &&
          event.contentHash &&
          this._blobStore
        ) {
          try {
            const absPath = join(rootPath, event.path);
            const content = await readFile(absPath);
            if (!this._blobResolver?.canSkipPut(event.path, event.contentHash)) {
              await this._blobStore.put(content);
            }
          } catch { }
        }
        await this.ingestion!.process(event);
      },
    });

    if (!reconcileExisting) {
      this.watcher.start();
      return;
    }

    this.watcher.scan().then(async (scanEvents) => {
      const trackedPaths = new Set(this.trackedFiles().map((f) => f.path));

for (const event of scanEvents) {
         if (!trackedPaths.has(event.path)) {
           if (event.contentHash && this._blobStore) {
             try {
               const absPath = join(rootPath, event.path);
               const content = await readFile(absPath);
               if (!this._blobResolver?.canSkipPut(event.path, event.contentHash)) {
                 await this._blobStore.put(content);
               }
             } catch { }
           }
           await this.ingestion!.process(event);
         }
       }

      this.watcher!.start();
    });
  }

  private async provisionLaneWorktree(
    meta: LaneMeta,
    worktreePathOverride?: string,
  ): Promise<LaneMeta> {
    if (
      !this.isWorktreeBindEnabled() ||
      !laneWorktreeMod.isGitRepo(this.config.rootPath)
    ) {
      return meta;
    }

    const worktreePath =
      worktreePathOverride ??
      meta.worktreePath ??
      laneWorktreeMod.defaultWorktreePath(this.trellisDir(), meta.id);
    const branch = laneWorktreeMod.laneGitBranch(meta.id);
    const baseRef = laneWorktreeMod.resolveBaseRef(
      this.config.rootPath,
      meta.baseBranch,
    );

    laneWorktreeMod.provisionWorktree({
      rootPath: this.config.rootPath,
      worktreePath,
      branch,
      baseRef,
    });

    meta.worktreePath = worktreePath;
    meta.updatedAt = new Date().toISOString();
    laneMod.saveLaneMeta(this.trellisDir(), meta);
    return meta;
  }

  /**
   * Auto-save a lane worktree before use (ADR 0038).
   *
   * Git is the sole authority over file bytes. Committing whatever the agent
   * left in the worktree — even when the agent never ran an explicit git
   * commit — guarantees re-entry and promotion see exactly the bytes the
   * agent produced. No op-log blobs are materialized over disk.
   */
  private async materializeLaneWorktree(meta: LaneMeta): Promise<void> {
    if (
      !this.isWorktreeBindEnabled() ||
      !meta.worktreePath ||
      !laneWorktreeMod.isGitRepo(this.config.rootPath)
    ) {
      return;
    }
    laneWorktreeMod.commitWorktree(
      meta.worktreePath,
      `trellis: lane worktree entry @ ${meta.id}`,
    );
  }

  private removeLaneWorktree(meta: LaneMeta): void {
    if (!meta.worktreePath) return;
    if (!laneWorktreeMod.isGitRepo(this.config.rootPath)) return;

    laneWorktreeMod.removeWorktree({
      rootPath: this.config.rootPath,
      worktreePath: meta.worktreePath,
      branch: laneWorktreeMod.laneGitBranch(meta.id),
      deleteBranch: true,
    });
  }

  /**
   * Stop watching.
   */
  stop(): void {
    this.watcher?.stop();
    this.watcher = null;
    this.ingestion = null;
  }

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  /**
   * Returns all ops in the causal stream.
   */
  getOps(): VcsOp[] {
    return this.opLog.readAll();
  }

  /**
   * Integrate externally supplied ops exactly as received.
   *
   * This is the sync ingestion primitive: callers are responsible for
   * exchanging, validating, and ordering ops before handing them to the
   * engine. The engine dedupes by hash, materializes each new op, and avoids
   * creating local branch-advance follow-up ops for remote history.
   */
  async integrateOps(
    ops: VcsOp[],
  ): Promise<IntegrateOpsResult> {
    if (this.activeLaneId) {
      throw new Error(
        'integrateOps() requires integration mode; leave the active lane first.',
      );
    }

    const known = new Set(this.opLog.readAll().map((op) => op.hash));
    const pendingByHash = new Map<string, VcsOp>();
    const rejected: IntegrateOpRejection[] = [];
    let applied = 0;
    let skipped = 0;

    for (const op of ops) {
      if (known.has(op.hash)) {
        skipped++;
        continue;
      }

      if (!isVcsOpKind(op.kind)) {
        rejected.push({
          op,
          reason: 'invalid-kind',
          message: `Rejected non-VCS op kind '${op.kind}'.`,
        });
        continue;
      }

      if (!(await verifyVcsOpHash(op))) {
        rejected.push({
          op,
          reason: 'hash-mismatch',
          message: `Rejected op with mismatched hash '${op.hash}'.`,
        });
        continue;
      }

      if (pendingByHash.has(op.hash)) {
        skipped++;
        continue;
      }

      pendingByHash.set(op.hash, op);
    }

    let pending = [...pendingByHash.values()];
    while (pending.length > 0) {
      const nextPending: VcsOp[] = [];
      let progressed = false;

      for (const op of pending) {
        if (op.previousHash && !known.has(op.previousHash)) {
          nextPending.push(op);
          continue;
        }

        // ADR 0022 Phase 3: enforce zone authority at the same boundary that
        // verifies integrity — a peer minting grant/zone ops directly is
        // opposed here, not only on the trusted local mint path.
        //
        // This runs at APPLY time, not during validation, because authority is
        // resolved against the materialized store and a batch carries its own
        // dependencies: `[zoneDefine, grantSet]` is the ordinary shape, and
        // checking the grant before its zone had landed rejected the zone's own
        // owner as "not Owner". Validating a batch against pre-batch state can
        // only ever accept ops whose authority predates the batch.
        const auth = await enforceIngestAuthorization(
          this.store,
          op,
          this.identityResolver,
        );
        if (!auth.ok) {
          rejected.push({
            op,
            reason: 'unauthorized',
            message: auth.message ?? `Unauthorized ingest of '${op.kind}'.`,
          });
          progressed = true; // resolved (as a rejection); don't re-defer
          continue;
        }

        try {
          await this.applyOp(op, {
            skipBranchAdvance: true,
            skipOwnershipCheck: true,
          });
          known.add(op.hash);
          applied++;
          progressed = true;
        } catch (err) {
          rejected.push({
            op,
            reason: 'apply-failed',
            message:
              err instanceof Error
                ? err.message
                : `Failed to apply op '${op.hash}'.`,
          });
        }
      }

      if (!progressed) {
        for (const op of nextPending) {
          rejected.push({
            op,
            reason: 'missing-dependency',
            message: `Missing previousHash '${op.previousHash}' for op '${op.hash}'.`,
          });
        }
        break;
      }

      pending = nextPending;
    }

    return { applied, skipped, rejected };
  }

  /**
   * Returns the total number of ops.
   */
  getOpCount(): number {
    return this.opLog.count();
  }

  /**
   * Returns the EAV store for direct querying.
   */
  getStore(): EAVStore {
    return this.store;
  }

  /**
   * Returns the blob store for content retrieval.
   */
  getBlobStore(): BlobStore | null {
    return this._blobStore;
  }

  /**
   * Returns the blob resolver (wraps BlobStore with git fallback).
   */
  getBlobResolver(): BlobResolver | null {
    return this._blobResolver;
  }

  /**
   * Returns the current status: tracked files, last op, branch info.
   */
  status(): {
    branch: string;
    totalOps: number;
    trackedFiles: number;
    lastOp: VcsOp | undefined;
    recentOps: VcsOp[];
  } {
    const ops = this.opLog.readAll();
    const fileEntities = this.store
      .getFactsByAttribute('type')
      .filter((f) => f.v === 'FileNode');

    return {
      branch: this.currentBranch,
      totalOps: ops.length,
      trackedFiles: fileEntities.length,
      lastOp: ops[ops.length - 1],
      recentOps: ops.slice(-10),
    };
  }

  /**
   * Returns op history, optionally filtered by file path.
   */
  log(opts?: { limit?: number; filePath?: string }): VcsOp[] {
    let ops = this.opLog.readAll();

    if (opts?.filePath) {
      ops = ops.filter((op) => {
        const vcs = op.vcs;
        return (
          vcs?.filePath === opts.filePath || vcs?.oldFilePath === opts.filePath
        );
      });
    }

    if (opts?.limit) {
      ops = ops.slice(-opts.limit);
    }

    return ops;
  }

  /**
   * Returns all tracked file paths and their content hashes.
   */
  trackedFiles(): Array<{ path: string; contentHash: string | undefined }> {
    const fileTypeFacts = this.store
      .getFactsByAttribute('type')
      .filter((f) => f.v === 'FileNode');

    return fileTypeFacts.map((f) => {
      const pathFacts = this.store
        .getFactsByEntity(f.e)
        .filter((ef) => ef.a === 'path');
      const hashFacts = this.store
        .getFactsByEntity(f.e)
        .filter((ef) => ef.a === 'contentHash');
      return {
        path: (pathFacts[0]?.v as string) ?? f.e,
        contentHash: hashFacts[0]?.v as string | undefined,
      };
    });
  }

  /**
   * Returns the root path of the repository.
   */
  getRootPath(): string {
    return this.config.rootPath;
  }

  /**
   * Checks if a .trellis directory exists at the root path.
   */
  static isRepo(rootPath: string): boolean {
    return existsSync(join(rootPath, '.trellis', 'config.json'));
  }

  static repair(
    rootPath: string,
    opts?: import('./vcs/op-log.js').RepairOptions,
  ): import('./vcs/op-log.js').RepairResult {
    const opsPath = join(rootPath, '.trellis', 'ops.json');
    return JsonOpLog.repair(opsPath, { ...opts, rootPath });
  }

  // -------------------------------------------------------------------------
  // Branch Management (delegated to src/vcs/branch.ts)
  // -------------------------------------------------------------------------

  async createBranch(name: string): Promise<VcsOp> {
    const op = await branchMod.createBranch(
      this._ctx(),
      name,
      this.currentBranch,
    );
    await this.flushAutoCheckpoint();
    return op;
  }

  switchBranch(name: string): void {
    branchMod.switchBranch(this._ctx(), name);
    this.currentBranch = name;
    const state = branchMod.loadBranchState(this.config.rootPath);
    branchMod.saveBranchState(this.config.rootPath, {
      ...state,
      currentBranch: name,
    });
  }

  listBranches(): branchMod.BranchInfo[] {
    return branchMod.listBranches(this._ctx(), this.currentBranch);
  }

  async deleteBranch(name: string): Promise<VcsOp> {
    const op = await branchMod.deleteBranch(
      this._ctx(),
      name,
      this.currentBranch,
    );
    await this.flushAutoCheckpoint();
    return op;
  }

  getCurrentBranch(): string {
    return this.currentBranch;
  }

  /**
   * Integration branch head op hash from the materialized store (ADR 0004).
   * Pass `principal` to resolve a single writer's per-principal ref zone
   * (ADR 0022 §4) — two writers on the same personal branch keep separate heads.
   */
  getBranchHeadOpHash(
    branchName: string = this.currentBranch,
    principal?: string,
  ): string | undefined {
    return branchMod.getBranchHeadOpHash(this._ctx(), branchName, principal);
  }

  /**
   * Engine context for the zone capability module (ADR 0022).
   *
   * Capability writes mint ops through this rather than touching the store,
   * so grants survive a reboot, replicate to peers, and are hash-covered.
   */
  capabilityContext(): EngineContext {
    return this._ctx();
  }

  getActiveLaneId(): string | undefined {
    return this.activeLaneId;
  }

  /**
   * Write a re-entry checkpoint (`.trellis/reentry-checkpoint.json`) capturing
   * the active lane's issue — the harness-side "session end" bookkeeping.
   * Never promotes; checkpointing is always safe.
   */
  writeReentryCheckpoint(): ReentryCheckpoint {
    const laneId = this.getActiveLaneId();
    const issueIds: string[] = [];
    if (laneId) {
      const meta = this.getLaneMeta(laneId);
      if (meta?.issueId) issueIds.push(meta.issueId);
    }
    return writeCheckpoint(this.config.rootPath, issueIds, []);
  }

  /**
   * Re-entry status for the harness "whereami" banner: the persisted
   * checkpoint (if any) plus the active lane's issue.
   */
  reentryStatus(): {
    checkpoint: ReentryCheckpoint | null;
    activeLaneId?: string;
    issueIds: string[];
  } {
    const cp = loadCheckpoint(this.config.rootPath);
    const laneId = this.getActiveLaneId();
    const issueIds: string[] = [];
    if (laneId) {
      const meta = this.getLaneMeta(laneId);
      if (meta?.issueId) issueIds.push(meta.issueId);
    }
    return { checkpoint: cp, activeLaneId: laneId, issueIds };
  }

  /**
   * Persist a session's LLM usage rollup as a `session:<id>` EAV entity
   * (latest write wins). Store-only — no op journal pollution. Backs the
   * harness token/cost visibility (Phase 2).
   */
  recordSessionUsage(input: {
    sessionId: string;
    laneId?: string;
    tokens: number;
    inputTokens?: number;
    outputTokens?: number;
    cost?: number;
    model?: string;
  }): void {
    const store = this.getEavStore();
    const eid = `session:${input.sessionId}`;
    const existing = store.getFactsByEntity(eid);
    if (existing.length > 0) store.deleteFacts(existing);
    const now = new Date().toISOString();
    const facts: Fact[] = [
      { e: eid, a: 'type', v: 'SessionUsage' },
      { e: eid, a: 'tokens', v: input.tokens },
      { e: eid, a: 'updatedAt', v: now },
    ];
    if (input.laneId) facts.push({ e: eid, a: 'laneId', v: input.laneId });
    if (typeof input.inputTokens === 'number') {
      facts.push({ e: eid, a: 'inputTokens', v: input.inputTokens });
    }
    if (typeof input.outputTokens === 'number') {
      facts.push({ e: eid, a: 'outputTokens', v: input.outputTokens });
    }
    if (typeof input.cost === 'number') facts.push({ e: eid, a: 'cost', v: input.cost });
    if (input.model) facts.push({ e: eid, a: 'model', v: input.model });
    store.addFacts(facts);
  }

  /** Read back a session usage rollup, if recorded. */
  getSessionUsage(sessionId: string): Record<string, unknown> | null {
    const store = this.getEavStore();
    const facts = store.getFactsByEntity(`session:${sessionId}`);
    if (facts.length === 0) return null;
    const out: Record<string, unknown> = {};
    for (const f of facts) out[f.a] = f.v;
    return out;
  }

  /** Whether milestones should auto-commit to git on create (config opt-in). */
  get milestoneAutoCommit(): boolean {
    return this.config.milestones?.autoCommit === true;
  }

  /** Last enter/leave/open materialization counters (W4). */
  getMaterializationStats(): MaterializationStats {
    return { ...this.materializationStats };
  }

  listLanes(): LaneMeta[] {
    return laneMod.listLaneMetas(this.trellisDir());
  }

  getIntegrationOpCount(): number {
    return this.opLog.count();
  }

  getLaneOpCount(laneId: string): number {
    const log = new LaneOpLog(laneMod.laneDir(this.trellisDir(), laneId));
    log.load();
    return log.count();
  }

  getLaneMeta(laneId: string): LaneMeta | undefined {
    return laneMod.loadLaneMeta(this.trellisDir(), laneId);
  }

  /**
   * Prune worktrees for lanes that haven't been updated in N days.
   * Skips active lanes and lanes without worktrees.
   */
  pruneStaleWorktrees(): { pruned: number; skipped: number } {
    const retentionDays = this.config.lanes?.worktreeRetentionDays ?? 7;
    const cutoffMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const lanes = this.listLanes();

    let pruned = 0;
    let skipped = 0;

    for (const lane of lanes) {
      // Skip active lanes
      if (lane.status === 'active') {
        skipped++;
        continue;
      }

      // Skip lanes without worktrees
      if (!lane.worktreePath) {
        skipped++;
        continue;
      }

      // Check if lane is stale
      const updatedAt = new Date(lane.updatedAt).getTime();
      if (updatedAt < cutoffMs) {
        this.removeLaneWorktree(lane);
        pruned++;
      } else {
        skipped++;
      }
    }

    return { pruned, skipped };
  }

  /** Active lane linked to an issue, if any. */
  findLaneForIssue(issueId: string): LaneMeta | undefined {
    const normalized = issueId.startsWith('issue:')
      ? issueId
      : `issue:${issueId}`;
    return this.listLanes().find(
      (lane) => lane.issueId === normalized && lane.status === 'active',
    );
  }

  /** Active lane bound to a Cursor/agent session id. */
  findLaneForSession(sessionId: string): LaneMeta | undefined {
    return this.listLanes().find(
      (lane) => lane.sessionId === sessionId && lane.status === 'active',
    );
  }

  /**
   * Find or create a lane for a session. Used by Cursor hooks for tab isolation.
   */
  async ensureSessionLane(opts: {
    sessionId: string;
    issueId?: string;
    enter?: boolean;
  }): Promise<LaneMeta> {
    const issueKey = opts.issueId
      ? opts.issueId.startsWith('issue:')
        ? opts.issueId
        : `issue:${opts.issueId}`
      : undefined;
    const issueIdPlain = issueKey?.replace(/^issue:/, '');

    if (issueIdPlain) {
      const existingIssueLane = this.findLaneForIssue(issueIdPlain);
      if (existingIssueLane) {
        if (
          existingIssueLane.sessionId &&
          existingIssueLane.sessionId !== opts.sessionId
        ) {
          throw new Error(
            `Issue ${issueIdPlain} is active on lane ${existingIssueLane.id} (session ${existingIssueLane.sessionId}).`,
          );
        }
        await issueClaimMod.claimIssue(
          this._ctx(),
          {
            issueId: issueIdPlain,
            laneId: existingIssueLane.id,
            sessionId: opts.sessionId,
          },
          this.config.rootPath,
        );
        if (opts.enter) {
          await this.enterLane(existingIssueLane.id);
        }
        return existingIssueLane;
      }

      const claim = issueClaimMod.getIssueClaim(
        this._ctx(),
        issueIdPlain,
        this.config.rootPath,
      );
      if (claim?.sessionId && claim.sessionId !== opts.sessionId) {
        throw new Error(
          `Issue ${issueIdPlain} claimed by lane ${claim.laneId} (session ${claim.sessionId}).`,
        );
      }
    }

    const existing = this.findLaneForSession(opts.sessionId);
    if (existing) {
      if (opts.enter) {
        await this.enterLane(existing.id);
      }
      if (issueIdPlain) {
        await issueClaimMod.claimIssue(
          this._ctx(),
          {
            issueId: issueIdPlain,
            laneId: existing.id,
            sessionId: opts.sessionId,
          },
          this.config.rootPath,
        );
      }
      return existing;
    }

    const lane = await this.createLane({
      sessionId: opts.sessionId,
      issueId: issueKey,
    });
    if (issueIdPlain) {
      await issueClaimMod.claimIssue(
        this._ctx(),
        {
          issueId: issueIdPlain,
          laneId: lane.id,
          sessionId: opts.sessionId,
        },
        this.config.rootPath,
      );
    }
    if (opts.enter) {
      await this.enterLane(lane.id);
    }
    return lane;
  }

  /**
   * Journal the current working tree into the integration op-log.
   *
   * Reconciles the *actual* files on disk against the op-log's recorded file
   * state (`buildFileStateAtOp`) and emits `vcs:fileAdd` / `vcs:fileModify`
   * ops for every divergence, then advances `branch` (the git-sync target) to
   * the last journaled op so a subsequent materialize sees the reconciled
   * state. This closes the journaling gap that let an un-journaled working
   * tree get clobbered by `git sync` materialization: after catch-up, the
   * op-log file state matches disk, so a subsequent materialize is a no-op
   * instead of a revert.
   *
   * Returns the count of ops journaled and any paths that could not be
   * reconciled (unreadable, blob-store failure). Callers that require a safe
   * materialize should refuse when `unreconciled.length > 0`.
   */
  async journalWorkingTreeToOps(opts?: {
    branch?: string;
    onProgress?: (progress: {
      phase: 'scanning' | 'journaling' | 'done';
      current: number;
      total: number;
      message: string;
    }) => void;
  }): Promise<{ journaled: number; unreconciled: string[] }> {
    const root = this.config.rootPath;
    if (!this._blobStore || !this._blobResolver) {
      return { journaled: 0, unreconciled: [] };
    }

    // 1. Current op-log file state (cumulative, all ops).
    const state = diffMod.buildFileStateAtOp(this.opLog.readAll());

    // 2. Scan disk (same ignore rules as the watcher, plus .trellis).
    const watcher = new FileWatcher({
      rootPath: root,
      ignorePatterns: [...this.config.ignorePatterns, '.trellis'],
      debounceMs: 0,
      onEvent: async () => {},
    });
    const events = await watcher.scan();

    const journaled: string[] = [];
    const unreconciled: string[] = [];

    for (const event of events) {
      const known = state.get(event.path);
      if (known && !known.deleted && known.contentHash === event.contentHash) {
        continue; // already journaled at this content
      }
      if (event.type !== 'add') continue; // scan emits adds only

      const absPath = join(root, event.path);
      let content: Buffer;
      try {
        content = await readFile(absPath);
      } catch {
        unreconciled.push(event.path);
        continue;
      }
      try {
        if (
          event.contentHash &&
          !this._blobResolver?.canSkipPut(event.path, event.contentHash)
        ) {
          await this._blobStore.put(content);
        }
        const op = await createVcsOp(
          known && !known.deleted ? 'vcs:fileModify' : 'vcs:fileAdd',
          {
            agentId: this.agentId,
            previousHash: this.opLog.getLastOp()?.hash,
            vcs: {
              filePath: event.path,
              contentHash: event.contentHash,
              oldContentHash: known && !known.deleted ? known.contentHash : undefined,
              size: event.size,
            },
          },
        );
        await this.applyOp(op, {
          skipOwnershipCheck: true,
          allowIntegrationWrite: true,
        });
        journaled.push(event.path);
      } catch (err) {
        unreconciled.push(event.path);
      }
    }

    // 3. Detect deletions: files in the op-log state that no longer exist on disk.
    const diskPaths = new Set(events.map((e) => e.path));
    for (const [path, fileState] of state) {
      if (fileState.deleted || diskPaths.has(path)) continue;
      const absPath = join(root, path);
      if (existsSync(absPath)) continue;
      try {
        const op = await createVcsOp('vcs:fileDelete', {
          agentId: this.agentId,
          previousHash: this.opLog.getLastOp()?.hash,
          vcs: {
            filePath: path,
            oldContentHash: fileState.contentHash,
          },
        });
        await this.applyOp(op, {
          skipOwnershipCheck: true,
          allowIntegrationWrite: true,
        });
        journaled.push(path);
      } catch (err) {
        unreconciled.push(path);
      }
    }

    // 4. Advance the sync-target branch to the last journaled op so
    //    `buildFileStateAtOp` (which stops at the branch head) includes the
    //    reconciled state. Without this, catch-up ops appended after the
    //    branch head would be invisible to materialization.
    if (journaled.length > 0) {
      const targetBranch = opts?.branch ?? this.currentBranch;
      const lastOp = this.opLog.getLastOp();
      if (lastOp) {
        try {
          const advanceOp = await createVcsOp('vcs:branchAdvance', {
            agentId: this.agentId,
            previousHash: lastOp.hash,
            vcs: { branchName: targetBranch, targetOpHash: lastOp.hash },
          });
          await this.applyOp(advanceOp, {
            skipBranchAdvance: true,
            allowIntegrationWrite: true,
          });
        } catch (err) {
          unreconciled.push(`branch:${targetBranch}`);
        }
      }
    }

    return { journaled: journaled.length, unreconciled };
  }

  /**
   * Commit the actual working tree to the default git branch (ADR 0038).
   *
   * Git is the sole authority over file bytes. The working tree is staged and
   * committed as-is — the op-log is never consulted for file content and no
   * op-log state is materialized over disk. After a successful commit a
   * non-materializing `vcs:gitSync` annotation op records `{ gitCommitHash,
   * gitBranch }` so the op-log can answer "where do these bytes live in git?"
   * without owning them.
   */
  async syncGitIntegration(opts?: {
    message?: string;
    push?: boolean;
    lane?: LaneMeta;
    laneOps?: VcsOp[];
    /** When true, sync even if git.syncOnPromote is false. */
    force?: boolean;
  }): Promise<GitSyncResult> {
    if (!laneWorktreeMod.isGitRepo(this.config.rootPath)) {
      return { committed: false, pushed: false, filesMaterialized: 0 };
    }

    const autoSync = this.config.git?.syncOnPromote !== false;
    if (!autoSync && !opts?.force && !opts?.push) {
      return { committed: false, pushed: false, filesMaterialized: 0 };
    }

    const branch =
      this.config.git?.branch ?? this.config.defaultBranch ?? 'main';

    let message = opts?.message;
    if (!message && opts?.lane && opts.laneOps) {
      let issueTitle: string | undefined;
      if (opts.lane.issueId) {
        const issueId = opts.lane.issueId.replace(/^issue:/, '');
        const issue = issueMod.getIssue(this._ctx(), issueId);
        issueTitle = issue?.title;
      }
      message = buildPromoteCommitMessage({
        lane: opts.lane,
        laneOps: opts.laneOps,
        issueTitle,
      });
    }
    message ??= `trellis: sync integration @ ${branch}`;

    const sync = syncIntegrationToGit({
      rootPath: this.config.rootPath,
      branch,
      remote: this.config.git?.remote ?? 'origin',
      message,
      push: opts?.push,
    });

    if (sync.committed && sync.commitHash) {
      await this.recordGitSyncAnnotation(sync.commitHash, branch);
    }

    return sync;
  }

  /**
   * Record a non-materializing `vcs:gitSync` annotation (ADR 0038): the op-log
   * learns where bytes live in git without ever claiming byte authority.
   */
  private async recordGitSyncAnnotation(
    commitHash: string,
    branch: string,
  ): Promise<void> {
    const annotationOp = await createVcsOp('vcs:gitSync', {
      agentId: this.agentId,
      previousHash: this.opLog.getLastOp()?.hash,
      vcs: {
        gitCommitHash: commitHash,
        gitBranch: branch,
      },
    });
    await this.applyOp(annotationOp, { skipBranchAdvance: true });
  }

  /**
   * Deliver a promoted lane's bytes to git (ADR 0038).
   *
   * 1. Auto-commit the lane worktree (the agent's actual bytes) onto its
   *    `lane/<shortId>` branch.
   * 2. Merge that branch into the integration head of the main worktree.
   * 3. Root sync: commit any remaining root dirt + push when configured.
   *
   * A git merge conflict fails the delivery — git is the authority, so a
   * conflicted merge cannot be papered over with a synthesized file state.
   */
  private async gitDeliveryForLane(opts: {
    lane: LaneMeta;
    laneOps: VcsOp[];
  }): Promise<GitSyncResult> {
    const rootPath = this.config.rootPath;
    const worktreePath =
      this.isWorktreeBindEnabled() && opts.lane.worktreePath
        ? opts.lane.worktreePath
        : undefined;

    let message: string | undefined;
    {
      let issueTitle: string | undefined;
      if (opts.lane.issueId) {
        const issueId = opts.lane.issueId.replace(/^issue:/, '');
        const issue = issueMod.getIssue(this._ctx(), issueId);
        issueTitle = issue?.title;
      }
      message = buildPromoteCommitMessage({
        lane: opts.lane,
        laneOps: opts.laneOps,
        issueTitle,
      });
    }

    const targetBranch =
      this.config.git?.branch ?? this.config.defaultBranch ?? 'main';

    if (worktreePath && laneWorktreeMod.isGitRepo(rootPath)) {
      laneWorktreeMod.commitWorktree(worktreePath, message);
      const laneBranch = laneWorktreeMod.laneGitBranch(opts.lane.id);
      const merged = laneWorktreeMod.mergeLaneWorktree(
        rootPath,
        laneBranch,
        message,
      );
      if (merged === 'failed') {
        return { committed: false, pushed: false, filesMaterialized: 0 };
      }
      if (merged === 'merged') {
        await this.recordGitSyncAnnotation(
          laneWorktreeMod.revParseHead(rootPath),
          targetBranch,
        );
      }
    }

    // Root delivery: commit any remaining dirty root bytes + push.
    return this.syncGitIntegration({ message, force: true });
  }

  /**
   * Enter lane from TRELLIS_LANE_ID when set (hooks/MCP/subprocess agents).
   */
  async syncEnvLaneFromEnv(): Promise<void> {
    const laneId = process.env.TRELLIS_LANE_ID?.trim();
    if (!laneId) return;
    if (this.activeLaneId === laneId) return;
    if (this.activeLaneId) {
      throw new Error(
        `TRELLIS_LANE_ID=${laneId} conflicts with active lane '${this.activeLaneId}'`,
      );
    }
    await this.enterLane(laneId);
  }

  /** Ops and touched files in a lane journal (for `trellis lane diff`). */
  summarizeLane(laneId: string): {
    meta: LaneMeta;
    ops: VcsOp[];
    filePaths: string[];
    integrationHead?: string;
    coherence: laneCoherenceMod.LaneCoherence;
  } {
    const meta = this.getLaneMeta(laneId);
    if (!meta) {
      throw new Error(`Lane not found: ${laneId}`);
    }
    const log = new LaneOpLog(laneMod.laneDir(this.trellisDir(), laneId));
    log.load();
    const ops = log.readAll();
    const filePaths = [
      ...new Set(
        ops
          .map((op) => op.vcs?.filePath ?? op.vcs?.oldFilePath)
          .filter((p): p is string => Boolean(p)),
      ),
    ];
    return {
      meta,
      ops,
      filePaths,
      integrationHead: this.getBranchHeadOpHash(meta.targetBranch),
      coherence: laneCoherenceMod.analyzeLaneCoherence(meta, ops, filePaths),
    };
  }

  /**
   * Fork a new agent lane from the current integration branch head.
   * Writes `vcs:laneCreate` to the integration journal only.
   */
  async createLane(opts?: {
    fromBranch?: string;
    targetBranch?: string;
    issueId?: string;
    sessionId?: string;
    worktreePath?: string;
    name?: string;
    parentLaneId?: string;
    forkKind?: laneMod.LaneForkKind;
  }): Promise<LaneMeta> {
    if (this.activeLaneId) {
      throw new Error(
        `Cannot create a lane while inside lane '${this.activeLaneId}' — leave first`,
      );
    }

    const baseBranch = opts?.fromBranch ?? this.currentBranch;
    const baseOpHash =
      branchMod.getBranchHeadOpHash(this._ctx(), baseBranch) ??
      this.opLog.getLastOp()?.hash;
    if (!baseOpHash) {
      throw new Error(
        `No integration head on branch '${baseBranch}' to fork lane from`,
      );
    }

    if (opts?.issueId) {
      const issuePlain = opts.issueId.replace(/^issue:/, '');
      const duplicate = this.findLaneForIssue(issuePlain);
      if (duplicate) {
        throw new Error(
          `Active lane ${duplicate.id} already linked to ${issuePlain}`,
        );
      }
    }

    const name = opts?.name ? laneMod.normalizeLaneName(opts.name) : undefined;
    const forkedAt = opts?.parentLaneId ? new Date().toISOString() : undefined;

    const meta = laneMod.createLaneMeta(this.trellisDir(), {
      baseBranch,
      baseOpHash,
      targetBranch: opts?.targetBranch ?? baseBranch,
      agentId: this.agentId,
      issueId: opts?.issueId,
      sessionId: opts?.sessionId,
      name,
      parentLaneId: opts?.parentLaneId,
      forkKind: opts?.forkKind,
      forkedAt,
      worktreePath: opts?.worktreePath,
    });

    const op = await createVcsOp('vcs:laneCreate', {
      agentId: this.agentId,
      previousHash: this.opLog.getLastOp()?.hash,
      vcs: {
        laneId: meta.id,
        baseBranch: meta.baseBranch,
        baseOpHash: meta.baseOpHash,
        targetBranch: meta.targetBranch,
        issueId: meta.issueId,
        sessionId: meta.sessionId,
        parentLaneId: meta.parentLaneId,
        forkKind: meta.forkKind,
      },
    });
    await this.applyOp(op);
    return this.provisionLaneWorktree(meta, opts?.worktreePath);
  }

  /**
   * Open a fresh domain-scoped lane and enter it (TRL-117).
   * Leaves the current lane if any. Does not require an issue — promote
   * boundary is the new lane itself. Parent lineage is recorded as sibling.
   */
  async splitLane(opts?: {
    name?: string;
    fromBranch?: string;
    sessionId?: string;
  }): Promise<{ meta: LaneMeta; splitFrom?: string }> {
    const splitFrom = this.activeLaneId;
    if (splitFrom) {
      await this.leaveLane();
    }

    const meta = await this.createLane({
      fromBranch: opts?.fromBranch,
      sessionId: opts?.sessionId,
      name: opts?.name,
      parentLaneId: splitFrom,
      forkKind: splitFrom ? 'sibling' : undefined,
    });
    await this.enterLane(meta.id);
    return { meta, splitFrom };
  }
  async forkLane(
    parentLaneId: string,
    opts?: {
      sessionId?: string;
      issueId?: string;
      worktreePath?: string;
      forkKind?: laneMod.LaneForkKind;
    },
  ): Promise<LaneMeta> {
    if (this.activeLaneId) {
      throw new Error(
        `Cannot fork a lane while inside lane '${this.activeLaneId}' — leave first`,
      );
    }

    const parent = laneMod.loadLaneMeta(this.trellisDir(), parentLaneId);
    if (!parent) {
      throw new Error(`Lane not found: ${parentLaneId}`);
    }
    if (parent.status !== 'active') {
      throw new Error(
        `Lane '${parentLaneId}' is ${parent.status} — cannot fork`,
      );
    }

    const forkKind = opts?.forkKind ?? 'sibling';
    const forkedAt = new Date().toISOString();
    const parentLog = new LaneOpLog(
      laneMod.laneDir(this.trellisDir(), parentLaneId),
    );
    parentLog.load();
    const parentLaneOps = parentLog.readAll();
    const parentHead = laneMod.resolveLaneHeadFromJournal(parent, parentLaneOps);

    if (forkKind === 'child') {
      const meta = laneMod.createLaneMeta(this.trellisDir(), {
        baseBranch: parent.baseBranch,
        baseOpHash: parent.baseOpHash,
        targetBranch: parent.targetBranch,
        agentId: this.agentId,
        issueId: opts?.issueId ?? parent.issueId,
        sessionId: opts?.sessionId,
        worktreePath: opts?.worktreePath,
        parentLaneId: parent.id,
        forkKind: 'child',
        forkedAt,
        virtualBaseOpHash: parentHead,
      });

      const op = await createVcsOp('vcs:laneCreate', {
        agentId: this.agentId,
        previousHash: this.opLog.getLastOp()?.hash,
        vcs: {
          laneId: meta.id,
          baseBranch: meta.baseBranch,
          baseOpHash: meta.baseOpHash,
          targetBranch: meta.targetBranch,
          issueId: meta.issueId,
          sessionId: meta.sessionId,
          parentLaneId: parent.id,
          forkKind: 'child',
          virtualBaseOpHash: parentHead,
        },
      });
      await this.applyOp(op);
      return this.provisionLaneWorktree(meta, opts?.worktreePath);
    }

    const meta = laneMod.createLaneMeta(this.trellisDir(), {
      baseBranch: parent.baseBranch,
      baseOpHash: parent.baseOpHash,
      targetBranch: parent.targetBranch,
      agentId: this.agentId,
      issueId: opts?.issueId ?? parent.issueId,
      sessionId: opts?.sessionId,
      worktreePath: opts?.worktreePath,
      parentLaneId: parent.id,
      forkKind: 'sibling',
      forkedAt,
    });

    const op = await createVcsOp('vcs:laneCreate', {
      agentId: this.agentId,
      previousHash: this.opLog.getLastOp()?.hash,
      vcs: {
        laneId: meta.id,
        baseBranch: meta.baseBranch,
        baseOpHash: meta.baseOpHash,
        targetBranch: meta.targetBranch,
        issueId: meta.issueId,
        sessionId: meta.sessionId,
        parentLaneId: parent.id,
        forkKind: 'sibling',
      },
    });
    await this.applyOp(op);
    return this.provisionLaneWorktree(meta, opts?.worktreePath);
  }

  /**
   * Enter a lane: route subsequent writes to its isolated journal.
   */
  async enterLane(laneId: string): Promise<LaneMeta> {
    if (this.activeLaneId) {
      throw new Error(
        `Already in lane '${this.activeLaneId}' — leave before entering another`,
      );
    }

    const meta = laneMod.loadLaneMeta(this.trellisDir(), laneId);
    if (!meta) {
      throw new Error(`Lane not found: ${laneId}`);
    }
    if (meta.status !== 'active') {
      throw new Error(`Lane '${laneId}' is ${meta.status} — cannot enter`);
    }

    this.activeLaneId = laneId;
    this.activeLaneLog = new LaneOpLog(laneMod.laneDir(this.trellisDir(), laneId));
    this.activeLaneLog.load();

    this.refreshMaterializedStore(
      this.opLog.readAll(),
      this.activeLaneLog.readAll(),
      meta,
    );

    await this.materializeLaneWorktree(meta);
    if (meta.worktreePath) {
      this.rebindWatcher(meta.worktreePath);
    }

    branchMod.saveBranchState(this.config.rootPath, {
      currentBranch: this.currentBranch,
      activeLaneId: laneId,
    });
    this.syncIngestionLastOpHash();
    return meta;
  }

  /** Leave the active lane and restore integration-only materialized state. */
  async leaveLane(): Promise<void> {
    if (!this.activeLaneId) return;

    const wasRunning = this.watcher !== null;
    if (wasRunning) {
      this.stop();
    }

    this.activeLaneId = undefined;
    this.activeLaneLog = null;
    branchMod.saveBranchState(this.config.rootPath, {
      currentBranch: this.currentBranch,
    });
    this.restoreIntegrationOnlyStore();
    this.syncIngestionLastOpHash();

    if (wasRunning && this.isWorktreeBindEnabled()) {
      this.startWatcherAt(this.config.rootPath, false);
    }
  }

  /** Mark a lane dropped (leaves first if it is the active lane). */
  async dropLane(laneId: string): Promise<void> {
    if (this.activeLaneId === laneId) {
      await this.leaveLane();
    }

    const meta = laneMod.loadLaneMeta(this.trellisDir(), laneId);
    if (!meta) {
      throw new Error(`Lane not found: ${laneId}`);
    }
    if (meta.status === 'dropped') return;

    meta.status = 'dropped';
    meta.updatedAt = new Date().toISOString();
    laneMod.saveLaneMeta(this.trellisDir(), meta);

    const op = await createVcsOp('vcs:laneDrop', {
      agentId: this.agentId,
      previousHash: this.opLog.getLastOp()?.hash,
      vcs: {
        laneId: meta.id,
        laneStatus: 'dropped',
      },
    });
    await this.applyOp(op);
    this.removeLaneWorktree(meta);
  }
  async recordLaneGc(entries: { laneId: string; disposition: string; reason: string }[]): Promise<void> {
    if (entries.length === 0) return;
    const last = entries.at(-1)!;
    const op = await createVcsOp('vcs:laneGc', {
      agentId: this.agentId,
      previousHash: this.opLog.getLastOp()?.hash,
      vcs: {
        laneId: last.laneId,
        gcDisposition: last.disposition,
        gcReason: last.reason,
      },
    });
    await this.applyOp(op, { allowIntegrationWrite: true });
  }
  async promoteLane(
    laneId: string,
    opts?: {
      dryRun?: boolean;
      explain?: boolean;
      toBranch?: string;
      requireTest?: boolean;
      /** Break a stale or abandoned promote lock (dangerous if another promote is live). */
      forceLock?: boolean;
      /** Milestone narrative (TRL-117). Auto-drafted when omitted unless milestone:false. */
      message?: string;
      /** Set false to promote without creating a milestone. Default true. */
      milestone?: boolean;
    },
  ): Promise<LanePromoteResult> {
    const meta = this.getLaneMeta(laneId);
    if (!meta) {
      throw new Error(`Lane not found: ${laneId}`);
    }
    if (meta.status !== 'active') {
      throw new Error(`Lane '${laneId}' is ${meta.status} — cannot promote`);
    }

    if (opts?.requireTest && !opts.dryRun) {
      const testResults = await testRunnerMod.runPromoteRequiredTests(
        this._ctx(),
        this.getEditRoot(laneId),
        laneId,
        this.config.rootPath,
      );
      if (!testRunnerMod.allTestRunsPassed(testResults)) {
        const failed = testResults
          .filter((r) => r.status === 'failed')
          .map((r) => r.suite ?? r.command)
          .join(', ');
        throw new Error(`Promote blocked — required tests failed: ${failed}`);
      }
      await this.flushAutoCheckpoint();
    }

    if (this.activeLaneId === laneId) {
      await this.leaveLane();
    } else if (this.activeLaneId) {
      throw new Error(
        `Cannot promote while inside lane '${this.activeLaneId}' — leave first`,
      );
    }

    const targetBranch = opts?.toBranch ?? meta.targetBranch;
    const integrationOps = this.opLog.readAll();
    const snapshotHead =
      lanePromoteMod.resolveBranchHeadFromOps(integrationOps, targetBranch) ??
      branchMod.getBranchHeadOpHash(this._ctx(), targetBranch);
    if (!snapshotHead) {
      throw new Error(`No head on branch '${targetBranch}' to promote onto`);
    }

    const laneLog = new LaneOpLog(laneMod.laneDir(this.trellisDir(), laneId));
    laneLog.load();
    const laneOps = laneLog.readAll();

    let parentLaneOps: VcsOp[] | undefined;
    if (meta.forkKind === 'child' && meta.parentLaneId) {
      parentLaneOps = this.loadLaneJournalOps(meta.parentLaneId);
    }

    const plan = await lanePromoteMod.planLanePromote({
      laneId,
      meta,
      targetBranch,
      snapshotHead,
      integrationOps: this.opLog.readAll(),
      laneOps,
      parentLaneOps,
      blobResolver: this._blobResolver,
    });

    if (opts?.dryRun || !plan.canPromote) {
      return { ...plan, promoted: false };
    }

    promoteLockMod.acquirePromoteLock(this.trellisDir(), laneId, {
      force: opts?.forceLock,
    });

    try {
      meta.status = 'promoting';
      meta.updatedAt = new Date().toISOString();
      laneMod.saveLaneMeta(this.trellisDir(), meta);

      const startOp = await createVcsOp('vcs:lanePromoteStart', {
        agentId: this.agentId,
        previousHash: this.opLog.getLastOp()?.hash,
        vcs: {
          laneId,
          targetBranch,
          baseOpHash: meta.baseOpHash,
        },
      });
      await this.applyOp(startOp, { skipBranchAdvance: true });

      const currentHead =
        lanePromoteMod.resolveBranchHeadFromOps(this.opLog.readAll(), targetBranch) ??
        branchMod.getBranchHeadOpHash(this._ctx(), targetBranch);
      if (currentHead !== snapshotHead) {
        meta.status = 'active';
        meta.updatedAt = new Date().toISOString();
        laneMod.saveLaneMeta(this.trellisDir(), meta);

        const abortOp = await createVcsOp('vcs:lanePromoteAbort', {
          agentId: this.agentId,
          previousHash: this.opLog.getLastOp()?.hash,
          vcs: { laneId },
        });
        await this.applyOp(abortOp, { skipBranchAdvance: true });
        throw new Error(
          `Integration head moved during promote — retry after integration settles`,
        );
      }

      let previousHash = this.opLog.getLastOp()?.hash;
      let lastReplayedHash: string | undefined;
      let opsAppended = 0;

      for (const action of plan.opsToReplay) {
        // ADR 0038: the op-log is annotation, not authority. Every op —
        // including merge-resolved ones — is re-chained from its source; the
        // merged bytes themselves are delivered by the git merge (see
        // gitDeliveryForLane). No blob is put, no synthetic fileModify minted.
        const opToApply = await lanePromoteMod.rechainOpForIntegration(
          action.sourceOp,
          previousHash,
        );

        await this.applyOp(opToApply, {
          skipBranchAdvance: true,
          skipOwnershipCheck: true,
        });
        previousHash = opToApply.hash;
        lastReplayedHash = opToApply.hash;
        opsAppended++;
      }

      if (lastReplayedHash) {
        await this.appendBranchAdvance(lastReplayedHash);
      }

      const completeOp = await createVcsOp('vcs:lanePromoteComplete', {
        agentId: this.agentId,
        previousHash: this.opLog.getLastOp()?.hash,
        vcs: {
          laneId,
          targetBranch,
          laneStatus: 'promoted',
        },
      });
      await this.applyOp(completeOp, { skipBranchAdvance: true });

      meta.status = 'promoted';
      meta.headOpHash = lastReplayedHash ?? meta.headOpHash;
      meta.updatedAt = new Date().toISOString();
      laneMod.saveLaneMeta(this.trellisDir(), meta);

      // Deliver the lane's bytes to git BEFORE the worktree is removed — the
      // lane branch is the merge source (ADR 0038: git, not the op-log, moves
      // bytes to the integration head).
      let gitSync: GitSyncResult | undefined;
      if (this.config.git?.syncOnPromote !== false) {
        gitSync = await this.gitDeliveryForLane({
          lane: meta,
          laneOps,
        });
      }

      // Clean up worktree after successful promotion
      this.removeLaneWorktree(meta);

      this.invalidateIntegrationCache();
      this.refreshMaterializedStore(this.opLog.readAll());
      this.syncIngestionLastOpHash();

      let milestoneId: string | undefined;
      let milestoneMessage: string | undefined;
      if (opts?.milestone !== false) {
        const issuePlain = meta.issueId?.replace(/^issue:/, '');
        const issueTitle = issuePlain
          ? issueMod.getIssue(this._ctx(), issuePlain)?.title
          : undefined;
        milestoneMessage = lanePromoteMod.draftLanePromoteMilestoneMessage({
          message: opts?.message,
          meta,
          opsToReplay: plan.opsToReplay,
          issueTitle,
        });
        const milestoneOp = await this.createMilestone(milestoneMessage, {
          fromOpHash: snapshotHead,
          toOpHash: completeOp.hash,
        });
        milestoneId = milestoneOp.vcs?.milestoneId;
      }

      return {
        ...plan,
        promoted: true,
        integrationOpsAppended: opsAppended + 2,
        completeOpHash: completeOp.hash,
        gitSync,
        milestoneId,
        milestoneMessage,
      };
    } finally {
      promoteLockMod.releasePromoteLock(this.trellisDir(), laneId);
    }
  }

  /**
   * Promote active issue lane before close when it has unpromoted journal ops.
   * No-ops when the lane has nothing replayable onto integration (e.g. only
   * testRun / claim metadata) — that still satisfies the promote boundary.
   */
  private async autoPromoteIssueLaneBeforeClose(
    id: string,
    opts?: { noPromote?: boolean; requireTest?: boolean },
  ): Promise<LanePromoteResult | undefined> {
    const lane = this.findLaneForIssue(id);
    if (!lane || lane.status !== 'active') {
      return undefined;
    }

    const opCount = this.getLaneOpCount(lane.id);
    if (opCount === 0) {
      return undefined;
    }

    // Peek the plan so --no-promote only blocks when there is real work to
    // replay (not claim/test metadata that promote would skip anyway).
    const plan = await this.promoteLane(lane.id, { dryRun: true });
    if (plan.opsToReplay.length === 0 && plan.blockingConflicts.length === 0) {
      return undefined;
    }

    if (opts?.noPromote) {
      throw new Error(
        `Lane ${lane.id} has ${plan.opsToReplay.length} unpromoted ops — promote boundary not met. ` +
        `Run \`trellis lane promote ${lane.id}\` first, or omit --no-promote to auto-promote on close.`,
      );
    }

    if (plan.blockingConflicts.length > 0) {
      throw new Error(
        `Auto-promote blocked for lane ${lane.id} — resolve conflicts and retry.`,
      );
    }

    const issue = issueMod.getIssue(this._ctx(), id);
    const plain = id.replace(/^issue:/, '');
    const message = issue?.title
      ? `${plain}: ${issue.title}`
      : `Close ${plain}`;

    const result = await this.promoteLane(lane.id, {
      requireTest: opts?.requireTest,
      message,
    });
    if (result.promoted) {
      return result;
    }
    throw new Error(
      `Auto-promote blocked for lane ${lane.id} — resolve conflicts and retry.`,
    );
  }

  // -------------------------------------------------------------------------
  // Milestones (delegated to src/vcs/milestone.ts)
  // -------------------------------------------------------------------------

  async createMilestone(
    message: string,
    opts?: { fromOpHash?: string; toOpHash?: string },
  ): Promise<VcsOp> {
    const op = await milestoneMod.createMilestone(this._ctx(), message, opts);
    await this.flushAutoCheckpoint();
    return op;
  }

  listMilestones(): milestoneMod.MilestoneInfo[] {
    return milestoneMod.listMilestones(this._ctx());
  }

  // -------------------------------------------------------------------------
  // Checkpoints (delegated to src/vcs/checkpoint.ts)
  // -------------------------------------------------------------------------

  async createCheckpoint(
    trigger: checkpointMod.CheckpointTrigger = 'manual',
  ): Promise<VcsOp> {
    const op = await checkpointMod.createCheckpoint(this._ctx(), trigger);
    this.checkpointOpCount = 0;
    return op;
  }

  listCheckpoints(): checkpointMod.CheckpointInfo[] {
    return checkpointMod.listCheckpoints(this._ctx());
  }

  setCheckpointThreshold(threshold: number): void {
    this.checkpointThreshold = threshold;
  }

  // -------------------------------------------------------------------------
  // Diff & Merge (delegated to src/vcs/diff.ts, src/vcs/merge.ts)
  // -------------------------------------------------------------------------

  /**
   * Diff two branches by comparing their file states.
   */
  diffBranches(branchA: string, branchB: string): diffMod.DiffResult {
    const ops = this.opLog.readAll();
    // Build file state for each branch by walking all ops
    // (branch-scoped filtering comes later; for now, single linear stream)
    const stateA = diffMod.buildFileStateAtOp(ops);
    const stateB = diffMod.buildFileStateAtOp(ops);
    return diffMod.diffFileStates(stateA, stateB, this._blobResolver);
  }

  /**
   * Diff between two op hashes in the causal stream.
   */
  diffOps(fromHash: string, toHash: string): diffMod.DiffResult {
    return diffMod.diffOpRange(
      this.opLog.readAll(),
      fromHash,
      toHash,
      this._blobResolver,
    );
  }

  /**
   * Diff the current state against a specific op hash (e.g. a milestone).
   */
  diffFromOp(opHash: string): diffMod.DiffResult {
    const ops = this.opLog.readAll();
    const stateA = diffMod.buildFileStateAtOp(ops, opHash);
    const stateB = diffMod.buildFileStateAtOp(ops);
    return diffMod.diffFileStates(stateA, stateB, this._blobResolver);
  }

  /**
   * Three-way merge: merge source branch state into current branch state.
   * Uses the fork-point (branch creation op) as the common ancestor.
   */
  mergeBranch(sourceBranch: string): mergeMod.MergeResult {
    const ops = this.opLog.readAll();

    // Find the branch creation op to determine fork point
    const branchOp = ops.find(
      (o) =>
        o.kind === 'vcs:branchCreate' && o.vcs?.branchName === sourceBranch,
    );
    const forkHash = branchOp?.vcs?.targetOpHash;

    // Build three states
    const base = forkHash
      ? diffMod.buildFileStateAtOp(ops, forkHash)
      : new Map<string, diffMod.FileState>();
    const ours = diffMod.buildFileStateAtOp(ops); // current full state
    const theirs = diffMod.buildFileStateAtOp(ops); // same stream for now

    return mergeMod.threeWayMerge(base, ours, theirs, this._blobResolver);
  }

  // -------------------------------------------------------------------------
  // Semantic Parsing (delegated to src/semantic/)
  // -------------------------------------------------------------------------

  private _parsers: ParserAdapter[] = [
    typescriptParser,
    pythonParser,
    goParser,
    rustParser,
    rubyParser,
    javaParser,
    csharpParser,
  ];

  /**
   * Parse a file's content into AST-level entities.
   */
  parseFile(content: string, filePath: string): ParseResult | null {
    const ext = filePath.split('.').pop() ?? '';
    const parser = this._parsers.find((p) =>
      p.languages.some((lang) => {
        if (lang === 'typescript') return ext === 'ts';
        if (lang === 'javascript')
          return ext === 'js' || ext === 'mjs' || ext === 'cjs';
        if (lang === 'tsx') return ext === 'tsx';
        if (lang === 'jsx') return ext === 'jsx';
        if (lang === 'python') return ext === 'py' || ext === 'pyi';
        if (lang === 'go') return ext === 'go';
        if (lang === 'rust') return ext === 'rs';
        if (lang === 'ruby') return ext === 'rb';
        if (lang === 'java') return ext === 'java';
        if (lang === 'csharp') return ext === 'cs';
        return false;
      }),
    );
    if (!parser) return null;
    return parser.parse(content, filePath);
  }

  /**
   * Compute semantic diff between two versions of a file.
   */
  semanticDiff(
    oldContent: string,
    newContent: string,
    filePath: string,
  ): SemanticPatch[] {
    const parser = this._parsers.find((p) =>
      p.languages.some((lang) => {
        const ext = filePath.split('.').pop() ?? '';
        if (lang === 'typescript') return ext === 'ts';
        if (lang === 'javascript')
          return ext === 'js' || ext === 'mjs' || ext === 'cjs';
        if (lang === 'tsx') return ext === 'tsx';
        if (lang === 'jsx') return ext === 'jsx';
        if (lang === 'python') return ext === 'py' || ext === 'pyi';
        if (lang === 'go') return ext === 'go';
        if (lang === 'rust') return ext === 'rs';
        if (lang === 'ruby') return ext === 'rb';
        if (lang === 'java') return ext === 'java';
        if (lang === 'csharp') return ext === 'cs';
        return false;
      }),
    );
    if (!parser) return [];
    const oldResult = parser.parse(oldContent, filePath);
    const newResult = parser.parse(newContent, filePath);
    return parser.diff(oldResult, newResult);
  }

  // -------------------------------------------------------------------------
  // Idea Garden (delegated to src/garden/)
  // -------------------------------------------------------------------------

  private _garden: IdeaGarden | null = null;

  /**
   * Get the Idea Garden instance for exploring abandoned work.
   */
  garden(): IdeaGarden {
    if (!this._garden) {
      this._garden = new IdeaGarden({
        readAllOps: () => this.opLog.readAll(),
        getMilestonedOpHashes: () =>
          buildMilestonedOpHashes(this.opLog.readAll()),
      });
    }
    return this._garden;
  }

  // -------------------------------------------------------------------------
  // Issue Management (delegated to src/vcs/issue.ts)
  // -------------------------------------------------------------------------

  async createIssue(
    title: string,
    opts?: issueMod.IssueCreateOptions,
  ): Promise<VcsOp> {
    const op = await issueMod.createIssue(
      this._ctx(),
      this.config.rootPath,
      title,
      opts,
    );
    await this.flushAutoCheckpoint();
    return op;
  }

  async updateIssue(
    id: string,
    updates: {
      title?: string;
      description?: string;
      priority?: 'critical' | 'high' | 'medium' | 'low';
      labels?: string[];
      assignee?: string;
      status?: 'backlog' | 'queue' | 'in_progress' | 'paused' | 'closed';
      parentId?: string | null;
    },
  ): Promise<VcsOp> {
    const op = await issueMod.updateIssue(this._ctx(), id, updates);
    await this.flushAutoCheckpoint();
    return op;
  }

  /**
   * Start an issue: optionally create+enter a lane, optionally create+switch to
   * a branch, emit `vcs:issueStart`, apply start criteria.
   *
   * `branch` is separable from `lane` on purpose. Branch creation used to be
   * unconditional while the lane was opt-out — so a repo that treats branches as
   * an antipattern (staying on `main`) had to avoid `issue start` entirely, and
   * avoiding it silently opted every agent out of LANES too, since this is the
   * only thing that creates one. Agents then shared the main tree and swept each
   * other's in-flight edits. The lane is the isolation that matters; the branch
   * is a naming convenience.
   */
  async startIssue(
    id: string,
    opts?: { lane?: boolean; branch?: boolean; sessionId?: string },
  ): Promise<VcsOp> {
    if (this.activeLaneId) {
      await this.leaveLane();
    }

    const issue = issueMod.getIssue(this._ctx(), id);
    if (!issue) throw new Error(`Issue ${id} not found.`);

    const slug = (issue.title ?? id)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);
    const issueIdSlug = id
      .replace(/^issue:/, '')
      .replace(/[^a-zA-Z0-9-]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);
    const branchName = `issue/${issueIdSlug}-${slug}`;
    const wantBranch = opts?.branch !== false;

    if (wantBranch) {
      await this.createBranch(branchName);
    }

    // Emit the issueStart op. The branch name is still recorded when one was
    // made, so `issue show` and the dashboard are unchanged.
    const op = await issueMod.startIssue(
      this._ctx(),
      id,
      wantBranch ? branchName : undefined,
    );

    await issueMod.applyIssueStartCriteria(
      this._ctx(),
      id,
      this.config.rootPath,
      issue.labels,
    );

    if (wantBranch) {
      this.switchBranch(branchName);
    }

    if (opts?.lane !== false) {
      const issueKey = id.startsWith('issue:') ? id : `issue:${id}`;
      let lane = this.findLaneForIssue(id);
      if (lane?.sessionId && opts?.sessionId && lane.sessionId !== opts.sessionId) {
        throw new Error(
          `Issue ${id} is active on lane ${lane.id} (session ${lane.sessionId}).`,
        );
      }
      if (!lane) {
        lane = await this.createLane({
          issueId: issueKey,
          sessionId: opts?.sessionId,
        });
      }
      await this.enterLane(lane.id);
      await issueClaimMod.claimIssue(
        this._ctx(),
        {
          issueId: id,
          laneId: lane.id,
          sessionId: opts?.sessionId ?? lane.sessionId,
        },
        this.config.rootPath,
      );
    }

    await this.flushAutoCheckpoint();
    return op;
  }

  async pauseIssue(id: string, note: string): Promise<VcsOp> {
    if (this.activeLaneId) {
      await this.leaveLane();
    }

    const op = await issueMod.pauseIssue(this._ctx(), id, note);

    // Switch back to default branch
    this.switchBranch(this.config.defaultBranch);

    await this.flushAutoCheckpoint();
    return op;
  }

  async resumeIssue(
    id: string,
    opts?: { lane?: boolean; sessionId?: string },
  ): Promise<VcsOp> {
    const issue = issueMod.getIssue(this._ctx(), id);
    if (!issue) throw new Error(`Issue ${id} not found.`);
    if (!issue.branchName)
      throw new Error(`Issue ${id} has no tracked branch.`);

    const op = await issueMod.resumeIssue(this._ctx(), id);

    // Switch to the issue branch
    this.switchBranch(issue.branchName);

    if (opts?.lane !== false) {
      const lane = this.findLaneForIssue(id);
      if (lane) {
        if (
          lane.sessionId &&
          opts?.sessionId &&
          lane.sessionId !== opts.sessionId
        ) {
          throw new Error(
            `Issue ${id} is on lane ${lane.id} (session ${lane.sessionId}).`,
          );
        }
        await this.enterLane(lane.id);
        await issueClaimMod.claimIssue(
          this._ctx(),
          {
            issueId: id,
            laneId: lane.id,
            sessionId: opts?.sessionId ?? lane.sessionId,
          },
          this.config.rootPath,
        );
      }
    }

    await this.flushAutoCheckpoint();
    return op;
  }

  async closeIssue(
    id: string,
    opts?: {
      confirm?: boolean;
      push?: boolean;
      noPromote?: boolean;
      requireTest?: boolean;
    },
  ): Promise<{
    op?: VcsOp;
    criteriaResults: issueMod.CriterionResult[];
    gitSync?: GitSyncResult;
    promoteResult?: lanePromoteMod.LanePromoteResult;
  }> {
    if (this.activeLaneId) {
      await this.leaveLane();
    }

    let promoteResult: lanePromoteMod.LanePromoteResult | undefined;
    if (opts?.confirm) {
      promoteResult = await this.autoPromoteIssueLaneBeforeClose(id, opts);
    }

    const result = await issueMod.closeIssue(this._ctx(), id, opts);
    if (result.op) {
      await this.flushAutoCheckpoint();

      // Clean up worktree for the issue's lane if it wasn't promoted
      if (!promoteResult?.promoted) {
        const lane = this.findLaneForIssue(id);
        if (lane && lane.worktreePath) {
          this.removeLaneWorktree(lane);
        }
      }

      const shouldPush =
        opts?.push === true || this.config.git?.pushOnClose === true;
      if (shouldPush) {
        const issue = issueMod.getIssue(this._ctx(), id);
        const message = issue?.title
          ? `${id}: ${issue.title}`
          : `${id}: issue close`;
        const gitSync = await this.syncGitIntegration({
          message,
          push: true,
          force: true,
        });
        return { ...result, gitSync, promoteResult };
      }
    }
    return { ...result, promoteResult };
  }

  async triageIssue(id: string): Promise<VcsOp> {
    const op = await issueMod.triageIssue(this._ctx(), id);
    await this.flushAutoCheckpoint();
    return op;
  }

  async reopenIssue(id: string): Promise<VcsOp> {
    const op = await issueMod.reopenIssue(this._ctx(), id);
    await this.flushAutoCheckpoint();
    return op;
  }

  checkCompletionReadiness(): issueMod.CompletionReadiness {
    return issueMod.checkCompletionReadiness(this._ctx());
  }

  async assignIssue(id: string, agentId: string): Promise<VcsOp> {
    const op = await issueMod.assignIssue(this._ctx(), id, agentId);
    await this.flushAutoCheckpoint();
    return op;
  }

  async blockIssue(id: string, blockedById: string): Promise<VcsOp> {
    const op = await issueMod.blockIssue(this._ctx(), id, blockedById);
    await this.flushAutoCheckpoint();
    return op;
  }

  async unblockIssue(id: string, blockedById: string): Promise<VcsOp> {
    const op = await issueMod.unblockIssue(this._ctx(), id, blockedById);
    await this.flushAutoCheckpoint();
    return op;
  }

  async addCriterion(
    issueId: string,
    description: string,
    opts?: string | { command?: string; suite?: string },
  ): Promise<VcsOp> {
    const normalized =
      typeof opts === 'string' ? { command: opts } : (opts ?? undefined);
    const op = await issueMod.addCriterion(
      this._ctx(),
      issueId,
      description,
      normalized,
    );
    await this.flushAutoCheckpoint();
    return op;
  }

  /** Retract an acceptance criterion by its 1-based index in the live list (TRL-1). */
  async removeCriterion(
    issueId: string,
    criterionIndex: number,
  ): Promise<VcsOp> {
    const op = await issueMod.removeCriterion(
      this._ctx(),
      issueId,
      criterionIndex,
    );
    await this.flushAutoCheckpoint();
    return op;
  }

  async setCriterionStatus(
    issueId: string,
    criterionIndex: number,
    status: 'passed' | 'failed' | 'pending',
  ): Promise<VcsOp> {
    const op = await issueMod.setCriterionStatus(
      this._ctx(),
      issueId,
      criterionIndex,
      status,
    );
    await this.flushAutoCheckpoint();
    return op;
  }

  async runCriteria(issueId: string): Promise<issueMod.CriterionResult[]> {
    const results = await issueMod.runCriteria(
      this._ctx(),
      issueId,
      this.getEditRoot(),
      {
        laneId: this.activeLaneId,
        manifestRoot: this.config.rootPath,
      },
    );
    await this.flushAutoCheckpoint();
    return results;
  }

  async runTests(opts?: {
    suiteIds?: string[];
    laneId?: string;
    issueId?: string;
    trigger?: testRunnerMod.TestRunTrigger;
  }): Promise<testRunnerMod.TestRunResult[]> {
    const laneId = opts?.laneId ?? this.activeLaneId;
    const cwd = this.getEditRoot(laneId);
    const manifest = testRunnerMod.tryLoadTestManifest(this.config.rootPath);
    if (!manifest) {
      throw new Error(
        'No test manifest at .trellis/tests.json — add suites before running trellis test',
      );
    }

    const suiteIds =
      opts?.suiteIds ??
      (manifest.defaultSuite ? [manifest.defaultSuite] : Object.keys(manifest.suites));
    if (suiteIds.length === 0) {
      throw new Error('No test suites defined in .trellis/tests.json');
    }

    const results = await testRunnerMod.runTestSuites(this._ctx(), {
      cwd,
      manifestRoot: this.config.rootPath,
      suiteIds,
      manifest,
      laneId,
      issueId: opts?.issueId,
      trigger: opts?.trigger ?? 'manual',
    });
    await this.flushAutoCheckpoint();
    return results;
  }

  listIssues(filters?: issueMod.IssueFilters): issueMod.IssueInfo[] {
    return issueMod.listIssues(this._ctx(), filters);
  }

  getIssue(id: string): issueMod.IssueInfo | null {
    return issueMod.getIssue(this._ctx(), id);
  }

  getActiveIssues(): issueMod.IssueInfo[] {
    return issueMod.getActiveIssues(this._ctx());
  }

  // -------------------------------------------------------------------------
  // EAV Store (delegated to src/vcs/store.ts — ADR 0008)
  // -------------------------------------------------------------------------

  async createStoreEntity(
    entityId: string,
    type: string,
    attributes: Record<string, Atom> = {},
    opts?: storeMod.StoreEntityCreateOptions,
  ): Promise<VcsOp> {
    const op = await storeMod.createEntity(
      this._ctx(),
      entityId,
      type,
      attributes,
      opts,
    );
    await this.flushAutoCheckpoint();
    return op;
  }

  async updateStoreEntity(
    entityId: string,
    updates: Record<string, Atom>,
  ): Promise<VcsOp> {
    const op = await storeMod.updateEntity(this._ctx(), entityId, updates);
    await this.flushAutoCheckpoint();
    return op;
  }

  async deleteStoreEntity(entityId: string): Promise<VcsOp> {
    const op = await storeMod.deleteEntity(this._ctx(), entityId);
    await this.flushAutoCheckpoint();
    return op;
  }

  getStoreEntity(entityId: string): EntityRecord | null {
    return storeMod.getEntity(this._ctx(), entityId);
  }

  listStoreEntities(
    type?: string,
    filters?: Record<string, Atom>,
    opts?: { includeVcs?: boolean },
  ): EntityRecord[] {
    return storeMod.listEntities(this._ctx(), type, filters, opts);
  }

  /** Raw EAV store (materialized from ops.json in VCS repos). */
  getEavStore() {
    return this._ctx().store;
  }

  async addStoreFact(
    entityId: string,
    attribute: string,
    value: Atom,
  ): Promise<VcsOp> {
    const op = await storeMod.addFact(this._ctx(), entityId, attribute, value);
    await this.flushAutoCheckpoint();
    return op;
  }

  async removeStoreFact(
    entityId: string,
    attribute: string,
    value: Atom,
  ): Promise<VcsOp> {
    const op = await storeMod.removeFact(
      this._ctx(),
      entityId,
      attribute,
      value,
    );
    await this.flushAutoCheckpoint();
    return op;
  }

  async addStoreLink(
    sourceId: string,
    attribute: string,
    targetId: string,
  ): Promise<VcsOp> {
    const op = await storeMod.addLink(
      this._ctx(),
      sourceId,
      attribute,
      targetId,
    );
    await this.flushAutoCheckpoint();
    return op;
  }

  async removeStoreLink(
    sourceId: string,
    attribute: string,
    targetId: string,
  ): Promise<VcsOp> {
    const op = await storeMod.removeLink(
      this._ctx(),
      sourceId,
      attribute,
      targetId,
    );
    await this.flushAutoCheckpoint();
    return op;
  }

  // -------------------------------------------------------------------------
  // Decision Traces
  // -------------------------------------------------------------------------

  async recordDecision(input: decisionMod.DecisionInput): Promise<VcsOp> {
    const op = await decisionMod.recordDecision(
      this._ctx(),
      this.config.rootPath,
      input,
    );
    await this.flushAutoCheckpoint();
    return op;
  }

  /**
   * Record a harness chat message as a vcs:chatMessage op.
   *
   * Config-gated by `transcripts.enabled` (default false); returns null when
   * disabled. Transcript ops are local-only by default (no peer sync).
   */
  async recordChatMessage(
    input: transcriptMod.ChatMessageInput,
  ): Promise<VcsOp | null> {
    const op = await transcriptMod.recordChatMessage(
      this._ctx(),
      this.config.rootPath,
      input,
    );
    if (op) await this.flushAutoCheckpoint();
    return op;
  }

  /** Recent chat messages from the op log (most recent first). */
  async listChatMessages(opts?: {
    sessionId?: string;
    laneId?: string;
    limit?: number;
  }): Promise<ReturnType<typeof transcriptMod.listChatMessages>> {
    const ops = await this.getOps();
    return transcriptMod.listChatMessages(ops, opts);
  }

  async recordRemotePush(info: {
    remoteName?: string;
    remoteRepoId?: string;
    remoteTailHash?: string;
    remoteByteLength?: number;
  }): Promise<VcsOp> {
    const op = await createVcsOp('vcs:remotePush', {
      agentId: this.agentId,
      previousHash: this.opLog.getLastOp()?.hash,
      vcs: {
        remoteName: info.remoteName,
        remoteRepoId: info.remoteRepoId,
        remoteTailHash: info.remoteTailHash,
        remoteByteLength: info.remoteByteLength,
      },
    });
    await this.applyOp(op, { allowIntegrationWrite: true });
    await this.flushAutoCheckpoint();
    return op;
  }

  async recordRemotePull(info: {
    remoteName?: string;
    remoteRepoId?: string;
    remoteTailHash?: string;
    remoteByteLength?: number;
  }): Promise<VcsOp> {
    const op = await createVcsOp('vcs:remotePull', {
      agentId: this.agentId,
      previousHash: this.opLog.getLastOp()?.hash,
      vcs: {
        remoteName: info.remoteName,
        remoteRepoId: info.remoteRepoId,
        remoteTailHash: info.remoteTailHash,
        remoteByteLength: info.remoteByteLength,
      },
    });
    await this.applyOp(op, { allowIntegrationWrite: true });
    await this.flushAutoCheckpoint();
    return op;
  }

  // -------------------------------------------------------------------------
  // Project identity (ADR 0032 §2/§4)
  // -------------------------------------------------------------------------

  /** Set (or update) the project's owner/name/kind metadata and persist it. */
  setProjectMetadata(meta: NonNullable<TrellisVcsConfig['project']>): void {
    this.config.project = { ...this.config.project, ...meta };
    this.writePersistedConfig();
  }

  /** The stable ledger repoId (persisted, or the in-memory config value). */
  getPersistedRepoId(): string {
    if (this.config.repoId) return this.config.repoId;
    const existing = this.readPersistedConfig();
    if (existing?.repoId) {
      this.config.repoId = existing.repoId;
      return existing.repoId;
    }
    throw new Error('No repoId available — run initRepo first.');
  }

  getProjectMetadata(): NonNullable<TrellisVcsConfig['project']> {
    return this.config.project ?? {};
  }

  /**
   * Mint + apply the owner-signed `vcs:repoAttest` op (ADR 0032 §4).
   * Returns the applied op. The attestation is chained to the current tail.
   */
  async attestProject(input: {
    owner: string;
    repoName: string;
    repoId: string;
    kind?: string;
    privateKey: string;
  }): Promise<VcsOp> {
    const op = await createProjectAttestation({
      owner: input.owner,
      repoName: input.repoName,
      repoId: input.repoId,
      kind: input.kind,
      privateKey: input.privateKey,
      agentId: this.agentId,
      previousHash: this.opLog.getLastOp()?.hash,
    });
    await this.applyOp(op, {
      allowIntegrationWrite: true,
      skipOwnershipCheck: true,
    });
    await this.flushAutoCheckpoint();
    return op;
  }

  queryDecisions(filter?: decisionMod.DecisionFilter): decisionMod.Decision[] {
    return decisionMod.queryDecisions(this._ctx(), filter);
  }

  getDecisionChain(entityId: string): decisionMod.Decision[] {
    return decisionMod.getDecisionChain(this._ctx(), entityId);
  }

  getDecision(id: string): decisionMod.Decision | null {
    return decisionMod.getDecision(this._ctx(), id);
  }

  // -------------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------------

  private _ctx(): EngineContext {
    return {
      store: this.store,
      agentId: this.agentId,
      provenance: this.provenance,
      signingMaterial: this.signingMaterial,
      readAllOps: () => this.getActiveJournal().readAll(),
      getLastOp: () => this.getActiveJournal().getLastOp(),
      applyOp: (op, opts) => this.applyOp(op, opts),
    };
  }

  private trellisDir(): string {
    return join(this.config.rootPath, '.trellis');
  }

  private getActiveJournal(): OpLog {
    if (this.activeLaneId && this.activeLaneLog) {
      return this.activeLaneLog;
    }
    return this.opLog;
  }

  private invalidateIntegrationCache(): void {
    this.integrationCache = null;
  }

  private loadLaneJournalOps(laneId: string): VcsOp[] {
    const log = new LaneOpLog(laneMod.laneDir(this.trellisDir(), laneId));
    log.load();
    return log.readAll();
  }

  private refreshMaterializedStore(
    integrationOps: VcsOp[],
    laneOps?: VcsOp[],
    meta?: LaneMeta,
  ): void {
    const laneMeta =
      meta ??
      (this.activeLaneId ? this.getLaneMeta(this.activeLaneId) : undefined);

    if (laneMeta?.forkKind === 'child' && laneMeta.parentLaneId) {
      const parentLaneOps = this.loadLaneJournalOps(laneMeta.parentLaneId);
      const { store, stats } = materializeMod.materializeChildForkEntry(
        integrationOps,
        laneMeta.baseOpHash,
        parentLaneOps,
        laneOps ?? [],
      );
      this.store = store;
      this.materializationStats = stats;
      return;
    }

    const tailHash = integrationOps[integrationOps.length - 1]?.hash;
    const { store, cache, stats } = materializeMod.materializeIntegrationOps(
      integrationOps,
      this.integrationCache,
      tailHash,
      { snapshotPath: integrationSnapshotPath(this.trellisDir()) },
    );
    this.integrationCache = cache;

    if (laneOps !== undefined) {
      const overlay = materializeMod.overlayLaneOps(store, laneOps);
      materializeMod.reapplyIntegrationCriterionUpdates(
        overlay.store,
        integrationOps,
      );
      this.store = overlay.store;
      this.materializationStats = {
        ...stats,
        laneOpsReplayed: overlay.laneOpsReplayed,
      };
      return;
    }

    this.store = store;
    this.materializationStats = stats;
  }

  /** Swap back to cached integration store without replaying the journal. */
  private restoreIntegrationOnlyStore(): void {
    const integrationOps = this.opLog.readAll();
    const tailHash = integrationOps[integrationOps.length - 1]?.hash;
    const { store, cache, stats } = materializeMod.materializeIntegrationOps(
      integrationOps,
      this.integrationCache,
      tailHash,
      { snapshotPath: integrationSnapshotPath(this.trellisDir()) },
    );
    this.integrationCache = cache;
    this.store = store;
    this.materializationStats = {
      ...stats,
      laneOpsReplayed: 0,
    };
  }

  private rebuildStore(ops: VcsOp[]): void {
    this.store = new EAVStore();
    for (const op of ops) {
      this.replayOp(op);
    }
  }

  private syncIngestionLastOpHash(): void {
    if (this.ingestion) {
      this.ingestion.setLastOpHash(this.getActiveJournal().getLastOp()?.hash);
    }
  }

  /**
   * Tag an op with the lane it was minted in (TRL-102).
   *
   * Writes the ENVELOPE field, not `op.vcs`. `createVcsOp` has already hashed
   * `vcs` by the time we get here, so mutating the payload silently invalidated
   * the hash — every op in every lane journal failed `verifyVcsOpHash`, and
   * would be rejected as `hash-mismatch` at any ingest boundary.
   *
   * The lane is ambient context, not identity: the same semantic op in two
   * lanes must hash identically, or peers lose dedup and cherry-pick rewrites
   * identity. `laneId` is outside the preimage by construction.
   */
  private stampLaneId(op: VcsOp): void {
    if (!this.activeLaneId) return;
    op.laneId = this.activeLaneId;
  }

  private requireActiveLaneLog(): LaneOpLog {
    if (!this.activeLaneId || !this.activeLaneLog) {
      throw new Error('No active lane journal');
    }
    return this.activeLaneLog;
  }

  private isIssueIntegrationOp(kind: string): boolean {
    return ISSUE_INTEGRATION_KINDS.has(kind);
  }

  private async applyOp(op: VcsOp, opts?: ApplyOpOptions): Promise<void> {
    const inLane = Boolean(this.activeLaneId);
    const forceIntegration =
      Boolean(opts?.allowIntegrationWrite) ||
      (inLane && this.isIssueIntegrationOp(op.kind));

    let opToApply = op;
    if (inLane && forceIntegration) {
      const intLast = this.opLog.getLastOp();
      if (intLast?.hash !== op.previousHash && isVcsOpKind(op.kind)) {
        opToApply = await createVcsOp(op.kind, {
          agentId: op.agentId,
          previousHash: intLast?.hash,
          vcs: op.vcs ?? {},
        });
      }
    }

    if (inLane && !forceIntegration) {
      this.stampLaneId(opToApply);
    }

    // TRL-117 AC4: reject silent writes into another agent's live lane files.
    if (!opts?.skipOwnershipCheck) {
      laneOwnershipMod.assertCrossAgentFileWriteAllowed(
        this.trellisDir(),
        opToApply,
      );
    }

    const decomposed = decompose(opToApply);

    if (decomposed.deleteFacts.length > 0) {
      this.store.deleteFacts(decomposed.deleteFacts);
    }
    if (decomposed.deleteLinks.length > 0) {
      this.store.deleteLinks(decomposed.deleteLinks);
    }
    if (decomposed.addFacts.length > 0) {
      this.store.addFacts(decomposed.addFacts);
    }
    if (decomposed.addLinks.length > 0) {
      this.store.addLinks(decomposed.addLinks);
    }

    if (inLane && !forceIntegration) {
      const laneLog = this.requireActiveLaneLog();
      laneLog.append(opToApply);
      laneMod.updateLaneHead(
        this.trellisDir(),
        this.activeLaneId!,
        opToApply.hash,
      );

      if (
        opToApply.kind !== 'vcs:checkpointCreate' &&
        this.checkpointThreshold > 0
      ) {
        this.checkpointOpCount++;
        if (this.checkpointOpCount >= this.checkpointThreshold) {
          this._pendingAutoCheckpoint = true;
        }
      }
      return;
    }

    this.opLog.append(opToApply);

    if (inLane && forceIntegration) {
      const meta = this.getLaneMeta(this.activeLaneId!);
      this.refreshMaterializedStore(
        this.opLog.readAll(),
        this.activeLaneLog!.readAll(),
        meta,
      );
    } else if (!inLane) {
      if (!this.integrationCache) {
        this.integrationCache = {
          tailHash: opToApply.hash,
          store: this.store,
        };
      } else {
        this.integrationCache.tailHash = opToApply.hash;
      }
      savePersistedSnapshot(
        integrationSnapshotPath(this.trellisDir()),
        opToApply.hash,
        this.store,
      );
    }

    if (
      opToApply.kind !== 'vcs:checkpointCreate' &&
      this.checkpointThreshold > 0
    ) {
      this.checkpointOpCount++;
      if (this.checkpointOpCount >= this.checkpointThreshold) {
        this._pendingAutoCheckpoint = true;
      }
    }

    if (
      !opts?.skipBranchAdvance &&
      branchMod.shouldAdvanceBranchHead(opToApply.kind)
    ) {
      await this.appendBranchAdvance(opToApply.hash);
    }
  }

  private async appendBranchAdvance(targetOpHash: string): Promise<void> {
    const advanceOp = await createVcsOp('vcs:branchAdvance', {
      agentId: this.agentId,
      previousHash: this.opLog.getLastOp()?.hash,
      vcs: {
        branchName: this.currentBranch,
        targetOpHash,
      },
    });
    await this.applyOp(advanceOp, {
      skipBranchAdvance: true,
      allowIntegrationWrite: true,
    });
  }

  private async flushAutoCheckpoint(): Promise<void> {
    if (this._pendingAutoCheckpoint) {
      this._pendingAutoCheckpoint = false;
      await this.createCheckpoint('op-count');
    }
  }

  private loadCurrentBranch(): void {
    const state = branchMod.loadBranchState(this.config.rootPath);
    this.currentBranch = state.currentBranch;
    this.activeLaneId = state.activeLaneId;
    this.activeLaneLog = null;

    if (this.activeLaneId) {
      const meta = laneMod.loadLaneMeta(this.trellisDir(), this.activeLaneId);
      if (meta && meta.status === 'active') {
        this.activeLaneLog = new LaneOpLog(
          laneMod.laneDir(this.trellisDir(), this.activeLaneId),
        );
        this.activeLaneLog.load();
      } else {
        this.activeLaneId = undefined;
      }
    }
  }

  private replayOp(op: VcsOp): void {
    // Same as applyOp but doesn't persist (ops are already in the log)
    const decomposed = decompose(op);

    if (decomposed.deleteFacts.length > 0) {
      this.store.deleteFacts(decomposed.deleteFacts);
    }
    if (decomposed.deleteLinks.length > 0) {
      this.store.deleteLinks(decomposed.deleteLinks);
    }
    if (decomposed.addFacts.length > 0) {
      this.store.addFacts(decomposed.addFacts);
    }
    if (decomposed.addLinks.length > 0) {
      this.store.addLinks(decomposed.addLinks);
    }
  }
}
