---
title: Docs spine — frontmatter, index, devlog
date: 2026-08-02
arc: docs-infra
landed: TRL-369 proposal, TRL-370 spec queued
next: executor impl, then wire into ship-check
---
# Docs spine — frontmatter, index, devlog

The repo could not answer "what landed this week": 29/147 docs had frontmatter,
`docs/adr/README.md` was stale (ADR-0018 of 34), and no devlog existed.

Landing the docs spine wedge: `scripts/docs-frontmatter.mjs` (lint + backfill),
`scripts/docs-index.mjs` (generates `docs/INDEX.md`, `llms.txt` primary docs,
`docs/devlog/README.md`), and a `status` lifecycle on every doc.
