/**
 * trellis profile — global user profile + agent learnings
 */

import type { Command } from 'commander';
import chalk from 'chalk';
import { TrellisVcsEngine } from '../engine.js';
import {
  appendLearning,
  formatProfileContextText,
  getProfile,
  profileContextStats,
  removeLearning,
  setProfileFields,
  type ProfileLearningCategory,
} from '../scaffold/profile.js';
import { inferProjectContext } from '../scaffold/infer.js';
import { writeAgentScaffold } from '../scaffold/write.js';
import { resolveRepoRoot } from './repo-path.js';

const LEARNING_CATEGORIES: ProfileLearningCategory[] = [
  'preference',
  'context',
  'style',
  'skill',
  'other',
];

function parseCategory(raw: string | undefined): ProfileLearningCategory | undefined {
  if (!raw) return undefined;
  if (!LEARNING_CATEGORIES.includes(raw as ProfileLearningCategory)) {
    console.error(
      chalk.red(
        `Invalid --category '${raw}'. Use: ${LEARNING_CATEGORIES.join(' | ')}`,
      ),
    );
    process.exit(1);
  }
  return raw as ProfileLearningCategory;
}

async function refreshProfileScaffold(rootPath: string): Promise<void> {
  if (!TrellisVcsEngine.isRepo(rootPath)) {
    console.error(
      chalk.red(`Not a TrellisVCS repository: ${rootPath}`),
    );
    process.exit(1);
  }
  const profile = getProfile();
  const context = await inferProjectContext(rootPath);
  writeAgentScaffold(rootPath, { profile, context });
  console.log(
    chalk.green(`  ✓ Refreshed agent scaffold at ${rootPath}/.trellis/agents/AGENTS.md`),
  );
}

