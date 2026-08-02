#!/usr/bin/env node
/**
 * Docs frontmatter lint + backfill for docs/ (contract: docs/FRONTMATTER.md).
 *
 *   node scripts/docs-frontmatter.mjs --check             # exit 1 on violations
 *   node scripts/docs-frontmatter.mjs --backfill          # deterministic, idempotent
 *   node scripts/docs-frontmatter.mjs --validate-status   # status enum check
 *
 * Scans git-tracked docs/*.md and docs/ subdirectory md files. Skips
 * docs/devlog/ (they use the devlog schema, not the doc schema).
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const REQUIRED = ['title', 'description', 'created', 'updated', 'status'];
const STATUSES = ['draft', 'proposal', 'spec', 'shipped', 'archived'];
const DEVLOG_DIR = 'docs/devlog';

function gitFiles() {
  const out = execSync('git ls-files "docs/*.md" "docs/**/*.md"', {
    cwd: ROOT,
    encoding: 'utf8',
  });
  return out
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith(`${DEVLOG_DIR}/`));
}

function parseFrontmatter(file) {
  const src = readFileSync(path.join(ROOT, file), 'utf8');
  if (!src.startsWith('---\n')) return { data: {}, body: src, hasFm: false };
  const end = src.indexOf('\n---\n', 4);
  if (end === -1) return { data: {}, body: src, hasFm: false };
  const fm = src.slice(4, end);
  const body = src.slice(end + 5);
  const data = {};
  for (const line of fm.split('\n')) {
    const m = line.match(/^([a-zA-Z-]+):\s*(.*)$/);
    if (m) data[m[1]] = m[2].trim();
  }
  return { data, body, hasFm: true };
}

function gitDates(file) {
  const abs = path.join(ROOT, file);
  const created = execSync(
    `git log --follow --diff-filter=A --format=%aI -- "${file}"`,
    { cwd: ROOT, encoding: 'utf8' },
  )
    .trim()
    .split('\n')[0];
  const updated = execSync(
    `git log -1 --format=%aI -- "${file}"`,
    { cwd: ROOT, encoding: 'utf8' },
  )
    .trim()
    .split('\n')[0];
  const date = (s) => (s ? s.slice(0, 10) : '');
  return { created: date(created), updated: date(updated) };
}

function fallbackDate(file) {
  try {
    return statSync(path.join(ROOT, file)).mtime.toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function firstHeading(body) {
  const m = body.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : '';
}

function firstParagraph(body) {
  const lines = body
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const line of lines) {
    if (line.startsWith('#')) continue;
    if (line.startsWith('>')) continue;
    if (line.startsWith('|')) continue;
    if (line.startsWith('-') || line.startsWith('*')) continue;
    if (line.startsWith('```')) continue;
    const clean = line.replace(/[*_`]/g, '').trim();
    if (clean.length > 0) {
      if (clean.length <= 160) return clean;
      const parts = clean.split(/(?<=[.?!…—,;)])\s+/).filter(Boolean);
      let acc = '';
      for (const p of parts) {
        if ((acc + p).length > 160) break;
        acc += `${acc ? ' ' : ''}${p}`;
      }
      if (acc.trim()) return acc.trim();
      const at = clean.lastIndexOf(' ', 160);
      return (at > 40 ? clean.slice(0, at) : clean.slice(0, 160)).trim();
    }
  }
  return '';
}

function lintOne(file) {
  const { data, body, hasFm } = parseFrontmatter(file);
  const missing = REQUIRED.filter((k) => !data[k]);
  const badStatus = data.status && !STATUSES.includes(data.status);
  return { file, hasFm, data, body, missing, badStatus };
}

function backfill() {
  const files = gitFiles();
  for (const file of files) {
    const r = lintOne(file);
    const src = readFileSync(path.join(ROOT, file), 'utf8');
    const dates = gitDates(file);
    const fill = {};
    if (!r.data.created) fill.created = dates.created || fallbackDate(file);
    if (!r.data.updated) fill.updated = dates.updated || fallbackDate(file);
    if (!r.data.title) fill.title = firstHeading(r.body) || path.basename(file, '.md');
    if (!r.data.description) fill.description = firstParagraph(r.body);
    if (!r.data.status) fill.status = 'draft';
    const missing = Object.keys(fill);
    if (missing.length === 0) continue;
    const insert = `${missing.map((k) => `${k}: ${fill[k]}`).join('\n')}\n`;
    let out;
    if (r.hasFm) {
      out = src.replace(/^---\n/, `---\n${insert}`);
    } else {
      out = `---\n${insert}---\n${src}`;
    }
    if (out !== src) writeFileSync(path.join(ROOT, file), out);
  }
}

function check() {
  const files = gitFiles();
  const violations = [];
  for (const file of files) {
    const r = lintOne(file);
    if (!r.hasFm) violations.push(`${file}: missing frontmatter`);
    for (const k of r.missing) violations.push(`${file}: missing frontmatter field '${k}'`);
    if (r.badStatus) violations.push(`${file}: invalid status '${r.data.status}'`);
  }
  return violations;
}

function validateStatus() {
  const files = gitFiles();
  const bad = [];
  for (const file of files) {
    const { data } = parseFrontmatter(file);
    if (data.status && !STATUSES.includes(data.status)) bad.push(`${file}: ${data.status}`);
  }
  return bad;
}

const mode = process.argv[2];
if (mode === '--check') {
  const violations = check();
  if (violations.length) {
    console.error('Frontmatter violations:');
    for (const v of violations) console.error(`  ${v}`);
    process.exit(1);
  }
  console.log('✓ All docs frontmatter valid.');
} else if (mode === '--backfill') {
  backfill();
  console.log('✓ Backfill complete (idempotent).');
} else if (mode === '--validate-status') {
  const bad = validateStatus();
  if (bad.length) {
    console.error('Invalid status values:');
    for (const b of bad) console.error(`  ${b}`);
    process.exit(1);
  }
  console.log('✓ All status values valid.');
} else {
  console.error('Usage: node scripts/docs-frontmatter.mjs --check | --backfill | --validate-status');
  process.exit(1);
}
