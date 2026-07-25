# Spec: `<trellis-entity>` — Universal Entity Renderer

**Status:** spec
**Date:** 2026-07-24
**Issue:** TRL-329
**Parent Proposal:** TRL-328
**References:**
- docs/planning/trellis-ui-webcomponents.md (Component API)
- docs/trellis-ui/provider-spec.md (provider context)
- demo/realtime-app/src/lib/fractal/Thing.svelte (vantage/shell reference)
- `trellis/browser` — `liveEntity()`, `liveEntities()`

**Target:** `packages/core/src/` in trellis-ui monorepo

---

## TL;DR

`<trellis-entity>` is the foundational Web Component for rendering a single
graph entity with vantage-driven shell switching (node/row/card). It consumes
the `trellis-provider` context via `getTrellisClient()` and uses `liveEntity()`
from `trellis/browser` for reactive data fetching.

---

## 1. `<trellis-entity>` Component

### API

```html
<trellis-entity id="TRL-1" type="Issue" vantage="8" lane="main" editable></trellis-entity>
```

**Attributes (all reflect to HTML attributes):**

| Attribute | Type | Required | Default | Description |
| --------- | ---- | -------- | ------- | ----------- |
| `id` | string | Yes | — | Entity ID |
| `type` | string | Yes | — | Entity type name |
| `vantage` | number | No | `8` | Continuous focal depth (0–13) |
| `lane` | string | No | `"main"` | Lane identifier |
| `editable` | boolean | No | `false` | Show edit affordance in card shell |

**Properties:**
- `id: string` — Mirror of `id` attribute
- `type: string` — Mirror of `type` attribute
- `vantage: number` — Mirror of `vantage` attribute
- `lane: string` — Mirror of `lane` attribute
- `editable: boolean` — Mirror of `editable` attribute
- `data: EntityData | null` — Fetched entity data (reactive)
- `loading: boolean` — Loading state
- `error: Error | null` — Error state

### Shell Mapping

| Vantage range | Shell | Layout |
| ------------- | ----- | ------ |
| 0–4 | `node` | Compact pill |
| 5–7 | `row` | List row |
| 8–13 | `card` | Expanded card with optional edit form |

**CSS custom properties set on host:**
- `--vantage` — The current vantage value (0–13), drives `clamp()` transitions

**Host attribute:**
- `data-shell` — Set to `node`, `row`, or `card` based on vantage

### Events

- `trellis-entity-update` — Fired when entity data changes (bubbles, composed)
- `trellis-error` — Fired when fetching fails (bubbles, composed)

### Context

Uses `getTrellisClient(el)` from `@trellis.computer/ui` to obtain the
`TrellisDb` instance from the nearest `<trellis-provider>` ancestor.

### Rendering

- **Default:** Entity title + metadata display based on current shell
- **Missing entity:** `-- not present in {lane} --` fallback
- **Loading:** Empty slot or loading indicator
- **Card shell + `editable`:** Inline edit form

### Slot

- Default slot: Custom content rendered inside the shell

---

## 2. Shell Resolution Helper

A pure function `resolveShell(vantage: number): 'node' | 'row' | 'card'` maps
vantage to shell id. This function is reused from the Svelte reference
(`shells.ts`).

```ts
export function resolveShell(vantage: number): 'node' | 'row' | 'card' {
  if (vantage <= 4) return 'node'
  if (vantage <= 7) return 'row'
  return 'card'
}
```

---

## 3. Files to Create

```
packages/core/src/
├── entity.ts          # trellis-entity Web Component (NEW)
├── shells.ts          # resolveShell helper (NEW)
└── index.ts           # Updated: export entity + shells
```

No changes to existing files (provider.ts, context.ts, signal-utils.ts).

---

## 4. Dependencies

- `lit` — already in packages/core devDependencies
- `trellis/browser` — peer dependency (`liveEntity()`, `TrellisDb`)
- `@trellis.computer/ui` — internal (provider context, getTrellisClient)
- No new npm packages

---

## Acceptance Criteria

1. `packages/core/src/entity.ts` exists and defines `<trellis-entity>` custom element
2. `packages/core/src/shells.ts` exists and exports `resolveShell(vantage)` returning `'node' | 'row' | 'card'`
3. `trellis-entity` accepts `id`, `type`, `vantage`, `lane`, `editable` attributes via Lit `@property`
4. `data-shell` attribute reflects current shell (`node`/`row`/`card`) based on vantage
5. `trellis-entity` fires `trellis-entity-update` event on data change
6. `trellis-entity` uses `getTrellisClient()` to obtain TrellisDb from provider context
7. `pnpm build` succeeds in packages/core
8. `pnpm check` passes with 0 errors
9. `trellis issue check TRL-329` — all AC pass