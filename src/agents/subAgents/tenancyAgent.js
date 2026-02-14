const BaseAgent = require('./baseAgent');

class TenancyAgent extends BaseAgent {
  constructor() {
    super('tenancy', 'sub-agent-tenancy');
  }
}

module.exports = TenancyAgent;
