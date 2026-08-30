# ADR 0041: Adoption signal without silent telemetry

**Status:** Accepted  
**Date:** 2026-08-29  
**Depends on:** [0040](./0040-lane-boundary-oss-and-hosted-platform.md) (local-first / OSS trust),  
[OPEN-SOURCE-STRATEGY](../OPEN-SOURCE-STRATEGY.md) (open layer builds trust)  
**Related essay draft:** [adoption_signal_without_telemetry_draft.md](../artifacts/adoption_signal_without_telemetry_draft.md)

## Context

Early-stage open projects often treat **npm download counts** as adoption signal.
At Trellis's scale, that number is close to meaningless:

- CI runners, mirrors, and Dependabot bumps count the same as a human install.
- A one-time `npm install` that bailed counts the same as daily `npx trellis studio`.
- Treating the metric as feedback is worse than having no number: noise dressed
  up as data.

There is also a product-architecture tension. Trellis's thesis is that **servers
never own state** and **nothing phones home by default**. Bolting on silent
telemetry to soothe founder anxiety would cut against the thing we are building.

Separately, **semver renumbering** (e.g. aligning published versions with honest
maturity) is sometimes deferred because "we don't know how many consumers we
have." Unknown consumer count does not block an honest renumber; it argues for
doing it now while breakage risk is low.

## Decision

### 1. Do not use npm downloads as internal adoption signal

npm download totals may appear on public dashboards, but **internal planning,
GTM anxiety, and version policy must not treat them as market feedback.**

### 2. Prefer these zero-telemetry signals

| Signal | Where | Why it carries weight |
| ------ | ----- | --------------------- |
| **GitHub traffic** | Repo → Insights → Traffic (owner-only) | Unique clones/visitors over 14 days; recurring non-owner IPs over weeks beat a download spike |
| **External issues/discussions** | GitHub Issues, Discussions | Someone filed because they were trying to use it |
| **Star/watcher trend** | GitHub over time | Slow trickle from unfamiliar accounts beats a HN spike that goes nowhere |
| **Direct pings** | Advisors, pilots, ACM contacts | One honest answer from a real person outweighs a thousand downloads |

Founders and agents should check these on a cadence (e.g. monthly), not npm.

### 3. No silent usage telemetry

**Default:** Trellis does not collect usage telemetry. No background pings, no
implicit analytics in `npx trellis studio`, no "help us improve" collection
without an explicit user action.

**If we want usage signal later:** ship an **opt-in, documented** path only, e.g.
`trellis studio --anonymous-usage` (off unless turned on). Consistent with
Craftpunk: explicit beats silent.

Non-goals for v1 of any opt-in ping: identity, repo contents, file paths, or
graph entity payloads.

### 4. Version policy is not blocked by unknown consumer count

Semver honesty (including renumber when maturity was mislabeled) proceeds on
**engineering and narrative correctness**, not npm download totals. Low real-user
count is a reason to fix the number **now**, not defer.

## Consequences

- **Positive:** Product decisions stay aligned with local-first trust; founders
  read signal that actually means something.
- **Positive:** Version renumber decisions simplify; less fear of imaginary
  breakage.
- **Tradeoff:** No dashboard dopamine; requires discipline and direct asks.
- **Tradeoff:** Opt-in usage (if built) must be designed, documented, and
  maintained; cannot be a backdoor telemetry layer.

## Non-goals

- Building a founder analytics dashboard in this ADR.
- Mandating `--anonymous-usage` implementation timeline (decision is principle
  only until a wedge ships it).
