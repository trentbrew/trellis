# The Residency Application: Trellis

Lead project: Trellis
Shared fields: the-residency-shared.md
Alt version: the-residency-raster.md

## About you

### 2-3 most important accomplishments (past 3 years)

- Built Trellis, a local-first, event-sourced graph engine for code, agents, and decisions, from kernel through CLI, MCP server, realtime SDK, and graph-native issue tracking. It has 100+ tests, and I acquired and published the canonical npm package name.
- Shipped Trellis as production infrastructure, not a demo. Raster.tv runs on the Trellis graph for multi-tenant scheduling and semantic metadata, is live with its first public-access partner, SPEAK MPLS, and has been validated against an 86-org Cablecast pipeline.
- Pioneered graph-native agent coordination: issues, branches, lanes, decision traces, and handoff protocol as first-class graph entities, used daily in my own multi-agent development workflow.

### One thing ONLY you believe

Naive question that stuck with me: what actually is a memory, for an agent? Everyone treats it as retrieval. Embed the past, search for something similar, hope the right thing resurfaces. I think that's the wrong primitive. Memory is closer to version control than to search. It's the causal history of what changed and why, forkable and auditable, something you own rather than a vector you cross your fingers on. Intelligence is getting cheap. Durable, forkable state is not. The agentic era gets won by whoever turns decisions into first-class facts you can query, the way Git did that for code. And here's the part almost no one builds toward: that state is the kernel. The model is just one thing that reads from it.

## Your work

### Ultimate vision

A world where your tools, memory, and AI all run on infrastructure you own: a local-first semantic graph that is the system of record for decisions in the agentic era, the way Git became the system of record for code.

### 50 characters or less

Local-first graph engine for agents' memory

### Details that didn't fit in 50 characters

Trellis inverts how agent frameworks treat state. Most pour everything into the reasoning engine and treat memory as an afterthought. Trellis is the system of record: every file change, tool call, and rationale is an immutable operation in a causal graph. Agents can fork state to explore safely, query prior decisions as precedent, and leave auditable traces humans can review.

It's not a better database. It's structured runtime for agents. Already powers Raster.tv in production, live with its first civic-media partner. CLI commands include trellis issue, trellis branch, and trellis garden. Trellis also includes MCP tools, React, Vue, and Svelte SDKs, and cloud-backed Studio sandboxes.

### Links

Link to work: https://trellis.computer
Demo video: TODO: Studio walkthrough or trellis ui screencast
GitHub: https://github.com/trentbrew/trellis
LinkedIn: https://linkedin.com/in/trentbrew
X/Twitter: https://x.com/trentbrew
Personal or project website: https://trentbrew.com

## Why this idea

### Why did you pick this to work on?

Building agentic apps, I kept hitting the same wall and rebuilding the same primitives: durable shared memory, a way to fork and explore safely, an audit trail for why an agent did what it did. Trellis started as an attempt to formalize those patterns into one package for my own AI work. It became something bigger once I saw the pattern underneath: agents don't fail because they're not smart enough, they fail because they have nowhere to keep what they decide. The problem isn't intelligence. It's structured state.

### How do you know the world needs what you're making?

I know because I can't work without it. I use Trellis every day to coordinate a 5+ role agent pipeline for orchestrating issues, branches, decision traces, handoffs. It's the only thing that keeps context from evaporating between sessions and tools. The sharpest example: I'll build a feature in Cursor, then open Claude or ChatGPT and pick up exactly where I left off, because the memory lives in one graph both can reach over MCP. That's the wall every agent framework hits: memory bolted on as a vector DB afterthought. It's why Trellis is already the backend behind Raster.tv in production, not a demo. The demand isn't hypothetical to me; it's the thing I reach for first every morning.

## Progress

### Key traction metrics

- Production deployment: Raster.tv is built on the Trellis graph and live with a real public-access partner, SPEAK MPLS. Not a toy; real semantic queries are running in production on multi-tenant infrastructure.
- Open source: trellis npm package, with the acquired canonical unscoped name, plus CLI, MCP server, and typed SDKs for React, Vue, and Svelte.
- 100+ passing tests: EAV kernel, EQL-S query engine, graph-native VCS, semantic diff, decision traces, and peer sync engine.
- Trellis Studio: Cloud sandboxes at studio.trellis.computer, backed by e2b.
- Daily dogfooding: Multi-agent development pipeline from strategist to architect to executor to reviewer runs entirely on Trellis graph-native issue tracking.
- MCP integration: Agent tools for graph queries, issue management, and decision audit trails.

### How long have you been working on this?

The graph engine and the agent-memory piece is about two or three years. Full-time since early 2025. But the throughline is older and messier than that. For years I kept building the same shape without noticing: a file browser that was secretly a graph; a note tool that was secretly a graph; a code tool; etc. It was the same instinct every time: a datalog-esque structure that owns its durable state locally. I didn't see them as one thing until agentic work made it legible. The moment agents hit the memory wall, this idea I'd been building over and over for years finally had a name.

### Are people using what you're building?

Yes. Raster.tv production deployment; open-source CLI and SDK available; personal daily use across multi-agent workflows.

### Do you have revenue?

No.

### Goals for the next 6 months

Ship the v1 beta, stabilize the sync protocol, and prototype the local-first desktop shell turning Trellis from graph engine to an OS your work lives on.

## Similar work

### Main competitors

Closest ancestor is Git. It versions files. Trellis versions decisions, the intent and precedent and rationale behind every change. That's the whole bet, honestly.

Agent memory, including LangChain, Mem0, and vector-DB-as-memory: memory as retrieval, bolted onto a stateless loop. Trellis treats it as causal, forkable state.

Knowledge tools, including Notion, Linear, and Obsidian: they own objects, tickets and docs and notes. Trellis owns the decisions those objects came from, queryable and auditable.

### What do you understand that they don't?

Git tracks what changed. Trellis tracks why. Notion and Linear own objects. The next layer owns decisions, the reasoning behind every state change, forkable and auditable. And every agent framework I've looked at treats the LLM as the kernel and memory as an afterthought. I flip that. Structured state is the kernel and the LLM is one consumer of it. That inversion is the thing I keep not seeing anyone else build toward.

## Raster as production proof (interview / follow-up)

If traction questions come up:

Trellis isn't a prototype. Raster.tv runs on the Trellis graph, live with SPEAK MPLS as its first paying partner. I exhibited Raster at ACM Madison in June 2026 and validated it against an 86-org Cablecast pipeline. One real, paying partner on infrastructure I built is worth more than a wall of logos. The vertical proves the platform; the platform is the long-term bet.

If they ask about revenue: Raster.tv has its first paying partner, SPEAK MPLS. Trellis, the platform itself, is pre-revenue by choice; I'm not monetizing the kernel yet. That's why the revenue field reads No: it's answered honestly for the lead project, which is Trellis.
