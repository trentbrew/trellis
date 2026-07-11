# ADR 0019 — Graph-native cron

**Status:** accepted (2026-07-10) **Related:**
[0018](./0018-explicit-ids-and-field-sync-tiers.md) (durable field sync),
[0016](./0016-relay-blob-serving.md) (servers never own state),
`src/plugins/cron/`, TRL-73 / TRL-77

## Context

Apps need recurring work (demo ticks, maintenance, Raster-style schedules)
without making a cloud timer the system of record. Trellis already has durable
entities, causal ops, and an in-process `db serve` host. What is missing is a
first-class **schedule entity + ephemeral runner** pair.

## Decision

1. **Schedule as durable graph state** — `CronJob` / `CronRun` entities (all
   fields `sync: durable`). Explicit ids allowed (`cron:demo-ping`).
2. **Runner as ephemeral process** — `CronScheduler` in `trellis/plugins/cron`,
   started on `trellis db serve` / `TrellisServer` when `TRELLIS_CRON !== '0'`
   (default on). Not the presence relay in v1.
3. **Primary schedule** — `intervalMs` (≥ 500). Optional crontab deferred.
4. **Handlers** — registry with builtins `builtin:ping`, `builtin:counter`; apps
   may `registerHandler`.
5. **Lease claim** — `leaseOwner` + `leaseExpiresAt` prevent double-fire across
   overlapping ticks / multi-runner.
6. **Optional probe** — `GET /cron/status` → `{ running, tickMs, jobCount }`.

## Consequences

**Positive:** schedules are forkable, queryable, auditable; local-first demos
work without a hosted cron product.

**Negative:** a stopped `db serve` does not fire jobs (by design — wake the
runner elsewhere later).

**Out of scope (v1):** relay-hosted runner, blob GC handler, distributed
election beyond leases, full crontab UX.
