const BaseAgent = require('./baseAgent');

class LaborAgent extends BaseAgent {
  constructor() {
    super('labor', 'sub-agent-labor');
  }
}

module.exports = LaborAgent;
