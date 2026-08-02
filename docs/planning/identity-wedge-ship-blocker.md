# Ship blocker — identity wedge (2026-08-02)

**Status:** WORK NEEDED IN A SEPARATE SESSION. Do not resolve in the working
session without explicit user approval.

## What is blocked

Committing the completed identity-wedge work (Slices A–D). 25 files are staged
in `git` (`git status` → `git diff --cached`, 2310 insertions) and ready to
commit, but the **opencode lane guard plugin denies direct `git commit`** in
Trellis workspaces.

## Why the sanctioned flow cannot be used

The repo's guard (`~/.config/opencode/plugins/trellis-lanes.ts` →
`~/.cursor/hooks/trellis-lane-guard-lib.mjs`, `GIT_MUTATION_RE`) denies
`git commit` and directs to `trellis lane promote` → `trellis git sync`.

That flow does **not** capture this work:

- Session lane `lane-2e102bcd-efbb-4474-8fbd-46a02dba0886` has **0 ops in its
  journal** — the file edits were never recorded as Trellis ops (no watcher
  captured them; `.trellis/ops.json` has zero ops referencing the new files).
- `trellis lane promote` replays the lane journal → nothing to replay (it is
  also guard-`ask`, needing UI approval anyway).
- `trellis git sync` mirrors the **Trellis-recorded integration state** to git
  — the working-tree diff is not part of that state, so it would commit
  nothing (or stale state), not the 25 files.

The work exists **only as a git working-tree diff** of 25 files.

## What needs to happen

Choose one:

1. **Approve a direct `git commit` of the staged set** (recommended). In the
   session where the work lives, re-run the commit command and approve the
   opencode permission prompt. Commit message is prepared (below).
2. **Journal the edits through the lane machinery first** (slow): watch the
   worktree so the edits enter the lane journal, then promote → git sync.
   Awkward because the files are already on disk and Trellis does not know
   they changed.

## Prepared commit

```bash
git commit -m "feat(identity): device identity wedge — onboarding-first identity, person-scoped registry, sprite devices

Slices A-D of docs/planning/device-registry-and-sprite-pairing.md.
A: onboarding-first identity + person-first pairing + device-signed ops
B: person-scoped device registry (~/.trellis/devices) + copy-up migration
C: device metadata (kind/transport/sync state), daemon feed, pair list/show
D: sprite provisioning (vm create), device-revoked sync message, pair revoke --push
Docs: ADR 0035, ADR 0036, peer system spec resolver contract.
Tests: 27 new; p4/p7/sync/engine suites green (300)."
```

## Verification state (already done)

- 300 relevant tests green (p4, p7, sync, engine, peer-resolver suites).
- `pnpm check` clean for the wedge's files (10+ pre-existing errors remain in
  other lanes' files: ws-transport, admin-kanban, inspector, orchestrator,
  combobox, dag-scheduler, workflow/pipeline CLIs).
- Full `pnpm test`: 7 pre-existing failures in OTHER lanes' files
  (test/issue.test.ts ×4, test/cli/skills.test.ts ×2,
  test/core/provenance-coverage.test.ts ×1 — registry-cli mint sites,
  test/core/workflow-pipeline-primitives.test.ts ×4).

## Staged file list (all wedge-owned)

docs/adr/0035-*, docs/adr/0036-*, docs/adr/README.md,
docs/planning/device-registry-and-sprite-pairing.md,
docs/specs/peer-system-specification.md, src/identity/peer-key-resolver.ts,
src/identity/sprite-device.ts, src/identity/pairing.ts, src/identity/index.ts,
src/vcs/peer-resolver.ts, src/engine.ts, src/cli/onboarding.ts,
src/cli/index.ts, src/sync/types.ts, src/sync/sync-engine.ts,
src/sync/room-core.ts, src/sync/sync-daemon.ts, src/server/deploy.ts,
test/p4/slice-a-onboarding.test.ts, test/p4/slice-b-device-registry.test.ts,
test/p4/slice-c-device-metadata.test.ts, test/p4/slice-d-sprite-device.test.ts,
test/p4/pairing.test.ts, test/p4/ingest-authorization.test.ts,
test/p7/vcs-op-sync-prototype.test.ts

Note: `src/sync/types.ts` carries one foreign hunk (SyncTransport
connect/disconnect signature — another lane's WIP) that rides along in the
commit; flag in the PR/commit review.
