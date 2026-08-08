import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Configurable issue-id prefix (`issuePrefix` in `.trellis/config.json`).
 *
 * Defaults to the legacy `TRL` allocator. Old `TRL-N` ids coexist with ids
 * minted under a configured prefix (e.g. `TF-N`) — parsing and validation
 * always accept both so a mid-life prefix change never orphans existing refs.
 */

export const DEFAULT_ISSUE_PREFIX = 'TRL';

/** A prefix must be letters/digits, start uppercase, no separators. */
export function isValidIssuePrefix(prefix: string): boolean {
  return /^[A-Z][A-Z0-9]*$/.test(prefix);
}

/** Read `issuePrefix` from `.trellis/config.json` (default `TRL`). */
export function readIssuePrefix(rootPath: string): string {
  try {
    const configPath = join(rootPath, '.trellis', 'config.json');
    if (!existsSync(configPath)) return DEFAULT_ISSUE_PREFIX;
    const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
    const prefix: unknown = raw?.issuePrefix;
    if (
      typeof prefix === 'string' &&
      prefix.trim() &&
      isValidIssuePrefix(prefix.trim())
    ) {
      return prefix.trim();
    }
  } catch {
    /* unreadable/invalid config → default */
  }
  return DEFAULT_ISSUE_PREFIX;
}

/**
 * Prefixes a repo recognizes when parsing/validating issue refs:
 * always the legacy `TRL` plus the configured prefix when different.
 */
export function issuePrefixSet(rootPath: string): string[] {
  const configured = readIssuePrefix(rootPath);
  if (configured === DEFAULT_ISSUE_PREFIX) return [DEFAULT_ISSUE_PREFIX];
  return [DEFAULT_ISSUE_PREFIX, configured];
}

/** Build a `/^([A-Za-z]+)-(\d+)$/`-style ref regex from accepted prefixes. */
export function issueRefRegex(prefixes: string[]): RegExp {
  const body = prefixes.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return new RegExp(`^(${body})-(\\d+)$`, 'i');
}

export interface IssueRefParts {
  /** The matched prefix as written (e.g. `TRL`, `tf`). */
  prefix: string;
  /** The numeric suffix. */
  n: number;
}

/** Parse `TRL-1` / `<prefix>-N` into { prefix, n } or null. */
export function parseIssueRefId(
  id: string,
  prefixes: string[],
): IssueRefParts | null {
  const m = issueRefRegex(prefixes).exec(id.trim());
  if (!m) return null;
  return { prefix: m[1], n: Number(m[2]) };
}

/** True when `id` looks like an issue ref for any accepted prefix. */
export function isIssueRefId(id: string, prefixes: string[]): boolean {
  return issueRefRegex(prefixes).test(id.trim());
}

/** Canonical `PREFIX-N` (uppercased prefix) from any accepted casing. */
export function canonicalIssueRef(id: string, prefixes: string[]): string | null {
  const parts = parseIssueRefId(id, prefixes);
  if (!parts) return null;
  return `${parts.prefix.toUpperCase()}-${parts.n}`;
}