export function registerProfileCommands(program: Command): void {
  const profileCmd = program
    .command('profile')
    .description('Global user profile and agent-captured learnings');

  profileCmd
    .command('show')
    .description('Show profile core fields and learnings')
    .option('--json', 'Emit JSON')
    .action((opts) => {
      const profile = getProfile();
      if (!profile) {
        console.log(chalk.yellow('No profile yet. Run trellis init to create one.'));
        return;
      }

      if (opts.json) {
        console.log(JSON.stringify(profile, null, 2));
        return;
      }

      console.log(chalk.bold('\n  Profile\n'));
      console.log(`  Name:       ${profile.name}`);
      console.log(`  Bio:        ${profile.bio || '(empty)'}`);
      console.log(
        `  Skills:     ${profile.skills.length ? profile.skills.join(', ') : '(empty)'}`,
      );
      console.log(`  Style:      ${profile.style || '(empty)'}`);
      console.log(
        `  Preferences: ${profile.preferences.verbosity} / ${profile.preferences.tone}`,
      );
      console.log(`  Updated:    ${profile.updatedAt}`);

      const learnings = profile.learnings ?? [];
      console.log(chalk.bold(`\n  Learnings (${learnings.length})\n`));
      if (learnings.length === 0) {
        console.log(chalk.dim('  (none — use `trellis profile learn "<fact>"`)'));
        return;
      }

      const sorted = [...learnings].sort(
        (a, b) => Date.parse(b.addedAt) - Date.parse(a.addedAt),
      );
      for (const l of sorted) {
        const tag = l.category ? chalk.cyan(`[${l.category}] `) : '';
        console.log(`  ${l.id}  ${tag}${l.fact}`);
        const meta = [l.addedAt.slice(0, 10), l.addedBy, l.source]
          .filter(Boolean)
          .join(' · ');
        if (meta) console.log(chalk.dim(`           ${meta}`));
      }
      console.log();
    });

  profileCmd
    .command('learn')
    .description('Append a durable learning about the user')
    .argument('<fact>', 'One-sentence fact to remember')
    .option(
      '--category <name>',
      'preference | context | style | skill | other',
    )
    .option('--source <ref>', 'Provenance (e.g. issue:TRL-5)')
    .option('--added-by <id>', 'Agent or actor id', 'cli')
    .option(
      '-p, --path <path>',
      'Refresh agent scaffold in this repo after learning',
    )
    .option('--refresh', 'Alias for --path .')
    .action(async (fact: string, opts) => {
      try {
        const profile = appendLearning({
          fact,
          category: parseCategory(opts.category),
          source: opts.source,
          addedBy: opts.addedBy,
        });
        const latest = profile.learnings?.[profile.learnings.length - 1];
        console.log(
          chalk.green(`  ✓ Learning saved${latest ? ` (${latest.id})` : ''}`),
        );

        const refreshPath =
          opts.path ?? (opts.refresh ? '.' : undefined);
        if (refreshPath) {
          await refreshProfileScaffold(resolveRepoRoot(refreshPath));
        }
      } catch (err) {
        console.error(chalk.red(`✗ ${(err as Error).message}`));
        process.exit(1);
      }
    });

  profileCmd
    .command('forget')
    .description('Remove a learning by id')
    .argument('<id>', 'Learning id from `trellis profile show`')
    .action((id: string) => {
      try {
        removeLearning(id);
        console.log(chalk.green(`  ✓ Removed learning ${id}`));
      } catch (err) {
        console.error(chalk.red(`✗ ${(err as Error).message}`));
        process.exit(1);
      }
    });

  profileCmd
    .command('set')
    .description('Update human-owned core profile fields')
    .option('--name <name>', 'Display name')
    .option('--bio <bio>', 'One-line bio')
    .option('--skills <list>', 'Comma-separated skills')
    .option('--style <style>', 'Working style')
    .option('--verbosity <level>', 'concise | balanced | detailed')
    .option('--tone <tone>', 'peer | mentor | formal')
    .action((opts) => {
      const updates: Record<string, unknown> = {};
      if (opts.name) updates.name = opts.name;
      if (opts.bio) updates.bio = opts.bio;
      if (opts.skills) {
        updates.skills = String(opts.skills)
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);
      }
      if (opts.style) updates.style = opts.style;

      const preferences: Record<string, string> = {};
      if (opts.verbosity) {
        if (!['concise', 'balanced', 'detailed'].includes(opts.verbosity)) {
          console.error(chalk.red('Invalid --verbosity. Use concise | balanced | detailed'));
          process.exit(1);
        }
        preferences.verbosity = opts.verbosity;
      }
      if (opts.tone) {
        if (!['peer', 'mentor', 'formal'].includes(opts.tone)) {
          console.error(chalk.red('Invalid --tone. Use peer | mentor | formal'));
          process.exit(1);
        }
        preferences.tone = opts.tone;
      }
      if (Object.keys(preferences).length > 0) {
        updates.preferences = preferences;
      }

      if (Object.keys(updates).length === 0) {
        console.error(
          chalk.red('Provide at least one field to update (--name, --bio, …)'),
        );
        process.exit(1);
      }

      const profile = setProfileFields(updates);
      console.log(chalk.green(`  ✓ Profile updated (${profile.updatedAt})`));
    });

  profileCmd
    .command('seed')
    .description('Re-inject profile into the current repo agent scaffold')
    .option('-p, --path <path>', 'Repository path', '.')
    .action(async (opts) => {
      try {
        await refreshProfileScaffold(resolveRepoRoot(opts.path));
      } catch (err) {
        console.error(chalk.red(`✗ ${(err as Error).message}`));
        process.exit(1);
      }
    });

  profileCmd
    .command('context')
    .description('Emit budgeted user profile text for hooks and eval arms')
    .option('--budget <n>', 'Character budget', '800')
    .option('--format <fmt>', 'text | json', 'text')
    .action((opts) => {
      const budget = parseInt(String(opts.budget), 10);
      if (!Number.isFinite(budget) || budget < 1) {
        console.error(chalk.red('--budget must be a positive integer'));
        process.exit(1);
      }
      const profile = getProfile();
      const text = formatProfileContextText(profile, { budgetChars: budget });
      const stats = profileContextStats(profile, { budgetChars: budget });
      const format = String(opts.format ?? 'text').toLowerCase();

      if (format === 'json') {
        console.log(
          JSON.stringify(
            { text, stats, profile: profile ?? null },
            null,
            2,
          ),
        );
        return;
      }
      if (!text) {
        console.log('');
        return;
      }
      console.log(text);
    });
}
