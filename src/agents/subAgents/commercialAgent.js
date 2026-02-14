const BaseAgent = require('./baseAgent');

class CommercialAgent extends BaseAgent {
  constructor() {
    super('commercial', 'sub-agent-commercial');
  }
}

module.exports = CommercialAgent;
