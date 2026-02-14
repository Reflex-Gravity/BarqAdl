# BarqAdl — Master Build Instructions
## For Claude Code / AI Coding Agent

> **Read this file completely before writing any code.**
> This document is the single source of truth for building the BarqAdl platform.

---

## 🎯 What We're Building

**BarqAdl** (⚡ Justice at the speed of light) — A self-improving multi-agent legal AI platform for UAE law.

**Core Concept:** User asks a legal question → Orchestrator classifies it → System checks if a specialist sub-agent exists for that domain → If not, spawns one and scrapes UAE legal resources to equip it → Sub-agent generates an action plan → Judge agent scores it → If score is low, retries with feedback → Response delivered → System learns for next time.

---

## 🏗️ Tech Stack (Non-Negotiable)

| Layer | Technology | Details |
|-------|-----------|---------|
| **Frontend** | LibreChat | Open-source chat UI. Clone from `github.com/danny-avila/LibreChat`. Configure to point to our Node.js backend as a custom endpoint. |
| **Backend** | Node.js + Express | Orchestration server. Handles all agent logic, registry, scraping, Bedrock calls. WebSocket/SSE for streaming. |
| **AI Engine** | AWS Bedrock (ADK) | Use `@aws-sdk/client-bedrock-runtime` for Claude Sonnet. Use Bedrock Knowledge Bases for RAG. S3 for document storage. |
| **Observability** | LangFuse | Use `langfuse` npm package. Trace every request. Score every response. This powers the self-improvement dashboard. |
| **Database** | DynamoDB (or SQLite for hackathon speed) | Agent registry, improvement memory, strategy store, skill metadata. |

---

## 📁 Target Project Structure

```
barqadl/
├── README.md
├── package.json
├── .env.example
├── .env
│
├── src/
│   ├── index.js                      # Express server entry point
│   ├── config/
│   │   ├── bedrock.js                # AWS Bedrock client config
│   │   ├── langfuse.js               # LangFuse client config
│   │   └── db.js                     # DynamoDB / SQLite config
│   │
│   ├── agents/
│   │   ├── orchestrator.js           # Main orchestrator — classifies queries
│   │   ├── skillScraper.js           # Scrapes web for legal resources
│   │   ├── judge.js                  # Evaluates responses, scores them
│   │   ├── responseFormatter.js      # Formats final output
│   │   └── subAgents/
│   │       ├── factory.js            # Dynamic sub-agent spawner
│   │       ├── baseAgent.js          # Base class all sub-agents extend
│   │       ├── laborAgent.js         # Labor law specialist
│   │       ├── tenancyAgent.js       # Tenancy specialist
│   │       ├── commercialAgent.js    # Commercial/business specialist
│   │       └── visaAgent.js          # Visa/immigration specialist
│   │
│   ├── registry/
│   │   ├── agentRegistry.js          # Tracks spawned agents + their skills
│   │   └── strategyStore.js          # Tracks prompt strategies + scores
│   │
│   ├── knowledge/
│   │   ├── knowledgeBase.js          # Bedrock Knowledge Base integration
│   │   ├── s3Manager.js             # Upload/manage docs in S3
│   │   └── skillStore.js            # Local skill cache + metadata
│   │
│   ├── middleware/
│   │   ├── langfuseTrace.js          # Auto-trace every request
│   │   └── errorHandler.js           # Global error handling
│   │
│   ├── routes/
│   │   ├── chat.js                   # POST /api/chat — main chat endpoint
│   │   ├── agents.js                 # GET /api/agents — registry status
│   │   └── metrics.js                # GET /api/metrics — improvement stats
│   │
│   └── utils/
│       ├── promptLoader.js           # Loads .md prompts from /prompts folder
│       ├── webScraper.js             # Puppeteer/Cheerio web scraper
│       └── helpers.js                # Shared utilities
│
├── prompts/                          # ⚠️ ALREADY EXISTS — read these files
│   ├── orchestrator-classifier.md
│   ├── skill-scraper.md
│   ├── sub-agent-labor.md
│   ├── sub-agent-tenancy.md
│   ├── sub-agent-commercial.md
│   ├── sub-agent-visa.md
│   ├── judge-evaluator.md
│   └── response-formatter.md
│
├── data/                             # Local storage for hackathon
│   ├── registry.json                 # Agent registry state
│   ├── strategies.json               # Strategy scores per domain
│   ├── skills/                       # Cached scraped skills per domain
│   │   ├── labor.json
│   │   ├── tenancy.json
│   │   └── ...
│   └── improvement-log.json          # Score history for all queries
│
├── librechat/                        # LibreChat config overrides
│   └── librechat.yaml               # Custom endpoint config pointing to our backend
│
├── scripts/
│   ├── setup-s3.sh                   # Create S3 bucket + upload initial docs
│   ├── setup-kb.sh                   # Create Bedrock Knowledge Base
│   └── seed-data.sh                  # Pre-load some test data
│
└── docs/
    ├── architecture.html             # ⚠️ ALREADY EXISTS
    ├── self-learning-guide.md        # ⚠️ ALREADY EXISTS
    └── api-reference.md              # API endpoint documentation
```

