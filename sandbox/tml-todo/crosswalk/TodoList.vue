<script setup lang="ts">
/**
 * Vue twin of sandbox/tml-todo (teaching crosswalk).
 * Shape-equivalent to TML project+shell — wire client per trellis/vue docs.
 * Not for Operate/admin chrome.
 */
import { computed } from 'vue';
// import { useEntities, useMutation } from 'trellis/vue/typed';

type Todo = {
  id: string;
  done?: boolean | string;
  title?: string;
};

/** Stand-in: replace with useEntities(client, TodoType) + useMutation(client). */
const todos = computed(() => [] as Todo[]);
const loading = computed(() => false);
async function remove(id: string) {
  // await mutation.remove(id)  ↔  op remove(@todo.id)
  void id;
}
</script>

<template>
  <p v-if="loading">Loading…</p>
  <div v-else data-trellis-ref="todos">
    <div
      v-for="todo in todos"
      :key="todo.id"
      data-trellis-shell="row"
      data-kind="todo"
      :data-entity-id="todo.id"
    >
      <label>
        <span data-trellis-slot="done">{{ todo.done }}</span>
        <span data-trellis-slot="title">{{ todo.title }}</span>
      </label>
      <button type="button" @click="remove(todo.id)">Remove</button>
    </div>
  </div>
</template>
