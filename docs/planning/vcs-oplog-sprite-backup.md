# VCS op-log remote peer (sprite) — seed for the GitHub analog

**Status:** Proposal / backlog (architectural seed)  
**Date:** 2026-07-21  
**Issue:** TRL-222  
**Relates to:** JSONL journal wipe (2026-07-21), `turtle-cloud-pricing.md`,
op-log JSONL (ADR 0008 family), peer sync / Iroh (future transport)

## Thesis — two peers, or it isn’t truth

A causal ledger is not **truth** while only one party holds it. Truth requires
**at least two peers** that can attest the same op chain — same tail hash, same
content-addressed history. One peer is a hypothesis; two is a witness.

| Peer | Role |
| ---- | ---- |
| **Local** (laptop / lane worktree) | Primary writer — where work happens |
| **Default remote** (sprite) | Second witness — durable mirror, not authority |

Local remains **primary for writes**. The sprite is the **default second peer**
provisioned at init (or first `trellis remote add`). It does not own state; it
**holds a copy** the local peer can reconcile against. If local is wiped and the
sprite still has the chain, truth survives.

This is the **seed of the GitHub analog**: not “hosting git repos,” but
**named remotes for op-log ledgers** — push, pull, compare tails, restore,
eventually fork/clone and social discovery. GitHub = social layer on git remotes;
Trellis remote = social layer on **causal op journals** (issues, lanes, graph).

```text
         ┌─────────────┐         push / pull          ┌─────────────┐
         │   local     │ ◄──────────────────────────► │   sprite    │
         │  .trellis/  │    tail hash + JSONL ack     │  (default   │
         │  ops.jsonl  │                              │   remote)   │
         └─────────────┘                              └─────────────┘
              │                                              │
              └──────── both must agree on tail ──────────────┘
                    for the ledger to count as "settled"
```

**Naming (GitHub analog, Trellis-native):**

| Git | Trellis (this seed → product) |
| --- | ----------------------------- |
| `origin` | `default remote` → sprite URL in `.trellis/config.json` |
| `git push` | `trellis remote push` / post-promote auto-push |
| `git fetch` | `trellis remote pull` / tail compare |
| clone | `trellis init --remote <url>` or import op chain |
| GitHub.com | Room / org / public ledger index (later) |

Backup is not a side feature — it is **peer #2**. The wipe incident is proof:
single-peer “truth” was fiction.

## Why (incident)

`.trellis/ops.json` (+ single-slot `.bak`) was a **single-peer ledger**. One bad
CLI (`repair` on JSONL) erased it; `.bak` was overwritten on the next write.
Time Machine absent. Lane journals are not a drop-in integration restore.

Need: **default second peer** that holds append-friendly, versioned mirrors of
the integration journal (and optionally lanes). Never run array-era repair on
JSONL at the remote.

## Non-goals (v0)

- Cloud **owning** primary state
- Full social GitHub product (stars, PRs UI) — this doc is the **ledger remote** seed only
- Replacing `lane promote` / future Iroh mesh (sprite is one peer; mesh adds more)

## Shape: default remote sprite

One Fly Sprite (or per-repo sprite) provisioned as **`remote: default`** — second
peer for named repos.

```text
laptop ──push──► sprite:<repo-slug>.sprites.app
                    │
                    ├─ /ledger/ops.jsonl              (tip mirror)
                    ├─ /ledger/checkpoints/<hash>/    (immutable)
                    └─ /ledger/META.json              (tail, format, cli version)
```

CLI surface evolves from `backup` → **`remote`** (backup = push to default peer):

```bash
trellis remote push          # ack tail on default sprite
trellis remote pull          # fetch if sprite ahead / diverged
trellis remote status        # local tail vs remote tail
trellis init --remote <url>  # new repo with second peer from day one
```

### Push triggers (v0)

| Trigger | Cadence |
| ------- | ------- |
| `trellis remote push` | Manual |
| Post-`lane promote` / `issue close` | Hook / CLI |
| Periodic (`trellis remote watch`) | e.g. 15m if dirty |
| Pre-`repair` | **Hard gate** — no repair unless remote ack within N minutes or `--i-know` |

### Protocol (v0 — dumb and safe)

1. Client reads local JSONL: `tailHash`, `sha256`, `byteLength`, `format: jsonl`.
2. `POST /v0/ledger/push` — append since last ack or full checkpoint.
3. Remote stores immutable checkpoint; advances tip only if `previousTail` matches.
4. Remote **never** runs `repair` or loads the engine — bytes + META only.

### Restore (pull + install)

```bash
trellis remote pull --to .trellis/ops.json.restored
trellis remote install --from .trellis/ops.json.restored
```

Install: stamp `.corrupted.<ts>` / `.bak.<ts>` before replace; refuse if local
newer unless `--force`.

## Why sprite first (vs S3 / git)

| Option | Fit |
| ------ | --- |
| **Sprite** | Default **peer** in Trellis cloud; push API; same VM mental model as Studio rooms |
| S3/R2 | Cold tier for checkpoint export — not the live second peer |
| Git remote | Wrong object model (text commits, not op chain) |
| “Trust only laptop” | Not truth — proved false |

Sprite = default remote; object storage = archive; Iroh = optional extra peers later.

## Hardening (ships with peer #2)

1. **Multi-slot local bak** — ring of `ops.json.bak.<ts>`; never one slot.
2. **CLI skew guard** — no array-era client against JSONL journal.
3. **Pre-repair remote push** — or abort.
4. **Init provisions default remote** — sprite URL + repo id in config; unset = “single-peer mode” (dev only, warned).

## Roadmap (GitHub analog layers)

| Layer | What |
| ----- | ---- |
| **L0 (this seed)** | Default remote sprite; push/pull/status; two-peer truth |
| **L1** | Named remotes (`upstream`, `backup`, org room) |
| **L2** | Public ledger index — discover op chains / issues (read-only room) |
| **L3** | Fork, promote-from-remote, agent lanes on shared remotes |

## Acceptance sketch

- [ ] `trellis init` (or first push) provisions default remote sprite
- [ ] `trellis remote push` acks tail; remote retains checkpoints
- [ ] Simulated local wipe + `pull` + `install` restores chain
- [ ] `trellis repair` blocked without recent remote ack
- [ ] Local bak ring ≥3; remote never runs repair

## Open questions

- Auth: per-repo API key in `.trellis/remote.json` vs room tenant?
- One sprite per desk vs per-repo slug?
- Retention policy on checkpoints?
- When does Iroh become peer #3 vs replace sprite for some users?
