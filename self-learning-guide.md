# BarqAdl — Self-Learning Guide
## How to Demonstrate Self-Improvement to Judges

> This is the most important document for your hackathon demo. The judges score heavily on **self-improvement**. This guide tells you exactly how BarqAdl learns and how to prove it live.

---

## The 4 Self-Improvement Mechanisms

BarqAdl improves itself through 4 distinct mechanisms. Each one is independently demonstrable.

---

### Mechanism 1: Dynamic Agent Spawning (New Capability Acquisition)

**What happens:** When a user asks about a legal domain BarqAdl has never seen, it dynamically creates a new specialist sub-agent and equips it with knowledge scraped from the web.

**How it learns:**
1. Query comes in about "tenancy" → Orchestrator classifies it
2. Agent Registry has no Tenancy Agent → spawns one
3. Skill Scraper searches UAE tenancy law sources online
4. Extracted legal knowledge is structured and loaded as skills
5. New Tenancy Agent now exists with domain expertise
6. Next tenancy query → agent already exists, no scraping needed

**How to demo this to judges:**
```
Demo Script:
1. Show the Agent Registry — it starts empty (or with just Labor)
2. Ask: "My landlord is demanding a 30% rent increase"
3. Show in real-time:
   - Orchestrator classifies → "tenancy"
   - Registry check → "No tenancy agent found"
   - Skill Scraper activates → scraping RERA, Dubai Land Department
   - New Tenancy Agent spawns with 11 skills loaded
4. Show the Registry again — Tenancy Agent now exists
5. Ask another tenancy question — this time it responds instantly (no scraping)
```

**LangFuse proof:** Show the trace — first tenancy query has a "skill-scraper" span (took 5s). Second query has no scraper span (0s). The system learned a new domain.

---

### Mechanism 2: Judge-Driven Quality Improvement (Response Quality Goes Up)

**What happens:** Every response is scored by the Judge Agent. Low scores trigger retries with specific feedback. Over time, the system learns what makes a good answer for each domain.

**How it learns:**
1. Sub-agent generates action plan
2. Judge scores it: accuracy=7, completeness=5, actionability=8, citations=6 → total=26 (below 32 threshold)
3. Judge provides feedback: "Missing WPS reference, no legal aid info"
4. Sub-agent re-generates incorporating the feedback → new score: 34 ✅
5. The feedback pattern is stored: "Labor wage cases need WPS"
6. Next labor wage query → sub-agent includes WPS from the start → scores 36 first try

**How to demo this to judges:**
```
Demo Script:
1. Ask: "My employer hasn't paid me in 2 months"
2. Show the Judge evaluation panel:
   - Score: 26/40 ❌
   - Feedback: "Missing WPS, no Tawafuq reference"
3. Show the retry happening automatically
4. Show new score: 35/40 ✅
5. Now ask a SIMILAR question: "My company owes me 4 months salary"
6. Show it scores 37/40 on the FIRST try — no retry needed
7. Switch to LangFuse dashboard — show the score trend chart going UP
```

**LangFuse proof:** 
- Score trend chart: early queries average 6.5/10, later queries average 8.5/10
- Retry rate chart: starts at 40%, drops to 10%
- Per-domain breakdown: show labor scores improving independently from tenancy

---

### Mechanism 3: Skill Gap Detection & Auto-Scraping (Knowledge Grows)

**What happens:** When the Judge identifies that a response is missing critical information, it flags a "skill gap." This triggers the Skill Scraper to fetch additional resources for that specific topic.

**How it learns:**
1. Judge evaluates labor response → flags "Missing info about Tawafuq legal aid centers"
2. System detects this is a KNOWLEDGE gap (not a prompt gap) — the sub-agent doesn't have this info
3. Skill Scraper is triggered: searches "Tawafuq legal aid UAE"
4. New skill added to Labor Agent's knowledge base
5. Next labor query → agent now knows about Tawafuq and includes it automatically

**How to demo this to judges:**
```
Demo Script:
1. Show Labor Agent skills count: 12 skills
2. Ask a question that requires niche knowledge
3. Judge flags a gap → scraper fetches new info
4. Show skills count: now 14 skills
5. "The agent just taught itself something new"
```

**LangFuse proof:** Tag the trace with `skill_gap_detected` and `skill_acquired`. Show these events in the LangFuse timeline.

---

### Mechanism 4: Strategy Optimization (Prompts Evolve)

