# Profile-context eval corpus

Frozen preference-sensitive tasks for `trellis eval profile-context`.

- **Freeze date:** 2026-09-23
- **Do not edit** `tasks.jsonl` mid-comparison — bump version in a new file instead.
- **Arms:** `off` (control) vs `session` | `pack` | `both`

Run:

```bash
trellis eval profile-context --arm off --trials 3
trellis eval profile-context --arm session --trials 3
bun experiments/profile-context/check.ts
```
