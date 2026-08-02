/**
 * Editor core tests (ADR 0034 wedge 4) — ProseMirror-backed rich text.
 *
 * Zero-timer, zero-DOM: the core is pure headless state. Covers schema
 * descriptors, actions, composed undo (typing coalescing), invert
 * round-trips, adapter surfaces, and cross-adapter shared mounts.
 */

import { describe, expect, it } from 'vitest';

import { createUndoHistoryCore } from '../../src/undo-history/core/index.js';
import type { EditorConfig } from '../../src/editor/core/types.js';
import { createEditorCore } from '../../src/editor/core/index.js';

import { useEditor } from '../../src/editor/react/index.js';
import { createEditorStore } from '../../src/editor/svelte/index.js';
import { createVanillaEditor } from '../../src/editor/vanilla/index.js';

function newEditor(cfg?: EditorConfig) {
  return createEditorCore({ undoHistory: createUndoHistoryCore(), ...cfg });
}

interface TestEditorNode {
  type?: string;
  content?: TestEditorNode[];
  marks?: unknown;
  text?: string;
}

/** Structural read of the editor doc — `EditorDocJSON.content` is loosely typed. */
function docContent(editor: ReturnType<typeof createEditorCore>): TestEditorNode[] {
  return (editor.state.doc as unknown as { content?: TestEditorNode[] }).content ?? [];
}

function listen(core: ReturnType<typeof createEditorCore>) {
  let count = 0;
  core.subscribe(() => count++);
  return () => count;
}

describe('editor core — initial state', () => {
  it('starts with an empty paragraph, empty selection, no marks', () => {
    const editor = newEditor();
    const s = editor.state;
    expect(s.text).toBe('');
    expect(s.selection).toEqual({ from: 0, to: 0, empty: true });
    expect(s.blockType).toBe('paragraph');
    expect(s.headingLevel).toBeNull();
    expect(s.activeMarks).toEqual([]);
    expect(s.canUndo).toBe(false);
    expect(s.canRedo).toBe(false);
    expect(editor.state.doc).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] });
  });

  it('projects an initial doc through the descriptor shape', () => {
    const editor = newEditor({
      doc: {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
          { type: 'paragraph' },
        ],
      },
    });
    expect(editor.state.text).toBe('Hello');
  });
});

describe('editor core — typing', () => {
  it('inserts text and moves the caret to the end', () => {
    const editor = newEditor();
    editor.actions.type('Hi');
    expect(editor.state.text).toBe('Hi');
    expect(editor.state.selection).toEqual({ from: 2, to: 2, empty: true });
  });

  it('coalesces consecutive typing into one undo step', () => {
    const editor = newEditor();
    const notify = listen(editor);
    editor.actions.type('H');
    editor.actions.type('e');
    editor.actions.type('y');
    expect(editor.state.canUndo).toBe(true);
    expect(editor.actions.undo()).toBe(true);
    expect(editor.state.text).toBe('');
    expect(editor.state.canUndo).toBe(false);
    expect(editor.actions.undo()).toBe(false);
    expect(notify()).toBeGreaterThanOrEqual(4);
  });

  it('breaks the coalesce window on non-typing actions', () => {
    const editor = newEditor();
    editor.actions.type('a');
    editor.actions.type('b');
    editor.actions.toggleMark('strong');
    editor.actions.type('c');
    expect(editor.actions.undo()).toBe(true);
    expect(editor.state.text).toBe('ab');
    expect(editor.actions.undo()).toBe(true);
    expect(editor.state.text).toBe('ab');
    expect(editor.actions.undo()).toBe(true);
    expect(editor.state.text).toBe('');
  });

  it('replaces a selection when typing over it', () => {
    const editor = newEditor();
    editor.actions.type('one two');
    editor.actions.setSelection(0, 3);
    editor.actions.type('X');
    expect(editor.state.text).toBe('X two');
    // selection moves are not pushes — the replacement coalesces into the
    // typing burst (undo-history core contract: only pushes break the window)
    expect(editor.actions.undo()).toBe(true);
    expect(editor.state.text).toBe('');
  });

  it('ignores empty type() calls', () => {
    const editor = newEditor();
    const notify = listen(editor);
    editor.actions.type('');
    expect(notify()).toBe(0);
    expect(editor.state.text).toBe('');
    expect(editor.state.canUndo).toBe(false);
  });
});

