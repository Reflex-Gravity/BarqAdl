# BarqAdl — Claude Code Starter Prompt

> **Copy everything below the line and paste it into Claude Code as your first message.**

---

## 📋 PASTE THIS INTO CLAUDE CODE:

```
You are building BarqAdl — "Justice at the speed of light" — a self-improving multi-agent legal AI platform for UAE law. This is for a hackathon with a 6-hour time limit, so move fast and prioritize working code over perfection.

## STEP 0: READ THE INSTRUCTIONS FIRST
Before writing ANY code, read these files in order:
1. Read `INSTRUCTIONS.md` — This is the master build plan with exact project structure, build order, code patterns, and implementation details.
2. Read all files in `prompts/` directory — These contain the exact system prompts for each agent.
3. Read `self-learning-guide.md` — This explains the 4 self-improvement mechanisms that judges will score on.

## WHAT TO BUILD
A Node.js backend that powers a multi-agent legal AI system:

**Tech Stack:**
- LibreChat (frontend — just configure, don't build from scratch)
- Node.js + Express (backend — this is what you're building)
- AWS Bedrock with Claude Sonnet (LLM — all agent calls go through Bedrock)
- LangFuse (observability — trace every call, score every response)

**3 Core Agents:**
1. **Orchestrator** — Classifies user's legal query into domains (labor, tenancy, commercial, visa, etc.), extracts entities. Prompt: `prompts/orchestrator-classifier.md`
2. **Skill Scraper** — When a new domain is encountered, searches web for UAE legal resources and structures them as "skills." Prompt: `prompts/skill-scraper.md`
3. **Judge Evaluator** — Scores every response on 4 dimensions (accuracy, completeness, actionability, citations). If score < 32/40, triggers retry with feedback. Prompt: `prompts/judge-evaluator.md`

**Dynamic Sub-Agents** (spawned on-demand per domain):
- Labor Agent → `prompts/sub-agent-labor.md`
- Tenancy Agent → `prompts/sub-agent-tenancy.md`
- Commercial Agent → `prompts/sub-agent-commercial.md`
- Visa Agent → `prompts/sub-agent-visa.md`

**Self-Improvement Loop (CRITICAL — judges score on this):**
1. New query → Orchestrator classifies → Check Agent Registry
2. If domain agent doesn't exist → Spawn new agent + Skill Scraper fetches legal resources
3. Sub-agent generates action plan using its skills
4. Judge scores the plan → If low, retry with feedback → Log scores to LangFuse
5. Strategy store tracks which approaches score highest per domain
6. Next query in same domain → uses best strategy → scores higher → SELF-IMPROVEMENT PROVEN

## BUILD ORDER (follow INSTRUCTIONS.md Phase 1-5)
1. Foundation: package.json, .env, Bedrock client, LangFuse client, prompt loader
2. Core Agents: Orchestrator, base sub-agent class, factory, domain sub-agents
3. Self-Improvement: Agent registry, Judge, strategy store, skill scraper
4. API Routes: /api/chat (main pipeline), /api/agents (registry), /api/metrics (stats)
5. LibreChat config: librechat.yaml pointing to our backend

## KEY RULES
- Read INSTRUCTIONS.md for exact code patterns (Bedrock invocation, LangFuse tracing, pipeline flow)
- Every Bedrock call MUST be traced in LangFuse with spans
- Every judge score MUST be logged to LangFuse
- Use JSON files in /data for storage (not DynamoDB — hackathon speed)
- Load prompts from .md files in /prompts — extract system prompts from between ``` markers
- The main chat pipeline in /api/chat must follow the exact flow in INSTRUCTIONS.md
- If web scraping is too slow, have fallback pre-cached skill files in /data/skills/

## START NOW
Read INSTRUCTIONS.md first, then begin with Phase 1. Build incrementally — get each phase working before moving to the next.
```

---

## 🚀 HOW TO USE THIS

### Step 1: Set Up Your Project Folder
Create a folder called `barqadl` and copy these files into it:
```
barqadl/
├── INSTRUCTIONS.md          ← Master build plan (just created)
├── self-learning-guide.md   ← Demo strategy for judges
├── architecture.html        ← Architecture diagram
├── README.md                ← Project readme
├── prompts/
│   ├── orchestrator-classifier.md
│   ├── skill-scraper.md
│   ├── sub-agent-labor.md
│   ├── sub-agent-tenancy.md
│   ├── sub-agent-commercial.md
│   ├── sub-agent-visa.md
│   ├── judge-evaluator.md
│   └── response-formatter.md
└── CLAUDE-CODE-PROMPT.md    ← This file
```

### Step 2: Open Claude Code
```bash
cd barqadl
claude
```

### Step 3: Paste the Prompt
Copy everything inside the ``` block above and paste it as your first message in Claude Code.

### Step 4: Let It Build
Claude Code will:
1. Read INSTRUCTIONS.md
2. Read all prompt files
3. Read self-learning-guide.md
4. Start building Phase 1 → 2 → 3 → 4 → 5

### Step 5: Iterate
After the initial build, you can ask Claude Code to:
- "Run the server and test with a sample query"
- "Fix any errors in the judge evaluation flow"
- "Add the LangFuse tracing to all Bedrock calls"
- "Set up the LibreChat custom endpoint config"
- "Pre-seed some labor law skills for the demo"
- "Test the full pipeline end-to-end"

---

## 💡 Pro Tips for Claude Code

### If something breaks:
```
Read the error, check INSTRUCTIONS.md for the correct pattern, and fix it. Don't deviate from the architecture.
```

### To add a new domain sub-agent:
```
Create a new prompt file prompts/sub-agent-{domain}.md following the same pattern as sub-agent-labor.md, then create the agent class in src/agents/subAgents/{domain}Agent.js extending baseAgent.js, and register it in the factory.
```

### To test the self-improvement loop:
```
Run 3 queries in the same domain. First one should trigger scraping. Judge should score it. Second one should score higher. Show me the LangFuse traces showing improvement.
```

### To prepare for demo:
```
Run 10-15 test queries across labor, tenancy, and visa domains. Make sure LangFuse has visible score improvement trends. Leave one domain (commercial) untouched so we can show live agent spawning during the demo.
```

### If you run out of time:
```
Priority 1: Main chat pipeline works (classify → generate → respond)
Priority 2: Judge scoring works and logs to LangFuse
Priority 3: Agent spawning is visible
Priority 4: Everything else is bonus
