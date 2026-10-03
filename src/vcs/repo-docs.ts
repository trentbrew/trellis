/**
 * Confined read-only access to repo markdown under `docs/` (issues, ADRs, plans).
 * ADR 0057 issue-dialog projection + operator doc browser share these helpers.
 */

import { openSync, readSync, closeSync, existsSync, readdirSync, statSync } from 'fs';
import { join, sep } from 'path';
import { realpathSync } from 'fs';

export const REPO_DOC_MAX_BYTES = 524_288;

const MARKDOWN_EXT = /\.md$/i;

/** After strip `issue:` + trim; single safe directory segment. */
export function assertIssueDocId(id: string): string {
  const bare = id.replace(/^issue:/, '').trim();
  if (!bare || bare === '.' || bare === '..') {
    throw new Error('invalid issue id');
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(bare)) {
    throw new Error('invalid issue id');
  }
  return bare;
}

function docsRoot(rootPath: string, ...segments: string[]): string {
  return join(rootPath, 'docs', ...segments);
}

function resolveConfinedRoot(rootPath: string, ...underDocs: string[]): string | null {
  const target = docsRoot(rootPath, ...underDocs);
  try {
    if (!existsSync(target)) return null;
    return realpathSync(target);
  } catch {
    return null;
  }
}

function isInsideRoot(resolved: string, root: string): boolean {
  const prefix = root.endsWith(sep) ? root : root + sep;
  return resolved === root || resolved.startsWith(prefix);
}

function readUtf8FileCapped(absPath: string, maxBytes: number): { text: string; truncated: boolean } {
  const fd = openSync(absPath, 'r');
  try {
    const buf = Buffer.alloc(maxBytes + 1);
    const n = readSync(fd, buf, 0, buf.length, 0);
    const truncated = n > maxBytes;
    const slice = truncated ? buf.subarray(0, maxBytes) : buf.subarray(0, n);
    let text = slice.toString('utf-8');
    if (truncated) {
      text = text.replace(/\uFFFD+$/, '').replace(/[\uD800-\uDBFF]$/, '');
    }
    return { text, truncated };
  } finally {
    closeSync(fd);
  }
}

export type RepoDocSection = 'issues' | 'adr' | 'plans' | 'artifacts';

export interface RepoDocEntry {
  /** Repo-relative path, e.g. `docs/adr/0001-foo.md` */
  relPath: string;
  label: string;
  section: RepoDocSection;
  kind: 'file' | 'dir';
  issueId?: string;
  docRole?: 'summary' | 'journal' | 'other';
}

export interface ListRepoDocsOptions {
  maxEntries?: number;
}

/** Flat list of browsable markdown (and issue folders) under allowed `docs/` trees. */
export function listRepoDocs(rootPath: string, opts?: ListRepoDocsOptions): RepoDocEntry[] {
  const max = opts?.maxEntries ?? 800;
  const out: RepoDocEntry[] = [];

  const push = (entry: RepoDocEntry) => {
    if (out.length < max) out.push(entry);
  };

  const issuesRoot = resolveConfinedRoot(rootPath, 'issues');
  if (issuesRoot) {
    for (const name of readdirSync(issuesRoot)) {
      if (out.length >= max) break;
      const dir = join(issuesRoot, name);
      let resolved: string;
      try {
        resolved = realpathSync(dir);
      } catch {
        continue;
      }
      if (!isInsideRoot(resolved, issuesRoot)) continue;
      if (!statSync(resolved).isDirectory()) continue;
      push({
        relPath: join('docs', 'issues', name).replace(/\\/g, '/'),
        label: name,
        section: 'issues',
        kind: 'dir',
        issueId: name,
      });
      for (const file of ['summary.md', 'journal.md']) {
        const f = join(resolved, file);
        if (!existsSync(f)) continue;
        let fResolved: string;
        try {
          fResolved = realpathSync(f);
        } catch {
          continue;
        }
        if (!isInsideRoot(fResolved, issuesRoot)) continue;
        push({
          relPath: join('docs', 'issues', name, file).replace(/\\/g, '/'),
          label: `${name} / ${file}`,
          section: 'issues',
          kind: 'file',
          issueId: name,
          docRole: file === 'summary.md' ? 'summary' : 'journal',
        });
      }
    }
  }

  const listMdDir = (section: RepoDocSection, ...segments: string[]) => {
    const root = resolveConfinedRoot(rootPath, ...segments);
    if (!root) return;
    const walk = (dir: string, relPrefix: string) => {
      if (out.length >= max) return;
      for (const name of readdirSync(dir)) {
        if (out.length >= max) break;
        const abs = join(dir, name);
        let resolved: string;
        try {
          resolved = realpathSync(abs);
        } catch {
          continue;
        }
        if (!isInsideRoot(resolved, root)) continue;
        const st = statSync(resolved);
        const relPath = join(relPrefix, name).replace(/\\/g, '/');
        if (st.isDirectory()) {
          walk(resolved, relPath);
          continue;
        }
        if (!MARKDOWN_EXT.test(name)) continue;
        push({
          relPath,
          label: name.replace(/\.md$/i, ''),
          section,
          kind: 'file',
          docRole: 'other',
        });
      }
    };
    walk(root, join('docs', ...segments).replace(/\\/g, '/'));
  };

  listMdDir('adr', 'adr');
  listMdDir('plans', 'plans');
  listMdDir('artifacts', 'artifacts');

  return out.sort((a, b) => a.relPath.localeCompare(b.relPath));
}

