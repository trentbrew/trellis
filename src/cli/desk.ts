import { join } from 'node:path';
import chalk from 'chalk';
import type { Command } from 'commander';
import { TrellisVcsEngine } from '../engine.js';
import { loadLaneMeta } from '../vcs/lane.js';
import {
  buildBriefingLine,
  buildRecommendations,
  collectGitDeskState,
  deskAuditExitCode,
  type DeskAuditReport,
} from '../vcs/desk-audit.js';
import { resolveRepoRoot } from './repo-path.js';

export function registerDeskCommands(program: Command): void {
  const desk = program
    .command('desk')
    .description('Desk hygiene — git + Trellis lane alignment');

  desk
    .command('audit')
    .description(
      'Summarize unpushed commits, dirty files by theme, lane coherence, and split recommendations',
    )
    .option('-p, --path <path>', 'Repository path', '.')
    .option('--json', 'Machine-readable JSON (no color)')
    .action((opts) => {
      const repoRoot = resolveRepoRoot(opts.path);
      let git;
      try {
        git = collectGitDeskState(repoRoot);
      } catch (err: unknown) {
        const msg = (err as Error).message;
        if (opts.json) {
          console.log(JSON.stringify({ error: msg }));
        } else {
          console.error(chalk.red(msg));
        }
        process.exit(1);
      }

      const engine = new TrellisVcsEngine({ rootPath: repoRoot });
      engine.open();
      const st = engine.status();

      const activeLaneId =
        process.env.TRELLIS_LANE_ID ?? engine.getActiveLaneId() ?? null;
      let laneIssueId: string | null = null;
      let laneOpCount: number | null = null;
      let laneSuggestSplit = false;
      let laneSplitReason: string | null = null;

      if (activeLaneId) {
        const summary = engine.summarizeLane(activeLaneId);
        laneIssueId = summary.meta.issueId ?? null;
        laneOpCount = summary.ops.length;
        laneSuggestSplit = summary.coherence.suggestSplit;
        laneSplitReason = summary.coherence.reason ?? null;
      } else if (process.env.TRELLIS_LANE_ID) {
        const meta = loadLaneMeta(
          join(repoRoot, '.trellis'),
          process.env.TRELLIS_LANE_ID,
        );
        laneIssueId = meta?.issueId ?? null;
      }

      const activeIssues = engine.listIssues({ status: 'in_progress' });
      const trellis = {
        branch: st.branch,
        totalOps: st.totalOps,
        activeLaneId,
        laneIssueId,
        laneOpCount,
        laneSuggestSplit,
        laneSplitReason,
        activeIssueCount: activeIssues.length,
        activeIssueIds: activeIssues.map((i) => i.displayId ?? i.id),
      };

      const report: DeskAuditReport = {
        repoRoot,
        git,
        trellis,
        briefingLine: buildBriefingLine(git),
        recommendations: buildRecommendations(git, trellis),
      };

      if (opts.json) {
        console.log(JSON.stringify(report, null, 2));
        process.exit(deskAuditExitCode(git));
      }

      console.log(chalk.bold('Desk audit\n'));
      console.log(`  ${chalk.dim('Repo:')}     ${repoRoot}`);
      console.log(`  ${chalk.dim('Git:')}      ${report.briefingLine}`);
      if (git.upstream) {
        console.log(
          `  ${chalk.dim('Upstream:')} ${git.upstream} (${git.behind} behind, ${git.ahead} ahead)`,
        );
      } else {
        console.log(`  ${chalk.dim('Upstream:')} ${chalk.yellow('none')}`);
      }

      if (git.unpushedCommits.length > 0) {
        console.log();
        console.log(chalk.dim('  Unpushed:'));
        for (const c of git.unpushedCommits.slice(0, 8)) {
          console.log(`    ${chalk.cyan(c.hash.slice(0, 7))} ${c.subject}`);
        }
        if (git.unpushedCommits.length > 8) {
          console.log(chalk.dim(`    … +${git.unpushedCommits.length - 8} more`));
        }
      }

      if (git.themes.length > 0) {
        console.log();
        console.log(chalk.dim('  Themes (working tree):'));
        for (const theme of git.themes) {
          console.log(
            `    ${chalk.cyan(theme.key)} ${chalk.dim(`(${theme.files.length} file(s))`)}`,
          );
        }
      }

      console.log();
      console.log(chalk.dim('  Trellis:'));
      console.log(
        `    branch ${st.branch} · ${st.totalOps} ops · ${trellis.activeIssueCount} in_progress issue(s)`,
      );
      if (activeLaneId) {
        console.log(
          `    lane ${activeLaneId}${laneIssueId ? ` → ${laneIssueId}` : ''}${laneOpCount !== null ? ` · ${laneOpCount} journal op(s)` : ''}`,
        );
        if (laneSuggestSplit) {
          console.log(chalk.yellow(`    coherence: spread > 1 — ${laneSplitReason ?? 'split recommended'}`));
        }
      } else {
        console.log(chalk.yellow('    no active lane'));
      }

      console.log();
      console.log(chalk.dim('  Recommendations:'));
      for (const rec of report.recommendations) {
        console.log(`    • ${rec}`);
      }

      process.exit(deskAuditExitCode(git));
    });
}
