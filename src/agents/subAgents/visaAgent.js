const BaseAgent = require('./baseAgent');

class VisaAgent extends BaseAgent {
  constructor() {
    super('visa', 'sub-agent-visa');
  }
}

module.exports = VisaAgent;
