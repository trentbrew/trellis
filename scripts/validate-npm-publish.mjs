/**
 * Guard against shipping file:/link: runtime deps — they break pnpm/bun installs.
 * UI is vendored into dist/ui at build time; @trellis.computer/ui stays dev-only.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

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
