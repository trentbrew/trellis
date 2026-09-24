#!/usr/bin/env node
// Trellis CLI launcher.
//
// The bundled CLI in dist/ is built with `--target bun` and uses Bun-specific
// APIs at runtime. This launcher works under either runtime:
//   - If invoked by bun, it imports the bundle directly.
//   - If invoked by node (the default for `npx trellis`), it re-execs the same
//     script under bun. If bun is missing, it prints actionable install hints.

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, delimiter } from 'node:path';
import { existsSync } from 'node:fs';

const isWindows = process.platform === 'win32';

if (process.versions?.bun) {
  await import('../dist/cli/index.js');
} else {
  const bun =
    findOnPath('bun') ??
    findUserBun() ??
    (existsSync('/opt/homebrew/bin/bun') ? '/opt/homebrew/bin/bun' : null);
  if (!bun) {
    process.stderr.write(
      [
        '',
        'Trellis requires Bun to run.',
        '',
        'Install Bun:',
        '  macOS/Linux:  curl -fsSL https://bun.sh/install | bash',
        '  Windows:      powershell -c "irm bun.sh/install.ps1 | iex"',
        '',
        'More info: https://bun.sh',
        '',
      ].join('\n'),
    );
    process.exit(1);
  }

  const here = fileURLToPath(import.meta.url);
  const result = spawnSync(bun, [here, ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: process.env,
  });
  const code = result.status ?? 1;
  if (code !== 0 && result.error) {
    process.stderr.write(`${result.error.message}\n`);
  }
  process.exit(code);
}

function findOnPath(cmd) {
  const PATH = process.env.PATH || '';
  const exts = isWindows ? ['.exe', '.cmd', '.bat', ''] : [''];
  for (const dir of PATH.split(isWindows ? ';' : delimiter)) {
    if (!dir) continue;
    for (const ext of exts) {
      const p = join(dir, cmd + ext);
      if (existsSync(p)) return p;
    }
  }
  return null;
}

function findUserBun() {
  const home = process.env.HOME || process.env.USERPROFILE;
  if (!home) return null;
  const candidates = isWindows
    ? [join(home, '.bun', 'bin', 'bun.exe')]
    : [join(home, '.bun', 'bin', 'bun')];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}
