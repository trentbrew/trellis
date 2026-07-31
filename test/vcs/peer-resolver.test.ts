import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	addPeer,
	loadPeers,
	parseProjectRef,
	removePeer,
	resolvePeer,
	savePeers,
} from "../../src/vcs/peer-resolver.js";

describe("peer resolver (ADR 0032)", () => {
	const originalHome = process.env.HOME;
	let home: string;

	beforeEach(() => {
		home = mkdtempSync(join(tmpdir(), "peers-"));
		process.env.HOME = home;
	});

	afterEach(() => {
		vi.restoreAllMocks();
		if (originalHome === undefined) delete process.env.HOME;
		else process.env.HOME = originalHome;
	});

	it("resolves a peer by registered name", () => {
		addPeer("alice", {
			did: "did:key:zAlice",
			entityId: "identity:did:key:zAlice",
			publicKey: "pub-alice",
			spriteUrls: ["https://sprite.example/alice"],
		});
		const peer = resolvePeer("alice");
		expect(peer?.entityId).toBe("identity:did:key:zAlice");
		expect(peer?.publicKey).toBe("pub-alice");
	});

	it("resolves a peer by DID or entityId", () => {
		addPeer("alice", {
			did: "did:key:zAlice",
			entityId: "identity:did:key:zAlice",
			publicKey: "pub-alice",
			spriteUrls: [],
		});
		expect(resolvePeer("did:key:zAlice")?.displayName).toBeUndefined();
		expect(resolvePeer("did:key:zAlice")?.entityId).toBe(
			"identity:did:key:zAlice",
		);
		expect(resolvePeer("identity:did:key:zAlice")?.did).toBe(
			"did:key:zAlice",
		);
	});

	it("returns null for unknown peers", () => {
		expect(resolvePeer("nobody")).toBeNull();
	});

	it("persists peers across load/save", () => {
		addPeer("bob", {
			did: "did:key:zBob",
			entityId: "identity:did:key:zBob",
			publicKey: "pub-bob",
			spriteUrls: ["https://sprite.example/bob"],
		});
		const reloaded = loadPeers();
		expect(reloaded["bob"]?.spriteUrls).toEqual([
			"https://sprite.example/bob",
		]);
	});

	it("removePeer deletes a registration", () => {
		addPeer("carol", {
			did: "did:key:zCarol",
			entityId: "identity:did:key:zCarol",
			publicKey: "",
			spriteUrls: [],
		});
		expect(removePeer("carol")).toBe(true);
		expect(removePeer("carol")).toBe(false);
		expect(resolvePeer("carol")).toBeNull();
	});

	it("parses {peer}/{repo} project refs", () => {
		expect(parseProjectRef("alice/trellis-node")).toEqual({
			peer: "alice",
			repo: "trellis-node",
		});
	});

	it("rejects malformed project refs", () => {
		expect(() => parseProjectRef("no-slash")).toThrow(/\{peer\}\/\{repo\}/);
		expect(() => parseProjectRef("/repo")).toThrow(/\{peer\}\/\{repo\}/);
		expect(() => parseProjectRef("alice/")).toThrow(/\{peer\}\/\{repo\}/);
	});

	it("saves an empty peers file without clobbering unrelated fields", () => {
		savePeers({
			existing: {
				did: "did:key:zOld",
				entityId: "identity:did:key:zOld",
				publicKey: "",
				spriteUrls: [],
			},
		});
		addPeer("newbie", {
			did: "did:key:zNew",
			entityId: "identity:did:key:zNew",
			publicKey: "",
			spriteUrls: [],
		});
		expect(resolvePeer("existing")).not.toBeNull();
		expect(resolvePeer("newbie")).not.toBeNull();
	});
});
