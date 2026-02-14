const LaborAgent = require('./laborAgent');
const TenancyAgent = require('./tenancyAgent');
const CommercialAgent = require('./commercialAgent');
const VisaAgent = require('./visaAgent');
const BaseAgent = require('./baseAgent');

const AGENT_MAP = {
  labor: LaborAgent,
  tenancy: TenancyAgent,
  commercial: CommercialAgent,
  visa: VisaAgent,
};

const createAgent = (domain) => {
  const AgentClass = AGENT_MAP[domain];
  if (AgentClass) {
    return new AgentClass();
  }
  // For unknown domains, create a generic agent with the labor prompt as fallback
  // The skill scraper will equip it with relevant knowledge
  console.log(`[Factory] No pre-built agent for domain "${domain}", creating generic agent`);
  return new BaseAgent(domain, 'sub-agent-labor');
};

const getAvailableDomains = () => Object.keys(AGENT_MAP);

module.exports = { createAgent, getAvailableDomains };
