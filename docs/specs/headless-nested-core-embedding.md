# Spec: Nested-core embedding (editor ↔ code)

**Status:** Draft\
**Date:** 2026-08-02\
**Builds on:** ADR 0034 §6 (editor-core, code-core, undo-history-core), `src/editor/core`, `src/undo-history/core`\
**Blocks:** `code-core` (doc code blocks, formula fields), editor NodeView adapters\
**Related:** [headless-schema-to-surface.md](./headless-schema-to-surface.md)

---

## 1. Intent

Two editing engines coexist in Trellis:

| Core | Engine | Surfaces |
| ---- | ------ | -------- |
| `editor-core` | ProseMirror model | rich text, docs, `rich_text` form/table cells |
| `code-core` | CodeMirror 6 state | EQL inputs, formulas, JSON, file entities, **embedded code blocks** |

ADR 0034 says heavy code editing **swaps a code-core instance into editor-core as a NodeView**. This spec defines that seam so code-core does not fuse with editor-core and undo/focus/doc-sync rules are identical across React/Vue/Svelte adapters.

**Principle:** Parent owns document structure; child owns buffer semantics while active. Commit on blur/close; draft while focused (same family as colorpicker draft/commit + dialog resolver).

---

## 2. Non-goals

- ProseMirror or CodeMirror view implementation details (adapter tier)
- Syntax highlighting themes, LSP, or language server wiring
- Multi-cursor across parent/child boundary
- Merging undo stacks from unrelated documents (e.g. two open files)

---

## 3. Embedding modes

Code-core runs in three modes — one factory, config-driven:

| Mode | Host | `CodeCoreConfig.mode` | Lifecycle |
| ---- | ---- | --------------------- | --------- |
| **Standalone** | Form field, desk file panel, query bar | `eql` \| `formula` \| `json` \| `plain` | Always active; commits to entity field / file entity |
| **Embedded block** | `editor-core` `code_block` node | `plain` + `language` attr | Swap-in on focus; commit replaces node content on blur |
| **Embedded inline** | Future: inline `code` mark with expanded edit | `plain` | Out of v1 — marks stay PM-native |

All modes share: `HeadlessCore` bridge, composed `undoHistory`, schema-derived completions (standalone EQL/formula only).

---

## 4. Document shape (editor ↔ code block)

### 4.1 ProseMirror node (canonical persist shape)

```ts
/** Persisted in EditorState.doc — one code block node. */
interface CodeBlockNodeJSON {
  type: 'code_block';
  attrs?: {
    /** Lezer/language id — 'eql', 'json', 'javascript', 'plain', … */
    language?: string;
  };
  /** Single text child — PM convention for code_block. */
  content?: Array<{ type: 'text'; text: string }>;
}
```

- **Source of truth while embedded editing is inactive:** PM doc JSON (above).
- **While embedded editing is active:** code-core owns a **draft buffer**; PM node content is stale until commit.
- **Plain text extraction:** `node.textContent` (already how editor-core projects `state.text` for non-code regions).

### 4.2 Editor core extensions (minimal)

Add to `editor-core` — behavior only, no CM/PM view:

```ts
interface EditorEmbedState {
  /** Active nested editor, or null. At most one embed per editor core. */
  embed: {
    kind: 'code_block';
    /** Path to the block in doc JSON — stable identity across structural edits. */
    blockId: string;
    language: string;
    /** Snapshot of node text at embed open (for dirty detection). */
    committed: string;
  } | null;
}

interface EditorEmbedActions {
  /** Enter embed mode for the code_block at `blockId`. Returns false if not found / already open. */
  openCodeEmbed(blockId: string): boolean;
  /** Exit embed: `commit` writes draft → PM node; `discard` restores `committed`. */
  closeCodeEmbed(opts: { commit: boolean; draft: string }): boolean;
}
```

`blockId` assignment: editor-core assigns stable ids to block nodes on first mutation (internal map `blockId ↔ doc position`), same pattern as table row ids. **Ids are core data**, not DOM attrs — adapters render them as `data-block-id` for hit-testing.

### 4.3 Code-core embed config

```ts
interface CodeCoreConfig {
  mode: 'eql' | 'formula' | 'json' | 'plain';
  language?: string;
  initial?: string;
  undoHistory?: UndoLike;
  completionSources?: CompletionSourceDescriptor[];
  /** Embed-only: parent notifies on commit request. */
  embed?: {
    role: 'embedded';
    onCommit(draft: string): void;
    onCancel(): void;
  };
}
```

