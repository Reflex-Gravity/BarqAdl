# BarqAdl — Justice at the Speed of Light ⚡

**A self-improving multi-agent legal AI for UAE law that learns from every interaction, proves it learned, and gets measurably better over time.**

---

## Inspiration

Access to justice in the UAE is broken for the people who need it most. A migrant worker whose employer hasn't paid wages in three months doesn't know that Federal Decree-Law No. 33 of 2021, Article 54 entitles them to file a free MOHRE complaint within 14 working days. A tenant being illegally evicted doesn't know their landlord needs 12 months' notarized notice under Dubai Law No. 26 of 2007. The information exists — scattered across government portals in legal jargon — but the gap between "the law exists" and "a vulnerable person can act on it" is enormous.

We asked ourselves: what if an AI could not only answer UAE legal questions accurately, but **get better at it with every question asked**? Not by us manually tuning prompts, but by the system autonomously evaluating its own output, identifying weaknesses, and evolving its strategy — then **proving** it did so with hard metrics?

That's BarqAdl. Arabic for "lightning of justice." A system that doesn't just respond — it learns, adapts, and shows its work.

---

## What It Does

BarqAdl is a **self-improving multi-agent pipeline** that handles UAE legal queries across five domains: labor, tenancy, commercial, visa, and criminal law.

### The Pipeline

A user asks a question. What happens next is fully autonomous:

1. **Orchestrator** classifies the query — extracting domain, urgency, complexity, and named entities (parties, amounts, dates, legal references)
2. **Agent Registry** checks if a specialist exists for that domain. If not, one is **spawned on the fly** and equipped with knowledge scraped from official UAE government sources (mohre.gov.ae, rera.gov.ae, ded.ae)
3. **Specialist Agent** generates a response using domain-specific prompts enriched with scraped legal skills and accumulated strategy enhancements from prior learnings
4. **Independent Judge** scores the response on four dimensions — legal accuracy, completeness, actionability, and citation quality — each rated $1$–$10$ for a total of $/40$
5. **Retry Loop** — if the score falls below $32/40$, the judge's specific feedback (not just "bad," but "missing WPS reference in Article 19") is fed back and the agent regenerates. Up to 2 retries
6. **Strategy Evolution** — improvement signals are captured. If the judge identifies a pattern ("labor queries about wages consistently miss Ministerial Resolution No. 43/2022"), a **new strategy version** is created. Future queries in that domain automatically use the evolved prompt
7. **Response Formatter** delivers the final answer with urgency badges, structured sections, and legal disclaimers

### The Self-Learning Proof

Every interaction produces measurable data:

- **Score trends** — early queries average $\sim 28/40$, later queries converge toward $35$+
- **Retry rate decay** — starts at $\sim 40\%$, drops to $\sim 10\%$ as strategies evolve
- **Strategy versioning** — labor law has evolved through 6 versions, each with a specific enhancement learned from judge feedback
- **Learning velocity chart** — plots score-per-query over time with annotated green markers where strategy evolution occurred

The dashboard doesn't just claim the system learned — it **proves** it with diffs, before/after scores, and a timeline of exactly what was learned and when.

---

## How We Built It

### Architecture

```
User Query
    │
    ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ Orchestrator │────▶│ Skill Scraper│────▶│ Sub-Agent   │
│ (Haiku)      │     │ (Sonnet)     │     │ (Sonnet)    │
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                 │
                                    ┌────────────┘
                                    ▼
                         ┌─────────────────┐
                         │  ╔═══════════╗  │
                         │  ║   Judge    ║  │  ◄── Self-Improvement Loop
                         │  ║ (Sonnet)  ║  │
                         │  ╚═════╤═════╝  │
                         │        │ score<32│
                         │        ▼        │
                         │  Retry + Learn  │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────┐
                         │  Formatter  │
                         │  (Haiku)    │
                         └─────────────┘
```

### Multi-Model Strategy on AWS Bedrock

We use different Claude model sizes for different cognitive loads — optimizing for both quality and speed:

