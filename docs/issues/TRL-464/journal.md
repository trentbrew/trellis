## 2026-10-02 — architect · spec

**Hop:** ADR 0057 (reviewer consult incorporated) → spec + issue scaffold.

**Delivered:**

- `docs/specs/trellis-admin-issue-docs.md` — normative contract (HTTP, security, three-repo phases).
- `docs/issues/TRL-464/summary.md` + `visuals/issue-docs-read-projection.mmd`.

**Blocked:** `trellis issue create` timed out on stale `.trellis/ops.json.lock` while
`just trellis admin` runs. Reserved TRL-463 (proposal) / TRL-464 (spec) in docs;
human or strategist should create graph issues when lock clears, then:

```bash
cd kernel
trellis issue create -t "Proposal: turtle-admin issue dialog — long-form docs (ADR 0057)" \
  -l proposal,admin,needs-e2e,cohesion -P high -S queue \
  --desc "ADR 0057. GET /api/issues/:id/docs; read-only dialog body."
# If id ≠ TRL-463, mv docs/issues/TRL-464 to match spec issue id

trellis issue create -t "Spec: turtle-admin issue dialog — long-form docs (ADR 0057)" \
  --parent TRL-463 -l spec,admin,needs-e2e,cohesion -P high -S queue \
  --desc "See docs/specs/trellis-admin-issue-docs.md" \
  --ac "test -f docs/specs/trellis-admin-issue-docs.md" \
  --ac "test:grep -q assertIssueDocId docs/specs/trellis-admin-issue-docs.md"
# … mirror §10 AC from spec
trellis issue start TRL-464
trellis issue check TRL-464
```

**Recommend:** Accept ADR 0057 before Executor P0.
