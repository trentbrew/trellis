import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import type { Command } from 'commander';
import { TrellisVcsEngine } from '../engine.js';
import { loadLaneMeta, listLaneMetas } from '../vcs/lane.js';
import { readPresence, resolveSessionId } from './presence.js';
import { resolveRepoRoot } from './repo-path.js';

export type OpsFileFormat =
  | 'missing'
  | 'jsonl'
  | 'legacy-array'
  | 'mixed'
  | 'corrupt';

export interface OpsFileReport {
  format: OpsFileFormat;
  firstChar: string | null;
  totalLines: number;
  validLines: number;
  invalidLines: number;
  notes: string[];
}

export function inspectOpsFile(raw: string | null): OpsFileReport {
  if (raw === null) {
    return {
      format: 'missing',
      firstChar: null,
      totalLines: 0,
      validLines: 0,
      invalidLines: 0,
      notes: ['ops.json is missing'],
    };
  }

  const trimmed = raw.trim();
  const firstChar = trimmed[0] ?? null;
  const lines = raw.split('\n');
  const notes: string[] = [];

  if (!trimmed) {
    return {
      format: 'jsonl',
      firstChar,
      totalLines: lines.length,
      validLines: 0,
      invalidLines: 0,
      notes: ['ops.json is empty'],
    };
  }

  if (firstChar === '[') {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        notes.push('Legacy JSON array format — safe to read, migrate before contested writes.')
        return {
          format: 'legacy-array',
          firstChar,
          totalLines: lines.length,
          validLines: parsed.length,
          invalidLines: 0,
          notes,
        };
      }
    } catch {
      notes.push('Starts as array but whole-file JSON parse failed.')
    }
  }

  let validLines = 0;
  let invalidLines = 0;
  let sawArrayLine = false;
  let sawObjectLine = false;
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    try {
      const parsed = JSON.parse(t);
      validLines += 1;
      if (Array.isArray(parsed)) sawArrayLine = true;
      else if (parsed && typeof parsed === 'object') sawObjectLine = true;
    } catch {
      invalidLines += 1;
    }
  }

  if (invalidLines === 0 && sawObjectLine && !sawArrayLine) {
    return {
      format: 'jsonl',
      firstChar,
      totalLines: lines.length,
      validLines,
      invalidLines,
      notes,
    };
  }

  if ((sawArrayLine && sawObjectLine) || (firstChar === '[' && validLines > 0)) {
    notes.push('Mixed array/JSONL content detected — stop writes and repair first.')
    return {
      format: 'mixed',
      firstChar,
      totalLines: lines.length,
      validLines,
      invalidLines,
      notes,
    };
  }

  notes.push('Unreadable or partially corrupt op journal detected.')
  return {
    format: 'corrupt',
    firstChar,
    totalLines: lines.length,
    validLines,
    invalidLines,
    notes,
  };
}

