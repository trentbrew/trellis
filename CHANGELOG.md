# Changelog

Notable changes by release date and version. See
[trellis.computer/changelog](https://trellis.computer/changelog) for the public
site copy.

## trellis [4.0.0] — 2026-08-04

**Git is now the sole authority over file bytes. The op-log can no longer write
file state. (ADR 0038)**

The structural bug that caused the `9801056`-class silent revert — `git sync`
materializing stale op-log bytes over newer disk content — is fixed by removing
the second authority entirely, not by adding another guard. Two systems
claiming authority over the same bytes is unsound; someone always forgets to
guard one of the paths. ADR 0038 makes git the only writer of bytes and the
op-log a pure provenance layer that is *incapable* of clobbering disk.

- **`syncIntegrationToGit` commits the working tree as-is** (ADR 0038). No more
  `buildFileStateAtOp` / `materializeToDisk` reconstruction from op-log blobs —
  it checks out `-B`, `add -A`, and commits the actual bytes on disk. `git sync`
  can never overwrite a newer file with stale op-log state.
- **Non-materializing `vcs:gitSync` annotations.** Each sync records
  `vcs:gitSync { gitCommitHash, gitBranch }` on the causal stream. The op-log
  holds provenance (who/what/why, milestones, decisions, lane lifecycle) — never
  byte state. `journalWorkingTreeToOps` is diagnostic-only; sync no longer calls
  it.
- **Promote delivers bytes via git, not replay.** `promoteLane` now runs a git
  branch merge (lane branch → integration) as the byte delivery, then rechains
  annotation ops onto integration. `mergeLaneWorktree` returns
  `merged | up-to-date | failed`; a real conflict aborts before replay.
- **Lane worktrees are git checkouts, not op-log materials.** Entering a lane
  auto-commits the agent's working bytes (`commitWorktree`) onto the lane
  branch; re-entry sees the lane's files from git. `lanes.worktreeBind` gives
  true per-agent isolation — one agent's `revert`/`reset` physically cannot
  touch another's files.

### Breaking changes

- `GitSyncResult.refused` and `reason` are removed — sync never refuses and
  there is no journal catch-up to race. The CLI "refused" branches in `git sync`
  and milestone auto-commit are gone.
- `syncIntegrationToGit` no longer takes `blobResolver`, `integrationOps`, or
  `headOpHash`. `resolveIntegrationHead` was removed from the `git-sync` module.
- `trellis git sync` does **not** journal previously-unjournaled edits — disk
  edits to tracked files now flow through git commits, not file-materializing
  ops.

### Fixes

- **`trellis lane list -p <dir>` resolved from cwd instead of the target.** The
  child `-p` default of `.` shadowed the parent command's `-p`, so `lane list`
  walked up from the shell cwd and reported an empty/mismatched lane set. The
  list action now resolves paths the same way as every other `lane` subcommand.
- workflow-pipeline-primitives test mock brought in line with the real
  `EAVStore` API (`addFacts`/`getLinksByEntity`), and the mock pool emits
  `task:completed` so DAG runs terminate.

## trellis [3.4.0] — 2026-07-24

**Lane ops were unverifiable; criterion removal (TRL-1, TRL-102).**

- **Every op minted inside a lane failed hash verification — fixed (TRL-102).**
  `createVcsOp` hashes `{kind, timestamp, agentId, previousHash, vcs}`, and
  `stampLaneId` then mutated `op.vcs` — *after* the hash was computed. Measured
  on this repo: **1334 of 1334 ops across 27 lane journals failed
  `verifyVcsOpHash`; 1334 of 1334 verified once `vcs.laneId` was removed.** Both
  ingest paths reject on `hash-mismatch`, so lane ops could never have been
  exchanged with a peer — this gated peer sync of agent lanes and any Iroh
  transport work.
- **Lane is now envelope, not identity.** `VcsOp.laneId` is a top-level field,
  outside the preimage by construction. The same semantic op in two lanes now
  hashes identically — required for cross-peer dedup and for cherry-pick not to
  rewrite op identity, both of which set-reconciliation depends on.
- **`vcs.laneId` is retained where it is *subject* data.** `vcs:laneCreate`,
  `vcs:laneDrop` and `vcs:testRun` are *about* a lane, pass `laneId` at mint, and
  keep it hashed — excluding it would collapse `laneCreate lane-A` and
  `laneCreate lane-B` to one identity. Promote paths carry the source lane as
  envelope provenance instead of baking it into a promoted op's hash.
- **Existing journals migrated in place, no hash rewritten.** The stored hashes
  were already correct for lane-free payloads, so migration only relocated the
  field: 0/1334 → **1334/1334 verifying**. Verify-guided — an op was rewritten
  only if it failed verification *and* stripping `laneId` made it pass.
  Integration's 47 subject-role ops were untouched.
- **`VcsOp` envelope vs payload is now explicit.** `vcs` is payload (hashed);
  top-level fields are envelope (not hashed). `facts`/`links` were already used
  this way — `RemoteManager` tags pulled ops with `{e:'op', a:'remote'}` so
  `trellis log --remote` can filter them *without* invalidating the remote's
  hash. Documented rather than discovered.
- **Criterion removal (TRL-1):** `trellis issue ac-rm <id> <index>` and
  `vcs:criterionRemove`. Removal is a **tombstone, not an erasure** — ids are
  minted as `ac-${count+1}`, so deleting the entity would let a later add mint
  the id of a *surviving* criterion (remove ac-2 of 3, next add collides with
  ac-3 and merges into it). Retracted criteria keep their id and are filtered
  from projections.
- **Promote gate now typechecks.** `promote.require` was `["smoke"]` — a single
  VCS test file that cannot see a type break. An agent widened an exported
  interface and the gate waved it through. Added a `check` suite (`npm run
  check`, ~3s); `promote.require` is now `["smoke", "check"]`.
- **`.gitignore`: `.trellis/tests.json` was never actually tracked.** Git cannot
  re-include a file whose parent directory is excluded, so `.trellis/` +
  `!.trellis/tests.json` silently ignored the manifest — the file defining the
  promote gate was unversioned. Now `/.trellis/*` + negation, plus
  `*/**/.trellis/` for stray repos created by running the CLI in a subdirectory
  (which root-anchoring would otherwise have un-ignored).

**Breaking**

- `VcsOp.vcs.laneId` is no longer set on stamped ops; read `VcsOp.laneId`
  instead. Subject ops (`laneCreate`/`laneDrop`/`testRun`) are unchanged.
- New op kind `vcs:criterionRemove`; older readers will not project it.

**Migration:** lane journals in existing repos still carry `vcs.laneId` and will
fail verification until relocated. No hashes change — the stored hash is already
the lane-free one.

**Also in 3.4.0 (kernel / VCS / TML)**

- **Lane promote reliability:** snapshot-head invariant fixes perpetual
  "Integration head moved during promote" on issue-branch closes; coordination
  hard-conflict skip v0.1 for sibling lanes (TRL-301–302, TRL-297–298).
- **Promote == milestone + git:** `trellis milestone --commit` auto-commits on
  integration; promote boundary locked to issue close; cross-agent file ownership
  and lane coherence signals (TRL-117).
- **`trellis lane split`:** open a domain lane without requiring an issue.
- **`trellis doctor`:** probes mutation safety before contested writes.
- **Op log safety:** append-only JSONL mirror; destructive guards; remote sprite
  backup specs (ADR follow-through).
- **TML runtime:** attribute projection on `/tml-lanes`; PeerDriver materializes
  ops and queries with real TQL; Phase 4 vantage shell resolution; slimmer live
  bundles (decompose browser-safe ~5.7 KB).
- **Theme contract Phase C:** fractal vantage + shell morph; unified
  `runtime-theme.css` scrubber hardening (TRL-167/281).
- **Promote gate:** whole-suite check includes query-stress harness; 12 formerly
  skipped CLI tests un-gated and passing.
- **ADR 0022 / 0026:** grants as ops; defaultVisibility floor; issueType as
  field not title prefix.

**In development (not in this release's npm story)**

- **`trellis admin` operator console** — substantial work on `main` (TML
  projections, lane datatable, chrome polish). UI modules are **not yet
  prebundled for global `npm install`**; use a repo checkout for admin. Not
  headline in 3.4.0 — kernel/VCS/TML CLI improvements are the ship focus.

## trellis [3.3.0] — 2026-07-14

**Canonical op hashing + op provenance (ADR 0021).** Op hashes are now
verifiable content addresses, and every op records who asserted it.

- **Op hashes were not recomputable — fixed.** The kernel hashed the *caller's*
  payload object while each backend independently reconstructed a
  differently-shaped one to store (`links: []` injected, key order drifting). No
  op in any existing log could be re-derived from storage. `hash` was a
  unique-ish identifier, not a content address. Undetected because nothing ever
  re-verified a kernel op.
- **One serializer:** `core/persist/canonical-op.ts`. Mint (`hashKernelOp`) and
  persist (every backend's `append()`) now go through the same canonicalization;
  the bytes in the `payload` column *are* the hashed bytes.
- **`verifyOpHash(op)`** — new, and did not exist before. Returns
  `{ valid, legacy }`.
- **Preimage is JSON, not `|`-joined.** Closes an injection where
  `agentId="a|b", previousHash="c"` and `agentId="a", previousHash="b|c"`
  produced identical preimages.
- **Op provenance (`actorType` + `origin`, SemType-aligned)** on every op,
  inside the hash — provenance that can be altered without invalidating the hash
  is decoration, not provenance. Resolved per-call
  (`payload ?? ctx ?? kernel default`), because one `TenantPool` kernel serves
  both HTTP and MCP. Wired at every mint site: HTTP, MCP, cron, sync, import,
  agent harness, and the agent plugins.
- **Value-level provenance:** `Fact.meta` (`confidence`, `dataTypeId`,
  `sources`). Rides inside `facts[]`, so it is hash-covered for free.
- **CLI graph writes are `VcsOp`s, not `KernelOp`s** — so kernel provenance
  never covered them. Provenance now rides `VcsPayload` instead, hash-covered
  via `hashVcsOp` with **no preimage change and no migration**. Set per engine
  construction (CLI/MCP/UI/sync/migration/SDK). Covers `vcs:store*` ops; branch,
  file and milestone ops are not yet covered.
- **`VcsMiddleware` deleted.** Never constructed, and written against a contract
  that never existed — `handleOp` is documented as *"can throw to block the
  operation"*, an observe-or-throw chain, so its decomposed ops were silently
  discarded. `engine.ts` already does the same decomposition inline, which is
  the path that actually runs. `DESIGN.md`'s
  `kernel.mutate → VcsMiddleware → decompose` sequence documented a flow that
  was never built and has been corrected.

**Breaking**

- `kernel.mutate(kind, payload)`: `payload.meta` removed (no caller used it),
  `payload.provenance` added.
- `VcsMiddleware` no longer exported from `trellis/vcs`.
- Newly minted kernel ops use preimage v2 and hash differently from v1. **v1 ops
  are grandfathered** — reported `{ valid: true, legacy: true }`, never
  reverified, because their preimages are unrecoverable by construction. Every
  log keeps a permanent unverifiable v1 prefix; this is the bug, not the fix.
- `KernelOp` gains `v` and `provenance`; `Fact` gains optional `meta`.

**Migration:** none required. Existing kernel logs boot and replay unchanged;
existing `ops.json` journals verify unchanged.

## trellis [3.2.6] — 2026-07-11

- **QR pairing (ADR 0020 Phase 1 start):** `trellis pair start|join|approve`
  renders a compact Unicode QR in the terminal (TTY default; `--no-qr` /
  `--qr`). Same OOB payloads as Phase 0 — `renderPairingQr` / `encodePairingQr`
  via `uqr`.
- **Sprite relay blobs (ADR 0016):** `startServer({ presenceRelay })` accepts
  full `RealtimeRelayOptions` (including `blobStore`). Sprite deploy entrypoints
  mount
  `presenceRelay: { path: '/rt', blobStore: () => new BlobStore('/home/sprite/trellis-db') }`
  so `/blob` is available on `*.sprites.app` alongside `/rt`.
- **`BlobStore` export:** re-exported from `trellis/server` for deploy
  entrypoints and embedders.
- **Redeploy required:** existing sprites still running a pre-3.2.6 bundle only
  have `/rt`. Re-run `trellis deploy --name <sprite>` (or the app's
  `smoke:deploy`) after publishing this kernel, then point clients at
  `VITE_RELAY_URL=wss://<sprite>.sprites.app/rt` (HTTP `/blob` shares that
  origin).

## trellis [3.2.5] — 2026-07-11

- **Agent coordination (Phase 2):** session-scoped lanes via
  `trellis lane ensure --session <id>`; issue claim lock (`vcs:issueClaim`);
  repo-wide promote mutex (`.trellis/locks/promote.lock`);
  `trellis lane lock-status`, `promote --force-lock`.
- **Git adapter:** `trellis git sync [--push]` mirrors integration → `main` with
  op-log-derived commit messages; auto-sync on `lane promote` when
  `git.syncOnPromote` (default on init).
- **Issue close:** auto-promotes unpromoted lane ops by default (`--no-promote`
  to skip); optional `--push` after close.
- **Init defaults:** every `trellis init` writes `lanes.worktreeBind: true` and
  `git.syncOnPromote: true` in `.trellis/config.json` (no longer gated on `.git`
  existing).
- **Lane watch dashboard:** `trellis lane watch` — SSE live view at `:3939`
  (lanes, claims, promote lock, in-progress issues).
- **Test manifest:** `.trellis/tests.json` seeded on init; `trellis test`,
  `lane promote --require-test`, suite-aware `issue check`.
- **Coordination smoke:** `scripts/trellis-coordination-smoke.mjs` validates
  global Cursor hooks + kernel defaults.
- **Touch manifest:** `docs/kernel-touch-manifest.json` +
  `scripts/sync-downstream.mjs` for create-trellis / docs / turtlecode sync.

## trellis [3.2.4] — 2026-07-08

- Workspace-only coordination wedge (session lanes, git sync, claims) — ship as
  **3.2.5** on npm if 3.2.4 was not published.

## trellis [3.2.3] — 2026-06-29

- **Agent handoff protocol (TRL-41 / ADR 0015):** `trellis protocol send`
  records trellis-handoffs YAML envelopes as child issues (`label: message` |
  `label: decision`); `trellis whereami` (+ `checkpoint`) for WAITING / ACTIVE /
  MOVED re-entry.
- **`src/protocol/`:** envelope parse/validate, `isWaitingOnHuman`, lane-aware
  active context.
- **Desk harness:** `templates/trellis-harness/trellis-cli.sh` —
  `trellis_harness_lane_worktree` / `trellis_harness_edit_root` for session
  hooks when `lanes.worktreeBind` is on.
- **Agent lane worktree bind (W5 / TRL-40):** optional `lanes.worktreeBind` in
  `.trellis/config.json` provisions a per-lane git worktree at
  `.trellis/worktrees/<shortId>/` on `lane create` / `issue start`.
- **`enterLane` materialize:** lane file blobs replay to the bound worktree;
  file watcher rebinds to the worktree root.
- **`dropLane` cleanup:** removes the git worktree when `worktreePath` was
  provisioned.
- **ADR 0014:** git materialization + lane worktrees spec
  (`docs/adr/0014-git-materialization-and-lane-worktrees.md`).

## trellis [3.2.2] — 2026-06-10

- **`trellis db serve` on Node:** preloads the default tenant with sql.js /
  better-sqlite3 before accepting traffic — fixes `create-trellis` scaffolds and
  any `npx trellis db serve` flow that hit
  `SqliteKernelBackend requires the Bun runtime`.
- **`TenantPool.get()` on Node:** fails fast with a preload hint instead of
  attempting `bun:sqlite`.
- **`TRELLIS_BACKEND`:** `sqljs` or `better-sqlite` env override for `db serve`
  and custom hosts (`resolvePoolBackendFromEnv`).
- **Gitignore:** `.trellis-db/`, `.trellis-db.json`, `.trellis-deploy/` at repo
  root.

## trellis [3.2.0] — 2026-06-08

- **Typed realtime SDK:** `trellis/schema` — `defineType`, `entityQuery`,
  `WhereFilter` operators, nested `InferResolvedType`, server
  `hydrateAndResolve` on subscription push.
- **Live client:** `liveEntities` / `liveEntity` in `trellis/client` with
  id-scoped subscriptions (`entityQuery`) instead of full-type scans.
- **Framework hooks:** `trellis/svelte/typed`, `trellis/vue/typed`,
  `trellis/react/typed` — typed `useEntities` / `useEntity` adapters.
- **Studio plugin exports:** `trellis/plugins/plan-approval`,
  `proactive-watcher`, `idea-garden`, `agent-memory` ship in `dist/` for npm
  consumers (Trellis Studio / opencode).
- **Ontology:** idempotent `registerType` — duplicate schema registration
  returns quietly (409 swallowed client-side).
- **Realtime:** explorer graph-nav + collections demos; collab presence session
  lifecycle hardening.

## trellis [3.1.32] — 2026-05-29

- **Agent Lanes (W1–W4):** `trellis lane` — isolated per-agent op journals under
  `.trellis/lanes/`, `create` / `enter` / `leave` / `status` / `diff` /
  `promote` / `drop`.
- **`trellis lane promote`:** replay lane ops onto integration with `--dry-run`,
  `--explain`, and hard/soft/file conflict detection.
- **`trellis issue start`:** auto-creates and enters a lane (opt out with
  `--no-lane`).
- **`TRELLIS_LANE_ID`:** subprocess agents auto-enter the lane via
  `syncEnvLaneFromEnv()`.
- **Lazy replay (W4):** integration materialization cache; `leaveLane` restores
  integration view without full journal replay.
- **`getBranchHeadOpHash`:** latest `headOpHash` fact wins (fixes stale head
  during promote).
- **Op log lock:** configurable timeout via `TRELLIS_OPLOG_LOCK_MS`.

## trellis [3.1.14] — 2026-05-22

- CLI `trellis --version` now reports the real package version from
  `package.json` (was hardcoded `0.1.0`).
- CLI `-p` / cwd resolution walks up to the nearest `.trellis` repo root
  (monorepo subfolders work without passing the root path).
- Clearer "not a repository" errors: show looked-from path, cwd, and `-p` hint.
- `issue create` accepts `--description` as an alias for `--desc`.
- `bin/trellis.mjs` launcher finds Homebrew Bun when Node's `PATH` is minimal
  (`npx trellis` / agent shells).

## trellis [3.1.2] — 2026-05-12

- Fixed `trellis/cms` collection reads for inferred collections whose normalized
  key differs from the stored entity type casing, such as `blogpost` reading
  `BlogPost` entities.
- Added graph-link awareness to CMS entries so reference links such as
  `post --author--> author` appear in `fields` and can be expanded.
- Added `status` fact fallback when `cms_status` is absent, preserving content
  created by agents or lower-level store tools.
- Added shared polling for CMS subscriptions so duplicate subscribers to the
  same collection or entry reuse one poll stream.
- Added `onError` and custom `equals` subscription options.
- Fixed CMS entity pagination to respect the opencode store route's 1000-entity
  page limit.
- Added CMS client/scaffold tests and included them in the default test script.
- Added `directory` support to CMS consumer scaffolds for multi-instance
  opencode routing.

## trellis [3.1.1] — 2026-05-12

- Published the first `trellis/cms` SDK package update after adding scaffold
  helpers.

## trellis [3.1.0] — 2026-05-12

- Added the `trellis/cms` subpath with `createCmsClient`, collection reads,
  entry reads, polling subscriptions, reference expansion, collection discovery,
  and consumer scaffold helpers for vanilla, React, Solid, and Vue.
