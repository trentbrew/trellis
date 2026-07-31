import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createIdentity, toPublicIdentity } from "../../src/identity/identity.js";
import {
	addRemote,
	cloneRemoteLedger,
	MemoryRemoteSprite,
	pushRemoteLedger,
} from "../../src/vcs/oplog-remote.js";
import {
	attestationMatches,
	createProjectAttestation,
	findAttestation,
	verifyAttestation,
} from "../../src/vcs/project.js";
import type { VcsOp } from "../../src/vcs/types.js";

function writeOps(root: string, ops: VcsOp[]): string {
	const opsPath = join(root, ".trellis", "ops.json");
	mkdirSync(join(root, ".trellis"), { recursive: true });
	const body = ops.map((o) => JSON.stringify(o)).join("\n") + "\n";
	writeFileSync(opsPath, body);
	return opsPath;
}

describe("project attestation (ADR 0032 §4)", () => {
	it("mints a signed repoAttest op that verifies against the owner's key", async () => {
		const owner = createIdentity({ displayName: "Alice" });
		const pub = toPublicIdentity(owner);

		const op = await createProjectAttestation({
			owner: owner.entityId,
			repoName: "trellis-node",
			repoId: "repo-123",
			kind: "code",
			privateKey: owner.privateKey,
			agentId: owner.entityId,
		});

		expect(op.kind).toBe("vcs:repoAttest");
		expect(op.vcs?.repoOwner).toBe(owner.entityId);
		expect(op.vcs?.repoName).toBe("trellis-node");
		expect(op.vcs?.repoId).toBe("repo-123");
		expect(op.vcs?.signedBy).toBe(owner.entityId);
		expect(op.vcs?.signature).toBeTruthy();

		const error = await verifyAttestation([op], {
			owner: owner.entityId,
			repoName: "trellis-node",
			repoId: "repo-123",
			publicKey: pub.publicKey,
		});
		expect(error).toBeNull();
	});

	it("rejects when the signature is not the owner's", async () => {
		const owner = createIdentity({ displayName: "Alice" });
		const attacker = createIdentity({ displayName: "Eve" });

		const op = await createProjectAttestation({
			owner: owner.entityId,
			repoName: "trellis-node",
			repoId: "repo-123",
			privateKey: owner.privateKey,
			agentId: owner.entityId,
		});

		const error = await verifyAttestation([op], {
			owner: owner.entityId,
			repoName: "trellis-node",
			publicKey: toPublicIdentity(attacker).publicKey,
		});
		expect(error).toMatch(/signature is missing or invalid/i);
	});

	it("rejects when the attestation names a different repo", async () => {
		const owner = createIdentity({ displayName: "Alice" });
		const pub = toPublicIdentity(owner);

		const op = await createProjectAttestation({
			owner: owner.entityId,
			repoName: "other-repo",
			repoId: "repo-456",
			privateKey: owner.privateKey,
			agentId: owner.entityId,
		});

		const error = await verifyAttestation([op], {
			owner: owner.entityId,
			repoName: "trellis-node",
			publicKey: pub.publicKey,
		});
		expect(error).toMatch(/mismatch/i);
	});

	it("rejects when no attestation op is present", async () => {
		const owner = createIdentity({ displayName: "Alice" });
		const pub = toPublicIdentity(owner);
		const op: VcsOp = {
			kind: "vcs:branchCreate",
			hash: "trellis:op:genesis",
			timestamp: "2026-07-21T00:00:00.000Z",
			agentId: owner.entityId,
		};
		const error = await verifyAttestation([op], {
			owner: owner.entityId,
			repoName: "trellis-node",
			publicKey: pub.publicKey,
		});
		expect(error).toMatch(/no repo-attestation op/i);
	});

	it("attestationMatches allows repoId-less identity-addressed checks", async () => {
		const owner = createIdentity({ displayName: "Alice" });
		const op = await createProjectAttestation({
			owner: owner.entityId,
			repoName: "trellis-node",
			repoId: "repo-123",
			privateKey: owner.privateKey,
			agentId: owner.entityId,
		});
		expect(
			attestationMatches(op, {
				owner: owner.entityId,
				repoName: "trellis-node",
			}),
		).toBe(true);
		expect(
			attestationMatches(op, {
				owner: owner.entityId,
				repoName: "other",
			}),
		).toBe(false);
	});

	it("findAttestation locates the op in a mixed chain", async () => {
		const owner = createIdentity({ displayName: "Alice" });
		const attestation = await createProjectAttestation({
			owner: owner.entityId,
			repoName: "trellis-node",
			repoId: "repo-123",
			privateKey: owner.privateKey,
			agentId: owner.entityId,
		});
		const filler: VcsOp = {
			kind: "vcs:branchCreate",
			hash: "trellis:op:fill",
			timestamp: "2026-07-21T00:00:00.000Z",
			agentId: owner.entityId,
		};
		expect(findAttestation([filler, attestation])?.hash).toBe(attestation.hash);
		expect(findAttestation([filler])).toBeNull();
	});
});

