#!/usr/bin/env node
/**
 * Full-stack Trellis release — gate, sync, commit, publish across manifest consumers.
 *
 * Usage:
 *   node scripts/ship-release.mjs                 # dry-run (default)
 *   node scripts/ship-release.mjs --verify        # run gates only
 *   node scripts/ship-release.mjs --execute       # commit + npm publish + turtlecode sync
 *   node scripts/ship-release.mjs --execute --skip-publish
 *   node scripts/ship-release.mjs --execute --skip-commit
 *   node scripts/ship-release.mjs --kernel-only   # trellis-node only
 *   node scripts/ship-release.mjs --full-test     # full npm test (default: test:ship)
 *
 * Just:
 *   just ship
 *   just ship --verify
 *   just ship --execute
 *   just ship-release          # alias for --execute
 *
 * See docs/release-checklist.md and docs/kernel-touch-manifest.json.
 */
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkDiskSpace,
  ensureShipTmp,
  printShipSummary,
  tailLines,
  writeShipReport,
} from './ship-utils.mjs';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const manifest = JSON.parse(
  readFileSync(join(repoRoot, 'docs/kernel-touch-manifest.json'), 'utf8'),
);

const args = new Set(process.argv.slice(2));
const execute = args.has('--execute');
const verify = args.has('--verify') || execute;
const skipPublish = args.has('--skip-publish');
const skipCommit = args.has('--skip-commit');
const kernelOnly = args.has('--kernel-only');
const fullTest = args.has('--full-test');

const kernelPkg = JSON.parse(
  readFileSync(join(repoRoot, 'package.json'), 'utf8'),
);
const version = kernelPkg.version;

const mode = execute ? 'execute' : verify ? 'verify' : 'dry-run';
const report = {
  version,
  mode,
  ok: false,
  startedAt: new Date().toISOString(),
  finishedAt: null,
  failedStep: null,
  preflight: {},
  steps: [],
};

function expandPath(p) {
  if (p.startsWith('~/')) return join(homedir(), p.slice(2));
  return resolve(repoRoot, p);
}

