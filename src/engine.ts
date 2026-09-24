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
  copyFileSync,
} from 'fs';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { EAVStore } from './core/store/eav-store.js';
import type { Fact, Link } from './core/store/eav-store.js';
import { FileWatcher, type ScanProgress } from './watcher/fs-watcher.js';
import { Ingestion } from './watcher/ingestion.js';
import { decompose } from './vcs/decompose.js';
import { createVcsOp, isVcsOpKind } from './vcs/ops.js';
import type { VcsOp, TrellisVcsConfig, FileChangeEvent } from './vcs/types.js';
import { DEFAULT_CONFIG } from './vcs/types.js';
import { BlobStore } from './vcs/blob-store.js';
import type { EngineContext } from './vcs/engine-context.js';
import * as branchMod from './vcs/branch.js';
import * as milestoneMod from './vcs/milestone.js';
import * as checkpointMod from './vcs/checkpoint.js';
import * as diffMod from './vcs/diff.js';
import * as mergeMod from './vcs/merge.js';
import * as issueMod from './vcs/issue.js';
import * as decisionMod from './decisions/index.js';
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

// ---------------------------------------------------------------------------
// Persistent op log (lightweight SQLite-free version for P0)
// ---------------------------------------------------------------------------

/**
 * A simple JSON-file-backed op log for P0.
 * Will be replaced by SqliteKernelBackend integration in P1.
 */
class JsonOpLog {
  private ops: VcsOp[] = [];
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  load(): void {
    if (existsSync(this.filePath)) {
      const raw = readFileSync(this.filePath, 'utf-8');
      try {
        this.ops = JSON.parse(raw);
      } catch (err) {
        // Attempt to load from backup
        const backupPath = this.filePath + '.bak';
        if (existsSync(backupPath)) {
          const backupRaw = readFileSync(backupPath, 'utf-8');
          this.ops = JSON.parse(backupRaw);
          // Restore the backup over the corrupted file
          writeFileSync(this.filePath, backupRaw);
        } else {
          throw new Error(
            `Corrupted ops.json and no backup found. Run \`trellis repair\` to attempt recovery.`,
          );
        }
      }
    }
  }

  append(op: VcsOp): void {
    this.ops.push(op);
    this.flush();
  }

  readAll(): VcsOp[] {
    return [...this.ops];
  }

  getLastOp(): VcsOp | undefined {
    return this.ops.length > 0 ? this.ops[this.ops.length - 1] : undefined;
  }

  count(): number {
    return this.ops.length;
  }

  private flush(): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    // Backup-on-write: keep one generation of backup
    if (existsSync(this.filePath)) {
      const backupPath = this.filePath + '.bak';
      try {
        copyFileSync(this.filePath, backupPath);
      } catch {
        // Best-effort backup — don't block writes
      }
    }
    writeFileSync(this.filePath, JSON.stringify(this.ops, null, 2));
  }

  /**
   * Attempt to repair a corrupted ops.json by truncating to the
   * last valid entry. Returns the number of recovered ops.
   */
  static repair(filePath: string): { recovered: number; lost: number } {
    if (!existsSync(filePath)) {
      return { recovered: 0, lost: 0 };
    }

    const raw = readFileSync(filePath, 'utf-8');

    // Try parsing as-is first
    try {
      const ops = JSON.parse(raw);
      return { recovered: ops.length, lost: 0 };
    } catch {
      // Corrupted — attempt truncation repair
    }

    // Find the last complete object by locating the last valid hash line
    const lastHash = raw.lastIndexOf('"hash": "trellis:op:');
    if (lastHash === -1) {
      // Check backup
      const bakPath = filePath + '.bak';
      if (existsSync(bakPath)) {
        const bakRaw = readFileSync(bakPath, 'utf-8');
        try {
          const ops = JSON.parse(bakRaw);
          writeFileSync(filePath, bakRaw);
          return { recovered: ops.length, lost: 0 };
        } catch {
          // Backup also corrupted
        }
      }
      writeFileSync(filePath, '[]');
      return { recovered: 0, lost: -1 };
    }

    // Find end of the hash line → closing brace of that object
    const endOfLine = raw.indexOf('\n', lastHash);
    const closingBrace = raw.indexOf('  }', endOfLine);
    if (closingBrace === -1) {
      writeFileSync(filePath, '[]');
      return { recovered: 0, lost: -1 };
    }

    const fixed = raw.slice(0, closingBrace + 3) + '\n]';
    try {
      const ops = JSON.parse(fixed);
      // Save repaired + backup of corrupted
      writeFileSync(filePath + '.corrupted', raw);
      writeFileSync(filePath, fixed);
      return { recovered: ops.length, lost: 0 };
    } catch {
      writeFileSync(filePath + '.corrupted', raw);
      writeFileSync(filePath, '[]');
      return { recovered: 0, lost: -1 };
    }
  }
}

