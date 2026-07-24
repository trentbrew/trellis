<script lang="ts">
  /**
   * Svelte twin of sandbox/tml-todo (teaching crosswalk).
   * Shape-equivalent to TML — wire stores per trellis/svelte docs.
   * Not for Operate/admin chrome.
   */
  // import { useEntities, useMutation } from 'trellis/svelte';

  type Todo = {
    id: string;
    done?: boolean | string;
    title?: string;
  };

  /** Stand-in: replace with live entity store + mutation helper. */
  let todos: Todo[] = [];
  let loading = false;

  async function remove(id: string) {
    // ↔ op remove(@todo.id)
    void id;
  }
</script>

{#if loading}
  <p>Loading…</p>
{:else}
  <div data-trellis-ref="todos">
    {#each todos as todo (todo.id)}
      <div data-trellis-shell="row" data-kind="todo" data-entity-id={todo.id}>
        <label>
          <span data-trellis-slot="done">{todo.done}</span>
          <span data-trellis-slot="title">{todo.title}</span>
        </label>
        <button type="button" on:click={() => remove(todo.id)}>Remove</button>
      </div>
    {/each}
  </div>
{/if}