export interface ReadRepoDocFileResult {
  relPath: string;
  content: string;
  truncated: boolean;
  maxBytes: number;
}

/** Read one markdown file confined under `docs/`. */
export function readRepoDocFile(
  rootPath: string,
  relPath: string,
  maxBytes = REPO_DOC_MAX_BYTES,
): ReadRepoDocFileResult | null {
  const normalized = relPath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized.startsWith('docs/') || normalized.includes('..')) return null;
  const docsCanonical = resolveConfinedRoot(rootPath);
  if (!docsCanonical) return null;
  const abs = join(rootPath, normalized);
  let resolved: string;
  try {
    if (!existsSync(abs)) return null;
    resolved = realpathSync(abs);
  } catch {
    return null;
  }
  if (!isInsideRoot(resolved, docsCanonical)) return null;
  if (!statSync(resolved).isFile()) return null;
  if (!MARKDOWN_EXT.test(resolved)) return null;
  const { text, truncated } = readUtf8FileCapped(resolved, maxBytes);
  return {
    relPath: normalized,
    content: text,
    truncated,
    maxBytes,
  };
}

export interface IssueDocsProjection {
  issueId: string;
  journal: string | null;
  summary: string | null;
  description: string | null;
  rendered: 'journal' | 'summary' | 'description' | 'none';
  truncated?: boolean;
  maxBytes: number;
}

export function readIssueDocFiles(
  rootPath: string,
  id: string,
  opts?: { maxBytes?: number; description?: string | null },
): IssueDocsProjection {
  const maxBytes = opts?.maxBytes ?? REPO_DOC_MAX_BYTES;
  const issueId = assertIssueDocId(id);
  const issuesRoot = resolveConfinedRoot(rootPath, 'issues');
  let journal: string | null = null;
  let summary: string | null = null;
  let truncated = false;

  const readRole = (file: string): string | null => {
    if (!issuesRoot) return null;
    const abs = join(issuesRoot, issueId, file);
    let resolved: string;
    try {
      if (!existsSync(abs)) return null;
      resolved = realpathSync(abs);
    } catch {
      return null;
    }
    if (!isInsideRoot(resolved, issuesRoot)) return null;
    const { text, truncated: t } = readUtf8FileCapped(resolved, maxBytes);
    if (t) truncated = true;
    const trimmed = text.trim();
    return trimmed.length ? text : null;
  };

  journal = readRole('journal.md');
  summary = readRole('summary.md');
  const description = opts?.description?.trim() ? opts.description : null;

  let rendered: IssueDocsProjection['rendered'] = 'none';
  if (journal) rendered = 'journal';
  else if (summary) rendered = 'summary';
  else if (description) rendered = 'description';

  return {
    issueId,
    journal,
    summary,
    description,
    rendered,
    ...(truncated ? { truncated: true } : {}),
    maxBytes,
  };
}
