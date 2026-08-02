/**
 * Headless undo-history — core behavior, bridge contract, dual-adapter test.
 * ADR 0034 wedge 8. All tests run in Node with zero DOM and zero timers.
 *
 * The invert contract is exercised through a tiny string buffer: insert and
 * delete commands with exact inverses, so undo/redo correctness (including
 * order and coalescing) is observable in the resulting string. Commands are
 * applied before pushing, per the documented contract (the caller executes,
 * then records).
 */
import { describe, expect, test } from 'vitest';
import type { UndoCommand } from '../../src/undo-history/core/types.js';
import { createUndoHistoryCore } from '../../src/undo-history/index.js';
import { createUndoHistoryStore } from '../../src/undo-history/svelte/index.js';
import { createVanillaUndoHistory } from '../../src/undo-history/vanilla/index.js';
import { useUndoHistory } from '../../src/undo-history/react/index.js';

/** Self-referential no-op inverse — satisfies the recursive `UndoCommand` contract. */
const noopInverse: UndoCommand = {
  execute() {},
  invert() {
    return noopInverse;
  },
};

/** Tiny model: a string buffer whose edits are undoable commands. */
function makeModel(initial = '') {
  let value = initial;
  const opLog: string[] = [];

  function insert(at: number, text: string): UndoCommand {
    return {
      label: `Insert "${text}"`,
      coalesceKey: 'type',
      execute() {
        value = value.slice(0, at) + text + value.slice(at);
        opLog.push(`insert(${at},${text})`);
      },
      invert() {
        return remove(at, text.length);
      },
    };
  }

  function remove(at: number, len: number): UndoCommand {
    const removed = value.slice(at, at + len);
    return {
      label: `Delete "${removed}"`,
      execute() {
        value = value.slice(0, at) + value.slice(at + len);
        opLog.push(`delete(${at},${removed})`);
      },
      invert() {
        return insert(at, removed);
      },
    };
  }

  return {
    get value() {
      return value;
    },
    get opLog() {
      return opLog;
    },
    insert,
    remove,
  };
}

/** Apply a command (the documented pre-push step), then return it. */
function apply(command: UndoCommand): UndoCommand {
  command.execute();
  return command;
}

// ---------------------------------------------------------------------------
// Core state machine
// ---------------------------------------------------------------------------

