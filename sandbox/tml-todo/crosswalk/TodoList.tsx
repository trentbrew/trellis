/**
 * React twin of sandbox/tml-todo (teaching crosswalk).
 * Shape-equivalent to TML project+shell — uses trellis/react hooks when wired.
 * Not for Operate/admin chrome.
 */
import { useEntities, useMutation } from 'trellis/react';

type Todo = {
  id: string;
  done?: boolean | string;
  title?: string;
};

export function TodoList() {
  // ↔ project todo.list { query type=Todo; each; live }
  const { data: todos, loading } = useEntities<Todo>({ type: 'Todo' });
  // ↔ op remove(@todo.id)
  const { remove } = useMutation();

  if (loading) return <p>Loading…</p>;

  return (
    <div data-trellis-ref="todos">
      {(todos ?? []).map((todo) => (
        // ↔ shell todo.row
        <div key={todo.id} data-trellis-shell="row" data-kind="todo" data-entity-id={todo.id}>
          <label>
            <span data-trellis-slot="done">{String(todo.done ?? false)}</span>
            <span data-trellis-slot="title">{todo.title}</span>
          </label>
          <button type="button" onClick={() => remove(todo.id)}>
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
