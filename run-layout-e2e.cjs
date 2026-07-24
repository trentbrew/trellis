const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const root = __dirname;
const patterns = [
  'sidebar collapses',
  'secondary sidebar collapses',
  'secondary sidebar switches',
];
let out = '';
let failed = false;
for (const g of patterns) {
  const r = spawnSync(
    process.execPath,
    [
      path.join(root, 'node_modules/@playwright/test/cli.js'),
      'test',
      'e2e/admin.spec.cjs',
      '-g',
      g,
      '--reporter',
      'line',
    ],
    { encoding: 'utf8', cwd: root },
  );
  out += `\n=== ${g} code=${r.status} ===\n${r.stdout || ''}${r.stderr || ''}`;
  if (r.status !== 0) failed = true;
}
fs.writeFileSync(path.join(root, 'e2e-capture.txt'), out);
process.exit(failed ? 1 : 0);
