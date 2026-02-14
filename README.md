# ⚡ BarqAdl — Justice at the Speed of Light

> An agentic legal AI platform that provides instant, reliable legal guidance — reducing wait times, lowering costs, and making justice accessible on demand.

---

## Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| Frontend | **LibreChat** | Open-source chat UI for user interaction |
| Backend | **Node.js** | Orchestration, agent registry, API server |
| AI Engine | **AWS Bedrock (ADK)** | LLM (Claude), Knowledge Bases, agent orchestration |
| Observability | **LangFuse** | Tracing, scoring, self-improvement proof |

---

## Architecture

See `architecture.html` for the full interactive diagram.

**3 Core Agents:**
1. **Orchestrator** — Classifies user queries, routes to sub-agents
2. **Skill Scraper** — Searches & structures UAE legal resources for new domains
3. **Judge Evaluator** — Scores responses, triggers retries, drives self-improvement

**Dynamic Sub-Agents** (spawned on-demand):
- Labor Agent, Tenancy Agent, Commercial Agent, Visa Agent, Family Agent, Criminal Agent

---

## File Structure

```
barqadl/
├── prompts/
│   ├── orchestrator-classifier.md    ← Classifies domain, extracts entities
│   ├── skill-scraper.md              ← Guides web scraping & structuring
│   ├── sub-agent-labor.md            ← Labor law specialist
│   ├── sub-agent-tenancy.md          ← Tenancy/rental specialist
│   ├── sub-agent-commercial.md       ← Business setup specialist
│   ├── sub-agent-visa.md             ← Visa/immigration specialist
│   ├── judge-evaluator.md            ← Scores responses, triggers retries
│   └── response-formatter.md         ← Formats final output for LibreChat
├── self-learning-guide.md            ← HOW TO DEMO SELF-IMPROVEMENT
├── architecture.html                 ← Interactive architecture diagram
└── README.md                         ← This file
```

---

## Self-Improvement Mechanisms

1. **Dynamic Agent Spawning** — New domains → new agents created automatically
2. **Judge-Driven Quality** — Scores improve over time, retries decrease
3. **Skill Gap Auto-Fill** — Missing knowledge triggers new web scraping
4. **Strategy Optimization** — Best-performing prompt versions are auto-selected

See `self-learning-guide.md` for the complete demo strategy.

---

## Hackathon: Ruya AI Self-Improving Agents Challenge
**Prize Pool:** $27,500 USD  
**Location:** American University of Dubai  
**Sponsors:** AWS, ClickHouse, ElevenLabs, Datamellon
