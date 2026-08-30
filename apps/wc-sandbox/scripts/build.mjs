#!/usr/bin/env node
/** @deprecated Use scripts/build.sh — shells out to `trellis sandbox pack`. */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const sh = path.join(path.dirname(fileURLToPath(import.meta.url)), 'build.sh');
const r = spawnSync(sh, { stdio: 'inherit', cwd: root, shell: false });
process.exit(r.status ?? 1);
