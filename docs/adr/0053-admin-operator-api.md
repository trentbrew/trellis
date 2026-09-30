# ADR 0053: `trellis admin` as a local operator API

> **Terminology:** **Operator API** = the HTTP surface `trellis admin` serves
> (`src/ui/lanes-dashboard.ts`): projections of the repo's VCS state plus a small
> set of writes. **Client** = any UI or agent that talks to it — the bundled
> `admin.html`, the turtleOS admin app (`os/admin`), or a script. **Issue truth**
> = the repo's op-log; **UI state** = saved views, record pages, tags.

**Status:** Proposed (P0 implemented 2026-09-29)
**Date:** 2026-09-29
**Issues:** TRL-219 (admin write surface, agents roster, pipeline canvas)
**Depends on:** [0050](./0050-notes-and-derived-operator-surface.md) (derived
operator surface), [0052](./0052-agent-liveness-census.md) (agent liveness census)
**Related:** [0040](./0040-lane-boundary-oss-and-hosted-platform.md) (OSS engine vs
hosted platform), [0024](./0024-ambient-agent-presence.md) (presence)
**Supersedes:** nothing
**Impacted components:** `src/ui/lanes-dashboard.ts`, `src/ui/issue-mutations.ts`,
`src/ui/lanes-snapshot.ts`, `src/server/node-adapter.ts`, `src/cli/` (`admin`)

## Context

1. **A separate client now exists.** turtleOS's admin app (`os/admin`, SvelteKit on
   the `@turtle.tech` app platform) renders issues from `trellis admin` over HTTP.
   Issues, lanes, milestones, ops and agents pages are planned. Until now the only
   client was the bundled `admin.html`, so the HTTP surface was an implementation
   detail; with a second client it is a contract, and it lives in the open engine
   (ADR 0040: turtleOS builds on the engine, never the reverse).
2. **The surface grew by accretion.** `/api/lanes` (snapshot), `/api/lanes/stream`
   (SSE), `/api/lanes/:id/ops`, `/api/causal-graph`, and `POST /api/tml-mutations`
   with `promote` and `updateLaneMeta`. 2026-09-29 added `GET /api/issues`,
   `GET /api/issues/:id`, and issue actions on `tml-mutations`.
3. **It is exposed wider than anyone intended.** `startNodeServer` is called with
   no hostname, so `listen(port, undefined)` binds every interface (`*:3939`).
   There is no auth and CORS is `*`. Anyone on the same network, and any web page
   the operator has open, can call `promote` (git work) and the issue writes.
   Trent works from shared networks, so this is a live exposure, not a theoretical one.
4. **The engine has one unguarded path.** `engine.updateIssue({ status: 'closed' })`
   records a close without running `closeIssue`'s criteria, lane promote, or worktree
   cleanup. The CLI never calls it that way, but an HTTP pass-through would.
5. **Which build is serving is invisible.** A client's `node_modules/.bin/trellis`
   (npm) shadows the operator's local checkout, and the only symptom is a 404 on
   routes the npm build doesn't have yet.

## Decision

### 1. Local by default: loopback bind, Host check, origin allowlist, JSON only

Enforced in `src/ui/local-access.ts`, shared by `trellis admin` and `trellis lane watch`:

- **Bind.** `127.0.0.1` unless `--host <addr>` is passed. A non-loopback bind prints
  a warning that the API is unauthenticated.
- **Host header.** While loopback-bound, requests whose `Host` isn't a loopback name
  get 403. This closes DNS rebinding, where a hostile page becomes same-origin with
  the admin; browsers send no `Origin` on same-origin GETs, so an origin check alone
  would miss it.
- **CORS.** Reflected, never `*`, for loopback origins (`localhost`, `127.0.0.1`,
  `[::1]`, any port) plus each `--allow-origin` (repeatable); `Vary: Origin` always.
- **Writes.** Refused with 403 when `Origin` is present and not allowed. Withholding
  CORS headers only hides the response, and the server would still run a "simple"
  cross-site POST. Writes also require `Content-Type: application/json` (415
  otherwise), so a legitimate cross-origin write always preflights.

### 2. Reads are projections, never a store

Clients read derived projections: the snapshot, `/api/issues`, `/api/issues/:id`,
`/api/causal-graph`, and paged ops (d5). The SSE stream emits `snapshot` only when
new ops land (idle means silence), and clients refetch on it. No client mirrors
issues into its own store (d6).

### 3. Writes over HTTP are the planning subset

Allowed: `issueCreate`, `issueUpdate`, `issueTriage`, `issueReopen`, `issueAssign`,
`issueBlock`, `issueUnblock`, `updateLaneMeta`. Each goes through the same engine
verb the CLI calls, so CLI guards apply unchanged.

**CLI-only:** `issue start` (creates lanes and branches), `issue close` (runs
criteria commands, removes worktrees, may push), and `promote`. `promote` is a
current HTTP action and **moves to CLI-only** (see Open questions): it does git work,
which is the same class as close.

