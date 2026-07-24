#!/usr/bin/env node
/**
 * Extract issue metadata from Cursor hook logs + doc overrides → catalog JSON.
 *
 *   node scripts/issue-recovery-extract.mjs
 *   node scripts/issue-recovery-extract.mjs --out docs/planning/issue-recovery-catalog.json
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const defaultOut = join(repoRoot, 'docs/planning/issue-recovery-catalog.json');

const WORKSPACE_HOOK = 'cursor.hooks.workspaceId-3f3a1001b9d86f9a4fb5ef47ad73c218.log';
const LOG_ROOT = join(
  process.env.HOME ?? '',
  'Library/Application Support/Cursor/logs',
);

/** Issues missing from hook "Issue created" lines — from specs / branch slugs. */
const MANUAL = {
  'TRL-156': {
    title: 'Proposal: Unified theme contract for runtime surfaces',
    priority: 'high',
    status: 'queue',
    labels: ['proposal', 'theme', 'design', 'tml', 'fractal'],
    source: 'manual-proposal-doc',
  },
  'TRL-159': {
    title: 'Proposal: Unified theme contract Phase B',
    priority: 'medium',
    status: 'backlog',
    labels: ['proposal', 'theme', 'needs-design'],
    parent: 'TRL-156',
    source: 'manual-spec',
  },
  'TRL-160': {
    title: 'Design: Unified theme contract Phase B',
    priority: 'medium',
    status: 'backlog',
    labels: ['design', 'theme'],
    parent: 'TRL-159',
    source: 'manual-spec',
  },
  'TRL-165': {
    title: 'Design: Unified theme contract Phase C',
    priority: 'medium',
    status: 'backlog',
    labels: ['design', 'theme'],
    parent: 'TRL-164',
    source: 'manual-spec',
  },
  'TRL-173': {
    title: 'Proposal: trellis admin fractal playground host',
    priority: 'high',
    status: 'backlog',
    labels: ['proposal', 'admin', 'tml', 'needs-design'],
    source: 'manual-design-doc',
  },
  'TRL-174': {
    title: 'Design: trellis admin — AffordanceShell + TML',
    priority: 'medium',
    status: 'backlog',
    labels: ['design', 'admin', 'tml'],
    parent: 'TRL-173',
    source: 'manual-spec',
  },
  'TRL-175': {
    title: 'Spec: trellis admin — kernel shell + TML projections',
    priority: 'medium',
    status: 'queue',
    labels: ['spec', 'tml', 'admin', 'needs-e2e'],
    parent: 'TRL-174',
    source: 'manual-spec',
  },
  'TRL-178': {
    title: 'Proposal: trellis admin v1.1 — fractal-playground host',
    priority: 'high',
    status: 'backlog',
    labels: ['proposal', 'admin', 'tml', 'needs-design'],
    parent: 'TRL-173',
    source: 'manual-spec',
  },
  'TRL-179': {
    title: 'Design: trellis admin v1.1 — playground AffordanceShell',
    priority: 'medium',
    status: 'backlog',
    labels: ['design', 'admin', 'tml'],
    parent: 'TRL-178',
    source: 'manual-spec',
  },
  'TRL-180': {
    title: 'Spec: trellis admin v1.1 — playground AffordanceShell host',
    priority: 'high',
    status: 'queue',
    labels: ['spec', 'tml', 'admin', 'needs-e2e', 'cohesion'],
    parent: 'TRL-179',
    source: 'manual-spec',
  },
  'TRL-183': {
    title: 'Proposal: trellis admin — visual parity harden',
    priority: 'high',
    status: 'backlog',
    labels: ['proposal', 'admin', 'tml', 'needs-design'],
    source: 'manual-spec',
  },
  'TRL-184': {
    title: 'Design: trellis admin — visual parity harden',
    priority: 'medium',
    status: 'backlog',
    labels: ['design', 'admin', 'tml'],
    parent: 'TRL-183',
    source: 'manual-spec',
  },
  'TRL-185': {
    title: 'Spec: trellis admin — visual parity harden',
    priority: 'high',
    status: 'queue',
    labels: ['spec', 'tml', 'admin', 'harden', 'needs-e2e'],
    parent: 'TRL-184',
    source: 'manual-spec',
  },
  'TRL-189': {
    title: 'Proposal: trellis admin shell — Operate sidebar + index /',
    priority: 'high',
    status: 'backlog',
    labels: ['proposal', 'admin', 'tml', 'needs-design'],
    source: 'manual-spec',
  },
  'TRL-190': {
    title: 'Design: trellis admin shell — Operate sidebar + index /',
    priority: 'medium',
    status: 'backlog',
    labels: ['design', 'admin', 'tml'],
    parent: 'TRL-189',
    source: 'manual-spec',
  },
  'TRL-194': {
    title: 'Proposal: trellis admin — Operate header/toolbar parity',
    priority: 'high',
    status: 'backlog',
    labels: ['proposal', 'admin', 'tml', 'needs-design'],
    source: 'manual-spec',
  },
  'TRL-195': {
    title: 'Design: trellis admin — Operate header/toolbar parity',
    priority: 'medium',
    status: 'backlog',
    labels: ['design', 'admin', 'tml'],
    parent: 'TRL-194',
    source: 'manual-spec',
  },
  'TRL-200': {
    title: 'Proposal: trellis admin — Operate datatable (SpreadsheetTable TML)',
    priority: 'high',
    status: 'backlog',
    labels: ['proposal', 'admin', 'tml', 'needs-design'],
    source: 'manual-spec',
  },
  'TRL-201': {
    title: 'Design: trellis admin — Operate datatable (SpreadsheetTable TML)',
    priority: 'medium',
    status: 'backlog',
    labels: ['design', 'admin', 'tml'],
    parent: 'TRL-200',
    source: 'manual-spec',
  },
  'TRL-206': {
    title: 'Proposal: trellis admin — extract Operate datatable module',
    priority: 'high',
    status: 'backlog',
    labels: ['proposal', 'admin', 'tml', 'harden'],
    source: 'manual-spec',
  },
  'TRL-207': {
    title: 'Design: trellis admin — extract Operate datatable module',
    priority: 'medium',
    status: 'backlog',
    labels: ['design', 'admin', 'tml'],
    parent: 'TRL-206',
    source: 'manual-spec',
  },
  'TRL-212': {
    title: 'Proposal: trellis admin — Operate inline cell edit',
    priority: 'high',
    status: 'backlog',
    labels: ['proposal', 'admin', 'tml'],
    source: 'manual-spec',
  },
  'TRL-213': {
    title: 'Design: trellis admin — Operate inline cell edit',
    priority: 'medium',
    status: 'backlog',
    labels: ['design', 'admin', 'tml'],
    parent: 'TRL-212',
    source: 'manual-spec',
  },
  'TRL-214': {
    title: 'Spec: trellis admin — Operate inline cell edit',
    priority: 'high',
    status: 'queue',
    labels: ['spec', 'tml', 'admin', 'needs-e2e', 'cohesion'],
    parent: 'TRL-213',
    source: 'manual-spec',
  },
  'TRL-215': {
    title: 'Impl: trellis admin — Operate inline cell edit',
    priority: 'high',
    status: 'queue',
    labels: ['impl', 'tml', 'admin', 'needs-e2e'],
    parent: 'TRL-214',
    source: 'manual-spec',
  },
};

