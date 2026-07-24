# TML Phase 5 — Renderer-agnostic write path (proposal)

**Issue:** TRL-273 · **Proposal:** TRL-274  
**Parent cycle:** TRL-247  
**Builds on:** TRL-249 (admin-shell + driver-unified writes)

## Problem

Phase 0–1 wired `tml-op` promote on the admin grid and extracted `admin-shell.ts`, but
other renderers (kanban drag, table inline edit, future shells) may still use bespoke
`fetch('/api/tml-mutations')` or ad-hoc handlers in inline script.

## Goal

Every interactive write in admin surfaces through `TmlDriver.op` — declarative
`tml-op` attributes or a single shell helper — with zero raw mutation fetch in
`admin.html` inline script.

## Scope

- Audit admin.html + shell partials for raw tml-mutation fetch
- Route kanban/table/grid writes through `driver.op`
- Expand `tml-mutations` map as needed (same POST contract)
- E2e: promote (or equivalent write) from ≥2 view modes

## Non-goals

- New mutation types beyond what admin needs today
- Remote/cloud mutation relay
- Renderer pack loading (TRL-272)

## Acceptance criteria (epic TRL-273)

- No raw `fetch` to `/api/tml-mutations` in admin inline script
- Kanban + grid + table interactive writes route through `driver.op`
- E2e covers promote from at least two view modes

## Open questions

- Do kanban column moves become `tml-op` or stay snapshot-local until PeerDriver default?
- Should `admin-shell.ts` own all click→op delegation?
