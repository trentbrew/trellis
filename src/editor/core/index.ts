/**
 * Editor core — headless rich text behind the standard bridge
 * (ADR 0034 wedge 4).
 *
 * Framework-free, DOM-free, timer-free: the document model is ProseMirror
 * (adopted per ADR 0034 §4.2 — pure state, runs in Node), wrapped behind
 * the HeadlessCore contract so every behavior is deterministic. The
 * Trellis-specific layer is built:
 *
 *   - the schema is descriptor-driven: `EditorSchemaConfig` picks the
 *     block/mark surface from the adopted schema (the same shape as the
 *     forms-descriptor generator — per-surface constraints);
 *   - the document is core data: `state.doc` is ProseMirror node JSON —
 *     the descriptor shape, one op to persist (EQL-S write surface);
 *   - `undoHistory` composes the undo-history service core: every
 *     mutation pushes one reversible command (full doc snapshots), and
 *     consecutive `type()` calls coalesce into one undo step (typing
 *     bursts); `canUndo`/`canRedo` are projected live, even for external
 *     pushes on the composed core.
 *
 * Selections are expressed in document-text offsets (offsets into
 * `state.text`), independent of block structure: PM's gap positions are
 * normalized so the same offset means the same caret, whether the
 * selection spans blocks or sits in a gap.
 *
 * The DOM view (caret, input events, IME) is the visual runtime's job —
 * the adapters expose the core for view binding; ProseMirror's built-in
 * history is not used (the shared undo-history core owns the stack).
 *
 *   const undo = createUndoHistoryCore();
 *   const editor = createEditorCore({ undoHistory: undo });
 *   editor.actions.type('hello');
 *   editor.actions.setSelection(0, 5);
 *   editor.actions.toggleMark('strong');
 *   editor.actions.undo();   // one step back through the burst
 *
 * @module trellis/editor
 */

import { Schema, Node, type MarkSpec, type NodeSpec } from 'prosemirror-model';
import { EditorState as PmEditorState, TextSelection } from 'prosemirror-state';
import { splitBlock, setBlockType as pmSetBlockType, wrapIn } from 'prosemirror-commands';
import { marks, nodes } from 'prosemirror-schema-basic';

import type {
  BlockType,
  EditorActions,
  EditorConfig,
  EditorSelection,
  EditorState,
  EditorSchemaConfig,
  MarkType,
  UndoCommandLike,
  UndoLike,
  UseEditorReturn,
} from './types.js';

export type {
  BlockType,
  EditorActions,
  EditorConfig,
  EditorDocJSON,
  EditorSchemaConfig,
  EditorSelection,
  EditorState,
  MarkType,
  UndoCommandLike,
  UndoLike,
  UseEditorReturn,
} from './types.js';

const BLOCK_KEYS: Record<BlockType, keyof typeof nodes> = {
  paragraph: 'paragraph',
  blockquote: 'blockquote',
  code_block: 'code_block',
  heading: 'heading',
  horizontal_rule: 'horizontal_rule',
};

const MARK_KEYS: Record<MarkType, keyof typeof marks> = {
  strong: 'strong',
  em: 'em',
  code: 'code',
  link: 'link',
};

const ALL_BLOCKS = Object.keys(BLOCK_KEYS) as BlockType[];
const ALL_MARKS = Object.keys(MARK_KEYS) as MarkType[];

/** Build the ProseMirror schema from the descriptor surface. */
function buildSchema(cfg: EditorSchemaConfig | undefined): Schema {
  const blockKeys = cfg?.blocks ?? ALL_BLOCKS;
  const markKeys = cfg?.marks ?? ALL_MARKS;
  const nodeSpecs: Record<string, NodeSpec> = {
    doc: nodes.doc,
    paragraph: nodes.paragraph,
    text: nodes.text,
  };
  for (const key of blockKeys) nodeSpecs[key] = nodes[BLOCK_KEYS[key]];
  const markSpecs: Record<string, MarkSpec> = {};
  for (const key of markKeys) markSpecs[key] = marks[MARK_KEYS[key]];
  return new Schema({ nodes: nodeSpecs, marks: markSpecs });
}

