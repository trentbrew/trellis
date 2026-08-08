---
title: Trellis Ecosystem — What's Open, What's Sold
description: One-page answer to "what's the moat if it's all open source."
created: 2026-08-08
updated: 2026-08-08
---

# Trellis Ecosystem: What's Open, What's Sold

*A one-page answer to "what's the moat if it's all open source."*

## The one-line answer

Everything that builds trust is open. Everything that costs money to run, or depends on a specific relationship, is where the business lives.

## What's open (and why)

**Trellis** — the graph kernel itself. AGPL-3.0.
**Trellis Studio** — the flagship product surface (`npx trellis studio`).
**Nodebook** — full-featured Trellis client/workspace.
**Playlab**, **Grid Engine**, **Trellis TUI** — clients and tools built on the kernel.

These are open because the core Trellis claim — *servers may relay, accelerate, index, or back up, but never own state* — is only credible if the code enforcing it is inspectable. A promise about data ownership that you can't verify isn't a promise, it's marketing. Open-sourcing the whole client/kernel layer is what makes "local-first" mean something instead of being a slide.

It also does the unglamorous work of building the ecosystem: adoption, contributors, trust, and a canonical implementation that other people build against instead of forking around. AGPL-3.0 means anyone running a modified fork as a network service has to publish their source — so this isn't giving up leverage, it's licensing it.

## What's closed / what's sold

**TurtleDB** — hosted BaaS layer. The value is operating it, not the idea of it.
**Studio's cloud sandboxes** — e2b.dev infrastructure has real, ongoing cost. Open client code doesn't give away the hosting bill.
**Vertical deployments** (Raster.tv / SPEAK Minneapolis and future partners like it) — the code is a small part of this. The value is the relationship, the domain-specific data model, the integration work, and being the one who shows up and runs it.

These stay closed (or at least commercial) not to withhold code, but because none of them are things "open-sourcing" even helps with — you can't open a hosting bill or a client relationship.

## The shape of the argument

Open layer → adoption + trust + a canonical reference implementation → commercial layer → hosting, sandboxes, and vertical deployments monetize the operational and relational work that open code can't replicate on its own.

This is a standard open-core structure, not a special case — but say it in those terms early, because "we open-sourced everything" without the second half sounds like giving away the business.

## One thing to decide per-repo, not in this doc

Whether a given open repo is "maintained" (issues triaged, PRs reviewed) or "here's the code, PRs welcome, no promises." Say which, in the README, so expectations are set going in — this is a bandwidth question, not a positioning one, and it's worth answering separately for Trellis (core, probably maintained) versus something like Trellis TUI (probably not, for now).