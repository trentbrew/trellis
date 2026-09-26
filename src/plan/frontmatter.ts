/**
 * Minimal YAML frontmatter parse/serialize for plan artifacts (no dependency).
 */

import type { PlanArtifactFrontmatter } from './types.js';

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function splitFrontmatter(
  content: string,
): { frontmatter: string; body: string } | null {
  const m = content.match(FM_RE);
  if (!m) return null;
  return { frontmatter: m[1], body: m[2] };
}

function unquote(value: string): string {
  const t = value.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1);
  }
  return t;
}

/** Best-effort parse of plan frontmatter fields we care about. */
export function parsePlanFrontmatter(raw: string): Partial<PlanArtifactFrontmatter> {
  const out: Partial<PlanArtifactFrontmatter> = {};
  const lines = raw.split('\n');
  let inTodos = false;
  let currentTodo: { id: string; content: string; status?: string } | null = null;

  for (const line of lines) {
    if (line.startsWith('todos:')) {
      inTodos = true;
      out.todos = out.todos ?? [];
      continue;
    }
    if (inTodos) {
      if (/^\s+- id:/.test(line)) {
        if (currentTodo) out.todos!.push(currentTodo);
        currentTodo = {
          id: unquote(line.replace(/^\s+- id:\s*/, '')),
          content: '',
        };
        continue;
      }
      if (currentTodo && /^\s+content:/.test(line)) {
        currentTodo.content = unquote(line.replace(/^\s+content:\s*/, ''));
        continue;
      }
      if (currentTodo && /^\s+status:/.test(line)) {
        currentTodo.status = unquote(line.replace(/^\s+status:\s*/, ''));
        continue;
      }
      if (/^\S/.test(line)) {
        if (currentTodo) out.todos!.push(currentTodo);
        currentTodo = null;
        inTodos = false;
      }
    }

    const kv = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (!kv || inTodos) continue;
    const key = kv[1];
    const value = unquote(kv[2]);
    if (key === 'name') out.name = value;
    else if (key === 'overview') out.overview = value;
    else if (key === 'status') out.status = value as PlanArtifactFrontmatter['status'];
    else if (key === 'issue') out.issue = value;
    else if (key === 'date') out.date = value;
    else if (key === 'isProject') out.isProject = value === 'true';
  }
  if (currentTodo) {
    out.todos = out.todos ?? [];
    out.todos.push(currentTodo);
  }
  return out;
}

function yamlQuote(value: string): string {
  if (/[:#\n"'&*]|^\s|\s$/.test(value)) {
    return JSON.stringify(value);
  }
  return value;
}

export function serializePlanDocument(
  fm: PlanArtifactFrontmatter,
  body: string,
): string {
  const lines: string[] = ['---'];
  if (fm.name) lines.push(`name: ${yamlQuote(fm.name)}`);
  if (fm.overview) lines.push(`overview: ${yamlQuote(fm.overview)}`);
  lines.push(`status: ${fm.status}`);
  if (fm.issue) lines.push(`issue: ${fm.issue}`);
  lines.push(`date: ${fm.date}`);
  if (fm.depends_on?.length) {
    lines.push('depends_on:');
    for (const d of fm.depends_on) lines.push(`  - ${d}`);
  }
  if (fm.source) {
    lines.push('source:');
    lines.push(`  tool: ${fm.source.tool}`);
    lines.push(`  path: ${yamlQuote(fm.source.path)}`);
    lines.push(`  capturedAt: ${fm.source.capturedAt}`);
    if (fm.source.session) {
      lines.push(`  session: ${yamlQuote(fm.source.session)}`);
    }
  }
  if (fm.todos?.length) {
    lines.push('todos:');
    for (const t of fm.todos) {
      lines.push(`  - id: ${t.id}`);
      lines.push(`    content: ${yamlQuote(t.content)}`);
      if (t.status) lines.push(`    status: ${t.status}`);
    }
  }
  if (fm.isProject !== undefined) {
    lines.push(`isProject: ${fm.isProject}`);
  }
  lines.push('---', '');
  const trimmedBody = body.replace(/^\n+/, '');
  return `${lines.join('\n')}${trimmedBody.endsWith('\n') || trimmedBody.length === 0 ? trimmedBody : `${trimmedBody}\n`}`;
}
