# The Residency (Trellis) — Revised Answers

> Drop-in replacements for [the-residency-trellis.md](./the-residency-trellis.md).
> Written in my voice, no em dashes. Pick the "one thing" variant, then merge.

---

## One thing ONLY you believe

### Option A (recommended)

Naive question that stuck with me: what actually is a memory, for an agent? Everyone treats it as retrieval. Embed the past, search for something similar, hope the right thing resurfaces. I think that's the wrong primitive. Memory is closer to version control than to search. It's the causal history of what changed and why, forkable and auditable, something you own rather than a vector you cross your fingers on. Intelligence is getting cheap. Durable, forkable state is not. The agentic era gets won by whoever turns decisions into first-class facts you can query, the way Git did that for code. And here's the part almost no one builds toward: that state is the kernel. The model is just one thing that reads from it.

### Option B (tighter, more contrarian)

The consensus is that agent memory is a retrieval problem. Better embeddings, bigger context windows. I think that's a dead end. Memory is a version control problem. Every decision, human or agent, should be an immutable, forkable, queryable fact you own, not a log line in someone else's cloud and not a vector you hope resurfaces at the right moment. Intelligence is commoditizing. Auditable, forkable state is the part that stays scarce, and almost no one is building it as the kernel instead of an add-on.

---

## Main competitors

Closest ancestor is Git. It versions files. Trellis versions decisions, the intent and precedent and rationale behind every change. That's the whole bet, honestly.

**Agent memory (LangChain, Mem0, vector-DB-as-memory):** memory as retrieval, bolted onto a stateless loop. Trellis treats it as causal, forkable state.

**Knowledge tools (Notion, Linear, Obsidian):** they own objects, tickets and docs and notes. Trellis owns the decisions those objects came from, queryable and auditable.

---

## What do you understand that they don't

Git tracks what changed. Trellis tracks why. Notion and Linear own objects. The next layer owns decisions, the reasoning behind every state change, forkable and auditable. And every agent framework I've looked at treats the LLM as the kernel and memory as an afterthought. I flip that. Structured state is the kernel and the LLM is one consumer of it. That inversion is the thing I keep not seeing anyone else build toward.