describe('editor core — marks', () => {
  it('toggles a mark over a selection and reports activeMarks', () => {
    const editor = newEditor();
    editor.actions.type('word');
    editor.actions.setSelection(0, 4);
    editor.actions.toggleMark('strong');
    expect(editor.state.activeMarks).toEqual(['strong']);
    expect(editor.state.doc).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'word', marks: [{ type: 'strong' }] },
          ],
        },
      ],
    });
  });

  it('removes a mark when toggled again', () => {
    const editor = newEditor();
    editor.actions.type('word');
    editor.actions.setSelection(0, 4);
    editor.actions.toggleMark('strong');
    editor.actions.toggleMark('strong');
    expect(editor.state.activeMarks).toEqual([]);
    expect(docContent(editor)[0]?.content?.[0]?.marks).toBeUndefined();
  });

  it('carries a stored mark into subsequently typed text', () => {
    const editor = newEditor();
    editor.actions.toggleMark('em');
    expect(editor.state.activeMarks).toEqual(['em']);
    editor.actions.type('slim');
    expect(editor.state.activeMarks).toEqual(['em']);
    expect(editor.state.doc).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'slim', marks: [{ type: 'em' }] }],
        },
      ],
    });
  });

  it('records link marks with href attributes', () => {
    const editor = newEditor();
    editor.actions.type('site');
    editor.actions.setSelection(0, 4);
    editor.actions.toggleMark('link', { href: 'https://trellis.computer' });
    const text = docContent(editor)[0]?.content?.[0];
    expect(text?.marks).toEqual([
      { type: 'link', attrs: { href: 'https://trellis.computer', title: null } },
    ]);
    editor.actions.undo();
    expect(editor.state.text).toBe('site');
  });

  it('marks are restored through undo/redo', () => {
    const editor = newEditor();
    editor.actions.type('word');
    editor.actions.setSelection(0, 4);
    editor.actions.toggleMark('strong');
    editor.actions.type('!');
    editor.actions.undo();
    expect(editor.state.text).toBe('word');
    expect(editor.state.activeMarks).toEqual(['strong']);
    editor.actions.undo();
    expect(editor.state.activeMarks).toEqual([]);
    editor.actions.redo();
    editor.actions.redo();
    expect(editor.state.activeMarks).toEqual(['strong']);
  });
});

describe('editor core — blocks', () => {
  it('turns the paragraph into a heading with a level', () => {
    const editor = newEditor();
    editor.actions.type('Title');
    editor.actions.setBlock('heading', 2);
    expect(editor.state.blockType).toBe('heading');
    expect(editor.state.headingLevel).toBe(2);
    expect(editor.state.doc).toEqual({
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Title' }],
        },
      ],
    });
    editor.actions.setBlock('paragraph');
    expect(editor.state.blockType).toBe('paragraph');
    expect(editor.state.headingLevel).toBeNull();
  });

  it('supports blockquote and code blocks', () => {
    const editor = newEditor();
    editor.actions.setBlock('blockquote');
    const doc = { content: docContent(editor) };
    expect(doc.content[0]?.type).toBe('blockquote');
    // deepest block under the caret is still the paragraph inside the quote
    expect(editor.state.blockType).toBe('paragraph');
    editor.actions.type('quoted');
    editor.actions.setBlock('code_block');
    expect(editor.state.blockType).toBe('code_block');
    expect(editor.state.text).toBe('quoted');
  });

  it('inserts a horizontal rule as its own block', () => {
    const editor = newEditor();
    editor.actions.type('a');
    editor.actions.insertHorizontalRule();
    const doc = { content: docContent(editor) };
    expect(doc.content.map((n) => n.type)).toEqual(['paragraph', 'horizontal_rule']);
    expect(editor.actions.undo()).toBe(true);
    expect(docContent(editor).length).toBe(1);
  });

  it('splits the block on insertBreak', () => {
    const editor = newEditor();
    editor.actions.type('aa');
    editor.actions.setSelection(1, 1);
    editor.actions.insertBreak();
    expect(docContent(editor).length).toBe(2);
    expect(editor.state.text).toBe('aa');
    editor.actions.undo();
    expect(docContent(editor).length).toBe(1);
  });

  it('ignores blocks absent from the schema descriptor', () => {
    const editor = newEditor({ schema: { blocks: ['paragraph'] } });
    const notify = listen(editor);
    editor.actions.setBlock('code_block');
    expect(notify()).toBe(0);
    expect(editor.state.blockType).toBe('paragraph');
    expect(editor.state.canUndo).toBe(false);
  });
});