const STATUS_OVERRIDES = {
  'TRL-171': 'closed',
  'TRL-176': 'closed',
  'TRL-177': 'backlog',
  'TRL-198': 'backlog',
  'TRL-199': 'backlog',
  'TRL-204': 'backlog',
  'TRL-205': 'backlog',
  'TRL-210': 'backlog',
  'TRL-211': 'backlog',
  'TRL-216': 'backlog',
  'TRL-217': 'backlog',
  'TRL-218': 'backlog',
};

/** @returns {string[]} */
function findHookLogs() {
  /** @type {string[]} */
  const out = [];
  /** @param {string} dir */
  function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const p = join(dir, name);
      let st;
      try {
        st = statSync(p);
      } catch {
        continue;
      }
      if (st.isDirectory()) walk(p);
      else if (name === WORKSPACE_HOOK) out.push(p);
    }
  }
  walk(LOG_ROOT);
  return out;
}

/** @param {string} raw */
function decodeOutput(raw) {
  return raw.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

/** @param {string} logText */
function extractFromLog(logText) {
  /** @type {Record<string, any>} */
  const issues = {};
  const outPat = /"output":\s*"((?:\\.|[^"\\])*)"/gs;

  for (const m of logText.matchAll(outPat)) {
    const text = decodeOutput(m[1]);
    if (!text.includes('TRL-')) continue;

    for (const cm of text.matchAll(
      /✓ Issue created: (TRL-\d+)\n(?:  Title:\s+(.+?)\n)?(?:  Priority:\s+(\w+)\n)?(?:  Labels:\s+(.+?)\n)?(?:  Parent:\s+(TRL-\d+)\n)?/g,
    )) {
      const [, id, title, priority, labels, parent] = cm;
      const rec = (issues[id] ??= {});
      if (title) rec.title = title.trim();
      if (priority) rec.priority = priority;
      if (labels) rec.labels = labels.split(',').map((s) => s.trim());
      if (parent) rec.parent = parent;
      rec.source = 'hooks-create';
    }

    for (const lm of text.matchAll(
      /^\s*(critical|high|medium|low)\s+(TRL-\d+)\s+(backlog|queue|closed|in_progress|paused|open)\s+/gm,
    )) {
      const [, , id, status] = lm;
      const rec = (issues[id] ??= {});
      rec.status = status;
    }

    for (const sm of text.matchAll(/^TRL-(\d+):\s+(.+)$/gm)) {
      const id = `TRL-${sm[1]}`;
      const title = sm[2].trim();
      if (title.startsWith('Review ')) continue;
      const rec = (issues[id] ??= {});
      if (!rec.title || title.length > rec.title.length) rec.title = title;
    }
  }

  return issues;
}

