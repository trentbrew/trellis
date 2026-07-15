# SPEC-v1.1 — the two open sections, mapped

Companion to `docs/specs/spec-v1.1-graph-op-sync.md`. §1–§4 are settled or
mechanical. **§2a (refs) and §5 (read authorization) are the two that need
decisions**, and they are the two that are genuinely hard. This is the landscape.

---

## Part 1 — §2a: refs

### First, a correction

The spec says "branch and lane heads are mutable side files". **That is wrong for
branches.** `vcs:branchAdvance` decomposes to a fact:

```ts
result.addFacts.push({ e: `branch:${name}`, a: 'headOpHash', v: targetOpHash });
```

Branch heads *are* in the graph. A peer replaying every op **does** learn what
`main` points at. `state.json` holds only `currentBranch` — a name, not a hash —
which is local checkout state and correctly local.

So the model isn't "refs live outside the graph". It's worse and more interesting.

### The actual problem: refs are order-dependent registers

```mermaid
flowchart TD
    subgraph store["branch:main — facts accumulated in the store"]
        F1["headOpHash = op:aaa<br/><i>from branchAdvance #1</i>"]
        F2["headOpHash = op:bbb<br/><i>from branchAdvance #2</i>"]
        F3["headOpHash = op:ccc<br/><i>from branchAdvance #3</i>"]
        F1 --> F2 --> F3
    end
    F3 -.->|"getBranchHeadOpHash()<br/>returns facts[facts.length - 1]"| HEAD["main = op:ccc"]
```

`branchAdvance` **only adds**. It never deletes the prior head. So `branch:main`
accumulates one `headOpHash` fact per advance — **1,128 of them in this repo
today**, out of 3,077 `branchAdvance` ops total — and the head is resolved
positionally:

```ts
// src/vcs/branch.ts:42 — "latest wins"
return facts[facts.length - 1]?.v;
```

**Insertion order decides the answer.** And insertion order is op *application*
order, which for concurrent advances is *arrival* order.

```mermaid
flowchart LR
    subgraph ops["Identical op set — both peers have both ops"]
        A["advance main → op:aaa<br/>(peer A, 10:00)"]
        B["advance main → op:bbb<br/>(peer B, 10:00)"]
    end

    ops --> PA["Peer A applies<br/>aaa then bbb"]
    ops --> PB["Peer B applies<br/>bbb then aaa"]

    PA --> RA["main = op:bbb"]
    PB --> RB["main = op:aaa"]

    RA -.->|"same ops<br/>same hashes<br/>all verify"| RB

    style RA fill:#f87171,color:#000
    style RB fill:#f87171,color:#000
```

Two peers. Same ops. Every hash verifies. Set union is complete. **And they
disagree about `main`.**

This is the session's recurring bug in its purest form: **correctness depends on
something the hash does not cover.** ADR 0021 was "the hash doesn't cover the
payload". TRL-102 was "the hash doesn't cover the lane, but we mutated it anyway".
This is *"the hash doesn't cover order, and order is the answer."*

### Why `branchAdvance` can't just delete the old fact

`criterionUpdate` gets this right:

```ts
for (const prior of ['pending', 'passed', 'failed'])
  result.deleteFacts.push({ e: ceid, a: 'status', v: prior });
result.addFacts.push({ e: ceid, a: 'status', v: newStatus });
```

Delete-then-add — a proper register. It works because **the domain is bounded**:
three possible values, so you can enumerate and delete them all.

`headOpHash`'s domain is **every hash that has ever existed**. You cannot
enumerate the priors, so you cannot delete them. The register degrades into an
append log resolved by position.

```mermaid
flowchart TD
    Q{"Is the field's value domain<br/>bounded and enumerable?"}
    Q -->|"Yes — e.g. status: pending/passed/failed"| BOUNDED["delete-all-priors + add<br/>✅ a real register<br/>✅ order-independent"]
    Q -->|"No — e.g. headOpHash: any hash"| UNBOUNDED["add only<br/>⚠️ resolved by array position<br/>❌ order-dependent"]

    style BOUNDED fill:#34d399,color:#000
    style UNBOUNDED fill:#f87171,color:#000
```

> **This generalizes beyond refs.** Any unbounded-domain "latest wins" field in
> Trellis has this property. Worth an audit — `getLast()` in `issue.ts` uses the
> same `matches[matches.length - 1]` pattern for `description`, `command`,
> `lastOutput`. Single-writer today, so it doesn't bite. It bites the moment
> there are peers.

