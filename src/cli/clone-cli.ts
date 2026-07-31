/**
 * trellis clone — bootstrap a fresh local repo from a remote sprite (ADR 0031).
 */

import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import chalk from "chalk";
import type { Command } from "commander";
import { cloneRemoteLedger, listRemoteRepos } from "../vcs/oplog-remote.js";

export function registerCloneCommands(program: Command): void {
	program
		.command("clone <url> [dir]")
		.description("Clone a repo from a remote sprite into a fresh directory")
		.option(
			"--repo <repoId>",
			"Remote ledger repoId (required when sprite hosts multiple)",
		)
		.option(
			"--api-key <key>",
			"Remote API key (also stored in .trellis/remote.json)",
		)
		.option(
			"--git <git-url>",
			"Git URL for the byte tier (git clone before materialize)",
		)
		.option("--ops-only", "Skip git materialization — chain + config only")
		.action(async (url: string, dir: string | undefined, opts) => {
			const destDir = dir ? resolve(dir) : process.cwd();
			if (existsSync(join(destDir, ".trellis"))) {
				throw new Error(
					`Destination already contains a Trellis repo: ${destDir}`,
				);
			}
			if (existsSync(destDir) && readDirNonEmpty(destDir) && !opts.git) {
				throw new Error(
					`Destination directory is not empty: ${destDir}. Pass --git to clone bytes into it.`,
				);
			}

			const result = await cloneRemoteLedger(url, destDir, {
				repoId: opts.repo,
				apiKey: opts.apiKey,
				gitUrl: opts.git,
				opsOnly: opts.opsOnly,
			});

			console.log(chalk.green(`✓ Cloned ${chalk.bold(result.repoId)}`));
			console.log(`  ${chalk.dim("Into:")}    ${destDir}`);
			console.log(
				`  ${chalk.dim("Tail:")}    ${result.tailHash.slice(0, 20)}…`,
			);
			console.log(`  ${chalk.dim("Ops:")}     ${result.lineCount}`);
			const byteLabel = result.materialized
				? "git checkout"
				: opts.git
					? "git checkout (pending open)"
					: "ops only — use --git for worktree";
			console.log(`  ${chalk.dim("Bytes:")}   ${byteLabel}`);
			if (!result.materialized && opts.git) {
				console.log(
					chalk.yellow(
						"\n  Run `trellis open` to replay and materialize the worktree.",
					),
				);
			}
		});

  const project = program
    .command('project')
    .description('Discover and clone repos hosted by remote sprites');

  project
    .command('list <url>')
    .description('List ledgers hosted by a remote sprite')
    .option('--api-key <key>', 'Remote API key')
    .action(async (url: string, opts) => {
			const repos = await listRemoteRepos(
				{ url, repoId: "" },
				undefined,
				opts.apiKey ? { authorization: `Bearer ${opts.apiKey}` } : {},
			);
			if (repos.length === 0) {
				console.log(chalk.dim("No ledgers hosted at this remote."));
				return;
			}
			for (const repo of repos) {
				console.log(
					`  ${chalk.bold(repo.repoId)}  ${chalk.dim(
						`${repo.lineCount ?? 0} ops · tail ${(repo.tailHash ?? "").slice(0, 12)}… · ${repo.updatedAt ?? ""}`,
					)}`,
				);
			}
		});
}

function readDirNonEmpty(dir: string): boolean {
	try {
		return readdirSync(dir).length > 0;
	} catch {
		return false;
	}
}