---

## 🔨 Build Order (Follow This Exactly)

### Phase 1: Foundation (Build First)
1. `package.json` — Initialize with all dependencies
2. `.env.example` — All required environment variables
3. `src/config/bedrock.js` — AWS Bedrock client
4. `src/config/langfuse.js` — LangFuse client
5. `src/config/db.js` — Simple JSON file store (SQLite if time allows)
6. `src/utils/promptLoader.js` — Read .md prompt files from /prompts directory
7. `src/index.js` — Express server with basic routes

### Phase 2: Core Agents (Build Second)
8. `src/agents/orchestrator.js` — Read `prompts/orchestrator-classifier.md` for the exact prompt. Implement classification logic.
9. `src/agents/subAgents/baseAgent.js` — Base class with: invoke(), getSkills(), getStrategy()
10. `src/agents/subAgents/factory.js` — Dynamic spawner: `createAgent(domain)` → returns the right sub-agent
11. `src/agents/subAgents/laborAgent.js` — Extends baseAgent. Uses `prompts/sub-agent-labor.md`
12. `src/agents/subAgents/tenancyAgent.js` — Uses `prompts/sub-agent-tenancy.md`
13. `src/agents/subAgents/commercialAgent.js` — Uses `prompts/sub-agent-commercial.md`
14. `src/agents/subAgents/visaAgent.js` — Uses `prompts/sub-agent-visa.md`

### Phase 3: Self-Improvement System (Build Third — CRITICAL)
15. `src/registry/agentRegistry.js` — Track spawned agents, their skill counts, status
16. `src/agents/judge.js` — Read `prompts/judge-evaluator.md`. Implement scoring + retry logic.
17. `src/registry/strategyStore.js` — Track strategy versions + their avg scores per domain
18. `src/agents/skillScraper.js` — Read `prompts/skill-scraper.md`. Implement web search + content extraction.
19. `src/middleware/langfuseTrace.js` — Auto-trace with scores

### Phase 4: API & Integration (Build Fourth)
20. `src/routes/chat.js` — Main endpoint: orchestrate the full pipeline
21. `src/routes/agents.js` — Return registry status (for dashboard)
22. `src/routes/metrics.js` — Return improvement metrics (for dashboard)
23. `src/agents/responseFormatter.js` — Read `prompts/response-formatter.md`
24. `librechat/librechat.yaml` — Configure LibreChat custom endpoint

### Phase 5: Polish (If Time Allows)
25. Pre-seed some skills in `data/skills/`
26. Create setup scripts for S3 + Bedrock KB
27. Add WebSocket streaming for real-time response
28. Add Arabic language support

---

## 🔑 Key Implementation Details

### Bedrock Invocation Pattern
```javascript
// Use this pattern for ALL Bedrock calls
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const invokeModel = async (systemPrompt, userMessage, options = {}) => {
  const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION });
  
  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature || 0.3,
    system: systemPrompt,
    messages: [
      { role: "user", content: userMessage }
    ]
  };

  const command = new InvokeModelCommand({
    modelId: process.env.BEDROCK_MODEL_ID || "anthropic.claude-sonnet-4-20250514",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(payload)
  });

  const response = await client.send(command);
  const body = JSON.parse(new TextDecoder().decode(response.body));
  return body.content[0].text;
};
```

