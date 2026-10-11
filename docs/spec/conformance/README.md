# Journal conformance corpus

Fixtures and a **zero-dependency validator** for the `.trellis` journal
envelope. The normative rules are
[`../JOURNAL-FORMAT.md`](../JOURNAL-FORMAT.md) §3.

## Files

| File | Purpose |
| --- | --- |
| `validate.mjs` | Independent validator — reimplements §3 from the spec text, imports **no kernel code**. Runs on Node ≥ 20 or Bun. |
| `make-fixtures.mjs` | Fixture generator — mints the fixtures with the **reference implementation** (`src/vcs/ops.ts`, `src/identity/signing-middleware.ts`). Bun only. |
| `run-conformance.mjs` | Runs every fixture against the validator and asserts the expected verdict. |
| `fixtures/*.jsonl` | Journal fixtures (one op per line). |
| `fixtures/keys.json` | Trusted keyring for signature verification (identity id → SPKI DER base64). |

## Run

```bash
# whole corpus (exit 0 = all fixtures behaved as expected)
bun docs/spec/conformance/run-conformance.mjs

# one journal
node docs/spec/conformance/validate.mjs docs/spec/conformance/fixtures/linear-signed.jsonl \
  --keyring docs/spec/conformance/fixtures/keys.json

# regenerate fixtures with the current mint code (rewrites fixtures/ + keys.json)
bun docs/spec/conformance/make-fixtures.mjs
```

## Expected verdicts

| Fixture | Expected | Why |
| --- | --- | --- |
| `linear-signed.jsonl` | **valid** | signed genesis + two chained signed ops |
| `unsigned-prefix.jsonl` | **valid** | unsigned genesis is admissible before the first signed op |
| `signed-then-unsigned.jsonl` | **invalid** | unsigned op after the first signed op (§3.4.5) |
| `tampered-hash.jsonl` | **invalid** | payload mutated after minting — hash recompute fails (§3.4.2) |
| `broken-chain.jsonl` | **invalid** | `previousHash` does not chain (§3.4.3) |
| `diverged-dag.jsonl` | **valid** | v2 `parents[]`: two roots + a merge op |
| `unknown-parent.jsonl` | **invalid** | v2 op references a parent not in the journal |

## v2 envelope (parents[])

`feat/envelope-v2` implements the journal v2 envelope
(`docs/spec/JOURNAL-FORMAT.md` §6): `v: 2` + `parents[]` (DAG) instead of
`previousHash`, signed and hashed by the same scheme (the body hash excludes
the signature fields; `hash` covers them). The validator dispatches on
`op.v`, so v1 fixtures keep verifying byte-for-byte. v2 roots
(`parents: []`) may start a new history line anywhere in a journal.

## Rules the fixtures do not yet cover

- Device-key resolution (`signedWith`) — covered by identity tests, not here.
- Legacy v1 kernel ops (`{valid: true, legacy: true}` grandfathering) — see
  `src/core/persist/canonical-op.ts`; belongs in its own kernel-op corpus.

## Note on fixture regeneration

`make-fixtures.mjs` generates a fresh Ed25519 keypair per run, so regenerating
rewrites `keys.json` and every signature. The **committed** fixture + keyring
pair is the source of truth; regenerate only when the mint implementation
changes, and review the diff.