Standalone cores omit `embed`; embedded cores receive `onCommit` / `onCancel` from the adapter that wired parent+child.

---

## 5. Lifecycle

```
                    ┌─────────────────┐
                    │  editor idle    │
                    │  (PM doc owns   │
                    │   code text)    │
                    └────────┬────────┘
                             │ focus / openCodeEmbed(blockId)
                             ▼
                    ┌─────────────────┐
                    │  embed open     │
                    │  code-core draft│
                    │  PM node frozen │
                    └────────┬────────┘
              ┌──────────────┼──────────────┐
              │ blur+commit  │ blur+discard │ Esc (policy)
              ▼              ▼              ▼
         closeCodeEmbed   closeCodeEmbed   closeCodeEmbed
         { commit: true } { commit: false } { commit: false }
              │              │              │
              └──────────────┴──────────────┘
                             ▼
                    ┌─────────────────┐
                    │  editor idle    │
                    └─────────────────┘
```

### 5.1 Rules

1. **At most one embed** per editor-core instance.
2. **Opening an embed** snapshots `committed` text; code-core `initial` = that snapshot.
3. **While embed open:** editor-core `type()` / `toggleMark()` on the parent document are **no-ops** (or queue until close — **v1: no-op**).
4. **Commit path:** adapter calls `codeCore.state` draft → `editor.actions.closeCodeEmbed({ commit: true, draft })` → PM node update → one undo step on **editor** stack.
5. **Discard path:** close without PM mutation; code-core discarded.
6. **Structural edits** (delete block, split doc) while embed open → **auto-discard** embed (same as colorpicker close-on-outside-click).

### 5.2 Draft / commit parity

| Component | Draft surface | Commit trigger |
| --------- | ------------- | -------------- |
| colorpicker | `state.draft` while `open` | `actions.commit()` |
| dialog | async `open()` promise | button / backdrop policy |
| code embed | code-core buffer while embed open | blur, Cmd+Enter, explicit Save |

**Recommend Cmd+Enter** commits embed; **Esc** discards (configurable via `EditorEmbedConfig` later).

---

## 6. Focus

| Layer | Owns focus while… |
| ----- | ----------------- |
| Editor adapter | embed closed; navigation between blocks |
| Code adapter | embed open; all keystrokes except explicit "exit chord" |

Adapters coordinate via a single **focus controller** object created at mount:

```ts
interface EmbedFocusController {
  active: 'editor' | 'code' | null;
  request(target: 'editor' | 'code'): void;
}
```

- React: ref handoff between PM view and CM view
- Vue/Svelte: same controller, framework-specific refs
- **No focus logic in cores** — cores expose `embed` state; adapters bind DOM focus

### 6.1 a11y

- Embedded: code textarea/contenteditable has `aria-label` from block language + "code block"
- Parent doc exposes `aria-activedescendant` or roving tabindex — adapter responsibility
- `canUndo` / `canRedo` from the **active** stack surface in UI chrome (see §7)

---

## 7. Undo composition

**One shared `undoHistory` instance per composed document surface** (editor mount with embeds). Both cores push to it; user sees one undo timeline.

### 7.1 Who pushes what

| User action | Stack entry | Coalesce |
| ----------- | ----------- | -------- |
| Typing in prose | editor-core command | `coalesceKey: 'type'` |
| Toggle mark / block | editor-core command | no |
| Typing in embedded code | code-core command | `coalesceKey: 'type'` |
| Commit embed (text changed) | **single** editor-core command: replace block content | no |
| Cancel embed | nothing | — |

### 7.2 Commit as one editor undo step

Embed commit is **one editor push**, not a code-core push + structural push:

```ts
// Conceptual undo command on commit
{
  label: 'Edit code block',
  execute: () => replaceCodeBlock(blockId, newText),
  invert: () => replaceCodeBlock(blockId, committedSnapshot),
}
```

Typing *inside* the embed before commit accumulates on code-core's local buffer only — **not** on the shared undo stack until commit. Alternative considered: push every code keystroke to shared stack — **rejected** (pollutes prose undo timeline).

### 7.3 Standalone code-core

File panel / EQL bar: code-core pushes directly to composed or standalone `undoHistory`. No editor parent.

### 7.4 Durable vs transient (boundary)

| Layer | Reverses |
| ----- | -------- |
| `undo-history-core` | In-session edits (ergonomic) |
| Op-log + semantic merge | Applied entity writes (durable) |