### LangFuse Tracing Pattern
```javascript
// Use this pattern for EVERY agent call
const Langfuse = require('langfuse');

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL
});

// Per request:
const trace = langfuse.trace({
  name: 'barqadl-query',
  userId: req.userId,
  metadata: { domain: classification.domains }
});

// Per agent call:
const span = trace.span({ name: 'orchestrator-classify' });
// ... do work ...
span.end({ output: result });

// Per evaluation:
trace.score({ name: 'legal_accuracy', value: 8 });
trace.score({ name: 'completeness', value: 7 });
```

### Main Chat Pipeline (src/routes/chat.js)
```javascript
// This is the core pipeline — implement this flow exactly
async function handleChat(userMessage, conversationHistory) {
  // 1. Start LangFuse trace
  const trace = langfuse.trace({ name: 'barqadl-query' });
  
  // 2. Orchestrator classifies
  const classification = await orchestrator.classify(userMessage, trace);
  
  // 3. For each domain, get or spawn sub-agent
  const agents = await Promise.all(
    classification.domains.map(domain => 
      agentRegistry.getOrSpawn(domain, trace)
    )
  );
  
  // 4. If any agent was newly spawned, scrape skills
  for (const agent of agents) {
    if (agent.isNew) {
      await skillScraper.equip(agent.domain, trace);
    }
  }
  
  // 5. Generate action plan (primary agent, with secondary support)
  const primaryAgent = agents[0];
  const actionPlan = await primaryAgent.generate(
    userMessage, classification, trace
  );
  
  // 6. Judge evaluates
  const evaluation = await judge.evaluate(
    userMessage, classification, actionPlan, trace
  );
  
  // 7. Retry if needed
  let finalPlan = actionPlan;
  if (!evaluation.pass) {
    finalPlan = await primaryAgent.regenerate(
      userMessage, classification, evaluation.feedback, trace
    );
    // Re-evaluate
    const reEval = await judge.evaluate(
      userMessage, classification, finalPlan, trace
    );
    // Log retry
    trace.event({ name: 'judge_retry', metadata: { 
      before: evaluation.scores.total, 
      after: reEval.scores.total 
    }});
  }
  
  // 8. Format response
  const formatted = await responseFormatter.format(finalPlan, classification, trace);
  
  // 9. Update strategy store
  await strategyStore.update(
    classification.domains[0], 
    evaluation.scores
  );
  
  // 10. End trace
  trace.update({ output: formatted });
  
  return formatted;
}
```

### Agent Registry Pattern
```javascript
// Agent Registry — the heart of dynamic spawning
class AgentRegistry {
  constructor() {
    this.agents = {}; // { domain: { agent, skills, avgScore, queryCount } }
    this.load(); // Load from data/registry.json
  }

  async getOrSpawn(domain, trace) {
    if (this.agents[domain]) {
      trace.event({ name: 'agent_reused', metadata: { domain } });
      return { ...this.agents[domain], isNew: false };
    }
    
    // Spawn new agent
    const agent = AgentFactory.create(domain);
    this.agents[domain] = {
      agent,
      skills: 0,
      avgScore: 0,
      queryCount: 0,
      createdAt: new Date().toISOString()
    };
    
    trace.event({ name: 'new_agent_spawned', metadata: { domain } });
    this.save();
    
    return { ...this.agents[domain], isNew: true };
  }
}
```

### Prompt Loader Pattern
```javascript
// Load prompts from .md files — this is important
const fs = require('fs');
const path = require('path');

const loadPrompt = (promptName) => {
  const filePath = path.join(__dirname, '../../prompts', `${promptName}.md`);
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Extract the system prompt between ``` markers
  const match = content.match(/```\n([\s\S]*?)```/);
  if (match) return match[1].trim();
  
  // Fallback: return everything after "## System Prompt"
  const parts = content.split('## System Prompt');
  return parts.length > 1 ? parts[1].trim() : content;
};
```

### Skill Scraper Pattern
```javascript
// Web scraping for legal resources
const cheerio = require('cheerio');
const axios = require('axios');