describe('createUndoHistoryCore', () => {
  test('initial state derives defaults', () => {
    const undo = createUndoHistoryCore();
    expect(undo.state.canUndo).toBe(false);
    expect(undo.state.canRedo).toBe(false);
    expect(undo.state.undoCount).toBe(0);
    expect(undo.state.redoCount).toBe(0);
    expect(undo.state.undoLabel).toBeNull();
    expect(undo.state.redoLabel).toBeNull();
  });

  test('push records a step and exposes its label', () => {
    const undo = createUndoHistoryCore();
    const model = makeModel('hello');
    undo.actions.push(apply(model.insert(5, '!')));
    expect(undo.state.canUndo).toBe(true);
    expect(undo.state.undoCount).toBe(1);
    expect(undo.state.undoLabel).toBe('Insert "!"');
  });

  test('undo executes the inverse and moves the step to redo', () => {
    const undo = createUndoHistoryCore();
    const model = makeModel('hello');
    undo.actions.push(apply(model.insert(5, '!')));
    undo.actions.push(apply(model.insert(0, '>')));
    expect(model.value).toBe('>hello!');

    expect(undo.actions.undo()).toBe(true);
    expect(model.value).toBe('hello!');
    expect(undo.state.canUndo).toBe(true);
    expect(undo.state.canRedo).toBe(true);
    expect(undo.state.redoLabel).toBe('Insert ">"');
    expect(undo.state.undoLabel).toBe('Insert "!"');

    expect(undo.actions.undo()).toBe(true);
    expect(model.value).toBe('hello');
    expect(undo.state.canUndo).toBe(false);
    expect(undo.state.undoLabel).toBeNull();
  });

  test('undo/redo return false when nothing is available', () => {
    const undo = createUndoHistoryCore();
    expect(undo.actions.undo()).toBe(false);
    expect(undo.actions.redo()).toBe(false);
    const model = makeModel();
    undo.actions.push(apply(model.insert(0, 'x')));
    undo.actions.undo();
    expect(undo.actions.undo()).toBe(false);
    expect(undo.actions.redo()).toBe(true);
    expect(undo.actions.redo()).toBe(false);
  });

  test('redo re-executes commands in original order', () => {
    const undo = createUndoHistoryCore();
    const model = makeModel('ab');
    undo.actions.push(apply(model.insert(1, 'X')));
    undo.actions.push(apply(model.insert(3, 'Y')));
    undo.actions.undo();
    undo.actions.undo();
    expect(model.value).toBe('ab');
    expect(undo.actions.redo()).toBe(true);
    expect(model.value).toBe('aXb');
    expect(undo.actions.redo()).toBe(true);
    expect(model.value).toBe('aXbY');
    expect(undo.state.redoCount).toBe(0);
  });

  test('new edits invalidate the redo stack', () => {
    const undo = createUndoHistoryCore();
    const model = makeModel();
    undo.actions.push(apply(model.insert(0, 'a')));
    undo.actions.undo();
    expect(undo.state.canRedo).toBe(true);
    undo.actions.push(apply(model.insert(0, 'b')));
    expect(undo.state.canRedo).toBe(false);
    expect(undo.actions.redo()).toBe(false);
    expect(model.value).toBe('b');
  });

  test('coalescing merges adjacent same-key pushes into one step', () => {
    const undo = createUndoHistoryCore();
    const model = makeModel('abc');
    undo.actions.push(apply(model.insert(3, 'd')), { coalesce: true });
    undo.actions.push(apply(model.insert(4, 'e')), { coalesce: true });
    undo.actions.push(apply(model.insert(5, 'f')), { coalesce: true });
    expect(model.value).toBe('abcdef');
    expect(undo.state.undoCount).toBe(1);

    undo.actions.undo();
    expect(model.value).toBe('abc');
    expect(undo.state.canUndo).toBe(false);
    expect(undo.state.canRedo).toBe(true);
  });

  test('plain push or different key breaks the coalesce window', () => {
    const undo = createUndoHistoryCore();
    const model = makeModel();
    undo.actions.push(apply(model.insert(0, 'a')), { coalesce: true });
    undo.actions.push(apply(model.insert(1, 'b'))); // plain push
    undo.actions.push(apply(model.insert(2, 'c')), { coalesce: true }); // key differs
    expect(undo.state.undoCount).toBe(3);

    undo.actions.undo();
    expect(model.value).toBe('ab');
    undo.actions.undo();
    expect(model.value).toBe('a');
    undo.actions.undo();
    expect(model.value).toBe('');
  });

  test('coalesceKey override wins over the command key', () => {
    const undo = createUndoHistoryCore();
    const model = makeModel();
    undo.actions.push(apply(model.insert(0, 'a')), {
      coalesce: true,
      coalesceKey: 'burst',
    });
    undo.actions.push(apply(model.insert(1, 'b')), {
      coalesce: true,
      coalesceKey: 'burst',
    });
    undo.actions.push(apply(model.insert(2, 'c')), { coalesce: true });
    expect(undo.state.undoCount).toBe(2);
  });

  test('commands without a key or label never coalesce', () => {
    const undo = createUndoHistoryCore();
    const noKey: UndoCommand = {
      execute() {},
      invert() {
        return noopInverse;
      },
    };
    undo.actions.push(noKey, { coalesce: true });
    undo.actions.push(noKey, { coalesce: true });
    expect(undo.state.undoCount).toBe(2);
  });

  test('coalescing falls back to the command label as key', () => {
    const undo = createUndoHistoryCore();
    const sameLabel: UndoCommand = {
      label: 'Typing',
      execute() {},
      invert() {
        return noopInverse;
      },
    };
    undo.actions.push(sameLabel, { coalesce: true });
    undo.actions.push(sameLabel, { coalesce: true });
    undo.actions.push(sameLabel, { coalesce: true });
    expect(undo.state.undoCount).toBe(1);
    expect(undo.state.undoLabel).toBe('Typing');
  });

  test('grouping: one gesture is one undo step, inverts run in reverse', () => {
    const undo = createUndoHistoryCore();
    const model = makeModel('ab');
    undo.actions.beginGroup('Insert pair');
    undo.actions.push(apply(model.insert(0, '1')));
    undo.actions.push(apply(model.insert(1, '2')));
    undo.actions.push(apply(model.insert(2, '3')));
    undo.actions.endGroup();
    expect(model.value).toBe('123ab');
    expect(undo.state.undoCount).toBe(1);
    expect(undo.state.undoLabel).toBe('Insert pair');

    undo.actions.undo();
    expect(model.value).toBe('ab');
    expect(model.opLog.slice(-3)).toEqual([
      'delete(2,3)',
      'delete(1,2)',
      'delete(0,1)',
    ]);
  });

  test('group redo re-executes in original order', () => {
    const undo = createUndoHistoryCore();
    const model = makeModel();
    undo.actions.beginGroup();
    undo.actions.push(apply(model.insert(0, 'a')));
    undo.actions.push(apply(model.insert(1, 'b')));
    undo.actions.endGroup();
    undo.actions.undo();
    undo.actions.redo();
    expect(model.value).toBe('ab');
    expect(model.opLog.slice(-2)).toEqual(['insert(0,a)', 'insert(1,b)']);
  });

  test('pushGroup is a one-call group', () => {
    const undo = createUndoHistoryCore();
    const model = makeModel('x');
    undo.actions.pushGroup(
      [apply(model.insert(1, 'y')), apply(model.insert(2, 'z'))],
      'Type yz',
    );
    expect(model.value).toBe('xyz');
    expect(undo.state.undoCount).toBe(1);
    expect(undo.state.undoLabel).toBe('Type yz');
    undo.actions.undo();
    expect(model.value).toBe('x');
  });

  test('nested groups flatten into the outer step', () => {
    const undo = createUndoHistoryCore();
    const model = makeModel();
    undo.actions.beginGroup('Outer');
    undo.actions.push(apply(model.insert(0, 'a')));
    undo.actions.beginGroup();
    undo.actions.push(apply(model.insert(1, 'b')));
    undo.actions.push(apply(model.insert(2, 'c')));
    undo.actions.endGroup();
    undo.actions.push(apply(model.insert(3, 'd')));
    undo.actions.endGroup();
    expect(model.value).toBe('abcd');
    expect(undo.state.undoCount).toBe(1);
    undo.actions.undo();
    expect(model.value).toBe('');
  });

  test('empty endGroup and empty pushGroup are no-ops', () => {
    const undo = createUndoHistoryCore();
    let calls = 0;
    undo.subscribe(() => calls++);
    undo.actions.beginGroup('Empty');
    undo.actions.endGroup();
    undo.actions.pushGroup([]);
    expect(undo.state.undoCount).toBe(0);
    expect(undo.state.undoLabel).toBeNull();
    expect(calls).toBe(1); // beginGroup only
  });

  test('maxDepth trims the oldest steps', () => {
    const undo = createUndoHistoryCore({ maxDepth: 2 });
    const model = makeModel();
    undo.actions.push(apply(model.insert(0, 'a')));
    undo.actions.push(apply(model.insert(1, 'b')));
    undo.actions.push(apply(model.insert(2, 'c')));
    expect(undo.state.undoCount).toBe(2);
    undo.actions.undo();
    expect(model.value).toBe('ab');
    undo.actions.undo();
    expect(model.value).toBe('a');
    expect(undo.actions.undo()).toBe(false);
  });

  test('maxDepth <= 0 means unlimited', () => {
    const undo = createUndoHistoryCore({ maxDepth: 0 });
    const model = makeModel();
    for (let i = 0; i < 500; i++) {
      undo.actions.push(apply(model.insert(i, 'x')));
    }
    expect(undo.state.undoCount).toBe(500);
  });

  test('clear drops everything', () => {
    const undo = createUndoHistoryCore();
    const model = makeModel();
    undo.actions.push(apply(model.insert(0, 'a')));
    undo.actions.undo();
    undo.actions.beginGroup();
    undo.actions.clear();
    expect(undo.state.canUndo).toBe(false);
    expect(undo.state.canRedo).toBe(false);
    expect(undo.state.undoCount).toBe(0);
    expect(undo.state.redoCount).toBe(0);
    // Group stays open-safe: subsequent pushes commit normally.
    undo.actions.push(apply(model.insert(0, 'b')));
    expect(undo.state.undoCount).toBe(1);
    expect(model.value).toBe('b');
  });

  test('subscribe notifies per mutation and unsubscribes', () => {
    const undo = createUndoHistoryCore();
    const model = makeModel();
    let calls = 0;
    const unsubscribe = undo.subscribe(() => calls++);
    undo.actions.push(apply(model.insert(0, 'a')));
    undo.actions.push(apply(model.insert(1, 'b')), { coalesce: true });
    undo.actions.undo();
    undo.actions.redo();
    expect(calls).toBe(4);
    unsubscribe();
    undo.actions.clear();
    expect(calls).toBe(4);
  });

  test('no-op actions do not notify', () => {
    const undo = createUndoHistoryCore();
    let calls = 0;
    undo.subscribe(() => calls++);
    expect(undo.actions.undo()).toBe(false);
    expect(undo.actions.redo()).toBe(false);
    undo.actions.endGroup(); // no group open
    undo.actions.pushGroup([]);
    expect(calls).toBe(0);
  });

  test('state is pure JSON — no functions leak', () => {
    const undo = createUndoHistoryCore();
    const model = makeModel('hi');
    undo.actions.push(apply(model.insert(2, '!')), { coalesce: true });
    const serialized = JSON.parse(JSON.stringify(undo.state));
    expect(serialized).toEqual({
      canUndo: true,
      canRedo: false,
      undoCount: 1,
      redoCount: 0,
      undoLabel: 'Insert "!"',
      redoLabel: null,
    });
  });
});

