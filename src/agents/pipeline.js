const orchestrator = require('./orchestrator');
const judge = require('./judge');
const responseFormatter = require('./responseFormatter');
const skillScraper = require('./skillScraper');
const { getRegistry } = require('../registry/agentRegistry');
const { getStrategyStore } = require('../registry/strategyStore');
const { appendToLog } = require('../config/db');

const handleChat = async (userMessage, conversationHistory, trace) => {
  const startTime = Date.now();

  // 1. Orchestrator classifies the query
  const classification = await orchestrator.classify(userMessage, trace);
  trace.update({ metadata: { domains: classification.domains, urgency: classification.urgency } });

  // 2. For each domain, get or spawn a sub-agent
  const registry = getRegistry();
  const agentResults = await Promise.all(
    classification.domains.map(domain => registry.getOrSpawn(domain, trace))
  );

  // 3. If any agent was newly spawned, equip it with skills via scraper
  for (const result of agentResults) {
    if (result.isNew) {
      const skills = await skillScraper.equip(result.agent.domain, trace);
      registry.updateSkillCount(result.agent.domain, skills.skills?.length || 0);
    }
  }

  // 4. Generate action plan using primary agent
  const primaryResult = agentResults[0];
  const primaryAgent = primaryResult.agent;
  let actionPlan = await primaryAgent.generate(userMessage, classification, trace);

  // 5. Judge evaluates the response
  let evaluation = await judge.evaluate(userMessage, classification, actionPlan, trace);

  // 6. Retry loop if needed
  let retried = false;
  let retryCount = 0;
  const maxRetries = evaluation.scores.total < 28 ? 2 : 1;

  while (!evaluation.pass && retryCount < maxRetries) {
    retryCount++;
    retried = true;

    const feedbackText = evaluation.feedback?.retry_instructions ||
      evaluation.feedback?.weaknesses?.join('. ') ||
      'Please improve legal citations and actionability.';

    trace.event({
      name: 'judge_retry',
      metadata: {
        attempt: retryCount,
        scoreBefore: evaluation.scores.total,
        feedback: feedbackText,
      },
    });

    // Regenerate with feedback
    actionPlan = await primaryAgent.regenerate(userMessage, classification, feedbackText, trace);

    // Re-evaluate
    evaluation = await judge.evaluate(userMessage, classification, actionPlan, trace);
  }

  // If still failing after retries, add disclaimer
  if (!evaluation.pass) {
    actionPlan += '\n\n> ⚠️ **Note:** This response may be incomplete. For your specific situation, we strongly recommend consulting a licensed UAE lawyer or contacting Tawafuq Legal Aid Centers (800-TAWAFUQ).';
  }

  // 7. Format the final response
  const formatted = await responseFormatter.format(actionPlan, classification, trace);

  // 8. Update strategy store with scores and improvement signals
  const strategyStore = getStrategyStore();
  strategyStore.update(
    classification.domains[0],
    evaluation.scores,
    evaluation.improvement_signal
  );

  // Update agent score in registry
  registry.updateScore(classification.domains[0], evaluation.scores.total);

  // 9. Log to improvement log
  appendToLog('improvement-log.json', {
    query: userMessage.substring(0, 200),
    domain: classification.domains[0],
    domains: classification.domains,
    urgency: classification.urgency,
    complexity: classification.complexity,
    totalScore: evaluation.scores.total,
    scores: evaluation.scores,
    retried,
    retryCount,
    pass: evaluation.pass,
    agentsUsed: classification.domains,
    responseTime: Date.now() - startTime,
  });

  // 10. Finalize trace
  trace.update({
    output: formatted.substring(0, 500),
    metadata: {
      totalScore: evaluation.scores.total,
      retried,
      pass: evaluation.pass,
      responseTime: Date.now() - startTime,
    },
  });

  return {
    response: formatted,
    classification,
    evaluation: {
      scores: evaluation.scores,
      pass: evaluation.pass,
      retried,
      retryCount,
    },
    agentsUsed: classification.domains,
  };
};

module.exports = { handleChat };
