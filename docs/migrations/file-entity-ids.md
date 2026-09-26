# Migration: minted FileNode / DirectoryNode ids (TRL-456)

## What changed

Before TRL-456, Trellis VCS derived entity ids from the first path seen:

- `fileEntityId(path)` → `file:<path>`
- `dirEntityId(path)` → `dir:<path>`

Renaming preserved the entity (still `file:a.ts`) but updated its `path` fact to
`b.ts`. Re-adding a file at the old path computed the same id `file:a.ts` again, so
the new file's facts landed on the renamed entity: one entity with two paths and
two content hashes.

From TRL-456 onward, `vcs:fileAdd` mints ids (`file:f_<32 hex>`, `dir:d_<32 hex>`:
a full v4 UUID, 122 random bits) and stores them on the op payload. Path is a
mutable attribute; lookup uses the EAV index (`path` fact → entity id). The ids
are stamped before the op is hashed and signed, so the signature covers them.

## Compatibility

| Graph age | Behavior |
| --------- | -------- |
| **New ops** (post-fix) | Payload carries `fileEntityId` / `dirEntityId`; replay is stable. |
| **Legacy ops** (no ids on payload) | `decompose` falls back to path-derived `file:<path>` / `dir:<path>` ids, deterministically. Replay never mints: `enrichFileOp` runs only when a local op is first applied. Existing graphs continue to load. |
| **Legacy histories that renamed then re-added a path** | Keep the merged entity for those pre-fix ops. The fallback reproduces the old behavior exactly; it does not repair it. New ops on the repo mint fresh ids. |
| **Ops from peers without TRL-456** (`integrateOps`, foreign) | Never rewritten, so their hash and signature stay valid. Id-less peer ops decompose with the legacy fallback, so an old peer's modify of a file minted here targets `file:<path>`, not the minted entity. Upgrade peers before relying on file identity across them. |
| **Wiki links `[[file:src/foo.ts]]`** | Resolver uses `getFileEntityId(path)` → path index, then legacy fallback. |

No automatic rewrite of historical ops is required for correctness on replay: the
store state built from legacy ops remains self-consistent. New writes on the same
repo use minted ids going forward.

## Callers

Use `resolveFileEntityIdForPath(store, path)` or `ResolverContext.getFileEntityId`
instead of `` `file:${path}` `` when linking to tracked files.

## Optional future work

- Batch migration to stamp minted ids on legacy ops (changes content hashes).
- Codemod import edges once file ids are stable across renames (ADR-0019 §12).