function mergeRecord(target, patch) {
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || v === null) continue;
    if (k === 'labels' && Array.isArray(target.labels) && Array.isArray(v)) {
      target.labels = [...new Set([...v, ...target.labels])];
    } else if (!target[k] || k === 'title' || k === 'status' || k === 'priority') {
      target[k] = v;
    }
  }
}

function main() {
  const outArg = process.argv.indexOf('--out');
  const outPath = outArg >= 0 ? process.argv[outArg + 1] : defaultOut;

  const logs = findHookLogs();
  /** @type {Record<string, any>} */
  const catalog = {
    meta: {
      extractedAt: new Date().toISOString(),
      hookLogs: logs.length,
      note: 'Metadata rehydrate only — AC pass/fail history not restored.',
      skipExisting: ['TRL-219', 'TRL-220', 'TRL-221', 'TRL-222'],
    },
    issues: {},
  };

  for (const logPath of logs) {
    const text = readFileSync(logPath, 'utf8');
    const chunk = extractFromLog(text);
    for (const [id, rec] of Object.entries(chunk)) {
      mergeRecord((catalog.issues[id] ??= {}), rec);
    }
  }

  for (const [id, rec] of Object.entries(MANUAL)) {
    mergeRecord((catalog.issues[id] ??= {}), rec);
  }

  for (const [id, status] of Object.entries(STATUS_OVERRIDES)) {
    if (catalog.issues[id]) catalog.issues[id].status = status;
  }

  for (const [id, rec] of Object.entries(catalog.issues)) {
    if (!rec.status) {
      rec.status = rec.labels?.includes('review')
        ? 'backlog'
        : rec.labels?.some((l) => ['spec', 'impl'].includes(l))
          ? 'queue'
          : 'backlog';
    }
    if (!rec.priority) rec.priority = 'medium';
    if (!rec.labels) rec.labels = [];
    rec.id = id;
  }

  const sorted = Object.fromEntries(
    Object.entries(catalog.issues).sort(
      ([a], [b]) => parseInt(a.slice(4), 10) - parseInt(b.slice(4), 10),
    ),
  );
  catalog.issues = sorted;

  writeFileSync(outPath, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`Wrote ${Object.keys(sorted).length} issues → ${outPath}`);
  console.log(`Hook logs scanned: ${logs.length}`);
}

main();
