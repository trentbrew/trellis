# formula-core v1 — semantics (frozen slice 1)

ADR [0059](../../docs/adr/0059-frozen-formula-core-dialect-adapters.md) slice 1.

## Dialects

| Tag | Surface | Parse entry |
| --- | ------- | ----------- |
| `kernel-fn` | `$mul($a, $b)` | Function calls + `$field` refs |
| `cms-brace` | `{field} * 2` | Infix numeric + `{name}` refs |
| `pb-compat` | `@field * 2` | Infix numeric + `@name` / `@request.*`; rejects strings and `concat()` |

## Context

```ts
interface EvalContextV1 {
  record: Record<string, unknown>;
  request?: Record<string, unknown>;
}
```

- Field paths resolve on `record` unless the ref is `@request.*` (pb-compat).
- Missing values → `null`.
- Single-element arrays unwrap once before numeric coercion.

## Null literal

Kernel-fn `null` token parses to IR `{ kind: 'null' }` and evaluates to JavaScript `null` (aligned with `ExprEvaluator`). Distinct from missing fields, which resolve to `null` then coerce in numeric ops.

## Numeric coercion

Binary `+ - * /` coerce operands with `Number()`. Operand `null` → `0`.

## Builtins (kernel-fn)

`$add`, `$sub`, `$mul`, `$div`, `$if`, `$gt`, `$eq` — arity per kernel `ExprEvaluator` v1 subset.

## Security

No `eval` or `new Function` in this module. Parse-only evaluation.

## Round-trip

`serialize(parse(expr, dialect), dialect)` is canonical for corpus rows marked `roundtrip: true`.

## Adapters (slice 2)

Surface entrypoints in `adapters/`:

| Module | API |
| ------ | --- |
| `kernel-fn.ts` | `evaluateKernel(expr, ctx)` |
| `cms-brace.ts` | `evaluateCms(expr, ctx)` |
| `pb-compat.ts` | `evaluatePb`, `assertPbSurface`, `classifyPbCompat` |

`classifyPbCompat` matches shablon `classifyFormula` labels for PB/CMS fence (`cms-numeric` \| `shablon-rich` \| `invalid`). Classification is regex + parse-derived; shablon may delegate in a later slice without a second evaluator.

## Out of scope (slice 1)

Boolean `&&` in pb filters, graph edges, rollups, `$now`, museum `=` prefix.