function scanLikelyProcesses(rootPath: string): { writers: string[]; observers: string[] } {
  const NOISE_RE =
    /(Cursor Helper|extension-host|extensionHost|Code Helper|GPU|renderer|crashpad|languagepack)/i;
  const WRITER_RE =
    /(lane watch|src\/cli\/index|trellis-cli|trellis lane|trellis issue|trellis repair|trellis promote)/i;

  try {
    const out = execSync('ps -axo pid=,command=', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const repoHint = rootPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(opencode|trellis|lane watch|src/cli/index\\.ts|dist/cli).*(?:${repoHint})?`, 'i');
    const writers: string[] = [];
    const observers: string[] = [];
    for (const line of out.split('\n').map((l) => l.trim()).filter(Boolean)) {
      if (!re.test(line) || NOISE_RE.test(line)) continue;
      if (WRITER_RE.test(line)) writers.push(line);
      else observers.push(line);
    }
    return {
      writers: writers.slice(0, 8),
      observers: observers.slice(0, 8),
    };
  } catch {
    return { writers: [], observers: [] };
  }
}

function verdictColor(verdict: 'ok' | 'caution' | 'blocked'): (s: string) => string {
  if (verdict === 'ok') return chalk.green;
  if (verdict === 'caution') return chalk.yellow;
  return chalk.red;
}

export function registerDoctorCommand(program: Command): void {
  program
    .command('doctor')
    .description('Inspect repo mutation safety: ops format, active lanes, presence, and likely writers')
    .option('-p, --path <path>', 'Repository path', '.')
    .action((opts) => {
      const rootPath = resolveRepoRoot(opts.path);
      const trellisDir = join(rootPath, '.trellis');
      const opsPath = join(trellisDir, 'ops.json');
      const lockPath = `${opsPath}.lock`;
      const raw = existsSync(opsPath) ? readFileSync(opsPath, 'utf8') : null;
      const ops = inspectOpsFile(raw);

      const engine = new TrellisVcsEngine({ rootPath });
      engine.open();
      const st = engine.status();

      const selfSessionId = resolveSessionId();
      const presence = readPresence(rootPath, { includeSelf: true, selfSessionId });
      const others = presence.filter((p) => p.sessionId !== selfSessionId);
      const lanes = listLaneMetas(trellisDir);
      const activeLaneId = process.env.TRELLIS_LANE_ID;
      const activeLane = activeLaneId ? loadLaneMeta(trellisDir, activeLaneId) : undefined;
      const processes = scanLikelyProcesses(rootPath);
      const { writers, observers } = processes;

      const reasons: string[] = [];
      let verdict: 'ok' | 'caution' | 'blocked' = 'ok';
      if (ops.format === 'mixed' || ops.format === 'corrupt') {
        verdict = 'blocked';
        reasons.push(`ops journal is ${ops.format}`);
      } else if (ops.format === 'legacy-array') {
        verdict = 'caution';
        reasons.push('ops journal still uses legacy array format');
      }
      if (existsSync(lockPath)) {
        verdict = 'blocked';
        reasons.push('ops lock file is present');
      }
      if (others.length > 0 && verdict !== 'blocked') {
        verdict = 'caution';
        reasons.push(`${others.length} other active presence record(s)`);
      }
      if (writers.length > 1 && verdict !== 'blocked') {
        verdict = 'caution';
        reasons.push('multiple likely Trellis writer processes are alive');
      } else if (observers.length > 0 && writers.length === 0 && verdict === 'ok') {
        verdict = 'caution';
        reasons.push('observer processes detected (OpenCode/Cursor) — confirm no parallel writes');
      }

      const paint = verdictColor(verdict);
      console.log(chalk.bold('Trellis Doctor'));
      console.log();
      console.log(`  ${chalk.dim('Repo:')}          ${rootPath}`);
      console.log(`  ${chalk.dim('Branch:')}        ${chalk.cyan(st.branch)}`);
      console.log(`  ${chalk.dim('Total ops:')}     ${st.totalOps}`);
      console.log(`  ${chalk.dim('Ops format:')}    ${ops.format}`);
      console.log(`  ${chalk.dim('Safe to mutate:')} ${paint(verdict.toUpperCase())}`);

      if (activeLaneId) {
        console.log(`  ${chalk.dim('Active lane:')}   ${chalk.cyan(activeLaneId)}`);
        if (activeLane?.issueId) {
          console.log(`  ${chalk.dim('Lane issue:')}    ${activeLane.issueId}`);
        }
        if (activeLane?.worktreePath) {
          console.log(`  ${chalk.dim('Worktree:')}      ${activeLane.worktreePath}`);
        }
      } else {
        console.log(`  ${chalk.dim('Active lane:')}   ${chalk.yellow('none')}`);
      }

      console.log();
      console.log(chalk.dim('  Why:'));
      if (reasons.length === 0) {
        console.log(`    ${chalk.green('•')} no immediate mutation hazards detected`);
      } else {
        for (const reason of reasons) {
          console.log(`    ${paint('•')} ${reason}`);
        }
      }
      for (const note of ops.notes) {
        console.log(`    ${chalk.dim('•')} ${note}`);
      }

      console.log();
      console.log(chalk.dim('  Presence:'));
      if (presence.length === 0) {
        console.log(`    ${chalk.dim('none')}`);
      } else {
        for (const p of presence.slice(0, 8)) {
          const who = p.sessionId === selfSessionId ? `${p.displayName} (self)` : p.displayName;
          const lane = p.laneId ? ` lane=${p.laneId}` : '';
          const issue = p.claimedIssueId ? ` issue=${p.claimedIssueId}` : '';
          console.log(`    ${who} [${p.client}/${p.status}]${lane}${issue}`);
        }
      }

      console.log();
      console.log(chalk.dim('  Lane ledger:'));
      const activeLanes = lanes.filter((lane) => lane.status === 'active');
      if (activeLanes.length === 0) {
        console.log(`    ${chalk.dim('no active lanes')}`);
      } else {
        for (const lane of activeLanes.slice(0, 8)) {
          console.log(
            `    ${lane.id} issue=${lane.issueId ?? '-'} agent=${lane.agentId} session=${lane.sessionId ?? '-'}`
          );
        }
      }

      console.log();
      console.log(chalk.dim('  Likely writers:'));
      if (writers.length === 0) {
        console.log(`    ${chalk.dim('none detected')}`);
      } else {
        for (const proc of writers) console.log(`    ${proc}`);
      }

      if (observers.length > 0) {
        console.log();
        console.log(chalk.dim('  Observers (non-writer):'));
        for (const proc of observers) console.log(`    ${chalk.dim(proc)}`);
      }

      console.log();
      console.log(chalk.dim('  Next step:'));
      if (verdict === 'blocked') {
        console.log(`    ${chalk.red('Stop writes.') } Run \`trellis repair\` only after stabilizing other writers/processes.`);
      } else if (verdict === 'caution') {
        console.log(`    ${chalk.yellow('Proceed carefully.') } Prefer read-only investigation, then a single write after quiescing peers.`);
      } else {
        console.log(`    ${chalk.green('Mutation looks safe.') } Continue in your lane/worktree and avoid parallel writers.`);
      }
    });
}
