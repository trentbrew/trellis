
the residency
›about you
›your work
›why this idea
›progress
›similar work
›equity
•past programs
›how you found us
saved
the residency application
september 7th – november 29th

note: please don't include links except where we specifically ask. part of what we're evaluating is how well you can explain your work without leaning on external references.

picked up where you left off for hello@trentbrew.com

about you
first name*
Trent
last name*
Brew
where do you live currently?*
Rancho Cucamonga, CA
what is your gender?

male
Which Residency locations are you open to?*
select all that apply


San Francisco, CA

New York, NY

Vienna, Austria

Berkeley, CA

Bangalore, India

Cambridge, MA

Ithaca, NY

London, UK

Munich, Germany

Hyderbad, India

Milan, Italy
what are your 2-3 most important accomplishments, personally or professionally, over the past 3 years? (be concise)*
- Built Trellis (a local-first, event-sourced graph engine for code, agents, and decisions) from kernel through CLI, MCP server, realtime SDK, and graph-native issue tracking (~100+ tests, npm package acquired and published).
- Shipped Trellis as production infrastructure, powering the backend of Raster.tv. Raster runs on the Trellis graph for multi-tenant scheduling and semantic metadata, live with its first public-access partner (SPEAK MPLS) and validated against an 86-org Cablecast pipeline.
- Pioneered graph-native agent coordination: issues, branches, lanes, decision traces, and handoff protocol as first-class graph entities, used daily in my own multi-agent development workflow.
what is one thing ONLY YOU believe?*
Naive question that stuck with me: what actually is a memory, for an agent? Everyone treats it as retrieval. Embed the past, search for something similar, hope the right thing resurfaces. I think that's the wrong primitive. Memory is closer to version control than to search. It's the causal history of what changed and why, forkable and auditable, something you own rather than a vector you cross your fingers on. Intelligence is getting cheap. Durable, forkable state is not. The agentic era gets won by whoever turns decisions into first-class facts you can query, the way Git did that for code. And here's the part almost no one builds toward: that state is the kernel. The model is just one thing that reads from it.
do you have a cofounder?*
yes
no
are you looking for a cofounder?*
yes
no
what's your #1 book recommendation / favorite book?
"Algorithms to Live By: The Computer Science of Human Decisions" by Brian Christian and Tom Griffiths
your work
what's the ultimate vision you're building towards *
A world where your tools, memory, and AI all run on infrastructure you own: a local-first semantic graph that is the system of record for decisions in the agentic era, the way Git became the system of record for code.
describe what you're building or investigating in 50 characters or less.*
Local-first graph engine for agent memory
41/50 characters

add any details that we might be interested in that you couldn't fit in 50 characters.*
Trellis inverts how agent frameworks treat state. Most pour everything into the reasoning engine and treat memory as an afterthought. Trellis is the system of record: every file change, tool call, and rationale is an immutable operation in a causal graph. Agents can fork state to explore safely, query prior decisions as precedent, and leave auditable traces humans can review.

