const { readJSON, writeJSON } = require('../config/db');

const STRATEGIES_FILE = 'strategies.json';

class StrategyStore {
  constructor() {
    this.strategies = {}; // { domain: { versions: [{ version, avgScore, queryCount, enhancements }], active } }
    this.load();
  }

  load() {
    const data = readJSON(STRATEGIES_FILE);
    if (data) {
      this.strategies = data;
    }
  }

  save() {
    writeJSON(STRATEGIES_FILE, this.strategies);
  }

  getActiveStrategy(domain) {
    const domainStrategies = this.strategies[domain];
    if (!domainStrategies || !domainStrategies.versions?.length) return null;

    const activeVersion = domainStrategies.active || 'v1';
    return domainStrategies.versions.find(v => v.version === activeVersion) || domainStrategies.versions[0];
  }

  update(domain, scores, improvementSignal) {
    if (!this.strategies[domain]) {
      this.strategies[domain] = {
        versions: [{
          version: 'v1',
          avgScore: 0,
          totalScore: 0,
          queryCount: 0,
          enhancements: [],
        }],
        active: 'v1',
      };
    }

    const domainData = this.strategies[domain];
    const activeVersion = domainData.active || 'v1';
    const active = domainData.versions.find(v => v.version === activeVersion);

    if (active) {
      active.queryCount++;
      active.totalScore += scores.total || 0;
      active.avgScore = parseFloat((active.totalScore / active.queryCount).toFixed(2));
    }

    // If we have an improvement signal, consider creating a new strategy version
    let evolvedVersion = null;
    if (improvementSignal?.learned && improvementSignal?.update_prompt) {
      const newVersionNum = domainData.versions.length + 1;
      const newVersion = `v${newVersionNum}`;

      // Check if the learning is already captured
      const existingEnhancements = active?.enhancements || [];
      if (!existingEnhancements.includes(improvementSignal.learned)) {
        evolvedVersion = {
          version: newVersion,
          avgScore: 0,
          totalScore: 0,
          queryCount: 0,
          enhancements: [...existingEnhancements, improvementSignal.learned],
          createdAt: new Date().toISOString(),
          newEnhancement: improvementSignal.learned,
          previousVersion: active?.version || 'v1',
        };

        domainData.versions.push(evolvedVersion);
        domainData.active = newVersion;

        console.log(`[StrategyStore] Domain "${domain}" evolved to ${newVersion}: ${improvementSignal.learned}`);
      }
    }

    this.save();
    return { domainData, evolved: !!evolvedVersion, evolvedVersion };
  }

  getAllStrategies() {
    return this.strategies;
  }
}

// Singleton
let storeInstance = null;
const getStrategyStore = () => {
  if (!storeInstance) {
    storeInstance = new StrategyStore();
  }
  return storeInstance;
};

module.exports = { StrategyStore, getStrategyStore };