function runCapture(cmd, opts = {}) {
  const cwd = opts.cwd ?? repoRoot;
  const env = { ...process.env, ...opts.env };
  const result = spawnSync(cmd, {
    cwd,
    env,
    shell: true,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  const combined = [result.stdout, result.stderr].filter(Boolean).join('\n');
  if (result.status !== 0) {
    const err = new Error(
      combined.trim().split('\n').pop() || `Command failed: ${cmd}`,
    );
    err.stdout = result.stdout ?? '';
    err.stderr = result.stderr ?? '';
    err.status = result.status;
    throw err;
  }
  if (opts.inherit) {
    process.stdout.write(result.stdout ?? '');
    process.stderr.write(result.stderr ?? '');
  }
  return combined;
}

async function runStep(id, label, fn) {
  const step = { id, label, status: 'pending', startedAt: new Date().toISOString() };
  const t0 = Date.now();
  console.log(`\n[${report.steps.length + 1}/${report.totalSteps}] ${label}`);
  try {
    await fn();
    step.status = 'ok';
  } catch (err) {
    step.status = 'fail';
    step.error = err.message ?? String(err);
    step.tail = tailLines(
      [err.stdout, err.stderr, err.message].filter(Boolean).join('\n'),
    );
    report.failedStep = id;
    report.steps.push({ ...step, durationMs: Date.now() - t0 });
    throw err;
  } finally {
    if (step.status !== 'fail') {
      step.durationMs = Date.now() - t0;
      report.steps.push(step);
    }
  }
}

function run(cmd, opts = {}) {
  const label = opts.label ?? cmd;
  console.log(`→ ${label}`);
  if (!verify) {
    console.log(`  (dry-run) ${cmd}`);
    return;
  }
  if (opts.inherit !== false) {
    execSync(cmd, {
      cwd: opts.cwd ?? repoRoot,
      stdio: 'inherit',
      env: { ...process.env, ...opts.env },
    });
    return;
  }
  runCapture(cmd, opts);
}

function gitDirty(dir) {
  if (!existsSync(join(dir, '.git'))) return false;
  const out = spawnSync('git', ['status', '--porcelain'], {
    cwd: dir,
    encoding: 'utf8',
  });
  return Boolean(out.stdout?.trim());
}

function gitCommit(dir, message, paths = ['-A']) {
  if (!execute) {
    console.log(`  (dry-run) git commit (${dir}): ${message.slice(0, 60)}…`);
    return;
  }
  if (!existsSync(join(dir, '.git'))) {
    console.log(`  skip commit — not a git repo: ${dir}`);
    return;
  }
  if (!gitDirty(dir)) {
    console.log(`  skip commit — clean: ${dir}`);
    return;
  }
  run(`git add ${paths.join(' ')}`, { cwd: dir, label: `git add (${dir})` });
  run(`git commit -m ${JSON.stringify(message)}`, {
    cwd: dir,
    label: `git commit (${dir})`,
  });
}

const total = kernelOnly ? 5 : 9;
report.totalSteps = total;

console.log(
  `Trellis release ${version} (${mode})`,
);
if (!execute && !verify) {
  console.log(
    'Pass --verify to run gates, --execute to commit + publish.\n',
  );
}

let reportPath = null;

try {
  await runStep('preflight', 'preflight (disk + tmp)', async () => {
    if (!verify) {
      console.log('  (dry-run) disk + TMPDIR checks');
      return;
    }
    const shipTmp = ensureShipTmp(repoRoot);
    const diskData = checkDiskSpace('/System/Volumes/Data', 512);
    const diskTmp = checkDiskSpace(shipTmp, 256);
    report.preflight = { shipTmp, disk: diskData, diskShipTmp: diskTmp };
    console.log(`  TMPDIR=${shipTmp}`);
    console.log(`  Data volume: ${diskData.availMb}MB free`);
    if (!diskData.ok) {
      throw new Error(
        `${diskData.message}. Free space before shipping (see rug/ship-report-*.json).`,
      );
    }
    if (!diskTmp.ok) {
      console.warn(`  warn: ${diskTmp.message}`);
    }
  });

  await runStep('ship-check', 'ship-check', async () => {
    run('node scripts/ship-check.mjs');
  });

  const testCmd = fullTest ? 'npm test' : 'npm run test:ship';
  await runStep('test', fullTest ? 'npm test (full)' : 'npm run test:ship', async () => {
    run(testCmd, { env: { TMPDIR: process.env.TMPDIR } });
  });

  await runStep('build', 'npm run build', async () => {
    run('npm run build');
  });

  await runStep('sync-downstream', 'sync-downstream', async () => {
    run('node scripts/sync-downstream.mjs');
  });

  await runStep('kernel-commit', 'kernel commit', async () => {
    const kernelMsg = `Release trellis ${version} — agent coordination wedge.`;
    if (!skipCommit) gitCommit(repoRoot, kernelMsg);
    else console.log('  (--skip-commit)');
  });

  if (kernelOnly) {
    report.ok = true;
    report.finishedAt = new Date().toISOString();
    reportPath = writeShipReport(repoRoot, report);
    printShipSummary(report, reportPath);
    process.exit(0);
  }

  const createTrellis = expandPath(
    manifest.consumers.find((c) => c.id === 'create-trellis')?.path ??
      '../create-trellis',
  );
  const trellisDocs = expandPath(
    manifest.consumers.find((c) => c.id === 'trellis-docs')?.path ??
      '../../Packages/trellis-docs/www',
  );
  const turtlecode = expandPath(
    manifest.consumers.find((c) => c.id === 'turtlecode-ide')?.path ??
      '../../Packages/turtlecode/ide',
  );

  await runStep('create-trellis-commit', 'create-trellis commit', async () => {
    const ctVersion =
      manifest.consumers.find((c) => c.id === 'create-trellis')?.packageVersion ??
      '0.2.0';
    if (!skipCommit) {
      gitCommit(
        createTrellis,
        `Release create-trellis ${ctVersion} — pin trellis ^${version}, sync skills.`,
      );
    }
  });

  await runStep('trellis-docs-commit', 'trellis-docs commit', async () => {
    if (!skipCommit) {
      gitCommit(
        trellisDocs,
        `docs: trellis ${version} — agent coordination guide and changelog`,
        ['content/', 'app/data/site-nav.ts'],
      );
    }
  });

  await runStep('npm-publish', 'npm publish (kernel + create-trellis)', async () => {
    if (!skipPublish) {
      run('npm publish', { cwd: repoRoot, label: 'npm publish trellis' });
      if (existsSync(join(createTrellis, 'package.json'))) {
        run('npm publish', {
          cwd: createTrellis,
          label: 'npm publish create-trellis',
        });
      }
    } else {
      console.log('  (--skip-publish)');
    }
  });

  await runStep('turtlecode-sync', 'turtlecode sync + commit', async () => {
    if (existsSync(join(turtlecode, 'script/sync-trellis-core.ts'))) {
      const syncMode = skipPublish ? '--pack' : '--npm';
      run(`bun script/sync-trellis-core.ts ${syncMode} --skip-trellis-test`, {
        cwd: turtlecode,
        label: `turtlecode sync (${syncMode})`,
      });
    }
    if (!skipCommit) {
      gitCommit(
        turtlecode,
        `Sync trellis ${version} — opencode dep, lane watch, skills.`,
        [
          'justfile',
          'script/trellis-env.sh',
          `RELEASE-${version}.md`,
          'packages/opencode/package.json',
          'bun.lock',
          '.opencode/skill/trellis-vcs/',
          '.opencode/skill/trellis-coordination/',
        ],
      );
    }
  });

  report.ok = true;
  report.finishedAt = new Date().toISOString();
  reportPath = writeShipReport(repoRoot, report);
  printShipSummary(report, reportPath);

  if (!execute) {
    console.log('Next: just ship-release   (or: node scripts/ship-release.mjs --execute)');
  } else if (!skipPublish) {
    console.log(`Verify: npx trellis@${version} --version`);
  }
} catch {
  report.ok = false;
  report.finishedAt = new Date().toISOString();
  reportPath = writeShipReport(repoRoot, report);
  printShipSummary(report, reportPath);
  process.exit(1);
}