describe("identity-addressed clone (ADR 0032)", () => {
	it("clone verifies the owner attestation before accepting the chain", async () => {
		const owner = createIdentity({ displayName: "Alice" });
		const pub = toPublicIdentity(owner);
		const srcRoot = mkdtempSync(join(tmpdir(), "attest-src-"));
		const destRoot = mkdtempSync(join(tmpdir(), "attest-dest-"));
		const sprite = new MemoryRemoteSprite();
		const repoId = "repo-attest-1";

		addRemote(srcRoot, "http://sprite.test", {
			repoId,
			owner: owner.entityId,
			repo: "trellis-node",
		});

		const genesis: VcsOp = {
			kind: "vcs:branchCreate",
			hash: "trellis:op:genesis",
			timestamp: "2026-07-21T00:00:00.000Z",
			agentId: owner.entityId,
		};
		const attestation = await createProjectAttestation({
			owner: owner.entityId,
			repoName: "trellis-node",
			repoId,
			privateKey: owner.privateKey,
			agentId: owner.entityId,
			previousHash: genesis.hash,
		});
		writeOps(srcRoot, [genesis, attestation]);
		await pushRemoteLedger(srcRoot, sprite);

		const result = await cloneRemoteLedger("http://sprite.test", destRoot, {
			repoId,
			expected: {
				owner: owner.entityId,
				repoName: "trellis-node",
				publicKey: pub.publicKey,
			},
		}, sprite);

		expect(result.tailHash).toBe(attestation.hash);
		expect(result.owner).toBe(owner.entityId);
		expect(result.name).toBe("trellis-node");

		const config = JSON.parse(
			readFileSync(
				join(destRoot, ".trellis", "config.json"),
				"utf-8",
			),
		) as { project?: { owner?: string; name?: string } };
		expect(config.project?.owner).toBe(owner.entityId);
		expect(config.project?.name).toBe("trellis-node");
	});

	it("refuses to clone when the attestation signature is invalid", async () => {
		const owner = createIdentity({ displayName: "Alice" });
		const attacker = createIdentity({ displayName: "Eve" });
		const srcRoot = mkdtempSync(join(tmpdir(), "attest-src-"));
		const destRoot = mkdtempSync(join(tmpdir(), "attest-dest-"));
		const sprite = new MemoryRemoteSprite();
		const repoId = "repo-attest-2";

		addRemote(srcRoot, "http://sprite.test", { repoId });

		const attestation = await createProjectAttestation({
			owner: owner.entityId,
			repoName: "trellis-node",
			repoId,
			privateKey: attacker.privateKey,
			agentId: owner.entityId,
		});
		writeOps(srcRoot, [attestation]);
		await pushRemoteLedger(srcRoot, sprite);

		await expect(
			cloneRemoteLedger("http://sprite.test", destRoot, {
				repoId,
				expected: {
					owner: owner.entityId,
					repoName: "trellis-node",
					publicKey: toPublicIdentity(owner).publicKey,
				},
			}, sprite),
		).rejects.toThrow(/signature is missing or invalid/i);
	});

	it("refuses to clone when the ledger attests a different repo", async () => {
		const owner = createIdentity({ displayName: "Alice" });
		const pub = toPublicIdentity(owner);
		const srcRoot = mkdtempSync(join(tmpdir(), "attest-src-"));
		const destRoot = mkdtempSync(join(tmpdir(), "attest-dest-"));
		const sprite = new MemoryRemoteSprite();
		const repoId = "repo-attest-3";

		addRemote(srcRoot, "http://sprite.test", { repoId });

		const attestation = await createProjectAttestation({
			owner: owner.entityId,
			repoName: "other-repo",
			repoId,
			privateKey: owner.privateKey,
			agentId: owner.entityId,
		});
		writeOps(srcRoot, [attestation]);
		await pushRemoteLedger(srcRoot, sprite);

		await expect(
			cloneRemoteLedger("http://sprite.test", destRoot, {
				repoId,
				expected: {
					owner: owner.entityId,
					repoName: "trellis-node",
					publicKey: pub.publicKey,
				},
			}, sprite),
		).rejects.toThrow(/mismatch/i);
	});

	it("sprite indexes owner/name from push and lists them in /v0/ledger/repos", async () => {
		const owner = createIdentity({ displayName: "Alice" });
		const srcRoot = mkdtempSync(join(tmpdir(), "attest-src-"));
		const sprite = new MemoryRemoteSprite();
		const repoId = "repo-attest-4";

		addRemote(srcRoot, "http://sprite.test", {
			repoId,
			owner: owner.entityId,
			repo: "trellis-node",
		});

		const op: VcsOp = {
			kind: "vcs:branchCreate",
			hash: "trellis:op:genesis4",
			timestamp: "2026-07-21T00:00:00.000Z",
			agentId: owner.entityId,
		};
		writeOps(srcRoot, [op]);
		await pushRemoteLedger(srcRoot, sprite);

		const res = await sprite.get("http://sprite.test/v0/ledger/repos");
		const repos = JSON.parse(res.body) as Array<{
			repoId: string;
			owner?: string;
			name?: string;
		}>;
		expect(repos[0]?.repoId).toBe(repoId);
		expect(repos[0]?.owner).toBe(owner.entityId);
		expect(repos[0]?.name).toBe("trellis-node");
	});
});
