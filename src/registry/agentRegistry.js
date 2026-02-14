const { readJSON, writeJSON } = require('../config/db');
const { createAgent } = require('../agents/subAgents/factory');

const REGISTRY_FILE = 'registry.json';

class AgentRegistry {
  constructor() {
    this.agents = {}; // { domain: { agent, skills, avgScore, queryCount, createdAt } }
    this.load();
  }

  load() {
    const data = readJSON(REGISTRY_FILE);
    if (data) {
      // Restore metadata but agents need to be re-instantiated
      for (const [domain, info] of Object.entries(data)) {
        this.agents[domain] = {
          agent: createAgent(domain),
          skills: info.skills || 0,
          avgScore: info.avgScore || 0,
          queryCount: info.queryCount || 0,
          createdAt: info.createdAt,
        };
      }
    }
  }

  save() {
    const serializable = {};
    for (const [domain, info] of Object.entries(this.agents)) {
      serializable[domain] = {
        domain,
        skills: info.skills,
        avgScore: info.avgScore,
        queryCount: info.queryCount,
        createdAt: info.createdAt,
      };
    }
    writeJSON(REGISTRY_FILE, serializable);
  }

  async getOrSpawn(domain, trace) {
    if (this.agents[domain]) {
      trace.event({ name: 'agent_reused', metadata: { domain } });
      this.agents[domain].queryCount++;
      this.save();
      return { ...this.agents[domain], isNew: false };
    }

    // Spawn new agent
    const agent = createAgent(domain);
    this.agents[domain] = {
      agent,
      skills: 0,
      avgScore: 0,
      queryCount: 1,
      createdAt: new Date().toISOString(),
    };

    trace.event({ name: 'new_agent_spawned', metadata: { domain } });
    this.save();

    return { ...this.agents[domain], isNew: true };
  }

  updateScore(domain, score) {
    if (!this.agents[domain]) return;
    const info = this.agents[domain];
    const totalBefore = info.avgScore * (info.queryCount - 1);
    info.avgScore = parseFloat(((totalBefore + score) / info.queryCount).toFixed(2));
    this.save();
  }

  updateSkillCount(domain, count) {
    if (!this.agents[domain]) return;
    this.agents[domain].skills = count;
    this.save();
  }

  getAllAgents() {
    const result = {};
    for (const [domain, info] of Object.entries(this.agents)) {
      result[domain] = {
        skills: info.skills,
        avgScore: info.avgScore,
        queryCount: info.queryCount,
        createdAt: info.createdAt,
      };
    }
    return result;
  }
}

// Singleton
let registryInstance = null;
const getRegistry = () => {
  if (!registryInstance) {
    registryInstance = new AgentRegistry();
  }
  return registryInstance;
};

module.exports = { AgentRegistry, getRegistry };
