const { invokeModel } = require('../config/bedrock');
const { loadPrompt } = require('../utils/promptLoader');
const { safeJsonParse } = require('../utils/helpers');

const SYSTEM_PROMPT = loadPrompt('orchestrator-classifier');

const classify = async (userMessage, trace) => {
  const span = trace.span({ name: 'orchestrator-classify' });

  try {
    const raw = await invokeModel(SYSTEM_PROMPT, userMessage, {
      temperature: 0.1,
      maxTokens: 1000,
    });

    const classification = safeJsonParse(raw);

    if (!classification || !classification.domains) {
      // Fallback classification
      const fallback = {
        domains: ['labor'],
        sub_topics: ['general'],
        entities: {},
        urgency: 'medium',
        complexity: 'simple',
        routing: {
          primary_agent: 'labor',
          secondary_agents: [],
          needs_scraping: false,
        },
        summary: userMessage.substring(0, 200),
      };
      span.end({ output: fallback });
      return fallback;
    }

    span.end({ output: classification });
    return classification;
  } catch (err) {
    span.end({ output: { error: err.message } });
    // Return a default classification on error
    return {
      domains: ['labor'],
      sub_topics: ['general'],
      entities: {},
      urgency: 'medium',
      complexity: 'simple',
      routing: {
        primary_agent: 'labor',
        secondary_agents: [],
        needs_scraping: false,
      },
      summary: userMessage.substring(0, 200),
    };
  }
};

module.exports = { classify };
