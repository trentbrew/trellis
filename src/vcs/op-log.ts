/**
 * JSONL (newline-delimited) op log (P0).
 * Shared by integration journal and per-lane journals (ADR 0001, ADR 0005).
 *
 * On-disk format is one op per line (`JSON.stringify(op) + "\n"`). Appends use
 * `appendFileSync`, which is atomic for the small per-op payloads Trellis mints,
 * so two processes can never clobber each other's writes — each simply adds its
 * line. This replaces the old single-JSON-array format, whose `append()` rewrote
 * the *entire* array from whatever was in memory; a long-lived process holding a
 * stale in-memory copy could silently overwrite intervening appends from another
 * process (the lost-backfill / lost-epic bug).
 *
 * Legacy JSON-array files are still readable: `load()` detects the `[` prefix and
 * parses the array. The first `append()` after a legacy load migrates the file to
 * JSONL in one atomic step, then continues appending lines.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  openSync,
  closeSync,
  unlinkSync,
  renameSync,
  appendFileSync,
} from 'fs';
import { dirname, resolve } from 'path';
import type { VcsOp } from './types.js';
import { requireDestructiveConfirm } from './destructive-guard.js';
import { mirrorOpLine, restoreOpsFromMirror, backfillMirrorIfBehind } from './oplog-mirror.js';
import { assertRecentRemoteAckForRepair } from './oplog-remote.js';

export interface RepairOptions {
  confirmDestructive?: boolean;
  /** Human ack that remote backup may be stale (repair gate). */
  iKnow?: boolean;
  /** Repo root for remote ack check (defaults from ops path). */
  rootPath?: string;
  /** Attempt ~/.trellis/oplog-mirror restore before truncating local file */
  preferMirror?: boolean;
}

export interface RepairResult {
  recovered: number;
  lost: number;
  /** Restored from local mirror before repair */
  mirrorRestored?: number;
}

/**
 * Backend-agnostic op log surface.
 *
 * Implementations may persist to filesystem (`JsonOpLog`), IndexedDB
 * (`IdbOpLog`), or any other store. The contract:
 *
 * - `load()` returns `void | Promise<void>` so filesystem backends can stay
 *   synchronous while browser backends (IndexedDB, OPFS) are async. Callers
 *   that may use either backend should `await opLog.load()`.
 * - `append()`, `readAll()`, `getLastOp()`, `count()` are sync — they
 *   operate on an in-memory cache the backend maintains. Sync reads are
 *   required by the engine, which does not await op-log access on hot paths.
 * - `flush()` is optional — when present, awaiting it guarantees durability
 *   for backends with deferred writes (e.g. IndexedDB). Filesystem backends
 *   that write synchronously may omit it.
 *
 * Implementations are responsible for hash-deduplication on `append`.
 */
export interface OpLog {
  load(): void | Promise<void>;
  append(op: VcsOp): void;
  readAll(): VcsOp[];
  getLastOp(): VcsOp | undefined;
  count(): number;
  flush?(): Promise<void>;
}

function lockTimeoutMs(): number {
  const raw = process.env.TRELLIS_OPLOG_LOCK_MS;
  if (!raw) return 5000;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5000;
}

