import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const cwd = '/Users/trentbrew/TURTLE/Projects/TRELLIS/trellis-node';
const r = spawnSync('node', ['./node_modules/vitest/vitest.mjs', 'run', 'test/vcs/test-runner.test.ts'], {
  cwd,
  encoding: 'utf8',
  env: { ...process.env, CI: '1', FORCE_COLOR: '0' },
  maxBuffer: 20 * 1024 * 1024,
});
const out = {
  status: r.status,
  stdout: r.stdout || '',
  stderr: r.stderr || '',
  error: r.error ? String(r.error) : null,
};
fs.writeFileSync(path.join(cwd, 'rug/spawn-vitest.json'), JSON.stringify(out, null, 2));
