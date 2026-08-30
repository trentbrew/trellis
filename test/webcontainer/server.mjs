#!/usr/bin/env node
/**
 * Dev entry for the WebContainer sandbox (legacy: npm run test:wc).
 * Prefer: trellis sandbox serve
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { startSandboxHost } from '../../dist/wc/index.js';

const trellisRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

startSandboxHost({
  trellisRoot,
  onListen: (url) => {
    console.log(`\n  Trellis WebContainer sandbox`);
    console.log(`  → ${url}`);
    console.log(`  Requires: npm run build\n`);
  },
});
