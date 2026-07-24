# TML · Thing · Shell · Primitive

**Status:** direction (internal UI)  
**Date:** 2026-07-21  
**Relates:** [`tml-v0.md`](../specs/tml-v0.md), [`trellis-ui-dsl.md`](./trellis-ui-dsl.md), fractal Thing demo (`demo/realtime-app`), admin Operate surface (`src/ui/admin.html`)  
**Non-goal:** replace public React/Vue/Svelte SDKs for external consumers  
**Authoring DSL (north-star):** [`tml-shell-dsl.md`](./tml-shell-dsl.md) · [`sandbox/tml-admin/`](../../sandbox/tml-admin/)

---

## 1. Policy (internal)

From now on, **Trellis-built UI surfaces are TML-first**:

- Markup + `tml-*` attributes + a `TmlDriver` (web / Tauri / peer)
- **No new React, Svelte, or Vue apps** for Trellis product chrome
- Existing framework SDKs may remain for **external** integrators
- Fractal-playground / AppShell sketches are **prototypes**; kernel **admin** (and successors) are the durable Operate surface

TML is the companion markup language to TQL — declarative bind/project/mutate over the graph — not “another component framework.”

---

## 2. Three layers (do not collapse them)

| Layer | Answers | Lives in |
| ----- | ------- | -------- |
| **Thing** | *What* entity am I looking at? | Graph (`core:Thing` + subclasses); identity + facts |
| **Shell** | *How* does it present at this focal depth? | TML templates + CSS / `--vantage` / shell registry |
| **Primitive** | *What interactive engine* does this shell need? | Small mount/destroy hosts (module or light-DOM CE) |

### Thing

Ontology root. A Thing has **no canonical representation** — only identity and facts. Fractal thesis: representation is a function of **vantage** (focal depth), not of a hard-coded component type.

### Shell

Vantage → presentation. Examples (Operate density today):

| Vantage band (illustrative) | Shell |
| --------------------------- | ----- |
| far / index | node / pip |
| list | row |
| board | card |
| inspect | detail panel |
| author | editor |
| spatial | graph / scene presence |

Kanban card, table row, and grid tile are **the same Things at different shells**, not three component families. Admin’s view toggle is a temporary Operate control; the end state is shell resolution from vantage (and context), not parallel widget trees.

### Primitive

Heavy interactive engines browsers do not give you for free. Shells **may mount** primitives; Things never “are” primitives.

**In-scope primitives (short list):**

- Dialog / sheet stack (focus, escape, z-order, restore)
- Rich text + code editors
- Force-directed / canvas / WebGL hosts (graph, 3D viewport)
- Virtualized lists when needed
- Command palette / popover when interaction cost justifies it

**Out of scope as a kit:** Button, Input, Card, Badge, Tabs-as-product. Those stay **HTML + theme tokens + TML**. Authoring a Trellis-native shadcn *catalog* is the wrong fractal move; authoring a **primitive runtime** is the right one.

### Promotion rule

Extract to the primitive layer only when all three hold:

1. Interaction complexity exceeds markup + CSS
2. ≥2 shells or surfaces will need it
3. A stable `mount` / `destroy` (and optional `update`) contract exists without leaking framework UI patterns

Until then: inline in the surface (e.g. `mountAdminDatatable`) is correct scaffolding.

---

## 3. Optional host: not a component zoo

A single custom element (or equivalent host) is optional:

```html
<trellis-thing id="issue:TRL-1" data-vantage="8"></trellis-thing>
```

Role: lifecycle boundary (driver connect, live subscribe, teardown) + vantage attribute.  
**Prefer light DOM** so TML can query/bind descendants and `runtime-theme.css` + e2e selectors keep working. Closed Shadow DOM only when a primitive’s CSS is radioactive.

Do **not** grow `<trellis-button>`, `<trellis-datatable>`, `<trellis-sidebar>` as the product model. Chrome density comes from tokens + layout, not from a second AppShell.