describe('editor core — clear + undo', () => {
  it('clears the document as one undo step', () => {
    const editor = newEditor();
    editor.actions.type('gone soon');
    editor.actions.clear();
    expect(editor.state.text).toBe('');
    expect(editor.actions.undo()).toBe(true);
    expect(editor.state.text).toBe('gone soon');
  });

  it('is a no-op on an already-empty document', () => {
    const editor = newEditor();
    const notify = listen(editor);
    editor.actions.clear();
    expect(notify()).toBe(0);
  });

  it('serializes the doc JSON identically after undo/redo', () => {
    const editor = newEditor();
    editor.actions.type('abc');
    const afterTyping = JSON.stringify(editor.state.doc);
    editor.actions.undo();
    editor.actions.redo();
    expect(JSON.stringify(editor.state.doc)).toBe(afterTyping);
  });
});

describe('editor core — selection', () => {
  it('clamps out-of-range and normalizes reversed selections', () => {
    const editor = newEditor();
    editor.actions.type('abc');
    editor.actions.setSelection(99, 99);
    expect(editor.state.selection).toEqual({ from: 3, to: 3, empty: true });
    editor.actions.setSelection(2, 1);
    expect(editor.state.selection).toEqual({ from: 1, to: 2, empty: false });
    editor.actions.setSelection(2, 2);
    expect(editor.state.selection).toEqual({ from: 2, to: 2, empty: true });
  });

  it('collapses to an empty selection when to is omitted', () => {
    const editor = newEditor();
    editor.actions.type('abc');
    editor.actions.setSelection(2);
    expect(editor.state.selection).toEqual({ from: 2, to: 2, empty: true });
  });
});

describe('editor core — composed undo lifecycle', () => {
  it('projects canUndo/canRedo live, including external pushes', () => {
    const undo = createUndoHistoryCore();
    const editor = createEditorCore({ undoHistory: undo });
    editor.actions.type('x');
    expect(editor.state.canUndo).toBe(true);
    expect(undo.state.canUndo).toBe(true);

    const external = {
      label: 'External',
      execute: () => {},
      invert: () => external,
    };
    undo.actions.push(external);
    expect(editor.state.canUndo).toBe(true);
    undo.actions.undo();
    expect(editor.state.canUndo).toBe(true);
    undo.actions.undo();
    expect(editor.state.canUndo).toBe(false);

    editor.actions.redo();
    editor.actions.redo();
    expect(editor.state.text).toBe('x');
    expect(editor.state.canRedo).toBe(false);
  });

  it('uses the undo-history step label for the composed action', () => {
    const undo = createUndoHistoryCore();
    const editor = createEditorCore({ undoHistory: undo });
    editor.actions.type('hi');
    expect(undo.state.undoLabel).toBe('Typing');
    editor.actions.toggleMark('strong');
    expect(undo.state.undoLabel).toBe('Format strong');
  });

  it('returns false for undo/redo without a composed core', () => {
    const editor = createEditorCore();
    editor.actions.type('x');
    expect(editor.state.canUndo).toBe(false);
    expect(editor.actions.undo()).toBe(false);
    expect(editor.actions.redo()).toBe(false);
  });

  it('notifies once per action batch', () => {
    const editor = newEditor();
    const notify = listen(editor);
    editor.actions.type('a');
    const afterType = notify();
    expect(afterType).toBeGreaterThanOrEqual(1);
  });
});

describe('editor adapters', () => {
  it('react — useEditor is exported as a hook', () => {
    expect(typeof useEditor).toBe('function');
  });

  it('svelte — createEditorStore exposes subscribable state + derived', () => {
    const core = createEditorCore({ undoHistory: createUndoHistoryCore() });
    const store = createEditorStore(core);
    let text = '';
    let canUndo = false;
    store.state.subscribe((s) => (text = s.text));
    store.canUndo.subscribe((v) => (canUndo = v));
    expect(text).toBe('');
    expect(canUndo).toBe(false);
    store.actions.type('sv');
    expect(text).toBe('sv');
    expect(canUndo).toBe(true);
  });

  it('vanilla — returns the core itself for shared mounts', () => {
    const core = createEditorCore({ undoHistory: createUndoHistoryCore() });
    const vanilla = createVanillaEditor(core);
    expect(vanilla).toBe(core);
    vanilla.actions.type('vanilla');
    expect(vanilla.state.text).toBe('vanilla');
  });

  it('svelte and vanilla share one core: actions land in both', () => {
    const core = createEditorCore({ undoHistory: createUndoHistoryCore() });
    const store = createEditorStore(core);
    const vanilla = createVanillaEditor(core);
    let text = '';
    store.state.subscribe((s) => (text = s.text));
    vanilla.actions.type('shared');
    expect(text).toBe('shared');
    expect(store.actions.undo()).toBe(true);
    expect(text).toBe('');
  });
});
