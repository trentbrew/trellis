# Spec: Wedge gallery — Storybook-like shell (Phases 0–2)

**Status:** Draft\
**Date:** 2026-08-02\
**Builds on:** ADR 0034 (headless UI convention), `demo/wedge-smoke/` gallery, `src/inspector/registry`\
**Blocks:** Studio tooling that renders any headless component in isolation

---

## 1. Intent

`demo/wedge-smoke` is the registry-driven gallery for headless components (11 entries today: table, editor, upload, colorpicker, undo-history, forms, palette, dialog, timeline, combobox, kanban). It has been reshaped into a Storybook-like shell — left nav → toolbar → canvas + controls panel — but **the refactor currently lives only in the built bundle** (`gallery.js`); the TypeScript sources (`gallery.ts`, `inspect.ts`) still render the old stacked-sections page. The next `pnpm smoke:wedge` rebuild would clobber the new layout.

**Goal:** make the Storybook shell durable in source, complete the shell chrome (fullscreen, keyboard nav, search, adapter badges), and add a generic Controls (knobs) panel derived from each entry's `defaultConfig`.

## 2. Current architecture

- `demo/wedge-smoke/gallery.ts` — entry: registers 11 entries, renders sections (stale).
- `demo/wedge-smoke/inspect.ts` — old section-based inspect wrapper (stale).
- `demo/wedge-smoke/index.html` — Storybook chrome: `#nav`, `#toolbar` (title + fullscreen button), `#content-area` → `#canvas`/`#component-canvas` + `#controls-panel` (`#state-display`, `#actions-display`).
- `demo/wedge-smoke/gallery.js` — built bundle holding the **current** implementation: hash routing, single-component render into canvas, state/actions panel, nav active states, cleanup.
- `demo/wedge-smoke/components/*.ts` — per-component gallery entries (registry `RegisteredComponent` with `defaultConfig`, `create`, `actions`, `renderers`).
- Registry: `src/inspector/registry/inspector-registry.ts` (`InspectorRegistry`, `inspectorRegistry` singleton, sorted by name).

## 3. Phase 0 — Sync shell to source + live reload

Port the bundle's `renderComponent`/`loadComponent`/`handleHashChange` logic back into clean TypeScript:

- `inspect.ts` becomes a single-component shell renderer: mounts vanilla renderer into `#component-canvas`, wires `#state-display` + `#actions-display`, sets `#toolbar-title`, returns a cleanup (unsubscribe + view cleanup). State JSON `<details>`, action buttons (try/catch + refresh), reset recreates the core.
- `gallery.ts`: registry-driven nav (`data-type` buttons), hash routing with first-component fallback, `loadComponent` cleanup + nav active state, `$('count')` update.
- Add `smoke:wedge:watch` to `package.json` — esbuild `--watch --servedir=demo/wedge-smoke --serve=8080` (replaces the static python server; bundle can't drift from source again).
- **AC:** rebuilt `pnpm smoke:wedge` output is behaviorally identical to the current bundle; page at `localhost:8080` renders nav → toolbar → canvas + controls panel; hash deep-links load the right component.

## 4. Phase 1 — Shell completeness

- Fullscreen: `⛶` toggles a `.fullscreen` class on `#component-canvas` (hides nav/panel, fills viewport; Esc exits; works under `file://`).
- Toolbar: prev/next `‹ ›` buttons cycling the component list; `entry.type` chip next to the title.
- Keyboard: `←`/`→` cycles components (ignored while typing in inputs); `/` focuses the nav search.
- Nav: search filter (filters by name substring), component count in the nav head.
- Controls panel: new About section — description + adapter badges (react/vue/svelte/vanilla presence from `entry.renderers`).
- **AC:** each behavior verifiable by hand in the browser; no dead controls remain in the toolbar.

## 5. Phase 2 — Generic Controls knobs

New `demo/wedge-smoke/controls.ts`:

- Deep-walk `defaultConfig`: scalar leaves → inputs (boolean → checkbox, number → number input, string → text input); arrays/objects → read-only collapsible JSON (e.g. kanban `issues`).
- Any edit → `entry.create(mergedConfig)`, resubscribe, remount (same path as reset); Reset restores `defaultConfig`.
- Generic across all 11 entries — no per-component code.
- **AC:** editing a knob recreates the core and remounts the view; reset restores defaults; all 11 entries render controls without errors.

## 6. Files touched

`demo/wedge-smoke/gallery.ts`, `demo/wedge-smoke/inspect.ts`, `demo/wedge-smoke/controls.ts` (new), `demo/wedge-smoke/index.html` (markup + CSS), `package.json` (watch script). Verification: `pnpm check` + Playwright pass over the page.
