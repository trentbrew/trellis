/**
 * Derived config references (ADR-0013 phase 3 / TRL-40).
 *
 * A derived value is stored as a reference and computed at read time, so it can
 * never go stale — the motivating case was a literal `.trellis/config.json`
 * `rootPath` rotting after the repo directory was renamed. Current configs
 * persist `{@link DERIVED_ROOT_PATH}`; readers that need a path resolve it
 * against the workspace root (the location of the config file itself).
 */

/** Marker persisted as `rootPath` — "this workspace's root" (derived). */
export const DERIVED_ROOT_PATH = '@self';

const REF_RE = /^\$\{ref:[^}]+\}$/;

/** True for spellings that must be treated as references, never literal paths. */
export function isDerivedRef(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    (value === DERIVED_ROOT_PATH || REF_RE.test(value))
  );
}
