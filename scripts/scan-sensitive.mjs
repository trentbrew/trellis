#!/usr/bin/env node
/**
 * Sensitive-content guard.
 *
 * Blocks personal material, PII, and credentials from being committed or
 * pushed, and from landing via CI. Rules live in sensitive-patterns.json next
 * to this file so the deny-list can evolve without touching logic.
 *
 * Usage:
 *   node scripts/scan-sensitive.mjs              # staged changes (pre-commit)
 *   node scripts/scan-sensitive.mjs --all        # every tracked file (CI)
 *   node scripts/scan-sensitive.mjs --range A..B  # a diff range (pre-push)
 *
 * Exit 0 = clean. Exit 1 = violations found (prints them).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(readFileSync(join(here, 'sensitive-patterns.json'), 'utf8'));

const argv = process.argv.slice(2);
const mode = argv.includes('--all')
  ? 'all'
  : argv.includes('--range')
    ? 'range'
    : 'staged';
const range = mode === 'range' ? argv[argv.indexOf('--range') + 1] : null;

const git = (...a) => execFileSync('git', a, { encoding: 'utf8' });
const nulSplit = (s) => (s ? s.split('\0').filter(Boolean) : []);

function listFiles() {
  try {
    if (mode === 'staged') {
      return nulSplit(git('diff', '--cached', '--name-only', '--diff-filter=ACM', '-z'));
    }
    if (mode === 'range') {
      return nulSplit(git('diff', '--name-only', '--diff-filter=ACM', '-z', range));
    }
    return nulSplit(git('ls-files', '-z'));
  } catch {
    return [];
  }
}

const BINARY = /\.(png|jpe?g|gif|webp|avif|mp4|mov|webm|tgz|gz|zip|ico|pdf|woff2?|ttf|otf|wasm|node|so|dylib|bin|snap|pack|idx)$/i;
const MAX_BYTES = 2_000_000;

const allowPath = (file) =>
  (cfg.allowPaths || []).some((a) => file === a || file.startsWith(a));

const matchesPath = (file, pat) => {
  const f = file.toLowerCase();
  const p = pat.toLowerCase();
  if (p.includes('/')) {
    return f === p || f.startsWith(p.replace(/\/$/, '') + '/') || f.includes(p);
  }
  const base = f.split('/').pop();
  if (p.startsWith('.')) return base === p;
  return base === p || base.includes(p) || f.includes(p);
};

function fileContent(file) {
  try {
    if (mode === 'staged') return git('show', `:${file}`);
    if (existsSync(file)) {
      const buf = readFileSync(file);
      if (buf.length > MAX_BYTES) return null;
      return buf.toString('utf8');
    }
  } catch {
    return null;
  }
  return null;
}

const violations = [];

for (const file of listFiles()) {
  if (allowPath(file)) continue;

  for (const p of cfg.denyPaths || []) {
    if (matchesPath(file, p)) {
      violations.push({ file, rule: `path:${p}`, detail: 'denied path' });
    }
  }

  if (BINARY.test(file)) continue;
  const content = fileContent(file);
  if (content == null || content.includes('\u0000')) continue;

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const s of cfg.denyStrings || []) {
      if (line.toLowerCase().includes(s.toLowerCase())) {
        violations.push({ file, line: i + 1, rule: `string:${s}`, detail: line.trim().slice(0, 100) });
      }
    }
    for (const r of cfg.denyRegexes || []) {
      const re = new RegExp(r.pattern, r.flags || '');
      if (re.test(line)) {
        violations.push({ file, line: i + 1, rule: `regex:${r.name || r.pattern}`, detail: line.trim().slice(0, 100) });
      }
    }
  }
}

if (violations.length === 0) {
  process.stdout.write('sensitive-scan: clean\n');
  process.exit(0);
}

process.stderr.write(`\nsensitive-scan: BLOCKED ${violations.length} finding(s)\n\n`);
for (const v of violations) {
  const loc = v.line ? `${v.file}:${v.line}` : v.file;
  process.stderr.write(`  ${loc}\n    rule: ${v.rule}\n    ${v.detail}\n`);
}
process.stderr.write(
  '\nRemove the flagged content, or (if a false positive) add it to\n' +
    'scripts/sensitive-patterns.json -> allowPaths.\n\n',
);
process.exit(1);
