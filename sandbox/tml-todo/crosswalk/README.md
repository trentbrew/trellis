# Crosswalk — same todo list, five surfaces

Identical behavior: live list of `Todo` entities, show `done` + `title`, **Remove** via generic `remove(id)`.

| Surface | Path | Role |
|---------|------|------|
| **TML DSL (brace)** | [`todo.tml`](./todo.tml) | Trellis-native compact |
| **TML HTML-adjacent** | [`todo.html-flavor.tml`](./todo.html-flavor.tml) | Svelte-compiler-shaped; `{#each}`, `{#if}`, `on:op`, `$:` reactive |
| **HTML IR** | [`todo.html`](./todo.html) | What `.tml` compiles to today |
| **React** | [`TodoList.tsx`](./TodoList.tsx) | External SDK flavor |
| **Vue** | [`TodoList.vue`](./TodoList.vue) | External SDK flavor |
| **Svelte** | [`TodoList.svelte`](./TodoList.svelte) | External SDK flavor |

**Policy reminder:** Operate / admin stays TML (+ HTML IR). React/Vue/Svelte are for **external** apps or primitive wrappers — not shell substrate inside Trellis chrome. This folder is a teaching twin, not an invitation to rewrite admin in React.

Shared contract:

```
query:  type = Todo  (live)
each:   todo in results
bind:   todo.id, todo.done, todo.title
op:     remove({ id: todo.id })
```

## Construct map

| TML | HTML IR | React / Vue / Svelte |
|-----|---------|----------------------|
| `project` + `query` + `live` | `tml-query` + `tml-live` | `useEntities({ type: 'Todo' })` |
| `each todo in todos` | `tml-each="todo of todos"` | `.map` / `v-for` / `{#each}` |
| `use todo.row` | `data-shell-slot` + hydrate | inline row JSX/template |
| `#title { @todo.title }` | `tml-text="todo.title"` | `{todo.title}` / `{{ }}` |
| `op remove(@todo.id)` | `tml-op="remove(todo.id)"` | `remove(todo.id)` from `useMutation` |
| `density: row` | `data-trellis-shell="row"` | same data attr (theme hook) |

## HTML-adjacent flavor (Svelte-compiler-shaped)

The HTML-adjacent flavor (`todo.html-flavor.tml`) explores what TML looks like
when it leans into HTML syntax, assuming a Svelte-like compiler.

| TML brace | HTML-adjacent | Svelte equivalent |
|-----------|---------------|-------------------|
| `shell id { ... }` | `<shell id="...">` | `<div>` |
| `#slot name { fallback }` | `<slot name="...">` | `<slot>` |
| `op remove(@todo.id)` | `on:op={remove(@todo.id)}` | `on:click={handler}` |
| `each todo in todos` | `each="todo of todos"` | `{#each todos as todo}` |
| `@todo.title` | `{@todo.title}` | `{todo.title}` |
| — | `{#if @todo.done}` | `{#if done}` |
| — | `$: count = ...` | `$: count = ...` |

**Key differences from Svelte:**
- `on:op` instead of `on:click` — ops are generic verbs, not DOM events
- `@entity.field` instead of `entity.field` — explicit entity binding
- `<shell>` instead of `<div>` — semantic, compiles to data-trellis-* attrs
- `<projection>` instead of `{#each}` — queries are first-class

**When to use:**
- HTML-adjacent: Authoring in a code editor with HTML awareness (Emmet, etc.)
- Brace form: Authoring in Trellis-native tools, compact notation

Both compile to the same HTML IR. The flavor is authoring preference, not runtime difference.