| Role | Model | Why |
|------|-------|-----|
| Orchestrator | Claude 3.5 Haiku | Fast classification ($\sim 1$s), low cost |
| Specialist Agents | Claude 3.5 Sonnet | Deep legal reasoning, citation accuracy |
| Judge | Claude 3.5 Sonnet | Independent quality evaluation |
| Skill Scraper | Claude 3.5 Sonnet | Structuring raw web content into skills |
| Formatter | Claude 3.5 Haiku | Speed — user is already waiting |

All models are invoked via **AWS Bedrock** using the unified `ConverseCommand` API, keeping the infrastructure vendor-neutral and serverless-ready.

### Four Self-Improvement Mechanisms

**1. Dynamic Agent Spawning** — The system starts with zero domain knowledge. The first labor query triggers: agent creation → web scraping of mohre.gov.ae → skill extraction → knowledge injection. The second labor query hits cache instantly. Capability grows with usage.

**2. Judge-Driven Retry Loop** — The judge doesn't just score; it provides actionable feedback. "Missing reference to Wage Protection System under Ministerial Resolution No. 43/2022." The agent incorporates this on retry — and the pattern gets logged for future queries.

**3. Strategy Evolution** — When the judge detects a systematic gap, a new strategy version is created:

```
labor v1 → v2: "Always cite specific Federal Decree-Law articles with numbers"
labor v2 → v3: "Include WPS (Wage Protection System) for salary disputes"
labor v3 → v4: "Reference Tawafuq free legal aid for low-income workers"
```

Each version carries forward all previous enhancements plus the new one. The active version is always the latest.

**4. Score-Based Learning Proof** — Every score, retry, and evolution event is logged to both a local improvement log and **LangFuse** for full observability. The dashboard computes deltas, renders diff cards, and annotates the learning velocity chart.

### Tech Stack

- **Backend:** Node.js + Express
- **LLMs:** AWS Bedrock (Claude 3.5 Haiku + Sonnet)
- **Observability:** LangFuse (traces, spans, scores, events)
- **Database:** Supabase (PostgreSQL with JSONB) + local JSON cache
- **Frontend:** Custom dashboard (vanilla JS, Chart.js, SSE streaming)
- **Chat UI:** LibreChat (OpenAI-compatible API integration)
- **Deployment:** Docker Compose (local) / AWS Lambda + CloudFormation (production)
- **Web Scraping:** Axios + Cheerio against official UAE government portals

### Data Layer

We implemented a **dual-write pattern**: every mutation writes synchronously to local JSON files (fast, zero-latency reads) and asynchronously to Supabase via the JS SDK (cloud persistence, source of truth on restart). On startup, the system pulls from Supabase to restore state. If Supabase is unavailable, JSON files provide seamless fallback.

---

## Challenges We Ran Into

**The Judge Paradox.** The judge needs to be strict enough to drive improvement but lenient enough to not reject every response. Our first judge prompt passed everything above $20/40$. Our second rejected everything. We iterated through 5 versions of the scoring rubric before finding the right threshold ($32/40$) and dimension weights that produced meaningful feedback without infinite retry loops.

**IPv6-Only Supabase.** Supabase's newer projects resolve to IPv6-only DNS records. Our Windows development environment had no IPv6 connectivity. Node.js DNS resolution failed silently. We initially tried raw `pg` connections, custom DNS resolvers, and OS-level PowerShell DNS lookups before switching to the Supabase JS SDK which uses HTTPS (always IPv4-compatible). Three hours of debugging DNS for what should have been a database connection.

**Prompt Stability Under Retry.** When the judge says "add WPS reference" and the agent retries, sometimes the agent would over-correct — stuffing in so many citations that readability tanked and the *next* judge evaluation would fail on a different dimension. We solved this by making the retry feedback very specific ("add X" not "improve everything") and capping retries at 2.

**Proving Learning vs. Just Claiming It.** The hardest challenge wasn't making the system learn — it was making the learning *visible*. A score going from 28 to 35 means nothing to a hackathon judge looking at a dashboard for 30 seconds. We built: diff-style learning cards with green `+ enhancement` lines, a glow animation on the most recent learning event, live toast notifications when strategy evolves during a chat, and a learning velocity chart with annotated evolution points. Making AI learning tangible required more UX work than the AI itself.