// ---------------------------------------------------------------------------
// Bridge contract + dual adapter (ADR 0034 §2/§3)
// ---------------------------------------------------------------------------

describe('undo-history adapters', () => {
  test('svelte + vanilla mounted on one shared core agree', () => {
    const core = createUndoHistoryCore();
    const store = createUndoHistoryStore(core);
    const vanilla = createVanillaUndoHistory(core);
    const labels: (string | null)[] = [];
    const vanillaStates: boolean[] = [];
    const unsubLabel = store.undoLabel.subscribe((l) => labels.push(l));
    const unsubVanilla = vanilla.subscribe(() =>
      vanillaStates.push(vanilla.state.canUndo),
    );
    expect(labels).toEqual([null]);
    expect(store.core).toBe(core);
    expect(vanilla).toBe(core);

    const model = makeModel();
    store.actions.push(apply(model.insert(0, 'a')), { coalesce: true });
    store.actions.push(apply(model.insert(1, 'b')), { coalesce: true });
    expect(labels).toEqual([null, 'Insert "a"', 'Insert "a"']);
    expect(vanillaStates).toEqual([true, true]);

    expect(vanilla.actions.undo()).toBe(true);
    expect(model.value).toBe('');
    expect(store.state.subscribe).toBeTypeOf('function');
    expect(store.canUndo.subscribe).toBeTypeOf('function');
    expect(vanilla.state.canRedo).toBe(true);

    unsubLabel();
    unsubVanilla();
  });

  test('react useUndoHistory is a function', () => {
    expect(typeof useUndoHistory).toBe('function');
  });

  test('svelte createUndoHistoryStore returns the documented surface', () => {
    const store = createUndoHistoryStore();
    expect(typeof store.actions.push).toBe('function');
    expect(typeof store.actions.pushGroup).toBe('function');
    expect(typeof store.actions.beginGroup).toBe('function');
    expect(typeof store.actions.endGroup).toBe('function');
    expect(typeof store.actions.undo).toBe('function');
    expect(typeof store.actions.redo).toBe('function');
    expect(typeof store.actions.clear).toBe('function');
    expect(typeof store.state.subscribe).toBe('function');
    expect(typeof store.canUndo.subscribe).toBe('function');
    expect(typeof store.canRedo.subscribe).toBe('function');
    expect(typeof store.undoLabel.subscribe).toBe('function');
    expect(typeof store.redoLabel.subscribe).toBe('function');
  });

  test('vanilla returns the core itself for shared mounts', () => {
    const core = createUndoHistoryCore();
    expect(createVanillaUndoHistory(core)).toBe(core);
    const fresh = createVanillaUndoHistory({ maxDepth: 3 });
    expect(fresh).not.toBe(core);
    expect(fresh.state.canUndo).toBe(false);
  });
});
