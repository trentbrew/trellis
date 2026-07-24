# Renderer pack registry — shadcn-protocol distribution (decision)

**Spike:** TRL-272 · **Proposal:** TRL-275  
**Related:** TRL-156+ (unified theme contract) · [Canvas UI](https://canvasui.dev/) (reference)  
**Status:** **Decision recorded** — adopt shadcn-style registry; defer runtime loader

---

## Decision

**User-defined renderer packs ship like shadcn / Canvas UI components — not like npm runtime plugins.**

| Layer | What it is | How it ships |
| ----- | ---------- | ------------ |
| **Shell pack** | TML `<template>` + `registerShell()` stub | `trellis shell add @trellis/issue-card-kanban` copies source into repo |
| **Primitive pack** | Optional effect engine (WebGL, dialog stack, datatable) | `trellis shell add @trellis/primitive-glass` — same protocol, different manifest kind |
| **Theme** | Token contract only | Packs declare `themeContract: unified-v1`; desk theme stays canonical |

**Yes:** registry + CLI + MCP catalog + source-in-repo + framework flavors for *external* surfaces (Vue sprite-client).  
**No (for now):** runtime URL loader, signed marketplace, hot-swap packs in production admin, replacing esbuild dev for first-party shells.

**Authoring form (deferred):** shells/projects may eventually be written as `.tml` (see [`tml-shell-dsl.md`](../../planning/tml-shell-dsl.md)); packs still install source the compiler or IR understands.

Inspired by [Canvas UI](https://canvasui.dev/): copy-paste ownership, agent-installable via MCP, multi-flavor emitters — applied to **TML shells and primitives**, not React-as-projection-core.

---

## Problem (restated)

Theme contract (TRL-156+) covers **tokens**. Shell registry (Phase 3–4) covers **runtime resolution**. Neither answers **how a desk or agent adds a new shell** without editing `admin.html` by hand.

The old sketch (`RendererPack` runtime loader + blob store) solved the wrong shape. Trellis is local-first; **you should own the code**.

---

## Architecture — two pack kinds (do not collapse)

Aligns with `docs/planning/tml-thing-shell-primitive.md`:

```
Graph query  →  shellForVantage(kind, host)  →  hydrateShellSlots
                                                      ↓
                                              optional primitive mount
                                              (WebGL, editor, datatable)
```

### Shell pack

- **Contains:** `<template id="shell-…">` with `tml-*` bindings, small `register.ts` that calls `registerShell(id, template)`
- **Install target:** `src/ui/shells/<pack-id>/` (first-party) or `.trellis/shells/<pack-id>/` (desk-local)
- **Connect hook:** `admin-shell.ts` imports installed registrations before `hydrateShellSlots` (explicit imports or generated manifest — TBD in impl spike)

### Primitive pack

- **Contains:** mount/destroy module (vanilla TS first; Vue/React flavors for sprite-client only)
- **Install target:** `src/ui/primitives/<pack-id>/`
- **Contract:** shell template references primitive via `data-tml-primitive="glass"` or existing datatable pattern
- **Canvas UI class:** WebGL / html-in-canvas effects live here — **never** replace TML binding sites

### Theme relationship

```json
{
  "name": "@trellis/issue-card-kanban",
  "type": "shell",
  "themeContract": "unified-v1",
  "shellId": "issue.card",
  "files": ["template.html", "register.ts"]
}
```

Packs **consume** `--trellis-*` tokens from `runtime-theme.css`; they do not fork the theme. Phase C vantage hooks (TRL-164+) apply to installed shells the same as built-in templates.

---

## Distribution protocol (shadcn-compatible shape)

MVP registry entry (conceptual):

```json
{
  "name": "@trellis/issue-card-kanban",
  "type": "shell",
  "title": "Issue card (kanban)",
  "description": "Single-source issue.card shell for kanban columns",
  "files": [
    { "path": "template.html", "target": "src/ui/shells/issue-card-kanban/template.html" },
    { "path": "register.ts", "target": "src/ui/shells/issue-card-kanban/register.ts" }
  ],
  "registryDependencies": [],
  "themeContract": "unified-v1"
}
```

**CLI (future):**

```bash
trellis shell add @trellis/issue-card-kanban
# → copies files, appends import to shells/manifest.ts (or prompts)
```

**MCP (future):** Trellis MCP tool `list_shell_packs` / `install_shell_pack` mirroring shadcn MCP — agents install from prompt without hand-editing admin.

**Framework flavors:** admin = vanilla TS + TML. Sprite-client / external = optional `@trellis/foo-vue` entries in same registry (separate file targets).

---

## Impact on existing work

### Unchanged — keep shipping as planned

| Work | Why unaffected |
| ---- | -------------- |
| **Phase 0–1** (TRL-248/249, `tml-op`, `admin-shell.ts`) | Pack direction is distribution; write path and driver contract stay |
| **Phase 2** (TRL-250, PeerDriver opt-in) | Materialization path is independent of how shells are copied into repo |
| **Phase 3** (`tml-shell-registry`, `registerShell`, `hydrateShellSlots`) | **This is the runtime hook packs plug into** — Phase 3 was prerequisite, not throwaway |
| **Phase 4** (TRL-269, `shellForVantage`, lane shells, unified query) | Still first-party templates in `admin.html` until extracted; pack install is **Phase 6+** infra |
| **Phase 5** (TRL-273, op parity) | All shells/primitives must use `TmlDriver.op` — pack manifest should document required ops |
| **Unified theme TRL-156+** | Still canonical; packs declare compatibility, don't embed parallel token systems |
| **admin-dev** (esbuild watch + SSE) | Still builds first-party bundle; installed pack files are watched like any new `src/ui/**` entry |

### Validated — this direction confirms prior bets

| Prior bet | How shadcn-protocol reinforces it |
| --------- | --------------------------------- |
| Thing → Shell → Primitive (three layers) | Shell packs vs primitive packs map 1:1 |
| TML-first internal UI | Packs are HTML templates + TS registration, not React SFCs in admin |
| Shell registry over parallel templates | Registry API is what installed packs call — extraction of built-in shells into packs is mechanical later |
| Local-first / you own state | Source-in-repo matches VCS + lane ownership; no phone-home loader |
| Agent experience | MCP install path is the GTM hook Canvas UI already proved |

### New work — does **not** block Phase 4–5

| Wedge | Suggested placement | Depends on |
| ----- | ------------------- | ---------- |
| Registry JSON + `trellis shell add` CLI | New epic under TRL-247 (Phase 6) or extend TRL-272 | Phase 4 closed |
| Generated `shells/manifest.ts` import barrel | Impl child of above | CLI |
| MCP shell catalog tools | AgentE / MCP server | Registry |
| Extract built-in `#shell-*` templates to `@trellis/*` packs | Optional hygiene | CLI + Phase 4 |
| `@canvas-ui/*` as **primitive** packs only | TRL-272 follow-on | Theme contract Phase A |

### Explicit non-goals (unchanged)

- Runtime pack loader from URL / blob store / lane op-log
- Marketplace, signing, paid registry
- HTML-in-canvas as default cell renderer in admin grid
- Replacing `mountAdminDatatable` with a pack in Phase 4
- Vue/React shells inside admin Operate surface

---

## Sequencing recommendation

```
Now     Phase 4 vantage shells (first-party admin.html)     TRL-269
Next    Phase 5 op parity                                   TRL-273
Then    Theme contract Phase A (tokens land)                 TRL-156+
Later   shadcn-protocol CLI + registry + MCP               TRL-272 impl
Later   Optional: extract built-in shells → @trellis/* packs
Optional: Canvas UI primitives as @trellis/primitive-* packs (juice only)
```

**Do not** wait on pack infra to finish Phase 4. **Do** design Phase 4 templates so extraction to a pack is a file move + `registerShell` import, not a rewrite.

---

## Acceptance criteria (spike TRL-272) — updated

- [x] Decision recorded: **shadcn-protocol source-in-repo**, not runtime loader
- [x] This doc distinguishes **shell pack** vs **primitive pack**
- [ ] Child issue: **Impl spike — registry JSON schema + `trellis shell add` stub** (queue after Phase 4)
- [ ] Theme contract spec cites pack `themeContract` field when TRL-157 lands

---

## Open questions (defer to impl spike)

1. **Import strategy:** explicit `import './shells/issue-card-kanban/register.js'` vs generated manifest committed to repo?
2. **Desk-local path:** `.trellis/shells/` vs always `src/ui/shells/`?
3. **Override precedence:** desk pack replaces built-in `ShellId` or registers alternate id (`issue.card.craftpunk`)?
4. **Canvas UI license:** MIT + Commons Clause — verify primitive pack redistribution policy before bundling.

---

## References

- [Canvas UI](https://canvasui.dev/) — registry, MCP, multi-framework emitters, WebGL degradation
- `docs/planning/tml-thing-shell-primitive.md` — Thing / Shell / Primitive layers
- `docs/specs/tml-phase-3-shell-registry.md` — `registerShell` / `hydrateShellSlots`
- `docs/specs/tml-phase-4-vantage-shell.md` — `shellForVantage`; user packs remain non-goal for Phase 4 AC
