/**
 * Init-time guardrails — prevent accidental full-workspace blob indexing.
 * @see docs/specs/git-backed-blob-tier-v0.md §3.2
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, resolve, sep } from 'path';
import { DEFAULT_CONFIG } from './types.js';

export const INIT_INDEX_MAX_FILES = 500;
export const INIT_INDEX_MAX_BYTES = 50 * 1024 * 1024; // 50 MiB

const UMBRELLA_SEGMENTS = new Set([
  'Projects',
  'Apps',
  'Packages',
  'Sandbox',
]);

const REPO_MARKERS = [
  '.git',
  'package.json',
  'pyproject.toml',
  'Cargo.toml',
  'go.mod',
  'pom.xml',
  'build.gradle',
];

export type WorkspaceScanEstimate = {
  fileCount: number;
  totalBytes: number;
};

function parseIgnoreFile(filePath: string): string[] {
  if (!existsSync(filePath)) return [];
  return readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

export function collectInitIgnorePatterns(rootPath: string): string[] {
  return [
    ...new Set([
      ...DEFAULT_CONFIG.ignorePatterns,
      ...parseIgnoreFile(join(rootPath, '.gitignore')),
      ...parseIgnoreFile(join(rootPath, '.trellisignore')),
    ]),
  ];
}

function shouldIgnore(relPath: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    if (pattern.startsWith('*.')) {
      const ext = pattern.slice(1);
      if (relPath.endsWith(ext)) return true;
    } else if (relPath.includes(pattern)) {
      return true;
    }
  }
  return false;
}

function walkFiles(
  rootPath: string,
  dir: string,
  ignorePatterns: string[],
  into: { fileCount: number; totalBytes: number },
): void {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relPath = relative(rootPath, fullPath);
    if (shouldIgnore(relPath, ignorePatterns)) continue;

    if (entry.isDirectory()) {
      walkFiles(rootPath, fullPath, ignorePatterns, into);
      continue;
    }
    if (!entry.isFile()) continue;

    try {
      into.fileCount += 1;
      into.totalBytes += statSync(fullPath).size;
    } catch {
      // race or permission
    }
  }
}

/** Cheap pre-init estimate (stat only — no hashing). */
export function estimateWorkspaceScan(rootPath: string): WorkspaceScanEstimate {
  const ignorePatterns = collectInitIgnorePatterns(rootPath);
  const tally = { fileCount: 0, totalBytes: 0 };
  walkFiles(resolve(rootPath), resolve(rootPath), ignorePatterns, tally);
  return tally;
}

export function exceedsInitIndexThreshold(
  estimate: WorkspaceScanEstimate,
): boolean {
  return (
    estimate.fileCount > INIT_INDEX_MAX_FILES ||
    estimate.totalBytes > INIT_INDEX_MAX_BYTES
  );
}

export function hasRepoMarker(rootPath: string): boolean {
  return REPO_MARKERS.some((name) => existsSync(join(rootPath, name)));
}

/** Warn when init target looks like an umbrella folder (v0: warn only). */
export function getUmbrellaInitWarning(rootPath: string): string | undefined {
  if (hasRepoMarker(rootPath)) return undefined;

  const parts = resolve(rootPath).split(sep);
  const hit = parts.find((segment) => UMBRELLA_SEGMENTS.has(segment));
  if (!hit) return undefined;

  return (
    `Initializing Trellis under umbrella path segment "${hit}" without a repo ` +
    `marker (${REPO_MARKERS.slice(0, 3).join(', ')}, …). Prefer init inside a ` +
    `single project root, or use --minimal / skip --index-workspace to avoid ` +
    `indexing the whole tree.`
  );
}

export type InitIndexGateInput = {
  rootPath: string;
  indexWorkspace: boolean;
  /** CLI passed --index-workspace explicitly. */
  explicitIndexWorkspace?: boolean;
  isInteractive?: boolean;
  confirmLargeIndex?: () => Promise<boolean>;
};

export type InitIndexGateResult =
  | { ok: true; indexWorkspace: boolean; umbrellaWarning?: string }
  | { ok: false; reason: 'gate'; message: string; estimate: WorkspaceScanEstimate };

/**
 * Apply init indexing policy: default off; block large implicit scans.
 */
export async function applyInitIndexGate(
  input: InitIndexGateInput,
): Promise<InitIndexGateResult> {
  const umbrellaWarning = getUmbrellaInitWarning(input.rootPath);

  if (!input.indexWorkspace) {
    return { ok: true, indexWorkspace: false, umbrellaWarning };
  }

  const estimate = estimateWorkspaceScan(input.rootPath);
  if (!exceedsInitIndexThreshold(estimate)) {
    return { ok: true, indexWorkspace: true, umbrellaWarning };
  }

  if (input.explicitIndexWorkspace) {
    return { ok: true, indexWorkspace: true, umbrellaWarning };
  }

  if (input.isInteractive && input.confirmLargeIndex) {
    const confirmed = await input.confirmLargeIndex();
    if (confirmed) {
      return { ok: true, indexWorkspace: true, umbrellaWarning };
    }
    return { ok: true, indexWorkspace: false, umbrellaWarning };
  }

  const mb = (estimate.totalBytes / (1024 * 1024)).toFixed(1);
  return {
    ok: false,
    reason: 'gate',
    estimate,
    message:
      `Refusing to index ${estimate.fileCount} files (~${mb} MiB) without ` +
      `explicit opt-in. Re-run with --index-workspace or use --minimal.`,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes;
  let unit = -1;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}
