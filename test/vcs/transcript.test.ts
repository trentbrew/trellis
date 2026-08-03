import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TrellisVcsEngine } from '../../src/engine.js';
import {
  readTranscriptConfig,
  recordChatMessage,
  listChatMessages,
  transcriptsEnabled,
} from '../../src/vcs/transcript.js';
import { isLocalOnlyOpKind } from '../../src/vcs/sync-policy.js';

function makeRepo(transcripts?: { enabled?: boolean; sync?: boolean }): string {
  const root = mkdtempSync(join(tmpdir(), 'trellis-transcript-'));
  mkdirSync(join(root, '.trellis'), { recursive: true });
  writeFileSync(
    join(root, '.trellis', 'config.json'),
    JSON.stringify({ transcripts: transcripts ?? {} }),
  );
  return root;
}

describe('readTranscriptConfig', () => {
  it('defaults to disabled when absent', () => {
    const root = makeRepo();
    expect(readTranscriptConfig(root)).toEqual({ enabled: false, sync: false });
    expect(transcriptsEnabled(root)).toBe(false);
  });

  it('reads explicit enable', () => {
    const root = makeRepo({ enabled: true });
    expect(readTranscriptConfig(root)).toEqual({ enabled: true, sync: false });
    expect(transcriptsEnabled(root)).toBe(true);
  });

  it('tolerates a missing config file', () => {
    const root = mkdtempSync(join(tmpdir(), 'trellis-transcript-none-'));
    expect(readTranscriptConfig(root)).toEqual({ enabled: false, sync: false });
  });
});

describe('recordChatMessage', () => {
  let root: string;
  let engine: TrellisVcsEngine;

  beforeEach(async () => {
    root = makeRepo({ enabled: true });
    engine = new TrellisVcsEngine({ rootPath: root, agentId: 'agent:test' });
    await engine.initRepo();
  });

  it('records a chat:message op with role, text, tokens', async () => {
    const op = await engine.recordChatMessage({
      sessionId: 'sess_1',
      laneId: 'lane-x',
      role: 'assistant',
      text: 'hello graph',
      tokens: 42,
    });
    expect(op).not.toBeNull();
    expect(op!.kind).toBe('vcs:chatMessage');
    expect(op!.vcs.chatRole).toBe('assistant');
    expect(op!.vcs.chatText).toBe('hello graph');
    expect(op!.vcs.chatLaneId).toBe('lane-x');
    expect(op!.vcs.chatTokens).toBe(42);
  });

  it('returns null when transcripts are disabled', async () => {
    const disabled = makeRepo({ enabled: false });
    const other = new TrellisVcsEngine({
      rootPath: disabled,
      agentId: 'agent:test',
    });
    await other.initRepo();
    const op = await other.recordChatMessage({
      sessionId: 'sess_1',
      role: 'user',
      text: 'secret',
    });
    expect(op).toBeNull();
  });

  it('lists messages most recent first, filterable by lane', async () => {
    await engine.recordChatMessage({ sessionId: 's1', laneId: 'lane-a', role: 'user', text: 'one' });
    await engine.recordChatMessage({ sessionId: 's1', laneId: 'lane-a', role: 'assistant', text: 'two' });
    await engine.recordChatMessage({ sessionId: 's2', laneId: 'lane-b', role: 'user', text: 'three' });

    const all = await engine.listChatMessages();
    expect(all.map((r) => r.op.vcs.chatText)).toEqual(['three', 'two', 'one']);

    const laneA = await engine.listChatMessages({ laneId: 'lane-a' });
    expect(laneA.map((r) => r.op.vcs.chatText)).toEqual(['two', 'one']);

    const s2 = await engine.listChatMessages({ sessionId: 's2' });
    expect(s2.map((r) => r.op.vcs.chatText)).toEqual(['three']);
  });
});

describe('local-only sync policy', () => {
  it('marks chat messages local-only', () => {
    expect(isLocalOnlyOpKind('vcs:chatMessage')).toBe(true);
    expect(isLocalOnlyOpKind('vcs:fileAdd')).toBe(false);
  });
});

describe('transcript decompose', () => {
  it('decomposes chat ops into conversation/message entities', async () => {
    const root = makeRepo({ enabled: true });
    const engine = new TrellisVcsEngine({
      rootPath: root,
      agentId: 'agent:test',
    });
    await engine.initRepo();
    const op = (await engine.recordChatMessage({
      sessionId: 'sess_decomp',
      laneId: 'lane-x',
      role: 'tool',
      toolName: 'bash',
      text: 'ls -la',
    }))!;

    const store = engine.getEavStore();
    const msg = `message:${op.hash}`;
    const facts = store.getFactsByEntity(msg);
    expect(facts.some((f) => f.a === 'type' && f.v === 'ChatMessage')).toBe(
      true,
    );
    expect(facts.some((f) => f.a === 'role' && f.v === 'tool')).toBe(true);
    expect(facts.some((f) => f.a === 'text' && f.v === 'ls -la')).toBe(true);
    expect(facts.some((f) => f.a === 'toolName' && f.v === 'bash')).toBe(true);

    const links = store.getLinksByEntity('conversation:sess_decomp');
    expect(links.some((l) => l.a === 'hasMessage' && l.e2 === msg)).toBe(true);
  });
});