### 4. Status transitions: only `backlog` and `queue` are settable

`issueUpdate` accepts `status` only as `backlog` or `queue`. `in_progress`,
`paused` and `closed` are lifecycle verbs with side effects and are refused with an
error naming the CLI command. The guard lives in `src/ui/issue-mutations.ts` today.
It **moves into `engine.updateIssue`** so that no caller, HTTP or otherwise, can
record a close without `closeIssue`.

### 5. Ops are paged newest-first

`GET /api/ops?before=<hash>&limit=<n>` (default 100, max 500), newest first, across
the integration log. Per-lane ops stay at `/api/lanes/:id/ops`. Clients render a
virtualized feed; they never load the whole log.

### 6. Two data planes

Issue truth stays in the op-log, behind this API. UI state (views, pages, tags)
belongs to the client (`os/admin` uses its own `trellis db serve`). The client
registers no issue schema, so issue data cannot land in the UI db.

### 7. The snapshot carries `stats`, including the serving build

```ts
stats: {
  opCount: number;
  headHash?: string;
  entityCount: number;            // distinct subjects in the store
  version: string;                // package.json version
  source: 'checkout' | 'package'; // running from a git checkout vs an installed package
}
```

Clients show these in a status bar. `source`/`version` make "which trellis is this?"
visible, fixing Context §5 in one glance instead of a 404 hunt.

### 8. Agents come from the ADR 0052 census, not the client

The agents page reads the census generator from ADR 0052, exposed as
`GET /api/census` once 0052 is implemented. Until then clients show only the
snapshot's `activeAgents` count. They do not derive a roster from lanes themselves
(ADR 0052 d1: a roster outside the generator is the drift bug).

## Consequences

**Good**

- A written contract for the open engine that any client (turtleOS, agents,
  scripts) can build on, with the safety line (planning vs lifecycle) stated once.
- The network exposure closes by default, and the close-without-gates path closes
  at the engine, not per caller.
- turtleOS pages (issues, lanes, milestones, ops, agents) all read one SSE
  connection plus projections; there is no second source of truth to reconcile.

**Costs / risks**

- **Breaking for anyone reaching admin over the network** (a VM, a WebContainer, a
  second machine). They need `--host` (and `--allow-origin`). Loud, one-flag fix.
- **`promote` leaves the HTTP surface.** `admin.html`'s promote button needs a
  CLI-copy affordance instead, until an authenticated write path exists.
- **The contract now constrains refactors** of `lanes-dashboard.ts`. Snapshot fields
  clients use should be additive-only.

## Open questions

- **Promote over HTTP.** Is a one-click promote in the browser worth an
  authenticated path (a per-session token printed by `trellis admin`, sent as a
  header)? This ADR removes it rather than design auth now.
- **`admin.html`'s future.** Freeze it as the zero-install fallback, or keep adding
  features? This ADR assumes freeze: new operator surfaces go to clients.
- **Stats cost.** Is `entityCount` cheap enough on large stores to recompute per
  snapshot, or should it be cached per `headHash`?

## Implementation phases

- **P0 (security): ✅ 2026-09-29.** d1 in `src/ui/local-access.ts` (loopback bind,
  Host check, reflected CORS, 403 on foreign-origin writes, 415 on non-JSON writes),
  `--host`/`--allow-origin` on `admin`, `admin-dev` and `lane watch`. `promote` over
  HTTP returns 403 with the CLI command; `admin.html`'s promote buttons copy
  `trellis lane promote <id>` instead. Tests: `test/ui/local-access.test.ts`.
- **P1:** the d4 guard moves into `engine.updateIssue`; `stats` in the snapshot (d7).
- **P2:** paged ops (d5).
- **P3:** `/api/census` when ADR 0052 lands (d8).

Also landed (2026-09-29): `GET /api/issues(/:id)`, the planning-subset issue actions
with the HTTP-side status guard, and fixes that had left `admin.html` working only
from inside a trellis-node checkout:

- `dist/ui` asset paths (`lanes.html`, theme CSS) resolved relative to the bundled
  chunk.
- The admin browser modules (`admin-shell`, `admin-datatable`,
  `admin-causal-graph`, `tml-runtime`) are prebuilt by `build:admin-ui` into
  `dist/ui/*.js`. On-request TS bundling remains for `--dev` and source runs;
  esbuild is external in the main build, since bundling it broke that path.
- Routes for runtime-theme's `@import`ed siblings and the vendored
  `@trellis.computer/ui` modules.
- `src/vcs/file-entity.ts` uses the Web Crypto global, so browser bundles that
  reach `decompose` build.
- `cliVersion()` finds the package's own `package.json` from a bundled chunk (it
  printed `0.0.0`), which d7's `stats.version` relies on.
