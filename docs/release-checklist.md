# Release checklist (trellis kernel)

Run before every npm publish. Downstream sync uses
`docs/kernel-touch-manifest.json`.

## Kernel

- [ ] `CHANGELOG.md` + `package.json` version match
- [ ] `npm run test:ship` for release gate (or `npm test` with `--full-test`)
- [ ] `node scripts/trellis-coordination-smoke.mjs`
- [ ] `node scripts/ship-check.mjs` (manifest pins + smoke)
- [ ] `npm run build`

## Downstream (manifest consumers)

- [ ] `node scripts/sync-downstream.mjs` — copy skills, verify pins
- [ ] **create-trellis** — publish `0.2.0` after kernel npm tag
- [ ] **trellis-docs** — deploy www (changelog + agent-coordination guide)
- [ ] **turtlecode** — `bun script/sync-trellis-core.ts --pack` + smoke tests

## Publish

- [ ] `just ship` (dry-run) → `just ship --verify` (gates) → `just ship-release`
- [ ] Or stepwise: `just ship-check` → `npm run test:ship` → `npm run build` →
      `just sync-downstream`
- [ ] `npm publish` (from trellis-node, after tests + build) — included in
      `just ship-release`
- [ ] Verify `npx trellis@latest --version` shows new version

### Ship report

Every `just ship*` run writes a JSON report to `rug/ship-report-*.json` and
prints a step summary at the end (pass/fail, duration, error tail). Use this
instead of pasting full logs when debugging.

Flags: `--skip-publish`, `--skip-commit`, `--kernel-only`, `--full-test` (pass
through: `just ship --verify --full-test`).

## Post-publish

- [ ] Bump turtlecode opencode trellis dep to `^3.2.5` if using npm mode
- [ ] Refresh desk `release.json` if present
