/**
 * Filesystem ledger store for sprite HTTP handler (TRL-243).
 * Bytes-only — no Trellis engine.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import type { JournalMeta, RemoteRepoInfo } from '../vcs/oplog-remote.js';

export const CHECKPOINT_RETENTION = 8;

export interface LedgerPushPayload {
  repoId: string;
  previousTail?: string;
  tailHash: string;
  format: string;
  byteLength: number;
  lineCount: number;
  checkpoint: string;
}

export type LedgerPushResult =
  | { ok: true; meta: JournalMeta }
  | { ok: false; reason: 'tail-mismatch' };

export function validateJsonl(raw: string): void {
  const lines = raw.split('\n').filter((l) => l.trim());
  for (const line of lines) {
    JSON.parse(line);
  }
}

function checkpointFileName(tailHash: string): string {
  return `${encodeURIComponent(tailHash)}.jsonl`;
}

export class LedgerStore {
  constructor(private readonly dataRoot: string) {
    mkdirSync(this.dataRoot, { recursive: true });
  }

  private repoRoot(repoId: string): string {
    const dir = join(this.dataRoot, repoId);
    mkdirSync(dir, { recursive: true });
    mkdirSync(join(dir, 'checkpoints'), { recursive: true });
    return dir;
  }

  getTail(repoId: string): JournalMeta | null {
    const tipPath = join(this.repoRoot(repoId), 'tip.json');
    if (!existsSync(tipPath)) return null;
    try {
      return JSON.parse(readFileSync(tipPath, 'utf-8')) as JournalMeta;
    } catch {
      return null;
    }
  }

  getCheckpoint(repoId: string, tailHash: string): string | null {
    const path = join(
      this.repoRoot(repoId),
      'checkpoints',
      checkpointFileName(tailHash),
    );
    if (!existsSync(path)) return null;
    return readFileSync(path, 'utf-8');
  }

  /** Client checkpoint GET has no repoId — scan repos (matches MemoryRemoteSprite). */
  findCheckpointByHash(tailHash: string): string | null {
    if (!existsSync(this.dataRoot)) return null;
    for (const repoId of readdirSync(this.dataRoot)) {
      const body = this.getCheckpoint(repoId, tailHash);
      if (body) return body;
    }
    return null;
  }

  /** List hosted ledgers for discovery / clone (`GET /v0/ledger/repos`). */
  listRepos(): RemoteRepoInfo[] {
    if (!existsSync(this.dataRoot)) return [];
    const repos: RemoteRepoInfo[] = [];
    for (const repoId of readdirSync(this.dataRoot)) {
      const tipPath = join(this.dataRoot, repoId, 'tip.json');
      if (!existsSync(tipPath)) continue;
      try {
        const meta = JSON.parse(
          readFileSync(tipPath, 'utf-8'),
        ) as JournalMeta;
        repos.push({
          repoId,
          tailHash: meta.tailHash,
          byteLength: meta.byteLength,
          lineCount: meta.lineCount,
          updatedAt: statSync(tipPath).mtime.toISOString(),
        });
      } catch {
        /* unreadable tip — skip */
      }
    }
    return repos;
  }

  push(payload: LedgerPushPayload): LedgerPushResult {
    const existing = this.getTail(payload.repoId);
    if (
      existing &&
      payload.previousTail &&
      existing.tailHash !== payload.previousTail
    ) {
      return { ok: false, reason: 'tail-mismatch' };
    }

    validateJsonl(payload.checkpoint);

    const repoDir = this.repoRoot(payload.repoId);
    const checkpointPath = join(
      repoDir,
      'checkpoints',
      checkpointFileName(payload.tailHash),
    );
    const normalized = payload.checkpoint.endsWith('\n')
      ? payload.checkpoint
      : `${payload.checkpoint}\n`;
    writeFileSync(checkpointPath, normalized);

    const meta: JournalMeta = {
      format: 'jsonl',
      tailHash: payload.tailHash,
      byteLength: payload.byteLength,
      lineCount: payload.lineCount,
    };
    writeFileSync(join(repoDir, 'tip.json'), JSON.stringify(meta, null, 2));
    this.trimCheckpoints(payload.repoId);
    return { ok: true, meta };
  }

  private trimCheckpoints(repoId: string): void {
    const dir = join(this.repoRoot(repoId), 'checkpoints');
    const files = readdirSync(dir)
      .filter((f) => f.endsWith('.jsonl'))
      .map((f) => ({
        name: f,
        mtime: statSync(join(dir, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);

    for (const stale of files.slice(CHECKPOINT_RETENTION)) {
      try {
        unlinkSync(join(dir, stale.name));
      } catch {
        /* best-effort */
      }
    }
  }
}
