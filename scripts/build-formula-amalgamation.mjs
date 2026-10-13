#!/usr/bin/env node
/**
 * Build the single-file formula-core amalgamation: dist/formula/v1.js.
 *
 * Zero runtime deps, ESM, Node LTS. Self-verifies by dynamically importing the
 * artifact and asserting the public API, so a broken bundle fails the build
 * rather than shipping.
 */
import { mkdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const entry = join(root, 'src/formula/index.ts');
const outfile = join(root, 'dist/formula/v1.js');

mkdirSync(dirname(outfile), { recursive: true });

await build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  legalComments: 'none',
});

const mod = await import(pathToFileURL(outfile).href);
for (const name of ['parse', 'evaluate', 'serialize']) {
  if (typeof mod[name] !== 'function') {
    console.error(`formula amalgamation: missing export "${name}"`);
    process.exit(1);
  }
}
console.log(`formula amalgamation: ok (${relative(root, outfile)})`);