// ---------------------------------------------------------------------------
// .gitignore reader
// ---------------------------------------------------------------------------

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

export class TrellisVcsEngine {
  private config: TrellisVcsConfig;
  private store: EAVStore;
  private opLog: JsonOpLog;
  private watcher: FileWatcher | null = null;
  private ingestion: Ingestion | null = null;
  private agentId: string;
  private currentBranch: string = 'main';
  private checkpointOpCount: number = 0;
  private checkpointThreshold: number = 100;
  private _pendingAutoCheckpoint: boolean = false;
  private _blobStore: BlobStore | null = null;

  constructor(
    opts: { rootPath: string; agentId?: string } & Partial<TrellisVcsConfig>,
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
    };
    this.agentId = opts.agentId ?? `agent:${process.env.USER ?? 'unknown'}`;
    this.store = new EAVStore();
    this.opLog = new JsonOpLog(
      join(this.config.rootPath, '.trellis', 'ops.json'),
    );
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  /**
   * Initialize a new TrellisVCS repo. Creates .trellis/ directory and config.
   */
  async initRepo(opts?: {
    onProgress?: (progress: InitProgress) => void;
  }): Promise<{ opsCreated: number; context: ProjectContext }> {
    ensureTrellisGitignoreEntry(this.config.rootPath);

    const trellisDir = join(this.config.rootPath, '.trellis');
    if (!existsSync(trellisDir)) {
      mkdirSync(trellisDir, { recursive: true });
    }

    // Initialize blob store
    this._blobStore = new BlobStore(trellisDir);

    // Write config
    const configPath = join(trellisDir, 'config.json');
    const persistedConfig: PersistedConfig = {
      rootPath: this.config.rootPath,
      ignorePatterns: this.config.ignorePatterns,
      debounceMs: this.config.debounceMs,
      defaultBranch: this.config.defaultBranch,
      agentId: this.agentId,
      createdAt: new Date().toISOString(),
    };
    writeFileSync(configPath, JSON.stringify(persistedConfig, null, 2));

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
    this.applyOp(branchOp);

    // Scan filesystem and create file-add ops for all existing files
    const scanner = new FileWatcher({
      rootPath: this.config.rootPath,
      ignorePatterns: [...this.config.ignorePatterns, '.trellis'],
      debounceMs: this.config.debounceMs,
      onEvent: () => {},
    });
    const events = await scanner.scan({
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

    let opsCreated = 1; // branch op
    opts?.onProgress?.({
      phase: 'recording',
      current: 0,
      total: events.length,
      message: `Scanning ${events.length} initial file operations…`,
    });
    for (const event of events) {
      // Store file content in blob store
      if (event.contentHash) {
        try {
          const absPath = join(this.config.rootPath, event.path);
          const content = await readFile(absPath);
          await this._blobStore!.put(content);
        } catch {}
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
      this.applyOp(op);
      opsCreated++;
      const scannedFiles = opsCreated - 1;
      if (scannedFiles % 25 === 0 || scannedFiles === events.length) {
        opts?.onProgress?.({
          phase: 'recording',
          current: scannedFiles,
          total: events.length,
          message: `Scanned ${scannedFiles}/${events.length} initial file ops`,
        });
      }
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
      precomputedFileCount: events.length,
    });
    const profile = loadProfile();
    writeAgentScaffold(this.config.rootPath, { profile, context });

    opts?.onProgress?.({
      phase: 'done',
      current: opsCreated,
      total: opsCreated,
      message: `Initialized repository with ${opsCreated} operations`,
    });
    return { opsCreated, context };
  }

  /**
   * Open an existing TrellisVCS repo. Loads ops and replays into EAV store.
   */
  open(): { opsReplayed: number } {
    this.opLog.load();

    // Initialize blob store
    const trellisDir = join(this.config.rootPath, '.trellis');
    this._blobStore = new BlobStore(trellisDir);

    // Load config
    const configPath = join(this.config.rootPath, '.trellis', 'config.json');
    if (existsSync(configPath)) {
      const raw = readFileSync(configPath, 'utf-8');
      const persisted: PersistedConfig = JSON.parse(raw);
      this.agentId = persisted.agentId;
      // Re-merge persisted patterns with .gitignore + .trellisignore
      const filePatterns = readIgnorePatterns(this.config.rootPath);
      this.config.ignorePatterns = [
        ...new Set([...persisted.ignorePatterns, ...filePatterns]),
      ];
      this.config.debounceMs = persisted.debounceMs;
      this.config.defaultBranch = persisted.defaultBranch;
    }

    // Load branch state
    this.loadCurrentBranch();

    // Replay all ops into the EAV store
    const ops = this.opLog.readAll();
    for (const op of ops) {
      this.replayOp(op);
    }

    return { opsReplayed: ops.length };
  }

  /**
   * Start watching the filesystem for changes.
   */
  watch(): void {
    this.ingestion = new Ingestion({
      agentId: this.agentId,
      lastOpHash: this.opLog.getLastOp()?.hash,
      onOp: (op) => this.applyOp(op),
    });

    this.watcher = new FileWatcher({
      rootPath: this.config.rootPath,
      ignorePatterns: [...this.config.ignorePatterns, '.trellis'],
      debounceMs: this.config.debounceMs,
      onEvent: async (event) => {
        // Store blob for file adds/modifies
        if (
          (event.type === 'add' || event.type === 'modify') &&
          event.contentHash &&
          this._blobStore
        ) {
          try {
            const absPath = join(this.config.rootPath, event.path);
            const content = await readFile(absPath);
            await this._blobStore.put(content);
          } catch {}
        }
        await this.ingestion!.process(event);
      },
    });

    // Scan to populate known files map, reconcile against op log for
    // untracked files, then start watching for live changes.
    this.watcher.scan().then(async (scanEvents) => {
      // Build set of paths already tracked in the op log
      const trackedPaths = new Set(this.trackedFiles().map((f) => f.path));

      // Emit fileAdd ops for files on disk that aren't in the op log
      for (const event of scanEvents) {
        if (!trackedPaths.has(event.path)) {
          // Store blob
          if (event.contentHash && this._blobStore) {
            try {
              const absPath = join(this.config.rootPath, event.path);
              const content = await readFile(absPath);
              await this._blobStore.put(content);
            } catch {}
          }
          await this.ingestion!.process(event);
        }
      }

      this.watcher!.start();
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

  static repair(rootPath: string): { recovered: number; lost: number } {
    const opsPath = join(rootPath, '.trellis', 'ops.json');
    return JsonOpLog.repair(opsPath);
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
    branchMod.saveBranchState(this.config.rootPath, { currentBranch: name });
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
    return diffMod.diffFileStates(stateA, stateB, this._blobStore);
  }

  /**
   * Diff between two op hashes in the causal stream.
   */
  diffOps(fromHash: string, toHash: string): diffMod.DiffResult {
    return diffMod.diffOpRange(
      this.opLog.readAll(),
      fromHash,
      toHash,
      this._blobStore,
    );
  }

  /**
   * Diff the current state against a specific op hash (e.g. a milestone).
   */
  diffFromOp(opHash: string): diffMod.DiffResult {
    const ops = this.opLog.readAll();
    const stateA = diffMod.buildFileStateAtOp(ops, opHash);
    const stateB = diffMod.buildFileStateAtOp(ops);
    return diffMod.diffFileStates(stateA, stateB, this._blobStore);
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

    return mergeMod.threeWayMerge(base, ours, theirs, this._blobStore);
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
    opts?: {
      priority?: 'critical' | 'high' | 'medium' | 'low';
      labels?: string[];
      assignee?: string;
      parentId?: string;
      description?: string;
      status?: 'backlog' | 'queue';
      criteria?: Array<{ description: string; command?: string }>;
    },
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
    },
  ): Promise<VcsOp> {
    const op = await issueMod.updateIssue(this._ctx(), id, updates);
    await this.flushAutoCheckpoint();
    return op;
  }

  async startIssue(id: string): Promise<VcsOp> {
    const issue = issueMod.getIssue(this._ctx(), id);
    if (!issue) throw new Error(`Issue ${id} not found.`);

    const slug = (issue.title ?? id)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);
    const branchName = `issue/${id}-${slug}`;

    // Create the branch
    await this.createBranch(branchName);

    // Emit the issueStart op
    const op = await issueMod.startIssue(this._ctx(), id, branchName);

    // Switch to the branch
    this.switchBranch(branchName);

    await this.flushAutoCheckpoint();
    return op;
  }

  async pauseIssue(id: string, note: string): Promise<VcsOp> {
    const op = await issueMod.pauseIssue(this._ctx(), id, note);

    // Switch back to default branch
    this.switchBranch(this.config.defaultBranch);

    await this.flushAutoCheckpoint();
    return op;
  }

  async resumeIssue(id: string): Promise<VcsOp> {
    const issue = issueMod.getIssue(this._ctx(), id);
    if (!issue) throw new Error(`Issue ${id} not found.`);
    if (!issue.branchName)
      throw new Error(`Issue ${id} has no tracked branch.`);

    const op = await issueMod.resumeIssue(this._ctx(), id);

    // Switch to the issue branch
    this.switchBranch(issue.branchName);

    await this.flushAutoCheckpoint();
    return op;
  }

  async closeIssue(
    id: string,
    opts?: { confirm?: boolean },
  ): Promise<{ op?: VcsOp; criteriaResults: issueMod.CriterionResult[] }> {
    const result = await issueMod.closeIssue(this._ctx(), id, opts);
    if (result.op) {
      await this.flushAutoCheckpoint();
    }
    return result;
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
    command?: string,
  ): Promise<VcsOp> {
    const op = await issueMod.addCriterion(
      this._ctx(),
      issueId,
      description,
      command,
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
    return issueMod.runCriteria(this._ctx(), issueId, this.config.rootPath);
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
      readAllOps: () => this.opLog.readAll(),
      getLastOp: () => this.opLog.getLastOp(),
      applyOp: (op) => this.applyOp(op),
    };
  }

  private applyOp(op: VcsOp): void {
    // Decompose VCS op into EAV primitives and apply to store
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

    // Persist to op log
    this.opLog.append(op);

    // Auto-checkpoint logic: set flag, flushed by public async callers
    if (op.kind !== 'vcs:checkpointCreate' && this.checkpointThreshold > 0) {
      this.checkpointOpCount++;
      if (this.checkpointOpCount >= this.checkpointThreshold) {
        this._pendingAutoCheckpoint = true;
      }
    }
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
