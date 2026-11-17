/**
 * Value-free query fingerprints for Decision traces (TRL-74).
 *
 * A shape clusters calls by their *structure* — tool, mode/type, filter keys,
 * ordering — without persisting entity ids, search text, paths, or any other
 * argument value. Only whitelisted key names and enum-ish fields are used.
 */

const MAX_SHAPE_LENGTH = 120;

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function objectKeys(value: unknown): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.keys(value as Record<string, unknown>).sort();
}

function cap(shape: string): string {
  return shape.length <= MAX_SHAPE_LENGTH
    ? shape
    : `${shape.slice(0, MAX_SHAPE_LENGTH - 1)}…`;
}

function joinKeys(keys: string[]): string {
  return keys.length ? keys.join('+') : '-';
}

export function deriveQueryShape(
  toolName: string,
  params: Record<string, unknown> = {},
): string {
  switch (toolName) {
    case 'trellis_store_query':
      return cap(
        `store_query:${text(params.mode) ?? '-'}:${text(params.type) ?? '-'}:${joinKeys(
          objectKeys(params.filter),
        )}`,
      );
    case 'trellis_issue_list':
      return cap(
        `issue_list:${text(params.status) ?? '-'}:${joinKeys(
          ['parent', 'label', 'priority']
            .filter((key) => params[key] !== undefined && params[key] !== null)
            .sort(),
        )}`,
      );
    case 'list_entities':
      return cap(
        `list_entities:${text(params.type) ?? '-'}:${joinKeys(
          objectKeys(params.filter),
        )}:${text(params.orderBy) ?? '-'}`,
      );
    default:
      return cap(toolName);
  }
}
