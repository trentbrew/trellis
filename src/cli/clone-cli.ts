/**
 * trellis project + trellis clone + trellis peer (ADR 0031 / ADR 0032).
 *
 * Identity-addressed surface: projects are `{peer}/{repo}`, never URLs. The
 * sprite URL lives in the peer resolver (~/.trellis/peers.json) and in
 * `.trellis/remote.json` as a bound transport. `trellis clone <url>` remains
 * as the explicit transport override.
 */

import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import chalk from "chalk";
import type { Command } from "commander";
import { TrellisVcsEngine } from "../engine.js";
import {
  cloneRemoteLedger,
  listRemoteRepos,
} from "../vcs/oplog-remote.js";
import {
  addPeer,
  loadPeers,
  parseProjectRef,
  removePeer,
  resolvePeer,
  type PeerRecord,
} from "../vcs/peer-resolver.js";
import { ensurePersonIdentity } from "../identity/identity.js";
import { PROVENANCE } from "../core/persist/canonical-op.js";

const PROJECT_KINDS = [
  "code",
  "knowledge-base",
  "notes",
  "data",
  "media",
  "other",
] as const;

export function registerCloneCommands(program: Command): void {
	registerPeerCommands(program);
	registerClone(program);
	registerProjectCommands(program);
}

// ---------------------------------------------------------------------------
// trellis peer — the person-level resolver (~/.trellis/peers.json)
// ---------------------------------------------------------------------------

function registerPeerCommands(program: Command): void {
	const peer = program
		.command("peer")
		.description("Register known people (identities) and their sprites");

	peer
		.command("add <name> <url>")
		.description("Register a person's sprite (URLs live here, never in the CLI surface)")
		.option(
			"--did <did>",
			"did:key identity (default: derive a fresh one for the person)",
		)
		.option(
			"--public-key <key>",
			"Ed25519 public key (base64) for attestation verification",
		)
		.action((name: string, url: string, opts) => {
			const existing = resolvePeer(name);
			const record: PeerRecord = {
				did: opts.did ?? existing?.did ?? `did:key:unverified-${name}`,
				entityId: opts.did
					? `identity:${opts.did}`
					: existing?.entityId ?? `identity:unverified-${name}`,
				publicKey: opts.publicKey ?? existing?.publicKey ?? "",
				spriteUrls: [
					...(existing?.spriteUrls ?? []).filter((u) => u !== url),
					url,
				],
				displayName: name,
			};
			addPeer(name, record);
			console.log(chalk.green(`✓ Registered peer ${chalk.bold(name)}`));
			console.log(`  ${chalk.dim("Sprite:")}  ${url}`);
			console.log(`  ${chalk.dim("DID:")}    ${record.did}`);
			if (!record.publicKey) {
				console.log(
					chalk.yellow(
						"  No public key set — pass --public-key to verify attestations at clone time.",
					),
				);
			}
		});

	peer
		.command("remove <name>")
		.description("Remove a registered peer")
		.action((name: string) => {
			if (!removePeer(name)) {
				console.log(chalk.yellow(`Peer ${name} not found.`));
				return;
			}
			console.log(chalk.green(`✓ Removed peer ${chalk.bold(name)}`));
		});

	peer
		.command("list")
		.description("List registered peers")
		.action(() => {
			const peers = loadPeers();
			const names = Object.keys(peers);
			if (names.length === 0) {
				console.log(chalk.dim("No peers registered."));
				return;
			}
			for (const name of names) {
				const p = peers[name];
				if (!p) continue;
				console.log(
					`  ${chalk.bold(name)}  ${chalk.dim(
						`${p.spriteUrls.join(", ")}${p.did ? ` · ${p.did.slice(0, 24)}…` : ""}`,
					)}`,
				);
			}
		});
}

// ---------------------------------------------------------------------------
// trellis clone <url> — explicit transport override (ADR 0032 §2)
// ---------------------------------------------------------------------------

function registerClone(program: Command): void {
	program
		.command("clone <url> [dir]")
		.description("Clone a repo from a remote sprite (transport override)")
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
			ensureEmptyDest(destDir, opts.git);

			const result = await cloneRemoteLedger(url, destDir, {
				repoId: opts.repo,
				apiKey: opts.apiKey,
				gitUrl: opts.git,
				opsOnly: opts.opsOnly,
			});

			renderClone(result, destDir, opts.git);
		});
}