### The three options

```mermaid
flowchart TD
    subgraph opt3["Option 3 — refs as ops (today, for branches)"]
        direction TB
        O3A["branchAdvance op → headOpHash fact"]
        O3B["✅ converges automatically for linear history<br/>✅ auditable: every move is in the log<br/>❌ order-dependent under concurrency<br/>❌ 1,128 dead facts on branch:main<br/>❌ append-only churn for a pointer"]
        O3A --> O3B
    end

    subgraph opt2["Option 2 — refs derived"]
        direction TB
        O2A["head = reachability from a root"]
        O2B["✅ no channel, no storage<br/>✅ order-independent<br/>❌ cannot express intentional rollback<br/>❌ 'which branch' becomes a scan"]
        O2A --> O2B
    end

    subgraph opt1["Option 1 — refs as a second channel (Git)"]
        direction TB
        O1A["name → tip hash, mutable, synced separately"]
        O1B["✅ ops stay immutable + identity-stable<br/>✅ pointer moves cost nothing in the log<br/>❓ needs a convergence rule of its own"]
        O1A --> O1B
    end

    style opt1 fill:#1a1b22,color:#e4e4e7
    style opt2 fill:#1a1b22,color:#e4e4e7
    style opt3 fill:#1a1b22,color:#e4e4e7
```

### The insight I'd build on: Git doesn't converge refs — it namespaces them

Git never merges `main` for you. It gives you `main` and `origin/main` and makes
the merge **explicit and local**. Refs are *per-peer*; convergence is a human (or
agent) decision, not a protocol guarantee.

**Trellis already has this and calls it lanes.**

```mermaid
flowchart LR
    subgraph git["Git"]
        GM["main"]
        GO["origin/main"]
        GO -.->|"explicit merge"| GM
    end

    subgraph trellis["Trellis — the same shape"]
        L1["lane A head"]
        L2["lane B head"]
        INT["integration"]
        L1 -.->|"promote"| INT
        L2 -.->|"promote"| INT
    end
```

A lane **is** a per-peer ref. `promote` **is** the explicit merge. The model was
right all along — it's just stored inconsistently: **branch heads are facts,
lane heads are `meta.json` files.** One of the two is wrong, and the concurrency
argument says it's the facts.

**Recommendation:** refs are per-writer and namespaced, never shared-mutable.
Then no convergence rule is needed — because two peers never write the same ref.
`main` is *my* main; yours is `peer:you/main`. Promote stays the explicit merge
it already is.

### Questions to settle

1. Do lane heads move into the graph, or branch heads move out to a ref store?
   (They disagree today; one has to move.)
2. If refs are per-writer, what identifies a writer — `agentId`, device key
   (ADR 0020), or lane?
3. Do the 1,128 accumulated `headOpHash` facts get compacted, or is that history
   worth keeping? (It is arguably a genuine audit trail of where `main` has been.)
4. Is there any shared-mutable ref left after per-writer namespacing? If yes, it
   needs a convergence rule and that rule needs a spec.

---

## Part 2 — §5: read authorization

### The shape of the problem

```mermaid
flowchart TD
    subgraph before["Server-projected (what the dashboard does today)"]
        S1["Server holds all facts"]
        S1 -->|"sends only what it chose"| C1["Client sees a subset"]
        C1 -.->|"can't ask novel questions"| X1["not local-first"]
    end

    subgraph after["Materialized (§1 — decided)"]
        S2["Server ships ops"]
        S2 -->|"peer replays them"| C2["Peer holds every fact it received"]
        C2 -.->|"queries locally, offline, novel"| X2["local-first ✅"]
        C2 -.->|"holds the bytes forever"| X3["filtering after this point<br/>is cosmetic ⚠️"]
    end

    style X3 fill:#fbbf24,color:#000
    style X1 fill:#f87171,color:#000
    style X2 fill:#34d399,color:#000
```

**Materialization doesn't create the authorization problem. It removes the place
you were hiding it.** With projections you can *pretend* per-fact authorization
is real, because the server silently declines to send things. Once a peer
materializes, that pretense is gone: it has what you shipped, permanently.

### Filter vs boundary

