/**
 * Publish guard. Three classes of mistake it refuses:
 *
 * 1. file:/link: runtime deps — they break pnpm/bun installs. The admin UI bundle is
 *    vendored in src/ui/@trellis.computer/ui/dist and copied into dist/ui at build time
 *    (refresh with `npm run sync:ui`).
 * 2. Publishing the wrong tree. 4.0.4 shipped from a stale working copy: the version had
 *    been bumped by hand, but the source predated 4.0.3, so npm's `latest` regressed.
 *    Releases go out from CI, off the tag. A local publish must be opted into explicitly
 *    and still has to sit on a clean checkout of the matching tag.
 * 3. Heavy agent runtimes back in `dependencies` — they take installs from ~40 MiB to
 *    over 1 GiB. They are optional peers on purpose.
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const fail = (title, lines) => {
  console.error(`npm publish blocked: ${title}\n`);
  for (const line of lines) console.error(`  ${line}`);
  console.error('');
  process.exit(1);
};

const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();

// --- 2. the tree this is being published from -------------------------------------
if (!process.env.CI) {
  if (process.env.TRELLIS_ALLOW_LOCAL_PUBLISH !== '1') {
    fail('releases publish from CI, not from a working copy', [
      'Push the release tag and let .github/workflows/publish-npm.yml publish it:',
      '',
      `  git tag -a v${pkg.version} -m "trellis v${pkg.version}" && git push origin v${pkg.version}`,
      '',
      'The workflow checks out that tag, so what ships is what is tagged — no worktree',
      'can be the wrong one. To override for a genuine one-off, set',
      'TRELLIS_ALLOW_LOCAL_PUBLISH=1; the checks below still apply.',
    ]);
  }

  let head;
  try {
    head = git('rev-parse', 'HEAD');
  } catch {
    fail('not a git checkout', ['Publish from the repository, off the release tag.']);
  }
  if (git('status', '--porcelain')) {
    fail('the working tree is dirty', ['Commit or stash everything before publishing.']);
  }
  const tags = git('tag', '--points-at', head).split('\n').filter(Boolean);
  if (!tags.includes(`v${pkg.version}`)) {
    fail(`HEAD is not tagged v${pkg.version}`, [
      `package.json says ${pkg.version}; HEAD (${head.slice(0, 12)}) carries: ${tags.join(', ') || 'no tags'}`,
      'This is exactly how 4.0.4 shipped a stale tree. Check out the tag you mean to publish.',
    ]);
  }
}

// --- 3. heavy runtimes must stay optional -----------------------------------------
const heavy = ['opencode-ai', 'turtlecode', '@xenova/transformers', '@huggingface/transformers'];
const regressed = heavy.filter((name) => pkg.dependencies?.[name]);
if (regressed.length > 0) {
  fail('agent/embedding runtimes are back in `dependencies`', [
    ...regressed.map((name) => `  ${name}`),
    '',
    'They belong in peerDependencies (optional). As hard deps a plain install exceeds 1 GiB.',
  ]);
}

// --- CHANGELOG matches the version being published ---------------------------------
const changelogHeading = readFileSync(join(root, 'CHANGELOG.md'), 'utf8').match(/^## trellis \[([^\]]+)\]/m);
if (!changelogHeading) {
  fail('CHANGELOG.md has no `## trellis [version]` heading', ['Add the release entry before publishing.']);
}
if (changelogHeading[1] !== pkg.version) {
  fail('CHANGELOG.md does not describe this version', [
    `package.json: ${pkg.version}`,
    `CHANGELOG top entry: ${changelogHeading[1]}`,
  ]);
}

const runtimeFields = ['dependencies', 'optionalDependencies', 'peerDependencies'];
const bad = [];

for (const field of runtimeFields) {
  const deps = pkg[field];
  if (!deps || typeof deps !== 'object') continue;
  for (const [name, version] of Object.entries(deps)) {
    if (
      typeof version === 'string' &&
      (version.startsWith('file:') || version.startsWith('link:') || version.startsWith('workspace:'))
    ) {
      bad.push(`${field}.${name} = ${version}`);
    }
  }
}

if (bad.length > 0) {
  console.error('npm publish blocked: runtime deps must not use file/link/workspace specifiers:\n');
  for (const line of bad) console.error(`  ${line}`);
  console.error('\nMove build-time-only packages to devDependencies and vendor into dist at build.');
  process.exit(1);
}

console.log('validate-npm-publish: ok');
