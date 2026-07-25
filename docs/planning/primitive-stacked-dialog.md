# Primitive — stacked dialog / inspect host

**Status:** scope / proposal (pre-spec)  
**Date:** 2026-07-24  
**Pair:** [`primitive-richtext.md`](./primitive-richtext.md)  
**North star:** [`tml-shell-dsl.md`](./tml-shell-dsl.md) §0  
**Pattern sources:** trellis-client `DialogStackHost` · turtlecode `createEntityDialogStack` · Raster stack host · Toolkit `EntityDetailSheet` variants  
**Test bed:** **trellis-node admin** (`src/ui/admin*`) — first impl lives here; other apps follow once sticky

## Problem

Activate-Thing (mention click, browse open, deep link) needs one shared inspect host. Today each app reimplements stack + chrome; admin has no stack yet. Without a locked contract, richtext and browse will invent one-off popovers.

## Goal

A **host primitive**: push/pop inspect frames for a Thing id, with a stable layout and presentation variants. Thing content stays shells (`*.inspect` / preview density); stack policy and chrome stay off-graph.

## Decisions (locked)

| # | Decision |
| - | -------- |
| D1 | **Admin is the test bed** for stack + inspect chrome (not extract-first from trellis-client) |
| D2 | Sidebar tabs: **Properties** · **References** · **Activity** — three top-level only |
| D3 | **Activity** = one stream: change history (ops) **and** ad-hoc comments, interleaved. Not separate top-level tabs; not “ops ‖ comments” as two products |

## Scope (v0)

**Stack policy**

- `push(entityId, opts?)` — open or focus frame
- If id already in stack → **jump / pop-to** (no duplicate)
- `back` / `pop` — previous frame; dismiss top when depth 1 (host policy)
- Only **top** frame interactive; lower frames scale/dim (GUI default)
- Deep-link / hash restore optional (nice-to-have after admin stack works)

**Frame layout (canonical GUI)**

| Region | Content |
| ------ | ------- |
| **Main** | Preview — denser projection of the Thing (see shell strategy below) |
| **Sidebar** | **Properties** · **References** (backlinks) · **Activity** (ops history + comments) |

Resizable dialog by default.

**Activity tab (detail)**

- Single chronological (or reverse-chron) feed
- Entries are typed: `op` (field change, promote, status, …) and `comment` (freeform richtext later)
- Same empty state / composer affordance at bottom (“Add comment”)
- Filtering (ops only / comments only) is optional chrome later — not a second tab

**Presentation variants** (same frame content; chrome changes)

| Variant | Notes |
| ------- | ----- |
| `dialog` | Stacked modal (default desktop) — **admin v0** |
| `sidebar` / `inset` | Docked inspect rail |
| `fullscreen` | Immersive / mobile sheet |
| `floating` | Canvas / spatial windowed node |

**Host API sketch (framework-agnostic)**

```ts
type InspectHost = {
  push(id: string, opts?: { variant?: InspectVariant; originId?: string }): void
  pop(): void
  popTo(id: string): void
  clear(): void
  readonly stack: readonly string[]
  readonly variant: InspectVariant
}
```

Activation from mentions / browse calls `push` only — no parallel open paths.

### Shell strategy: host chrome vs Thing preview

**Elaborate — universal frame vs per-kind inspect**

Two different things often get conflated:

| Piece | Whose job? | Shared or per-kind? |
| ----- | ---------- | ------------------- |
| **Inspect host chrome** | Stack, resize, back, sidebar tab strip, Activity feed chrome | **Always universal** — one `InspectHost` |
| **Main preview** | How *this* Thing looks at inspect density | **Per-kind shells** (via resolve) |
| **Properties panel** | Which fields / editors | **Per-kind** (schema or property pack) — host only provides the tab slot |
| **References** | Backlinks query UI | **Universal** list; row = mention-density shell of each linked Thing |
| **Activity** | Merge ops + comments | **Universal** feed renderer; op rows may use tiny kind-specific summaries |

**Recommend for admin v0:**

```
InspectHost (universal)
├── chrome: stack transforms, resize, tabs
├── slot main    → resolve(kind, density: inspect)  // issue.inspect, lane.inspect, …
├── slot props   → resolve(kind, density: props) or shared property table driven by schema
├── slot refs    → universal backlinks list
└── slot activity → universal Activity feed
```

- **Do not** invent `thing.inspect` as a giant switch statement that owns every kind’s layout forever.
- **Do** ship a **fallback** `thing.inspect` (title + id + raw facts) for unknown kinds so the host never blanks.
- **Do** add `issue.inspect` / `lane.inspect` as real shells when admin needs richer previews — same resolve table as board cards.

So: **universal host + fallback shell + per-kind preview shells as needed** — not “one mega shell” and not “N completely separate dialog components.”

```tml
resolve kind {
  when density == inspect -> kind.inspect   // if registered
  when density == inspect -> thing.inspect  // fallback
}
```

**Degrade (document only in v0; implement later)**

TUI / e-paper / a11y / AI: same meaning — navigate focus to Thing at inspect density — different chrome.

## Non-goals (v0)

- Per-kind custom dialog trees that bypass the host
- Full comment product (moderation, reactions) — composer + list is enough
- VR / fractal-zoom chrome
- Porting trellis-client stack wholesale before admin spike
- `.tml` compiler dependency

## Acceptance (scope lock)

- [x] Written contract: push / pop-to / back / no-duplicate
- [x] Layout + three sidebar tabs: Properties · References · Activity
- [x] Activity = ops history + comments in one feed
- [x] Variant enum locked (`dialog` | `sidebar` | `fullscreen` | `floating`)
- [x] Stack depth, size, active tab = **off-graph** chrome
- [x] First impl target: **admin**
- [x] Shell strategy: universal host + `thing.inspect` fallback + per-kind preview via resolve
- [ ] Mentions (#2) and browse (#3) activate **only** via this host (when those land)

## Open questions

1. Does `originId` (where you came from) live in stack metadata or only URL?
2. Activity ordering: strict time-merge of ops+comments, or comments pinned / threaded later?
3. Properties v0: hardcoded issue fields vs generic EAV table?

## Sequencing

1. Admin `InspectHost` + dialog variant + empty slots  
2. Fallback `thing.inspect` preview + stub Properties / References / Activity  
3. Wire browse/card open → `push`  
4. Wire richtext mention activate → `push`  
5. Enrich per-kind inspect shells as needed  

**Does not block** TML Phase 4–5; can land as a parallel admin wedge.