**What happens:** The system tracks which prompt strategies produce the highest scores for each domain. Over time, it selects the best-performing strategy automatically.

**How it learns:**
1. Labor Agent starts with default prompt strategy v1
2. After 3 queries, average score for strategy v1 = 7.2
3. Judge feedback patterns suggest adding: "Always start with MOHRE process"
4. System creates strategy v2 incorporating this
5. Strategy v2 average score = 8.6
6. System now defaults to v2 for all labor queries
7. v1 is kept as fallback

**How to demo this to judges:**
```
Demo Script:
1. Show the strategy store: { labor: { v1: avg_score 7.2 } }
2. Run several queries
3. Show the strategy store updated: { labor: { v1: 7.2, v2: 8.6, active: "v2" } }
4. "The system discovered that leading with MOHRE process improves labor answers by 19%"
```

**LangFuse proof:** Use LangFuse's `prompt` versioning feature. Show prompt v1 vs v2 performance comparison in the dashboard.

---

## Demo Day Checklist

### Before the Demo
- [ ] Pre-load at least 1 domain (Labor) so the agent has skills
- [ ] Leave at least 1 domain empty (Tenancy) so you can show spawning live
- [ ] Have 5-6 test queries ready covering different scenarios
- [ ] Have LangFuse dashboard open in another tab with score charts visible
- [ ] Test the full flow 3+ times

### During the 3-Minute Demo

| Time | What to Show | Self-Improvement Proof |
|------|-------------|----------------------|
| 0:00-0:20 | Problem statement | "Static AI can't improve" |
| 0:20-1:00 | First query (labor) | Judge scores it, show retry + improvement |
| 1:00-1:30 | Same domain again | Scores higher first try — learning! |
| 1:30-2:10 | New domain (tenancy) | Agent SPAWNS live + scraper runs |
| 2:10-2:40 | LangFuse dashboard | Score trends UP, retries DOWN |
| 2:40-3:00 | Tech stack + vision | "Every query makes it smarter" |

### Killer Phrases for Judges
- "The system you see now is smarter than the system 10 minutes ago"
- "It's not a static chatbot — it builds its own expertise"
- "Watch: this domain didn't exist 30 seconds ago. Now it does."
- "LangFuse proves it: scores up 30%, retries down 75%"
- "It doesn't just answer — it evolves"

---

## What Makes This DIFFERENT from Other Teams

| Other Teams | BarqAdl |
|---|---|
| Static multi-agent systems | Dynamic agent spawning |
| Pre-loaded knowledge only | Skills scraped on-demand from the web |
| User feedback only | Automated judge + user feedback |
| No observability | Full LangFuse tracing with score trends |
| Improvement is invisible | Improvement is VISIBLE in dashboard |
| Fixed prompts | Prompt strategies evolve based on scores |

---

## Technical Implementation Summary

```
Self-Improvement Data Flow:

User Query
    ↓
Orchestrator (classify) ──── LangFuse: trace.start()
    ↓
Registry Check ──── LangFuse: span("registry")
    ↓ (if new domain)
Skill Scraper ──── LangFuse: span("scraping"), event("new_skills_acquired")
    ↓
Sub-Agent Generate ──── LangFuse: span("generation"), generation()
    ↓
Judge Evaluate ──── LangFuse: score("accuracy"), score("completeness"), etc.
    ↓ (if score < threshold)
Retry with Feedback ──── LangFuse: span("retry"), event("judge_retry")
    ↓
Strategy Update ──── LangFuse: event("strategy_updated")
    ↓
Deliver to User ──── LangFuse: trace.end(), user_feedback()
```

---

## LangFuse Dashboard Setup for Demo

Create these views in LangFuse before the demo:

1. **Score Trend Chart** — Filter by `total_score`, group by time → shows improvement
2. **Retry Rate** — Count of `judge_retry` events / total traces → shows decrease
3. **Per-Domain Scores** — Filter by domain tag → shows each domain improving
4. **Agent Registry Growth** — Count of `new_agent_spawned` events → shows system growing
5. **Skills Acquired** — Count of `new_skills_acquired` events → shows knowledge growing
6. **Latency Improvement** — Average response time → should decrease as retries decrease

> **Pro tip:** Run 10-15 test queries before the demo so the charts have visible trends. Don't start with an empty LangFuse — pre-populate so judges see real improvement curves.