export class JsonOpLog implements OpLog {
  private ops: VcsOp[] = [];
  private hashes = new Set<string>();
  private filePath: string;
  private lockPath: string;
  /** True when the on-disk file is still the legacy single JSON array. */
  private legacy = false;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.lockPath = `${filePath}.lock`;
  }

  get path(): string {
    return this.filePath;
  }

  load(): void {
    this.hashes.clear();
    if (!existsSync(this.filePath)) {
      this.ops = [];
      this.legacy = false;
      return;
    }
    const raw = readFileSync(this.filePath, 'utf-8');
    this.legacy = raw.trim().startsWith('[');
    this.ops = this.parseFile(raw);
    this.hashes = new Set(this.ops.map((o) => o.hash));
    backfillMirrorIfBehind(this.filePath);
  }

  append(op: VcsOp): void {
    this.withLock(() => {
      if (this.legacy) {
        // Another process may have appended to the legacy array since we
        // loaded. Re-read the authoritative file, then migrate to JSONL once.
        this.ops = this.readDiskOps();
        this.hashes = new Set(this.ops.map((o) => o.hash));
        this.migrateToJsonl();
        this.legacy = false;
      } else if (existsSync(this.filePath)) {
        // A peer process may have appended since we loaded. Adopt the longer
        // disk journal so our in-memory tail reflects reality.
        const diskOps = this.readDiskOps();
        if (diskOps.length > this.ops.length) {
          this.ops = diskOps;
          this.hashes = new Set(diskOps.map((o) => o.hash));
        }
      }

      if (this.hashes.has(op.hash)) return;

      // Append ONLY this op. `appendFileSync` is atomic for the small per-op
      // payloads Trellis mints, so a peer writing concurrently adds its own
      // line — neither clobbers the other. This is the fix for the silent
      // op-loss bug: the old code rewrote the whole array from in-memory state,
      // so a long-lived process holding a stale in-memory copy could overwrite
      // another process's appends.
      //
      // We preserve `op` exactly as given — including its `previousHash` and
      // hash. Re-chaining to the local tail would be wrong for sync/merge, where
      // a received op must keep its foreign `previousHash` and original hash so
      // peer engines converge. Concurrent appends to the *same* journal are
      // prevented architecturally by lanes (each agent works in its own lane
      // journal); if they ever do collide, a fork is far less harmful than the
      // silent data loss this change eliminates.
      this.appendLineToDisk(op);
      this.ops.push(op);
      this.hashes.add(op.hash);
    });
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

  /** Parse either a legacy JSON array or a JSONL file into ops. */
  private parseFile(raw: string): VcsOp[] {
    const trimmed = raw.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return this.parseJsonl(raw);
      }
    }
    return this.parseJsonl(raw);
  }

  private parseJsonl(raw: string): VcsOp[] {
    const out: VcsOp[] = [];
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t) continue;
      try {
        out.push(JSON.parse(t));
      } catch {
        // skip a malformed trailing line; `repair` is the recovery path
      }
    }
    return out;
  }

  /** Authoritative read of the on-disk journal (array or JSONL). */
  private readDiskOps(): VcsOp[] {
    if (!existsSync(this.filePath)) return [];
    return this.parseFile(readFileSync(this.filePath, 'utf-8'));
  }

  /** One-time write of the legacy array as JSONL, atomically. */
  private migrateToJsonl(): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    this.backupCurrentFile();
    const tmp = `${this.filePath}.tmp`;
    const payload =
      this.ops.map((o) => JSON.stringify(o)).join('\n') +
      (this.ops.length ? '\n' : '');
    writeFileSync(tmp, payload);
    renameSync(tmp, this.filePath);
    for (const line of payload.split('\n')) {
      if (line.trim()) mirrorOpLine(this.filePath, line);
    }
  }

  private appendLineToDisk(op: VcsOp): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    this.backupCurrentFile();
    const line = JSON.stringify(op) + '\n';
    appendFileSync(this.filePath, line);
    mirrorOpLine(this.filePath, line, op.hash);
  }

  private backupCurrentFile(): void {
    if (!existsSync(this.filePath)) return;
    const backupPath = this.filePath + '.bak';
    // Ring: .bak.2 ← .bak.1 ← .bak ← current (single-slot overwrite was the wipe amplifier)
    for (let i = 2; i >= 1; i--) {
      const from = i === 1 ? backupPath : `${backupPath}.${i - 1}`;
      const to = `${backupPath}.${i}`;
      if (!existsSync(from)) continue;
      try {
        copyFileSync(from, to);
      } catch {
        /* best-effort */
      }
    }
    try {
      copyFileSync(this.filePath, backupPath);
    } catch {
      // best-effort
    }
  }

  private withLock(fn: () => void): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const deadline = Date.now() + lockTimeoutMs();
    let lockFd: number | undefined;

    while (Date.now() < deadline) {
      try {
        lockFd = openSync(this.lockPath, 'wx');
        break;
      } catch (err: any) {
        if (err?.code !== 'EEXIST') {
          throw err;
        }
      }
    }

    if (lockFd === undefined) {
      throw new Error(
        `Timed out waiting for ops log lock: ${this.lockPath}. Another Trellis process may be stalled.`,
      );
    }

    try {
      fn();
    } finally {
      closeSync(lockFd);
      try {
        unlinkSync(this.lockPath);
      } catch {
        // best-effort
      }
    }
  }

  static repair(filePath: string, opts?: RepairOptions): RepairResult {
    if (!existsSync(filePath)) {
      return { recovered: 0, lost: 0 };
    }

    let mirrorRestored: number | undefined;
    if (opts?.preferMirror !== false) {
      const localLines = JsonOpLog.parseFileForRepair(
        readFileSync(filePath, 'utf-8'),
      ).valid.length;
      const mirror = restoreOpsFromMirror(filePath);
      if (mirror && mirror.restored > localLines) {
        mirrorRestored = mirror.restored;
      }
    }

    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JsonOpLog.parseFileForRepair(raw);
    const beforeCount = parsed.valid.length;

    if (!parsed.corrupt) {
      return { recovered: beforeCount, lost: 0, mirrorRestored };
    }

    if (parsed.valid.length === 0) {
      const rootPath =
        opts?.rootPath ?? resolve(dirname(filePath), '..', '..');
      assertRecentRemoteAckForRepair(rootPath, {
        iKnow: opts?.iKnow,
        confirmDestructive: opts?.confirmDestructive,
      });
      requireDestructiveConfirm({
        action: 'repair-empty-journal',
        confirmDestructive: opts?.confirmDestructive,
      });
    } else {
      const rootPath =
        opts?.rootPath ?? resolve(dirname(filePath), '..', '..');
      assertRecentRemoteAckForRepair(rootPath, {
        iKnow: opts?.iKnow,
        confirmDestructive: opts?.confirmDestructive,
      });
      requireDestructiveConfirm({
        action: 'repair-truncate-journal',
        confirmDestructive: opts?.confirmDestructive,
      });
    }

    const payload =
      parsed.valid.join('\n') + (parsed.valid.length ? '\n' : '');
    if (!payload.trim()) {
      throw new Error(
        'Refusing to write an empty ops journal. Restore from ~/.trellis/oplog-mirror or remote peer.',
      );
    }

    const backupPath = filePath + '.corrupted.' + Date.now();
    try {
      copyFileSync(filePath, backupPath);
    } catch {
      /* best-effort */
    }

    try {
      writeFileSync(filePath, payload);
    } catch {
      return { recovered: 0, lost: -1, mirrorRestored };
    }
    return {
      recovered: parsed.valid.length,
      lost: parsed.dropped,
      mirrorRestored,
    };
  }

  /** Exposed for repair + tests */
  static parseFileForRepair(raw: string): {
    valid: string[];
    corrupt: boolean;
    dropped: number;
  } {
    const trimmed = raw.trim();
    if (trimmed.startsWith('[')) {
      try {
        const ops = JSON.parse(raw);
        if (Array.isArray(ops)) {
          const valid = ops.map((o) => JSON.stringify(o));
          return { valid, corrupt: false, dropped: 0 };
        }
      } catch {
        // JSONL / truncation path
      }
    }

    const lines = raw.split('\n');
    const valid: string[] = [];
    let corrupt = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      try {
        JSON.parse(t);
        valid.push(t);
      } catch {
        corrupt = true;
      }
    }
    return { valid, corrupt, dropped: corrupt ? -1 : 0 };
  }
}

/** Lane journal op log — same implementation, distinct path (ADR 0001, ADR 0005). */
export class LaneOpLog extends JsonOpLog {
  constructor(laneDir: string) {
    super(`${laneDir}/ops.json`);
  }
}