---

## 4. Relation to admin (foundation surface)

Kernel admin is the first production TML surface that must prove:

1. **TML binds graph → DOM** (live query / each / text / op)
2. **Shells are vantage, not routes-as-apps** (grid / kanban / table converge on one query family + shell)
3. **Primitives mount under shells** only when needed (datatable behavior → later editor/graph hosts)

Playground React Operate chrome informs density and IA; it is not the long-term stack.

---

## 5. Compatibility with 3D (museum / game engine)

Reference: [`Projects/Sandbox/museum`](file:///Users/trentbrew/TURTLE/Projects/Sandbox/museum) — data-first JSON-LD worlds, component bags, per-tick behaviors, Threlte/Svelte chrome today.

### What already matches

| Museum today | TML architecture |
| ------------ | ---------------- |
| Entity in `.jsonld` | Thing |
| Component fields | Facts / attributes |
| World graph | Same EAV/op-log story Trellis already wants |
| “No canonical mesh — data drives render” | Same as “no canonical shell — vantage drives representation” |
| New *behavior* = engine primitive | New *interaction engine* = UI primitive |

Museum’s thesis is already fractal-adjacent: **author data, extend behavior primitives sparingly.** TML does not replace JSON-LD world files; it replaces **framework chrome** around the viewport and, over time, binds HUD / inspector / collections to the same graph.

### Mapping a TML museum surface

```text
World (graph of Things)
  ├─ 3D viewport shell     → mounts primitive: WebGL/Threlte host (or successor)
  ├─ HUD / pip shell       → TML light DOM over player/quest facts
  ├─ Inspector row/card    → TML shells on selected entity id
  └─ Edit dialog           → mounts primitive: dialog stack (+ optional code/richtext)
```

- **`--vantage` / shell registry** can span 2D→3D: far = map pip, mid = billboard label, near = full inspector, edit = property panel + gizmo chrome.
- **Behaviors / systems** stay engine-side (tick, physics, animation). TML does not become a game loop DSL.
- **Durable / realtime / derived** field sync stays world/engine concern; TML reads the same store the viewport does (one driver, many shells).

### Compatibility verdict

**High**, if we treat the 3D viewport as a **primitive** and museum UI chrome as **TML shells** — not if we try to express meshes, materials, or per-frame juice as `tml-*` attributes.

| Concern | Fit |
| ------- | --- |
| Entity identity + facts | Native |
| Multi-shell presence (HUD + scene + inspector) | Native (fractal) |
| Authoring worlds as data | Stays JSON-LD (or graph-native successor); TML consumes |
| WebGL / physics / animation | Primitive / engine — not TML vocabulary |
| Replacing Svelte AppShell with TML pages | Aligned with internal policy |
| One `<Thing>` custom element hosting both CSS shell and 3D attach point | Feasible; light DOM + canvas/slot for the viewport host |

### What not to do

- Do not invent `tml-mesh` / `tml-rigidbody` — that forks the engine ontology into markup.
- Do not wrap every museum Svelte leaf as a WC “Trellis shadcn 3D kit.”
- Do not require Shadow DOM around the canvas host if it blocks theme or picking.

### Migration sketch (non-normative)

1. Keep museum world runtime; peel Operate-like chrome (collections, inspector chrome) toward TML + shared theme.
2. Register `viewport-3d` (and later `force-graph`) as named primitives with `mount(el, { thingId, lane, vantage })`.
3. Resolve shells so the same `thingId` can appear as row in a list and as a selected outline in the viewport without two source-of-truth UIs.

---

## 6. One-line summary

**TML binds Things; vantage selects shells; shells may mount a small set of primitives.**  
Internal product UI is TML-only; 3D worlds stay data + engine behaviors, with the viewport as a primitive under the same Thing/shell model — not a second framework, and not a shadcn catalog.
