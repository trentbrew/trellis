# CLI consumer audit — footgun scan (2026-07-21)

After the array-era global `trellis repair` wipe, scan repos that invoke the
CLI directly (not via in-process `TrellisVcsEngine`).

## Summary

| Consumer | CLI path | Oplog wipe risk | Skew risk | Notes |
| -------- | -------- | --------------- | --------- | ----- |
| **trellis-node** desk `tooling/trellis.ts` | Prefers `trellis-node/src/cli` | Low (guards + source CLI) | Low | Always `-p` when `-r` alias used |
| **turtlecode/ide** opencode | Mixed: engine + bare `trellis` | Medium if global stale | **Medium** | See below |
| **turtlecode/game/playlab** | Same fork as ide | Medium | Medium | Duplicate of ide patterns |
| **Cursor hooks** | Shell guard | Blocked for agents | Blocked in trellis checkout | Does not cover ide cwd |
| **Global npm `trellis`** | PATH | Was **critical** | Was **critical** | Now npm-linked to 3.4.0 |

## turtlecode/ide (`packages/opencode`)

**Primary path (safe):** `TrellisVcsEngine` imported from
`node_modules/trellis` — currently `file:../../../../../TRELLIS/trellis-node`.
All issue/branch/lane mutations go through the bundled engine.

**Footgun A — bare global CLI (read paths):** ~~fixed 2026-07-21~~ — `trellisCliArgs()`
resolves `node_modules/trellis` CLI before PATH fallback.

```typescript
await Process.run(trellisCliArgs(["issue", "check", id, "--path", d]))
```

**Footgun B — skew guard blind spot:** ~~fixed 2026-07-21~~ — hook denies bare
`trellis … -p <repo>` when target has `.trellis/config.json` or is a trellis
package checkout (regardless of cwd).

**Footgun C — separate graph (not a bug):**

ide repo has its own `.trellis` (~62k ops). `-p` must point at the intended
repo. Studio/opencode uses `Instance.directory` — usually correct.

**Safe paths:**

- `script/sync-trellis-core.ts` — probes via `bun node_modules/trellis/dist/cli/index.js`
- HTTP routes — `Trellis.deleteBranch()` etc. use engine, not shell

## playlab

Same `Process.run(["trellis", …])` fallbacks in
`packages/opencode/src/trellis/index.ts` (fork). Same recommendations.

## Desk orchestration

`Projects/TRELLIS/tooling/trellis.ts`:

- Prefers `trellis-node/src/cli/index.ts` over global
- Injects `-p <canonical>` for `-r` aliases
- Does not auto-add `--confirm-destructive` (human/agent must pass explicitly)

## Agent hook coverage (post 2026-07-21)

Blocked without `--confirm-destructive`:

- `trellis repair`
- `trellis branch -d` / `--delete`
- `trellis lane drop`
- `just trellis …` / `src/cli/index.ts …` equivalents

**Not yet blocked:**

- IDE HTTP API calling `engine.deleteBranch` / `dropLane` (in-process — intentional for product)

## Operational checklist

1. Keep `npm link` global → trellis-node checkout (`just link-cli`).
2. After kernel changes, run `bun script/sync-trellis-core.ts` in ide.
3. Never run bare `trellis repair` on JSONL journals without `--confirm-destructive`.
4. Prefer `just trellis -r trellis-node …` from desk over bare `trellis`.
