# The Residency Application — Raster

> Lead project: **Raster.tv**  
> Shared fields: [the-residency-shared.md](./the-residency-shared.md)  
> Alt version: [the-residency-trellis.md](./the-residency-trellis.md)

---

## About you

### 2–3 most important accomplishments (past 3 years)

- Built and deployed **Raster.tv** — a multi-tenant broadcasting platform live with four public-access partners (SPEAK MPLS, STL TV, LA Channel 36, SF Commons), replacing VPN-and-spreadsheet workflows with self-service scheduling and unified metadata.
- Exhibited at the **Alliance for Community Media's 50th anniversary conference** (Madison, WI) — first industry conference, validated product with station managers, and built a pipeline of 86 Cablecast-verified orgs with enriched contacts.
- Designed and shipped the full stack solo as a designer-engineer: Nuxt/Vue frontend, Nitro Cablecast API integration, multi-tenant graph backend — while maintaining active station relationships and bi-weekly partner calls.

### One thing ONLY you believe

Community media was *social* decades before Silicon Valley defined the word — and the entire industry is still being forced into feed-shaped tooling (profiles, algorithms, engagement metrics) when what stations actually need is **row-shaped infrastructure**: finite schedules, accountable metadata, one source of truth that follows a show from ingest to air to archive. The incumbents aren't wrong about the metaphor. They're wrong about duplication.

---

## Your work

### Ultimate vision

Every community that governs itself deserves operational infrastructure as durable as the civic record it produces — not another social layer on top of broken spreadsheets, but tooling that makes schedules, archives, producers, and public obligations legible in one place.

### 50 characters or less

```
Row-shaped ops infrastructure for community media
```

*(43 characters)*

### Details that didn't fit in 50 characters

Raster is a multi-tenant TV Guide and station operations platform for public, educational, and government (PEG) access television. Stations today re-type the same show title into Cablecast, their website, YouTube, and an FCC spreadsheet. Raster connects directly to station playout systems (Cablecast), unifies metadata in a semantic graph, and gives producers self-service scheduling — so station staff spend time training producers and covering city council, not copy-pasting rows.

Built on a graph engine I wrote (Trellis), but Raster is the product: four live station partners, a validated post-conference pipeline, and a market of 1,600+ ACM member organizations.

### Links

| Field | Value |
| --- | --- |
| Link to work | https://raster.tv |
| Demo video | *[TODO: station walkthrough URL if available]* |
| GitHub | https://github.com/trentbrew |
| LinkedIn | https://linkedin.com/in/trentbrew |
| X/Twitter | https://x.com/trentbrew |
| Personal or project website | https://raster.tv |

---

## Why this idea

### Why did you pick this to work on?

Public access TV is where communities watch themselves govern — cameras in council chambers, producers in edit bays, volunteers learning switchers so a neighbor's show airs on channel 18. I got pulled in through a relationship with SPEAK MPLS in Minneapolis and saw the actual workflow: VPN into a remote desktop, manual Cablecast entry, spreadsheet tracking, email confirmations. The pain isn't lack of ambition — it's that the same metadata lives in six places and someone re-types it every week. That felt fixable, and nobody else was building for it.

### How do you know the world needs what you're making?

Four stations are already using or piloting Raster across four cities. At ACM Madison (June 2026), station managers didn't ask about activity streams — they asked whether Raster respects how their station actually runs: who produces what, what's scheduled where, what history sits in a folder of XML exports. The moments that landed were quiet: "Oh, you can see the whole week." "Oh, the metadata follows the file." "Oh, I wouldn't have to copy this twice." I also mapped 86 Cablecast-verified organizations with contact data — a validated day-one integration cohort, not a cold market guess.

---

## Progress

### Key traction metrics

- **4 live station partners:** SPEAK MPLS (Minneapolis), STL TV (St. Louis), LA Channel 36 (Fairfax VA area), SF Commons / BAVC Media (San Francisco)
- **ACM Madison 2026:** Exhibited at industry's 50th anniversary conference; organic booth traffic; product validation from station managers nationwide
- **86-org validated pipeline:** Cablecast-verified stations with enriched contacts, channels, and timezone data — post-conference outreach cohort
- **Multi-tenant Cablecast integration:** Production API proxy serving all stations from one platform
- **Revenue model defined:** Free / $49/mo Basic / $199/mo Pro tiers
- **479-station civic memory archive** built as market research and community credibility layer

### How long have you been working on this?

~2 years on Raster specifically, building nights and weekends alongside contract work until recently. Full-time on Raster and Trellis infrastructure since early 2025. Raster went from prototype to four-station deployment over the past 12 months; ACM Madison was the first public industry presence (June 2026).

### Are people using what you're building?

**Yes**

### Do you have revenue?

**No** *(update if any station is paying)*

### Goals for the next 6 months

- Close 3–5 pilots from the post-ACM pipeline (86 verified Cablecast orgs)
- Ship producer self-service portal — upload, metadata, schedule requests without station staff in the loop
- Convert first paying stations on Basic tier ($49/mo)
- Find a GTM cofounder who knows civic media, local news, or vertical SaaS sales
- Expand SF Commons and SPEAK MPLS from pilot to production dependency

---

## Similar work

### Main competitors

Cablecast (Tightrope Media Systems), TelVue, generic CMS tools (WordPress, YouTube), manual spreadsheet + email workflows stations cobble together.

### What do you understand that they don't?

Incumbents treat this as a playout problem or a website problem. Stations experience it as a **duplication problem** — the same row of metadata re-typed across six systems, every week, by someone who'd rather be training a producer. Community media is row-shaped (finite schedules, accountable air times, compliance flags), not feed-shaped (infinite, ranked, engagement-optimized). Raster keeps the row metaphor and kills the duplication. Incumbents are also single-tenant installed software from 2004; Raster is multi-tenant, API-native, and built for the producer self-service era.

---

## Trellis as technical moat (interview / follow-up)

If asked for the long-term platform play:

> Raster runs on a graph engine I built (Trellis) — same infrastructure that powers multi-tenant scheduling, semantic metadata, and cross-station queries. The product is the wedge; the engine is the long-term platform play.
