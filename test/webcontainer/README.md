# WebContainer CLI sandbox

Browser Trellis CLI + live graph (StackBlitz WebContainer).

## Run

```bash
just wc-sandbox
# or
trellis sandbox serve
# or
npm run test:wc
```

Requires `npm run build` first.

## Vercel deploy

```bash
just wc-sandbox-build                    # pack public/ locally
just wc-sandbox-deploy                   # prebuilt deploy (CLI, no Git required)
```

**CLI without Git:** `vercel` only uploads `apps/wc-sandbox/` — it cannot run `npm install` at repo root. Use `just wc-sandbox-deploy` (builds locally → `vercel deploy --prebuilt`).

**Git-connected CI:** connect the repo in Vercel, set **Root Directory** to `apps/wc-sandbox`. Remote build runs `npm install` + `npm run build` at repo root via `vercel.json`.

## Tests

```bash
npm run test:wc:init   # vitest — pack + host-vendored trellis init
WC_E2E=1 npm run test:wc:e2e   # Playwright — full WC boot on :14321 (WC_E2E_PORT; avoids :4321 dev collision)
```

**Ports:** `just wc-sandbox` / `trellis sandbox serve` default to **:4321**. Playwright e2e uses **:14321** (`WC_E2E_PORT`) so e2e can run while a dev server is on 4321.

## Architecture

| Module | Role |
|--------|------|
| `src/wc/pack.ts` | Bootstrap packer (dist + vendored node_modules + iroh stub) |
| `src/wc/host.ts` | COOP/COEP HTTP host |
| `src/wc/assets/` | `index.html` + native stubs (canonical) |
| `src/cli/sandbox-cli.ts` | `trellis sandbox serve` + `pack` |
| `apps/wc-sandbox/` | Static Vercel bundle (`just wc-sandbox-build` / `deploy`) |
| `test/webcontainer/server.mjs` | Thin dev entry (legacy `npm run test:wc`) |

Assets live in **`src/wc/assets/`** only — copied to `dist/wc/assets/` on build.