/** A full document + selection + stored-marks snapshot (the undo payload). */
interface Snapshot {
  doc: Record<string, unknown>;
  from: number;
  to: number;
  stored: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

/** Text-block layout: pm start, pm end (exclusive gap), text length. */
interface BlockSpan {
  start: number;
  end: number;
  len: number;
}

export function createEditorCore(config: EditorConfig = {}): UseEditorReturn {
  const schema = buildSchema(config.schema);
  const undoHistory = config.undoHistory ?? null;

  let state: PmEditorState = PmEditorState.create({
    schema,
    ...(config.doc
      ? { doc: Node.fromJSON(schema, config.doc as unknown as Record<string, unknown>) }
      : {}),
  });

  const subscribers = new Set<() => void>();
  const notify = () => subscribers.forEach((fn) => fn());

  /** Top-level textblock spans, in document order. */
  function blockSpans(): BlockSpan[] {
    const spans: BlockSpan[] = [];
    let offset = 0;
    state.doc.content.forEach((block) => {
      if (block.isTextblock) {
        spans.push({ start: offset + 1, end: offset + 1 + block.content.size, len: block.content.size });
      }
      offset += block.nodeSize;
    });
    return spans;
  }

  /** Map a text offset to a PM position inside a textblock (clamped). */
  function pmPosOf(offset: number): number {
    const spans = blockSpans();
    if (spans.length === 0) return 1;
    let acc = 0;
    for (const span of spans) {
      if (offset <= acc + span.len) return span.start + Math.max(0, offset - acc);
      acc += span.len;
    }
    const last = spans[spans.length - 1]!;
    return last.end;
  }

  /** Map a PM position to a text offset. */
  function textOffsetOf(pos: number): number {
    let acc = 0;
    for (const span of blockSpans()) {
      if (pos <= span.end) {
        return acc + Math.max(0, Math.min(pos - span.start, span.len));
      }
      acc += span.len;
    }
    return acc;
  }

  function textSelection(from: number, to: number) {
    return TextSelection.between(state.doc.resolve(pmPosOf(from)), state.doc.resolve(pmPosOf(to)));
  }

  function snapshot(): Snapshot {
    const sel = state.selection;
    return {
      doc: state.doc.toJSON(),
      from: textOffsetOf(sel.from),
      to: textOffsetOf(sel.to),
      stored: (state.storedMarks ?? []).map((m) => ({
        type: m.type.name,
        ...(Object.keys(m.attrs).length > 0 ? { attrs: m.attrs } : {}),
      })),
    };
  }

  /** Rebuild PM state from a snapshot (used by undo/redo execution). */
  function applySnapshot(snap: Snapshot): void {
    const doc = Node.fromJSON(schema, snap.doc);
    const storedMarks = snap.stored.length > 0
      ? snap.stored
          .map((m) => schema.marks[m.type]?.create(m.attrs))
          .filter((m) => m !== undefined)
      : null;
    state = PmEditorState.create({
      schema,
      doc,
      selection: TextSelection.between(
        doc.resolve(pmPosOf(Math.min(snap.from, snap.to))),
        doc.resolve(pmPosOf(Math.max(snap.from, snap.to))),
      ),
      storedMarks,
    });
  }

  function makeCommand(before: Snapshot, after: Snapshot, label: string): UndoCommandLike {
    const command: UndoCommandLike = {
      label,
      execute: () => applySnapshot(after),
      invert: () => ({
        label,
        execute: () => applySnapshot(before),
        invert: () => command,
      }),
    };
    return command;
  }

  /** Record an executed mutation with the undo core (when composed). */
  function record(
    before: Snapshot,
    label: string,
    opts?: { coalesce?: boolean; coalesceKey?: string },
  ): void {
    if (!undoHistory) return;
    undoHistory.actions.push(makeCommand(before, snapshot(), label), opts);
  }

  /** Run a prosemirror-commands command against the current state. */
  function runCommand(
    fn: (dispatch: (tr: import('prosemirror-state').Transaction) => void) => boolean,
  ): boolean {
    let applied: import('prosemirror-state').Transaction | undefined;
    const changed = fn((tr) => {
      applied = tr;
    });
    if (!changed || applied === undefined) return false;
    if (applied.steps.length === 0) return false;
    state = state.apply(applied);
    return true;
  }

  function deriveMarks(): MarkType[] {
    const sel = state.selection;
    if (sel.empty) {
      const marksAt =
        state.storedMarks && state.storedMarks.length > 0
          ? state.storedMarks
          : sel.$from.marks();
      return marksAt.map((m) => m.type.name as MarkType);
    }
    const names = new Set<string>();
    state.doc.nodesBetween(sel.from, sel.to, (node) => {
      if (node.isText) node.marks.forEach((m) => names.add(m.type.name));
    });
    return [...names].filter((n) => (MARK_KEYS as Record<string, string>)[n]) as MarkType[];
  }

  function deriveState(): EditorState {
    const sel = state.selection;
    const at = sel.$from.node(sel.$from.depth);
    return {
      doc: state.doc.toJSON() as EditorState['doc'],
      text: state.doc.textContent,
      selection: {
        from: textOffsetOf(sel.from),
        to: textOffsetOf(sel.to),
        empty: sel.empty,
      } as EditorSelection,
      activeMarks: deriveMarks(),
      blockType: (at?.type.name ?? 'paragraph') as BlockType,
      headingLevel: at?.type.name === 'heading' ? (at.attrs.level as number) : null,
      canUndo: undoHistory?.state.canUndo ?? false,
      canRedo: undoHistory?.state.canRedo ?? false,
    };
  }

  let viewState = deriveState();

  function refresh(): void {
    viewState = deriveState();
    notify();
  }

  if (undoHistory) {
    undoHistory.subscribe(() => {
      viewState = deriveState();
      notify();
    });
  }

  const actions: EditorActions = {
    type: (text) => {
      if (text === '') return;
      const before = snapshot();
      const tr = state.tr;
      if (!state.selection.empty) tr.deleteSelection();
      tr.insertText(text);
      state = state.apply(tr);
      record(before, 'Typing', { coalesce: true, coalesceKey: 'type' });
      refresh();
    },

    setSelection: (from, to) => {
      const size = state.doc.textContent.length;
      const f = Math.max(0, Math.min(from, size));
      const raw = to === undefined ? f : Math.max(0, Math.min(to, size));
      const [lo, hi] = f <= raw ? [f, raw] : [raw, f];
      const cur = state.selection;
      if (textOffsetOf(cur.from) === lo && textOffsetOf(cur.to) === hi) return;
      state = state.apply(state.tr.setSelection(textSelection(lo, hi)));
      refresh();
    },

    toggleMark: (mark, attrs) => {
      const type = schema.marks[mark];
      if (!type) return;
      const before = snapshot();
      const tr = state.tr;
      const { from, to, empty } = state.selection;
      if (empty) {
        const stored = state.storedMarks ?? [];
        const active = stored.some((m) => m.type === type);
        if (active) tr.removeStoredMark(type);
        else tr.addStoredMark(type.create(attrs));
      } else if (deriveMarks().includes(mark)) {
        tr.removeMark(from, to, type);
      } else {
        tr.addMark(from, to, type.create(attrs));
      }
      state = state.apply(tr);
      record(before, `Format ${mark}`);
      refresh();
    },

    setBlock: (block, level) => {
      if (block === 'horizontal_rule') {
        actions.insertHorizontalRule();
        return;
      }
      const type = schema.nodes[block];
      if (!type) return;
      const before = snapshot();
      const changed = runCommand((dispatch) =>
        type.isTextblock
          ? pmSetBlockType(
              type,
              block === 'heading' && level ? { level } : undefined,
            )(state, dispatch)
          : wrapIn(type)(state, dispatch),
      );
      if (!changed) return;
      record(before, `Set ${block}${block === 'heading' && level ? ` ${level}` : ''}`);
      refresh();
    },

    insertBreak: () => {
      const before = snapshot();
      const changed = runCommand((dispatch) => splitBlock(state, dispatch));
      if (!changed) return;
      record(before, 'Insert break');
      refresh();
    },

    insertHorizontalRule: () => {
      const type = schema.nodes.horizontal_rule;
      if (!type) return;
      const before = snapshot();
      const tr = state.tr;
      tr.replaceSelectionWith(type.create());
      state = state.apply(tr);
      record(before, 'Insert rule');
      refresh();
    },

    clear: () => {
      if (state.doc.textContent === '' && state.doc.childCount === 1) return;
      const before = snapshot();
      state = PmEditorState.create({ schema });
      record(before, 'Clear document');
      refresh();
    },

    undo: () => {
      if (!undoHistory) return false;
      return undoHistory.actions.undo();
    },

    redo: () => {
      if (!undoHistory) return false;
      return undoHistory.actions.redo();
    },
  };

  const core: UseEditorReturn = {
    get state(): EditorState {
      return viewState;
    },
    actions,
    subscribe: (listener: () => void) => {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
  };

  return core;
}