**Web Scraping Government Sites.** UAE government portals are not built for scraping. Heavy JavaScript rendering, inconsistent HTML structure, aggressive rate limiting. We built a fallback system with 19+ pre-cached legal skills across 5 domains, so the demo never breaks even if scraping fails. The scraper is the best-effort layer; the fallbacks are the guarantee.

---

## Accomplishments That We're Proud Of

- **Measurable self-improvement**: Labor domain evolved through **6 strategy versions**, each with a specific, traceable enhancement. Average score improved from $\sim 28/40$ to $\sim 35/40$ — a $25\%$ increase driven entirely by autonomous learning.

- **Zero-to-capable in one query**: The system starts knowing nothing about a legal domain. One question triggers agent spawning, web scraping, skill extraction, and knowledge injection. By the second query, the agent is fully equipped and cached.

- **Full observability stack**: Every single agent decision is traced in LangFuse — classification, generation, judging, retries, strategy evolution. Any hackathon judge can open the dashboard and verify every claim we make about self-improvement.

- **Production-ready deployment**: Not a notebook demo. Docker Compose for local dev, CloudFormation for AWS Lambda, OpenAI-compatible API for any chat frontend. The same codebase runs locally, in containers, or serverless.

- **The Learning Proof Dashboard**: The crown jewel. Real-time learning KPIs, diff-style evolution cards with version badges, a learning velocity chart with annotated strategy evolution points, live toast notifications during chat, and collapsible before/after strategy views. Hackathon judges see proof, not promises.

---

## What We Learned

**Self-improvement needs a closed loop, not just a score.** Logging scores is easy. Turning scores into actionable feedback, feeding that back into the system, and tracking whether the feedback actually improved future performance — that's the hard part. The judge→retry→strategy pipeline is the real innovation, not any single model call.

**Multi-agent systems need clear boundaries.** Early in development, we had the orchestrator, generator, and judge all using the same model and similar prompts. Responses were mediocre because the judge couldn't be objective about output from a near-identical prompt. Separating concerns — fast classification with Haiku, deep reasoning with Sonnet, independent evaluation with a different Sonnet prompt — made each agent genuinely good at its job.

**The best demo is a live one.** Static screenshots of scores don't convince anyone. SSE streaming that shows "Classifying... Generating... Judging... Score: 35/40 PASS" in real time, followed by a green toast notification saying "Strategy Evolved: labor v5 → v6" — that tells a story no slide deck can match.

**UAE law is surprisingly well-structured.** Federal Decree-Laws have clear article numbers, MOHRE has documented procedures, RERA has a rent calculator formula. This structure made it possible for an AI system to cite specific legal references accurately — something that wouldn't work as well in jurisdictions with less codified law.

---

## What's Next for BarqAdl

**Arabic language support.** Over 80% of UAE legal aid seekers are Arabic-speaking. The entire pipeline — classification, generation, judging, formatting — needs to work natively in Arabic, not through translation.

**Bedrock Knowledge Bases.** Replace web scraping with curated vector stores of official UAE legal documents. More reliable, faster, and we can include full-text Federal Decree-Laws rather than scraped excerpts.

**User feedback loop.** Currently the judge is the only evaluator. Adding user satisfaction scores (already partially built via `/api/feedback`) as a second improvement signal would create a dual-loop: AI judge for quality, human feedback for relevance.

**More legal domains.** Family law, criminal law, real estate beyond tenancy, intellectual property, and immigration beyond visas. Each new domain is just a new prompt file, a fallback skill set, and the system auto-spawns the rest.

**Deployed legal aid service.** Partner with organizations like Tawafuq Legal Aid Centers to offer BarqAdl as a free first-response tool. A migrant worker texts a question on WhatsApp, BarqAdl responds with accurate legal guidance, specific articles, and the exact steps to file a complaint — in under 10 seconds.

---

*Built for the Ruya AI Self-Improving Agents Hackathon at the American University of Dubai.*
*BarqAdl — because justice shouldn't wait.* ⚡