```mermaid
flowchart LR
    subgraph filter["A FILTER — not a boundary"]
        FA["Server decides<br/>what to send"]
        FA --> FB["Peer receives subset"]
        FB --> FC["Enforcement lives<br/>in the sender's good behaviour"]
        FC --> FD["Change one line →<br/>peer gets everything"]
    end

    subgraph boundary["A BOUNDARY — real"]
        BA["Ops encrypted<br/>to a room key"]
        BA --> BB["Peer without the key<br/>holds ciphertext"]
        BB --> BC["Enforcement lives<br/>in mathematics"]
        BC --> BD["Change one line →<br/>peer still can't read it"]
    end

    style filter fill:#f87171,color:#000
    style boundary fill:#34d399,color:#000
```

This is the same argument that killed lane-scoped sync as a security concept:
**once the bytes land, the filter is cosmetic.** A lane is either a real boundary
— in which case it needs its own key and it *is* a room — or it's a naming
convenience.

> Trellis has already rejected this pattern once, in `rule Read`: a UI affordance
> cosplaying as security. Don't let it back in via the transport.

### The candidate boundaries

```mermaid
flowchart TD
    R["Repo"] --> RM["Room / tenant"]
    RM --> L["Lane"]
    L --> E["Entity"]
    E --> F["Fact"]

    R -.- RN["coarse · trivially enforceable<br/>· useless granularity"]
    RM -.- RMN["✅ already has tenancy<br/>✅ ADR 0020 gives key material<br/>✅ coarse enough to encrypt"]
    L -.- LN["⚠️ would need its own key<br/>→ then it IS a room"]
    E -.- EN["❌ per-entity keys = key explosion"]
    F -.- FN["❌ filter-only = theatre"]

    style RMN fill:#34d399,color:#000
    style EN fill:#f87171,color:#000
    style FN fill:#f87171,color:#000
```

### The part that has no nice answer: revocation

```mermaid
sequenceDiagram
    participant A as Alice (room owner)
    participant B as Bob (peer)
    Note over A,B: Bob is a member
    A->>B: ops 1..500
    Note over B: Bob materializes.<br/>Bob has 500 ops on disk.
    Note over A: Alice revokes Bob
    A--xB: ops 501+ withheld / re-keyed
    Note over B: Bob STILL HAS ops 1..500.<br/>Forever. Offline. Un-unsendable.
```

**You cannot un-ship bytes.** Revocation can only mean "no *future* ops" —
rotate the key, re-encrypt going forward. Everything already replicated stays
readable by the revoked peer, offline, permanently.

This is not a Trellis flaw; it's true of every E2EE group. But it must be *said*,
because "revoke access" in a local-first system means something weaker than it
does in a server-owned one, and users will assume the server-owned meaning.

**The operational rule that follows:** *ship no room to a peer you would not show
the whole room to, forever.*

### Questions to settle

1. Is the room the boundary? (Recommended — it's the only unit with tenancy and
   key material already.)
2. What is a room, exactly — a tenant, a repo, or a new construct? Today
   `TenantPool` exists and rooms are a server concept; peers have no notion.
3. Are ops encrypted at rest per-room, or is the boundary only "who do we send
   to"? **The second is a filter.** If we want a boundary, it's the first.
4. Does revocation exist at all, or is the honest word "rotate"?
5. Do lanes need to be rooms? If a lane must be private, the answer is forced.

---

## How the two interact

```mermaid
flowchart TD
    M["§1 Peers materialize<br/>(decided · 4 KB)"]
    M --> REF["§2a Refs<br/>peer needs to know<br/>where history ends"]
    M --> AUTH["§5 Authorization<br/>peer holds every fact<br/>you shipped it"]

    REF --> RQ{"Per-writer refs?"}
    RQ -->|yes| RQY["no shared-mutable state<br/>→ no convergence rule needed<br/>→ promote stays the merge"]

    AUTH --> AQ{"Room = boundary?"}
    AQ -->|yes| AQY["replication unit =<br/>authorization unit"]

    RQY --> BOTH["Both point the same way:<br/><b>partition, don't filter</b>"]
    AQY --> BOTH

    style BOTH fill:#6d5bfa,color:#fff
```

Both sections resolve to the same principle. **Refs:** don't share a mutable
pointer between writers — give each writer its own and merge explicitly.
**Authorization:** don't filter a shared stream — partition it and give each
partition a key. In both cases the failure mode is *pretending two parties share
one thing when they don't*, and in both cases the fix is to stop pretending.

Which is, once more, the same shape as the two-log split: one thing that was
actually two, papered over.
