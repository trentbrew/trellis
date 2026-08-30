# WebContainer CLI sandbox

Browser Trellis CLI + live graph (StackBlitz WebContainer).

## Run

```bash
just sandbox
# or
trellis sandbox serve
# or
npm run test:wc
```

Requires `npm run build` first.

## Tests

```bash
npm run test:wc:init   # vitest — pack + host-vendored trellis init
WC_E2E=1 npm run test:wc:e2e   # Playwright — full WC boot on :4321 (slow, ~3–5 min)
```

## Architecture

| Module | Role |
|--------|------|
| `src/wc/pack.ts` | Bootstrap packer (dist + vendored node_modules + iroh stub) |
| `src/wc/host.ts` | COOP/COEP HTTP host |
| `src/wc/assets/` | `index.html` + native stubs (canonical) |
| `src/cli/sandbox-cli.ts` | `trellis sandbox serve` |
| `test/webcontainer/server.mjs` | Thin dev entry (legacy `npm run test:wc`) |

Assets live in **`src/wc/assets/`** only — copied to `dist/wc/assets/` on build.
