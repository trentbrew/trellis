#!/usr/bin/env node
/**
 * Seed Bible genealogy claims (runs the TypeScript entry via tsx).
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const entry = join(dir, 'seed-genealogies.ts');
const result = spawnSync('tsx', [entry], { stdio: 'inherit', cwd: process.cwd() });
process.exit(result.status ?? 1);
