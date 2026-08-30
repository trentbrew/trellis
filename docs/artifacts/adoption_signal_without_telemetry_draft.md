---
title: 'Signal without telemetry'
description: 'Why npm download counts are tea leaves at Trellis scale, what actually carries adoption signal, and why silent analytics would betray the architecture.'
published: 2026-08-29
tags: ['trellis', 'open-source', 'local-first', 'craftpunk']
category: Essay
draft: true
---

# Signal without telemetry

npm download counts are close to meaningless at Trellis's scale. CI runners,
mirrors, Dependabot bumps, and people who `npm install`'d once and bailed all
count the same as a real user running `npx trellis studio` daily. Treating that
number as signal is worse than having no number. It's noise dressed up as data,
which is exactly what makes it anxiety-inducing: you're reading tea leaves and
calling it market feedback.

## What actually carries signal (no telemetry required)

**GitHub traffic insights** (repo → Insights → Traffic, visible to you as
owner) show unique clones and visitors over a rolling 14 days. Clones from IPs
that aren't yours, recurring over weeks, is a much stronger signal than a
download count.

**Issues and discussions opened by people who aren't you or Lauren.** Someone
hitting a bug and filing it is one of the highest-signal things that can
happen. They only do that if they were trying to actually use it.

**Stars and watchers trend over time**, not the absolute number. A slow steady
trickle from unfamiliar accounts beats a spike from a HN link that goes
nowhere.

**Direct pings.** If anyone's mentioned trying it (Jay, Abdi, ACM contacts),
just ask them directly if they still have it installed. One honest answer from a
real person outweighs a thousand npm downloads.

## The architectural tension

Trellis's whole architectural thesis is that servers never own state and nothing
phones home by default. Bolting on telemetry to solve this anxiety would cut
against the thing you're building.

If you want actual usage signal without betraying that, the honest version is an
explicit, opt-in, documented ping: something like `trellis studio
--anonymous-usage` that's off unless someone turns it on. Not silent collection.
That's consistent with Craftpunk. Silent telemetry isn't.

We recorded this as [ADR 0041](../adr/0041-adoption-signal-without-silent-telemetry.md).

## Versioning

Not knowing your consumer count doesn't block the honest renumber. If anything it
argues for it: fewer people means less breakage risk in fixing the number now
versus later.
