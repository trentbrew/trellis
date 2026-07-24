# Crosswalk — same todo list, five surfaces

Identical behavior: live list of `Todo` entities, show `done` + `title`, **Remove** via generic `remove(id)`.

| Surface | Path | Role |
|---------|------|------|
| **TML DSL (brace)** | [`todo.tml`](./todo.tml) | Trellis-native compact |
| **TML HTML-adjacent** | [`todo.row.html-flavor.tml`](./todo.row.html-flavor.tml), [`todo.projection.html`](./todo.projection.html) | Svelte-compiler-shaped; `each`/`when` directives |
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