declare module 'svelte/store' {
  export interface Readable<T> {
    subscribe(run: (value: T) => void): () => void;
  }
  export interface Writable<T> extends Readable<T> {
    set(value: T): void;
    update(updater: (value: T) => T): void;
  }
  export function writable<T>(value: T): Writable<T>;
  export function derived<T, S>(store: Readable<T>, fn: (value: T) => S): Readable<S>;
}