// ---------------------------------------------------------------------------
// trellis project — create / clone / list (ADR 0032)
// ---------------------------------------------------------------------------

function registerProjectCommands(program: Command): void {
	const project = program
		.command("project")
		.description("Create, clone, and discover projects by identity ({peer}/{repo})");

	project
		.command("create [dir]")
		.description("Initialize a Trellis project bound to your person identity")
		.option("--name <name>", "Project slug ({peer}/{repo} right half)")
		.option(
			"--kind <kind>",
			`Project kind (${PROJECT_KINDS.join(", ")})`,
		)
		.option("--no-interactive", "Skip onboarding prompts")
		.action(async (dir: string | undefined, opts) => {
			const rootPath = dir ? resolve(dir) : process.cwd();
			if (TrellisVcsEngine.isRepo(rootPath)) {
				throw new Error(`Already a Trellis workspace: ${rootPath}`);
			}

			const interactive = opts.interactive !== false && process.stdin.isTTY;
			const identity = ensurePersonIdentity();

			let name = opts.name;
			let kind = opts.kind;
			if (interactive) {
				if (!name) {
					name = await prompt("Project name (slug): ", basenameOr(rootPath));
				}
				if (!kind) {
					kind = await prompt(
						`Project kind (${PROJECT_KINDS.join("/")}): `,
						"other",
					);
				}
			}
			name = sanitizeSlug(name ?? basenameOr(rootPath));
			kind = sanitizeKind(kind);

			const engine = new TrellisVcsEngine({
				rootPath,
				provenance: PROVENANCE.cli,
			});
			await engine.initRepo({ indexWorkspace: false });
			engine.setProjectMetadata({
				owner: identity.entityId,
				name,
				kind,
			});
			const repoId = engine.getPersistedRepoId();
			await engine.attestProject({
				owner: identity.entityId,
				repoName: name,
				repoId,
				kind,
				privateKey: identity.privateKey,
			});

			console.log(chalk.green(`✓ Created project ${chalk.bold(`${identity.entityId.split(":")[1]?.slice(0, 12)}/${name}`)}`));
			console.log(`  ${chalk.dim("Path:")}    ${rootPath}`);
			console.log(`  ${chalk.dim("Owner:")}   ${identity.entityId}`);
			console.log(`  ${chalk.dim("RepoId:")}  ${repoId}`);
			console.log(`  ${chalk.dim("Kind:")}    ${kind}`);
			console.log(
				chalk.dim(
					"\n  Projects are local-only until published (see `trellis project publish`, L1+).",
				),
			);
		});

	project
		.command("clone {peer}/{repo} [dir]")
		.description("Clone a published project by identity — trust the person, not a URL")
		.option("--api-key <key>", "Remote API key")
		.option(
			"--git <git-url>",
			"Git URL for the byte tier (git clone before materialize)",
		)
		.option("--ops-only", "Skip git materialization — chain + config only")
		.action(async (ref: string, dir: string | undefined, opts) => {
			const { peer: peerRef, repo } = parseProjectRef(ref);
			const peer = resolvePeer(peerRef);
			if (!peer) {
				throw new Error(
					`Unknown peer '${peerRef}'. Register it first: trellis peer add ${peerRef} <sprite-url> [--public-key <key>]`,
				);
			}
			if (peer.spriteUrls.length === 0) {
				throw new Error(`Peer '${peerRef}' has no registered sprites.`);
			}
			if (!peer.publicKey) {
				throw new Error(
					`Peer '${peerRef}' has no public key — attestation cannot be verified. Add it: trellis peer add ${peerRef} <url> --public-key <key>`,
				);
			}

			const destDir = dir ? resolve(dir) : process.cwd();
			ensureEmptyDest(destDir, opts.git);

			const spriteUrl = peer.spriteUrls[0];
			const result = await cloneRemoteLedger(spriteUrl, destDir, {
				apiKey: opts.apiKey,
				gitUrl: opts.git,
				opsOnly: opts.opsOnly,
				expected: {
					owner: peer.entityId,
					repoName: repo,
					publicKey: peer.publicKey,
				},
			});

			// After the clone, the sprite's listing tells us the exact repoId the
			// ledger holds; re-verify it if it differs from what was selected.
			renderClone(result, destDir, opts.git, `${peerRef}/${repo}`);
		});

	project
		.command("list [peer]")
		.description("List a peer's published projects (or all registered peers)")
		.option("--api-key <key>", "Remote API key")
		.action(async (peerRef: string | undefined, opts) => {
			const peers = loadPeers();
			const targets = peerRef
				? [resolvePeerOrThrow(peerRef)]
				: Object.values(peers).filter((p) => p.spriteUrls.length > 0);

			if (targets.length === 0) {
				console.log(chalk.dim("No peers registered with sprites."));
				return;
			}

			for (const peer of targets) {
				for (const url of peer.spriteUrls) {
					const repos = await listRemoteRepos(
						{ url, repoId: "" },
						undefined,
						opts.apiKey ? { authorization: `Bearer ${opts.apiKey}` } : {},
					);
					console.log(chalk.bold(`\n${displayName(peer)}  ${chalk.dim(url)}`));
					if (repos.length === 0) {
						console.log(chalk.dim("  No projects hosted at this sprite."));
						continue;
					}
					for (const repo of repos) {
						const scoped = repo.owner === peer.entityId;
						console.log(
							`  ${scoped ? chalk.green("✓") : chalk.dim("•")} ${chalk.bold(repo.name ?? repo.repoId)}  ${chalk.dim(
								`${repo.lineCount ?? 0} ops · tail ${(repo.tailHash ?? "").slice(0, 12)}…`,
							)}`,
						);
					}
				}
			}
		});
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function resolvePeerOrThrow(ref: string): PeerRecord {
	const peer = resolvePeer(ref);
	if (!peer) {
		throw new Error(
			`Unknown peer '${ref}'. Register it first: trellis peer add ${ref} <sprite-url>`,
		);
	}
	return peer;
}

function ensureEmptyDest(destDir: string, gitUrl?: string): void {
	if (existsSync(join(destDir, ".trellis"))) {
		throw new Error(
			`Destination already contains a Trellis repo: ${destDir}`,
		);
	}
	if (existsSync(destDir) && readDirNonEmpty(destDir) && !gitUrl) {
		throw new Error(
			`Destination directory is not empty: ${destDir}. Pass --git to clone bytes into it.`,
		);
	}
}

function renderClone(
	result: {
		repoId: string;
		tailHash: string;
		lineCount: number;
		materialized: boolean;
		owner?: string;
		name?: string;
	},
	destDir: string,
	gitUrl?: string,
	label?: string,
): void {
	const shown = label ?? `${result.owner ?? ""}/${result.name ?? result.repoId}`;
	console.log(chalk.green(`✓ Cloned ${chalk.bold(shown)}`));
	console.log(`  ${chalk.dim("Into:")}    ${destDir}`);
	console.log(`  ${chalk.dim("Tail:")}    ${result.tailHash.slice(0, 20)}…`);
	console.log(`  ${chalk.dim("Ops:")}     ${result.lineCount}`);
	const byteLabel = result.materialized
		? "git checkout"
		: gitUrl
			? "git checkout (pending open)"
			: "ops only — use --git for worktree";
	console.log(`  ${chalk.dim("Bytes:")}   ${byteLabel}`);
	if (!result.materialized && gitUrl) {
		console.log(
			chalk.yellow(
				"\n  Run `trellis open` to replay and materialize the worktree.",
			),
		);
	}
}

function displayName(peer: PeerRecord): string {
	const name = Object.entries(loadPeers()).find(([, p]) => p === peer)?.[0];
	if (name) return name;
	const short = peer.entityId.replace(/^identity:/, "");
	return peer.displayName ?? short.slice(0, 16);
}

function readDirNonEmpty(dir: string): boolean {
	try {
		return readdirSync(dir).length > 0;
	} catch {
		return false;
	}
}

function basenameOr(path: string): string {
	return path.split(/[\\/]/).filter(Boolean).pop() ?? "project";
}

function sanitizeSlug(slug: string): string {
	const cleaned = slug.trim().toLowerCase().replace(/[^a-z0-9-._]+/g, "-");
	return cleaned || "project";
}

function sanitizeKind(kind: string): string {
	const k = kind.trim().toLowerCase();
	return PROJECT_KINDS.includes(k as (typeof PROJECT_KINDS)[number])
		? k
		: "other";
}

async function prompt(question: string, fallback: string): Promise<string> {
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	try {
		const answer = (await rl.question(question)).trim();
		return answer || fallback;
	} finally {
		rl.close();
	}
}
