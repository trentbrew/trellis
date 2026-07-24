/**
 * Append-only local mirror of integration op journals under ~/.trellis/oplog-mirror/.
 *
 * Separate from any repo-local .trellis — survives repair wipes of ops.json.bak.
 * Not a substitute for remote peer backup (TRL-222); L0.5 on the same machine.
 */
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

const MIRROR_ROOT = join(homedir(), '.trellis', 'oplog-mirror');
const SNAPSHOT_RING = 8;
const SNAPSHOT_EVERY_OPS = 500;

export interface MirrorMeta {
  repoKey: string;
  rootPath: string;
  journalPath: string;
  sourceOpsPath: string;
  lineCount: number;
  lastHash?: string;
  updatedAt: string;
}

function repoKeyForOpsPath(opsPath: string): string | null {
  const normalized = resolve(opsPath);
  const base = basename(normalized);
  const parent = basename(dirname(normalized));
  if (base !== 'ops.json' || parent !== '.trellis') return null;
  const rootPath = dirname(dirname(normalized));
  return createHash('sha256').update(rootPath).digest('hex').slice(0, 16);
}

function mirrorDir(repoKey: string): string {
  return join(MIRROR_ROOT, repoKey);
}

function readMeta(repoKey: string): MirrorMeta | null {
  const p = join(mirrorDir(repoKey), 'meta.json');
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as MirrorMeta;
  } catch {
    return null;
  }
}

function writeMeta(meta: MirrorMeta): void {
  const dir = mirrorDir(meta.repoKey);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'meta.json'), JSON.stringify(meta, null, 2));
}

function countLines(path: string): number {
  if (!existsSync(path)) return 0;
  let n = 0;
  for (const line of readFileSync(path, 'utf-8').split('\n')) {
    if (line.trim()) n++;
  }
  return n;
}

function rotateSnapshots(repoKey: string, journalPath: string): void {
  const snapDir = join(mirrorDir(repoKey), 'snapshots');
  mkdirSync(snapDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = join(snapDir, `ops-${stamp}.jsonl`);
  copyFileSync(journalPath, dest);
  const files = readdirSync(snapDir)
    .filter((f) => f.startsWith('ops-') && f.endsWith('.jsonl'))
    .map((f) => ({ f, m: statSync(join(snapDir, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  for (const extra of files.slice(SNAPSHOT_RING)) {
    try {
      unlinkSync(join(snapDir, extra.f));
    } catch {
      /* best-effort */
    }
  }
}

/** Mirror one appended JSONL line (integration journal only). */
export function mirrorOpLine(opsPath: string, line: string, opHash?: string): void {
  if (process.env.TRELLIS_SKIP_OPLOG_MIRROR === '1') return;
  const repoKey = repoKeyForOpsPath(opsPath);
  if (!repoKey) return;

  const rootPath = dirname(dirname(resolve(opsPath)));
  const dir = mirrorDir(repoKey);
  mkdirSync(dir, { recursive: true });
  const journalPath = join(dir, 'journal.jsonl');
  appendFileSync(journalPath, line.endsWith('\n') ? line : `${line}\n`);

  const prev = readMeta(repoKey);
  const lineCount = countLines(journalPath);
  const meta: MirrorMeta = {
    repoKey,
    rootPath,
    journalPath,
    sourceOpsPath: resolve(opsPath),
    lineCount,
    lastHash: opHash ?? prev?.lastHash,
    updatedAt: new Date().toISOString(),
  };
  writeMeta(meta);

  if (
    lineCount === 1 ||
    lineCount % SNAPSHOT_EVERY_OPS === 0 ||
    (prev && lineCount > prev.lineCount + SNAPSHOT_EVERY_OPS)
  ) {
    rotateSnapshots(repoKey, journalPath);
  }
}

/** Best snapshot or journal for recovery. */
export function findMirrorForOpsPath(
  opsPath: string,
): { path: string; lineCount: number; repoKey: string } | null {
  const repoKey = repoKeyForOpsPath(opsPath);
  if (!repoKey) return null;
  const dir = mirrorDir(repoKey);
  const journalPath = join(dir, 'journal.jsonl');
  const snapDir = join(dir, 'snapshots');
  let best: { path: string; lineCount: number } | null = null;

  if (existsSync(journalPath)) {
    const n = countLines(journalPath);
    if (n > 0) best = { path: journalPath, lineCount: n };
  }

  if (existsSync(snapDir)) {
    for (const f of readdirSync(snapDir)) {
      if (!f.endsWith('.jsonl')) continue;
      const p = join(snapDir, f);
      const n = countLines(p);
      if (!best || n > best.lineCount) best = { path: p, lineCount: n };
    }
  }

  if (!best) return null;
  return { ...best, repoKey };
}

export function restoreOpsFromMirror(opsPath: string): {
  restored: number;
  from: string;
} | null {
  const hit = findMirrorForOpsPath(opsPath);
  if (!hit || hit.lineCount === 0) return null;
  copyFileSync(hit.path, opsPath);
  return { restored: hit.lineCount, from: hit.path };
}

export function backfillMirrorIfBehind(opsPath: string): number {
  if (process.env.TRELLIS_SKIP_OPLOG_MIRROR === '1') return 0;
  const repoKey = repoKeyForOpsPath(opsPath);
  if (!repoKey) return 0;
  if (!existsSync(opsPath)) return 0;

  const localLines: string[] = [];
  for (const line of readFileSync(opsPath, 'utf-8').split('\n')) {
    if (line.trim()) localLines.push(line);
  }
  if (localLines.length === 0) return 0;

  const hit = findMirrorForOpsPath(opsPath);
  if (hit && hit.lineCount >= localLines.length) return 0;

  const dir = mirrorDir(repoKey);
  mkdirSync(dir, { recursive: true });
  const journalPath = join(dir, 'journal.jsonl');
  const payload = localLines.join('\n') + '\n';
  writeFileSync(journalPath, payload);
  rotateSnapshots(repoKey, journalPath);

  const rootPath = dirname(dirname(resolve(opsPath)));
  writeMeta({
    repoKey,
    rootPath,
    journalPath,
    sourceOpsPath: resolve(opsPath),
    lineCount: localLines.length,
    updatedAt: new Date().toISOString(),
  });
  return localLines.length;
}

export function listMirrors(): MirrorMeta[] {
  if (!existsSync(MIRROR_ROOT)) return [];
  const out: MirrorMeta[] = [];
  for (const repoKey of readdirSync(MIRROR_ROOT)) {
    const meta = readMeta(repoKey);
    if (meta) out.push(meta);
  }
  return out.sort((a, b) => a.rootPath.localeCompare(b.rootPath));
}
