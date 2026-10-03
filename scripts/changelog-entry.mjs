#!/usr/bin/env node
/**
 * CHANGELOG entry tooling for releases (`just changelog` / `just publish`).
 *
 *   node scripts/changelog-entry.mjs                 # print a draft entry for package.json's version
 *   node scripts/changelog-entry.mjs --check         # exit 1 unless the top CHANGELOG entry matches package.json
 *   node scripts/changelog-entry.mjs --write         # prepend the draft to CHANGELOG.md (marked as draft)
 *   node scripts/changelog-entry.mjs --write --accept  # prepend the entry without the draft marker
 *
 * The draft is generated from commits since the previous release (the tag of the
 * previous CHANGELOG version, falling back to its release commit), grouped by
 * conventional-commit type so it reads in review order. `--accept` is for
 * `just publish --write-changelog`, where the operator accepts the draft as-is.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const version = pkg.version;
const changelogPath = join(root, 'CHANGELOG.md');
const changelog = readFileSync(changelogPath, 'utf8');

const args = new Set(process.argv.slice(2));
const check = args.has('--check');
const write = args.has('--write');
const accept = args.has('--accept');

const topMatch = changelog.match(/^## trellis \[([^\]]+)\]/m);
const topVersion = topMatch?.[1] ?? null;

if (topVersion === version) {
  if (!check) console.log(`changelog: top entry already describes ${version}`);
  process.exit(0);
}

if (check) {
  console.error(
    `changelog: CHANGELOG.md top entry is ${topVersion ?? 'missing'}, package.json is ${version}`,
  );
  process.exit(1);
}

const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim();

function previousReleaseBase(prev) {
  if (prev) {
    try {
      return git('rev-parse', `v${prev}`);
    } catch {
      /* tag not present */
    }
    try {
      const byMsg = git(
        'log',
        '--format=%H',
        '-1',
        `--grep=^release: trellis ${prev}`,
        '--',
        'CHANGELOG.md',
      );
      if (byMsg) return byMsg.split('\n')[0];
    } catch {
      /* no release commit */
    }
  }
  try {
    return git('describe', '--tags', '--abbrev=0');
  } catch {
    return null;
  }
}

const base = previousReleaseBase(topVersion);
const range = base ? `${base}..HEAD` : 'HEAD';

let subjects = [];
try {
  subjects = git('log', range, '--no-merges', '--format=%h\t%s')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [sha, ...rest] = line.split('\t');
      return { sha, subject: rest.join('\t') };
    });
} catch {
  subjects = [];
}

subjects = subjects.filter(
  ({ subject }) => !/^release:/i.test(subject) && !/^chore\(docs\): INDEX/i.test(subject),
);

const TYPE_ORDER = ['feat', 'fix', 'perf', 'refactor', 'docs', 'test', 'chore'];
function parseType(subject) {
  const m = subject.match(/^(\w+)(?:\(([^)]+)\))?!?:\s*(.*)$/);
  if (!m) return { type: 'other', scope: '', text: subject };
  return { type: m[1].toLowerCase(), scope: m[2] ?? '', text: m[3] };
}

function rank(type) {
  const i = TYPE_ORDER.indexOf(type);
  return i === -1 ? TYPE_ORDER.length : i;
}

const parsed = subjects
  .map(({ sha, subject }) => ({ sha, ...parseType(subject) }))
  .sort((a, b) => rank(a.type) - rank(b.type));

const date = new Date().toISOString().slice(0, 10);
const since = base ? `v${topVersion}` : 'repository start';
const marker = `_Draft generated from commits since ${since} — review and tighten before publishing._`;

const bullets = parsed.map(({ type, scope, text, sha }) => {
  const where = scope ? `**${type}(${scope})**` : `**${type}**`;
  return `- ${where} ${text} (\`${sha}\`)`;
});

const lines = [
  `## trellis [${version}] — ${date}`,
  '',
  ...(accept ? [] : [marker, '']),
  ...(bullets.length ? bullets : ['- (no commits since the previous release)']),
  '',
];

const entry = `${lines.join('\n')}\n`;

if (write) {
  if (/^## trellis \[/m.test(changelog) === false) {
    writeFileSync(changelogPath, `${changelog.trimEnd()}\n\n${entry}`, 'utf8');
  } else {
    const firstEntry = changelog.search(/^## trellis \[/m);
    const next = `${changelog.slice(0, firstEntry)}${entry}${changelog.slice(firstEntry)}`;
    writeFileSync(changelogPath, next, 'utf8');
  }
  console.log(`changelog: wrote ${version} entry to CHANGELOG.md${accept ? '' : ' (draft)'}`);
} else {
  process.stdout.write(entry);
}