class SkillScraper {
  async equip(domain, trace) {
    const span = trace.span({ name: `skill-scraper-${domain}` });
    
    // 1. Get search queries for this domain
    const queries = this.getSearchQueries(domain);
    
    // 2. Search and fetch content
    const rawContent = [];
    for (const query of queries) {
      try {
        const results = await this.searchWeb(query);
        const content = await this.extractContent(results[0].url);
        rawContent.push(content);
      } catch (e) {
        console.error(`Scrape failed for: ${query}`, e.message);
      }
    }
    
    // 3. Use Bedrock to structure into skills
    const prompt = loadPrompt('skill-scraper');
    const structured = await invokeModel(prompt, 
      `Domain: ${domain}\n\nRaw content:\n${rawContent.join('\n---\n')}\n\nExtract and structure skills.`
    );
    
    // 4. Save skills locally
    const skills = JSON.parse(structured);
    this.saveSkills(domain, skills);
    
    // 5. Log to LangFuse
    span.end({ output: { skills_count: skills.skills?.length || 0 } });
    trace.event({ name: 'new_skills_acquired', metadata: { domain, count: skills.skills?.length } });
    
    return skills;
  }
  
  getSearchQueries(domain) {
    const queryMap = {
      labor: [
        "UAE labor law MOHRE complaint process",
        "Federal Decree-Law 33 2021 UAE employment rights",
        "UAE wage protection system WPS rules"
      ],
      tenancy: [
        "Dubai rental dispute RERA process",
        "Dubai tenancy law eviction rules",
        "RERA rent calculator Dubai increase"
      ],
      commercial: [
        "UAE business setup mainland vs freezone",
        "Dubai trade license DED application",
        "UAE commercial companies law 2021"
      ],
      visa: [
        "UAE work permit process MOHRE",
        "UAE golden visa requirements 2024",
        "UAE visa cancellation grace period rules"
      ]
    };
    return queryMap[domain] || [`UAE ${domain} law regulations`];
  }
}
```

---

## 🌍 Environment Variables (.env)

```
# AWS
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
BEDROCK_MODEL_ID=anthropic.claude-sonnet-4-20250514
BEDROCK_KB_ID=your_knowledge_base_id

# LangFuse
LANGFUSE_PUBLIC_KEY=pk-...
LANGFUSE_SECRET_KEY=sk-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com

# Server
PORT=3001
NODE_ENV=development

# LibreChat
LIBRECHAT_API_URL=http://localhost:3001

# Optional
S3_BUCKET=barqadl-legal-docs
DYNAMODB_TABLE=barqadl-registry
```

---

## 📦 Dependencies (package.json)

```json
{
  "name": "barqadl",
  "version": "1.0.0",
  "description": "BarqAdl - Justice at the speed of light",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  },
  "dependencies": {
    "@aws-sdk/client-bedrock-runtime": "^3.500.0",
    "@aws-sdk/client-bedrock-agent-runtime": "^3.500.0",
    "@aws-sdk/client-s3": "^3.500.0",
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.0",
    "langfuse": "^3.0.0",
    "axios": "^1.6.0",
    "cheerio": "^1.0.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}
```

---

## ⚠️ Critical Notes

1. **Read the prompt files FIRST** — Every .md file in `/prompts` contains the exact system prompt to use. Extract the prompt from between the ``` markers.

2. **LangFuse on EVERYTHING** — Every Bedrock call must be traced. Every judge score must be logged. This is not optional — it's the self-improvement proof.

3. **JSON fallback for DB** — Use simple JSON files in `/data` for hackathon speed. Don't waste time on DynamoDB unless the basics are working.

4. **The Judge is the key** — The judge-evaluator is the most important agent. If you only have time for one self-improvement mechanism, make sure the judge scoring + retry loop works perfectly.

5. **Pre-seed before demo** — Run 10-15 test queries before the live demo so LangFuse has visible improvement trends.

6. **LibreChat is just the UI** — Don't spend time customizing LibreChat. Just point it to your backend. The magic is in the Node.js agents.

7. **Scraper can be simplified** — For the hackathon, the scraper can use pre-cached results if live scraping is too slow. Have fallback JSON files in `/data/skills/`.

---

## ✅ Definition of Done

The system is complete when:
- [ ] User can type a legal question in LibreChat
- [ ] Orchestrator classifies it correctly
- [ ] Correct sub-agent is activated (or spawned if new)
- [ ] Action plan is generated with UAE law citations
- [ ] Judge scores the response (visible in logs)
- [ ] If score is low, system retries automatically
- [ ] LangFuse shows traces with scores
- [ ] Second query in same domain scores higher than first
- [ ] New domain triggers agent spawning (visible)
- [ ] `/api/agents` returns registry status
- [ ] `/api/metrics` returns improvement stats
