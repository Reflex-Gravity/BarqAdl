const EventEmitter = require('events');
const orchestrator = require('./orchestrator');
const judge = require('./judge');
const responseFormatter = require('./responseFormatter');
const skillScraper = require('./skillScraper');
const { getRegistry } = require('../registry/agentRegistry');
const { getStrategyStore } = require('../registry/strategyStore');
const { appendToLog } = require('../config/db');

const handleChat = async (userMessage, conversationHistory, trace, emitter) => {
  const startTime = Date.now();
  const emit = (stage, data) => {
    if (emitter) emitter.emit('progress', { stage, timestamp: Date.now(), ...data });
  };

  // 1. Orchestrator classifies the query
  emit('classifying', { message: 'Classifying query with Llama 4 Maverick...' });
  const classification = await orchestrator.classify(userMessage, trace);
  trace.update({ metadata: { domains: classification.domains, urgency: classification.urgency } });
  emit('classified', {
    message: `Routed to ${classification.domains.join(', ')} (${classification.urgency})`,
    domains: classification.domains,
    urgency: classification.urgency,
  });

  // 2. For each domain, get or spawn a sub-agent
  const registry = getRegistry();
  const agentResults = await Promise.all(
    classification.domains.map(domain => registry.getOrSpawn(domain, trace))
  );
  emit('agents_ready', {
    message: `${agentResults.length} agent(s) active: ${classification.domains.join(', ')}`,
    agents: classification.domains,
    newAgents: agentResults.filter(r => r.isNew).map(r => r.agent.domain),
  });

  // 3. If any agent was newly spawned, equip it with skills via scraper
  for (const result of agentResults) {
    if (result.isNew) {
      emit('scraping', { message: `Equipping ${result.agent.domain} agent with skills via Mistral...` });
      const skills = await skillScraper.equip(result.agent.domain, trace);
      registry.updateSkillCount(result.agent.domain, skills.skills?.length || 0);
      emit('skills_loaded', {
        message: `${result.agent.domain}: ${skills.skills?.length || 0} skills acquired`,
        domain: result.agent.domain,
        skillCount: skills.skills?.length || 0,
      });
    }
  }

  // 4. Generate action plan using primary agent
  const primaryResult = agentResults[0];
  const primaryAgent = primaryResult.agent;
  emit('generating', { message: `Generating response with Claude Sonnet 4.5...` });
  let actionPlan = await primaryAgent.generate(userMessage, classification, trace);
  emit('generated', { message: 'Initial response ready, sending to judge...' });

  // 5. Judge evaluates the response
  emit('judging', { message: 'DeepSeek judge evaluating response quality...' });
  let evaluation = await judge.evaluate(userMessage, classification, actionPlan, trace);
  emit('judged', {
    message: `Score: ${evaluation.scores.total}/40 — ${evaluation.pass ? 'PASS' : 'NEEDS RETRY'}`,
    scores: evaluation.scores,
    pass: evaluation.pass,
  });

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

    emit('retrying', {
      message: `Retry ${retryCount}/${maxRetries} — applying judge feedback...`,
      attempt: retryCount,
      maxRetries,
      feedback: feedbackText,
    });

    // Regenerate with feedback
    actionPlan = await primaryAgent.regenerate(userMessage, classification, feedbackText, trace);

    // Re-evaluate
    emit('judging', { message: `Re-evaluating retry ${retryCount}...` });
    evaluation = await judge.evaluate(userMessage, classification, actionPlan, trace);
    emit('judged', {
      message: `Retry ${retryCount} score: ${evaluation.scores.total}/40 — ${evaluation.pass ? 'PASS' : 'NEEDS RETRY'}`,
      scores: evaluation.scores,
      pass: evaluation.pass,
      retry: retryCount,
    });
  }

  // If still failing after retries, add disclaimer
  if (!evaluation.pass) {
    actionPlan += '\n\n> ⚠️ **Note:** This response may be incomplete. For your specific situation, we strongly recommend consulting a licensed UAE lawyer or contacting Tawafuq Legal Aid Centers (800-TAWAFUQ).';
  }

  // 7. Format the final response
  emit('formatting', { message: 'Formatting final response with Claude Haiku...' });
  const formatted = await responseFormatter.format(actionPlan, classification, trace);
  emit('formatted', { message: 'Response formatted and ready.' });

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

  const result = {
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

  emit('done', { message: 'Complete', result });
  return result;
};

module.exports = { handleChat, EventEmitter };