Embed commit that triggers `onCellEdit` / entity write: **local undo** reverts buffer; **durable reversal** goes through op-log machinery — same as table-core today.

---

## 8. Adapter responsibilities

```
┌──────────────────────────────────────────────────────────┐
│  Adapter (react/vue/svelte/vanilla)                      │
│  ┌─────────────┐    focus     ┌─────────────┐            │
│  │ PM DOM view │◄────────────►│ CM DOM view │            │
│  └──────┬──────┘  controller └──────┬──────┘            │
│         │                            │                   │
│         ▼                            ▼                   │
│  ┌─────────────┐              ┌─────────────┐            │
│  │ editor-core │◄── embed ───►│  code-core  │            │
│  └──────┬──────┘   state      └─────────────┘            │
│         │                                                │
│         ▼                                                │
│  ┌─────────────┐                                         │
│  │ undo-history│  (shared, one per mount)                │
│  └─────────────┘                                         │
└──────────────────────────────────────────────────────────┘
```

### 8.1 Factory helper (adapter tier, not core)

```ts
/** Optional convenience — lives in adapter package, not core. */
function createEditorWithCodeEmbed(config: {
  editor: EditorConfig;
  codeDefaults?: Partial<CodeCoreConfig>;
}): {
  editor: UseEditorReturn;
  createCodeEmbed(blockId: string): UseCodeReturn | null;
  focus: EmbedFocusController;
};
```

Cores stay independent; helper wires `openCodeEmbed` ↔ `createCodeCore({ embed: { … } })`.

### 8.2 Vanilla / wedge-smoke path

v1 smoke test: **standalone code-core only** in gallery; editor gallery gains one action **"Open code embed (simulated)"** that exercises `openCodeEmbed` / `closeCodeEmbed` without CM DOM — behavior test in Node, textarea stand-in for CM in browser (matches current editor gallery pattern).

Full CM NodeView lands in adapter follow-up.

---

## 9. Single-line modes (formula, EQL)

Standalone code-core instances (no editor parent):

```ts
createCodeCore({
  mode: 'formula',
  initial: schemaField.formula ?? '',
  completionSources: deriveCompletionSources({ ontologies, rootType }),
  undoHistory,
});
```

- **Single line enforced in core:** `actions.insert('\n')` rejected or transforms to commit in formula mode
- Form/table bind via schema affordance (`code` / `formula`) — see schema-to-surface spec
- Same factory as embed; `embed` config absent

---

## 10. Acceptance criteria

### Behavior (Node, vitest)

- [ ] `openCodeEmbed` → edit draft → `closeCodeEmbed({ commit: true })` updates PM doc JSON
- [ ] Discard restores prior node text; no undo entry
- [ ] Commit with changed text → one undo step reverts entire block
- [ ] Typing inside embed before commit → no parent undo entries
- [ ] Second `openCodeEmbed` while open returns false
- [ ] Delete containing block while embed open → embed cleared

### Adapter (smoke)

- [ ] Editor gallery action simulates embed open/commit/discard
- [ ] Code gallery (standalone) types + undoes with shared undo pattern

### Integration (post code-core v1)

- [ ] `code_block` in doc round-trips through entity `rich_text` write
- [ ] Table cell with `editor: { kind: 'code', mode: 'json' }` uses standalone embed (no PM parent)

---

## 11. Implementation order

1. **Editor embed state machine** — `EditorEmbedState`, `openCodeEmbed`, `closeCodeEmbed` in `editor-core` (no CodeMirror)
2. **Tests** — Node suite for lifecycle + undo (§10)
3. **Code-core factory** — standalone first; `embed` config stub
4. **Adapter helper** — `createEditorWithCodeEmbed` in `editor/react` (one framework first)
5. **CM view** — CodeMirror 6 adapter binds embed focus controller
6. **Wedge-smoke** — simulated embed action on editor entry

**Gate:** steps 1–2 complete before CodeMirror dependency lands.

---

## 12. Open questions

- **Block identity:** stable `blockId` map vs path-based `(child index[])` — **Recommend:** opaque `blockId` assigned by editor-core (survives index shifts via internal mapping).
- **Partial commit:** commit on every blur vs explicit Save in modal code block — **Recommend:** blur commits when dirty (Notion-like); modal variant uses dialog draft/commit wrapper for long scripts.
- **Language pickers:** `language` attr on node vs inferred from schema — **Recommend:** attr on node; schema sets default when inserting block from toolbar.
