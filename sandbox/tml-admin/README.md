# sandbox/tml-admin — Operate as `.tml` (reference)

**Status:** north-star reference only — **not** loaded by `admin.html` or the TML runtime yet.  
**Purpose:** Authoring shape for future compiler / validation; keep twins next to source.

Related: planning note TBD `docs/planning/tml-shell-dsl.md` · live IR in [`src/ui/admin.html`](../../src/ui/admin.html).

## Layout

```
sandbox/tml-admin/
  shells/          # projection templates (kind × density)
  projects/        # query + each + use
  resolve/         # kind × vantage × salience → shell id
  ir/              # resolved HTML IR twins (today’s attribute dialect)
  README.md
```

## Conventions

| File | Role |
|------|------|
| `*.tml` | Desired authoring DSL |
| `ir/*.html` | What it compiles to **today** (match admin where possible) |

Ephemeral chrome (sidebar, crumbs, dialog) stays in `admin.html` until shelled.  
Primitives (`datatable`, `causal-graph`) stay TypeScript under `src/ui/`.

## Validate later

When a compiler exists:

1. Compile `shells/` + `projects/` → HTML fragments  
2. Diff against `ir/` (or against extracted templates from `admin.html`)  
3. Mount under a sterile route for e2e

Until then: treat this tree as the **spec fixture** for agent/human authoring experiments.