It's not a better database. It's structured runtime for agents. Already powers Raster.tv in production, live with its first civic-media partner. CLI (`trellis issue`, `trellis branch`, `trellis garden`), MCP tools, React/Vue/Svelte SDKs, and cloud-backed Studio sandboxes.
link to your work (if available, nw if you don't have one)
https://trellis.computer
demo video (if available, nw if you don't have one)
https://
github profile (if available)
https://github.com/trentbrew
linkedin (if not available put n/a)*
https://www.linkedin.com/in/trentbrew
x/twitter (if available)
https://x.com/trent_brew
personal or project website (if available)
https://trentbrew.com
why this idea
why did you pick this to work on? (be concise)*
Building agentic apps, I kept hitting the same wall and rebuilding the same primitives: durable shared memory, a way to fork and explore safely, an audit trail for why an agent did what it did. Trellis started as an attempt to formalize those patterns into one package for my own AI work. It became something bigger once I saw the pattern underneath: agents don't fail because they're not smart enough, they fail because they have nowhere to keep what they decide. The problem isn't intelligence. It's structured state.
how do you know the world needs what you're making? (be concise)*
I know because I can't work without it. I use Trellis every day to coordinate a 5+ role agent pipeline for orchestrating issues, branches, decision traces, handoffs. It's the only thing that keeps context from evaporating between sessions and tools. The sharpest example: I'll build a feature in Cursor, then open Claude or ChatGPT and pick up exactly where I left off, because the memory lives in one graph both can reach over MCP. That's the wall every agent framework hits: memory bolted on as a vector DB afterthought. It's why Trellis is already the backend behind Raster.tv in production, not a demo. The demand isn't hypothetical to me; it's the thing I reach for first every morning.
progress
key traction metrics, use bullet points (be concise)*
- Production deployment: Raster.tv is built on the Trellis graph and live with a real public-access partner, SPEAK MPLS. Not a toy; real semantic queries are running in production on multi-tenant infrastructure.
- Open source: trellis npm package, with the acquired canonical unscoped name, plus CLI, MCP server, and typed SDKs for React, Vue, and Svelte.
- 100+ passing tests: EAV kernel, TQL query engine, graph-native VCS, semantic diff, decision traces, and peer sync engine.
- Trellis Studio: Cloud sandboxes at studio.trellis.computer, backed by e2b.
- Daily dogfooding: Multi-agent development pipeline from strategist to architect to executor to reviewer runs entirely on Trellis graph-native issue tracking.
- MCP integration: Agent tools for graph queries, issue management, and decision audit trails.
How long have you been working on this, and how much has been full-time, if any?*
The graph engine and the agent-memory piece is about two or three years. Full-time since early 2025. But the throughline is older and messier than that. For years I kept building the same shape without noticing: a file browser that was secretly a graph; a note tool that was secretly a graph; a code tool; etc. It was the same instinct every time: a datalog-esque structure that owns its durable state locally. I didn't see them as one thing until agentic work made it legible. The moment agents hit the memory wall, this idea I'd been building over and over for years finally had a name.
are people using what you're building?*
yes
no
roughly how many?*
Yes. Raster.tv production deployment; open-source CLI and SDK available; personal daily use across multi-agent workflows.
do you have revenue?*
yes
no
what are your goals for the next 6 months (in general, doesn't only have to be numerical goals)?*
Ship the v1 beta, stabilize the sync protocol, and prototype the local-first desktop shell, turning Trellis from graph engine to an OS your work lives on.
similar work
who are your main competitors?*
Closest ancestor is Git. It versions files. Trellis versions decisions, the intent and precedent and rationale behind every change. That's the whole bet, honestly.

Agent memory, including LangChain, Mem0, and vector-DB-as-memory: memory as retrieval, bolted onto a stateless loop. Trellis treats it as causal, forkable state.

Knowledge tools, including Notion, Linear, and Obsidian: they own objects, tickets and docs and notes. Trellis owns the decisions those objects came from, queryable and auditable.
what do you understand that they don't?*
Git tracks what changed. Trellis tracks why. Notion and Linear own objects. The next layer owns decisions, the reasoning behind every state change, forkable and auditable. And every agent framework I've looked at treats the LLM as the kernel and memory as an afterthought. I flip that. Structured state is the kernel and the LLM is one consumer of it. That inversion is the thing I'm not seeing anyone else build toward.
equity
have you formed ANY legal entity yet?*
This may be in the United States or another country.

yes
no
what type of legal entity & where is it based?*
LLC, based in CA
16/50 characters

what entities have you formed?*
TURTLE LABS LLC
what is the equity breakdown among founders?*
Trent Brew (Founder): 100%
Have you taken any investment?*
yes
no
are you currently fundraising?*
yes
no
past programs
Have you participated in any incubators, accelerators, or pre-accelerators? If so which ones?*
n/a
Have you had roommates besides your family before?*
yes
no
Have you applied to the Residency before?*
yes
no
Are you working on the same thing?*
yes
no
What changed since last time?*
Same thesis, heavier proof. Last time Trellis was a credible engine without external validation. Since January Trellis went live through Raster, a streaming app with a paying partner. I exhibited at ACM Madison with an 86-org pipeline behind it, and I shipped agent lanes plus handoff protocol so my multi-agent dev workflow runs on Trellis daily. We've also shipped realtime sync and an MCP server for connecting external agents to a shared graph.
how you found us
how did you hear about the residency?*

twitter
who or what inspired you to apply?*
At every job I ended up the person rebuilding the same AI primitives on traditional architecture, because the stack wasn't built for agents. Teams optimize for UX; almost nobody builds for DX, and almost nobody thinks about AX (agent experience). I want to build for builders. The Residency is the clearest path to do that full-time alongside people solving adjacent hard problems.
were you referred by an alumni?*
yes
no
next
if you have any issues, send an email to support@livetheresidency.com