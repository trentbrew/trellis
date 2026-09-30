#!/usr/bin/env node
/**
 * Copy `os/admin` static build into dist/ui/turtle-admin for npm publish.
 * Run from trellis-node after `cd ../admin && bun run build`.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const fromEnv = process.env.TURTLE_ADMIN_BUILD?.trim();
const candidates = [
  fromEnv,
  join(pkgRoot, '../admin/build'),
  join(pkgRoot, '../../admin/build'),
].filter(Boolean);

const src = candidates.find((p) => existsSync(join(p, 'index.html')));
const dest = join(pkgRoot, 'dist/ui/turtle-admin');

if (!src) {
  console.warn(
    'copy-turtle-admin: skip — no admin build found (set TURTLE_ADMIN_BUILD or run `cd admin && bun run build`)',
  );
  process.exit(0);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dirname(dest), { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`copy-turtle-admin: ${src} → ${dest}`);
