import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	addRemote,
	cloneRemoteLedger,
	listRemoteRepos,
	MemoryRemoteSprite,
	pushRemoteLedger,
	readJournalMeta,
} from "../../src/vcs/oplog-remote.js";
import type { VcsOp } from "../../src/vcs/types.js";

function sampleOp(hashSuffix: string): VcsOp {
	return {
		kind: "vcs:test",
		hash: `trellis:op:${hashSuffix.padEnd(64, "c")}`,
		timestamp: "2026-07-21T00:00:00.000Z",
		agentId: "agent:test",
	};
}

function writeOps(root: string, ops: VcsOp[]): string {
	const opsPath = join(root, ".trellis", "ops.json");
	mkdirSync(join(root, ".trellis"), { recursive: true });
	const body = ops.map((o) => JSON.stringify(o)).join("\n") + "\n";
	writeFileSync(opsPath, body);
	return opsPath;
}

describe("trellis clone (ADR 0031)", () => {
	let srcRoot: string;
	let destRoot: string;
	let sprite: MemoryRemoteSprite;
	const repoId = "repo-source";

	beforeEach(() => {
		srcRoot = mkdtempSync(join(tmpdir(), "clone-src-"));
		destRoot = mkdtempSync(join(tmpdir(), "clone-dest-"));
		sprite = new MemoryRemoteSprite();
		addRemote(srcRoot, "http://sprite.test", { repoId });
	});

	afterEach(() => {
		delete process.env.TRELLIS_REMOTE_KEY;
	});

	it("lists repos hosted by a sprite", async () => {
		const op = sampleOp("1");
		writeOps(srcRoot, [op]);
		await pushRemoteLedger(srcRoot, sprite);

		const repos = await listRemoteRepos(
			{ url: "http://sprite.test", repoId: "" },
			sprite,
		);
		expect(repos.length).toBe(1);
		expect(repos[0]!.repoId).toBe(repoId);
		expect(repos[0]!.tailHash).toBe(op.hash);
		expect(repos[0]!.lineCount).toBe(1);
	});

	it("clones a single-ledger sprite into a fresh dir with identical tail", async () => {
		const op = sampleOp("2");
		writeOps(srcRoot, [op]);
		await pushRemoteLedger(srcRoot, sprite);

		const result = await cloneRemoteLedger(
			"http://sprite.test",
			destRoot,
			{ repoId },
			sprite,
		);
		expect(result.repoId).toBe(repoId);
		expect(result.tailHash).toBe(op.hash);
		expect(result.lineCount).toBe(1);

		const meta = readJournalMeta(join(destRoot, ".trellis", "ops.json"));
		expect(meta?.tailHash).toBe(op.hash);

		const config = JSON.parse(
			readFileSync(join(destRoot, ".trellis", "config.json"), "utf-8"),
		) as {
			repoId?: string;
			remote?: { default?: { url?: string; repoId?: string } };
		};
		expect(config.repoId).toBe(repoId);
		expect(config.remote?.default?.url).toBe("http://sprite.test");
		expect(config.remote?.default?.repoId).toBe(repoId);
	});

	it("discovers repoId when remote hosts exactly one ledger", async () => {
		const op = sampleOp("3");
		writeOps(srcRoot, [op]);
		await pushRemoteLedger(srcRoot, sprite);

		const result = await cloneRemoteLedger(
			"http://sprite.test",
			destRoot,
			{},
			sprite,
		);
		expect(result.repoId).toBe(repoId);
		expect(result.tailHash).toBe(op.hash);
	});

	it("errors when repoId is ambiguous (multiple ledgers)", async () => {
		const op1 = sampleOp("4");
		const op2 = sampleOp("5");
		writeOps(srcRoot, [op1]);
		await pushRemoteLedger(srcRoot, sprite);

		// Seed a second repo directly (no path-derived repoId involved).
		sprite.seedRemote(
			"repo-other",
			{ format: "jsonl", tailHash: op2.hash, byteLength: 10, lineCount: 1 },
			JSON.stringify(op2) + "\n",
		);

		await expect(
			cloneRemoteLedger("http://sprite.test", destRoot, {}, sprite),
		).rejects.toThrow(/--repo/);
	});

	it("pulled clone can push back to the same ledger (no divergence)", async () => {
		const op = sampleOp("6");
		writeOps(srcRoot, [op]);
		await pushRemoteLedger(srcRoot, sprite);

		await cloneRemoteLedger("http://sprite.test", destRoot, { repoId }, sprite);

		const pushed = await pushRemoteLedger(destRoot, sprite);
		expect(pushed.pushed).toBe(false);
		expect(pushed.tailHash).toBe(op.hash);

		const status = await sprite.get(
			`http://sprite.test/v0/ledger/tail?repoId=${repoId}`,
		);
		const tip = JSON.parse(status.body) as { tailHash: string };
		expect(tip.tailHash).toBe(op.hash);
	});

	it("clone fails cleanly when remote hosts no ledgers", async () => {
		await expect(
			cloneRemoteLedger("http://sprite.test", destRoot, {}, sprite),
		).rejects.toThrow(/no ledgers/i);
	});

	it("ops-only clone writes chain + config but no worktree", async () => {
		const op = sampleOp("7");
		writeOps(srcRoot, [op]);
		await pushRemoteLedger(srcRoot, sprite);

		const result = await cloneRemoteLedger(
			"http://sprite.test",
			destRoot,
			{ repoId, opsOnly: true },
			sprite,
		);
		expect(result.materialized).toBe(false);
		expect(readdirSync(destRoot)).toEqual([".trellis"]);
	});
});
