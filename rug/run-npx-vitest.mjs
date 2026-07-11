import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const cwd = '/Users/trentbrew/TURTLE/Projects/TRELLIS/trellis-node';
const r = spawnSync('npx', ['vitest', 'run', 'test/vcs/test-runner.test.ts'], {
  cwd,
  encoding: 'utf8',
  env: { ...process.env, CI: '1', FORCE_COLOR: '0' },
  maxBuffer: 20 * 1024 * 1024,
  shell: true,
});
fs.writeFileSync(path.join(cwd, 'rug/spawn-npx-vitest.json'), JSON.stringify({
  status: r.status,
  stdout: r.stdout || '',
  stderr: r.stderr || '',
  error: r.error ? String(r.error) : null,
}, null, 2));
