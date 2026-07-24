# Issue recovery (journal rehydrate)

**Status:** Rehydrated 2026-07-21 — metadata restored from Cursor hook logs + specs.

The integration journal wipe (2026-07-21) truncated `.trellis/ops.json`. Issue **cards** were rebuilt from shell output captured in `cursor.hooks.*.log` and proposal/spec/design docs. This is **not** a full ledger restore — acceptance-criteria pass history, claims, and milestone hashes were not replayed.

## Artifacts

| File | Purpose |
| ---- | ------- |
| [`issue-recovery-catalog.json`](./issue-recovery-catalog.json) | Machine catalog (62 issues, TRL-156…218) |
| [`scripts/issue-recovery-extract.mjs`](../../scripts/issue-recovery-extract.mjs) | Re-parse hook logs → refresh catalog |
| [`scripts/issue-recovery-rehydrate.ts`](../../scripts/issue-recovery-rehydrate.ts) | Mint `issueCreate` ops with `forceIssueId` |

## Commands

```bash
# Refresh catalog from hook logs
node scripts/issue-recovery-extract.mjs

# Preview
bun scripts/issue-recovery-rehydrate.ts --dry-run

# Apply (skips TRL-219…222 by default; skips any id already on graph)
bun scripts/issue-recovery-rehydrate.ts
```

## What was preserved vs lost

| Preserved | Lost |
| --------- | ---- |
| TRL id, title, priority, labels | AC pass/fail timestamps |
| Parent links (proposal → design → spec → impl → review) | Lane claims / assignee |
| Status (approximate: queue/backlog/closed) | Descriptions (replaced with rehydrate stub) |
| Post-wipe issues TRL-219…222 untouched | Original op hashes / milestone chain |

## Source priority

1. Cursor hook `"output"` fields (`Issue created:` blocks, `issue show`, list lines)
2. Spec/design doc headers (`Proposal:` / `Design:` / parent TRL-N)
3. Manual overrides in extract script for gaps (e.g. TRL-156 pre-dated hook capture)
