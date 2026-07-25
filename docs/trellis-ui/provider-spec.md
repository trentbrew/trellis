# Provider & Context — @trellis.computer/ui Phase 2

**Status:** spec
**Date:** 2026-07-24
**Issue:** TRL-324
**References:** docs/planning/trellis-ui-webcomponents.md (Component API), TRL-314 (theme tokens), signal-utils.ts (existing)
**Target:** `packages/core/src/` in trellis-ui monorepo

## TL;DR

Implement the foundational Web Components and utilities for
`@trellis.computer/ui`: `<trellis-provider>` context provider,
`getTrellisClient()` context traversal helper, and validation of Signal-to-DOM
utilities against Lit lifecycle. This is the infrastructure layer that all other
components depend on.

## Files to Create/Modify

```
packages/core/src/
├── provider.ts        # trellis-provider Web Component (NEW)
├── context.ts         # getTrellisClient helper (NEW)
└── signal-utils.ts    # Already exists — no changes needed
```

---

## 1. `<trellis-provider>` — Context Provider Web Component

### API

```html
<trellis-provider url="http://localhost:8231" api-key="..." tenant-id="...">
  <trellis-entity-list type="Issue"></trellis-entity-list>
</trellis-provider>
```

**Attributes:**
- `url` (string, required) — Trellis server URL. Reflects to attribute. When
  changed, disconnects old client, creates new client, reconnects.
- `api-key` (string, optional) — Authentication key. Reflects to attribute.
- `tenant-id` (string, optional) — Multi-tenant identifier. Reflects to
  attribute.

**Properties:**
- `client: TrellisDb | null` — Public read-only access to the created client
  instance.

**Events:**
- `trellis-connected` — Fired when client connects successfully
- `trellis-disconnected` — Fired when client disconnects or url/api-key changes

### Context Traversal

Child components locate the nearest ancestor provider via DOM traversal:

```ts
const provider = (el as HTMLElement).closest('trellis-provider')
```

Not Lit context protocol — `Element.closest()` is simpler, zero-dependency, and
works across shadow DOM boundaries when `composed: true`.

### Implementation

```ts
import { LitElement, html, property } from 'lit'
import { TrellisDb } from 'trellis/browser'

export class TrellisProvider extends LitElement {
  @property({ type: String, reflect: true }) url?: string
  @property({ type: String, reflect: true, attribute: 'api-key' }) apiKey?: string
  @property({ type: String, reflect: true, attribute: 'tenant-id' }) tenantId?: string

  private _client: TrellisDb | null = null
  get client(): TrellisDb | null { return this._client }

  willUpdate(changed: PropertyValues) {
    if (changed.has('url') || changed.has('apiKey')) {
      this._reconnect()
    }
  }

  private _reconnect() { /* create TrellisDb, fire events */ }

  render() { return html`<slot></slot>` }
}

customElements.define('trellis-provider', TrellisProvider)
```

---

## 2. `getTrellisClient()` — Context Helper

Programmatic access to the nearest provider's client from any framework:

```ts
import { getTrellisClient } from '@trellis.computer/ui'

const client = getTrellisClient(someElement)
```

```ts
export function getTrellisClient(el: HTMLElement): TrellisDb | null {
  const provider = el.closest('trellis-provider') as TrellisProvider | null
  return provider?.client ?? null
}
```

**Edge cases:**
- No provider found → returns `null`
- Provider not upgraded yet → returns `null` (caller retries on
  `trellis-connected` event)
- Multiple nested providers → returns nearest ancestor (correct for scoped
  contexts)

---

## 3. Signal-to-DOM Utilities Validation

The existing `packages/core/src/signal-utils.ts` (written in Phase 1) provides:

- `bindText(signal, element)` — Bind to textContent
- `bindClass(signal, element, map)` — Bind to class list
- `bindAttr(signal, element, name)` — Bind to boolean attribute
- `bindVisible(signal, element)` — Bind to display toggle
- `bindList(signal, container, renderItem)` — Bind array to DOM

**Validation needed:**
- Ensure all functions work correctly within Lit's lifecycle (connectedCallback,
  disconnectedCallback, update)
- Test cleanup: returned disposer functions should remove signal listeners when
  called
- Type compatibility with `Signal<T>` from `trellis/browser`

No code changes expected — the existing implementation should be compatible.
Add tests if gaps found.

---

## 4. Build Config

The `packages/core/vite.config.js` already builds in library mode. Verify:

- `dist/index.mjs` includes `provider.ts` and `context.ts` exports
- `dist/index.d.ts` includes type declarations
- `dist/signal-utils.mjs` and `dist/signal-utils.d.ts` are separate entry points
  (per package.json exports map)
- Build succeeds with `pnpm build` from monorepo root

---

## Dependencies

- `lit` (devDependency in packages/core) — already in package.json
- `trellis/browser` — peer dependency (TrellisDb client)
- No new npm packages required

## Acceptance Criteria

1. `packages/core/src/provider.ts` exists and defines `<trellis-provider>` custom element
2. Provider accepts `url`, `api-key`, `tenant-id` attributes via Lit `@property`
3. Provider fires `trellis-connected` and `trellis-disconnected` events
4. `packages/core/src/context.ts` exports `getTrellisClient(el)` returning `TrellisDb | null`
5. `getTrellisClient` traverses DOM via `el.closest('trellis-provider')`
6. `pnpm build` succeeds in packages/core
7. `pnpm check` passes with 0 errors
