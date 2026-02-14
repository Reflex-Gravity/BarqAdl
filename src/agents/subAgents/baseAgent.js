const { invokeModel, MODELS } = require('../../config/bedrock');
const { loadPrompt } = require('../../utils/promptLoader');
const { readJSON } = require('../../config/db');
const { getStrategyStore } = require('../../registry/strategyStore');

class BaseAgent {
  constructor(domain, promptFile) {
    this.domain = domain;
    this.promptFile = promptFile;
    this.systemPrompt = loadPrompt(promptFile);
  }

  getSkills() {
    const skills = readJSON(`skills/${this.domain}.json`);
    return skills?.skills || [];
  }

  getStrategy() {
    const store = getStrategyStore();
    return store.getActiveStrategy(this.domain);
  }

  buildContext(classification) {
    const skills = this.getSkills();
    const strategy = this.getStrategy();

    let context = '';

    if (skills.length > 0) {
      context += '\n\n## Available Legal Knowledge (Skills)\n';
      for (const skill of skills) {
        context += `\n### ${skill.title || skill.topic}\n`;
        context += skill.content || '';
        if (skill.law_references) {
          context += '\nReferences: ' + skill.law_references.map(r => `${r.law} Articles ${r.articles?.join(', ')}`).join('; ');
        }
        if (skill.procedures) {
          context += '\nProcedures: ' + skill.procedures.join(' → ');
        }
        context += '\n';
      }
    }

    if (strategy?.enhancements) {
      context += '\n\n## Strategy Enhancements (learned from previous evaluations)\n';
      context += strategy.enhancements.join('\n- ');
    }

    return context;
  }

  async generate(userMessage, classification, trace) {
    const span = trace.span({ name: `${this.domain}-agent-generate` });

    const context = this.buildContext(classification);
    const fullPrompt = this.systemPrompt + context;

    const userContent = `## User Query\n${userMessage}\n\n## Classification\n${JSON.stringify(classification, null, 2)}`;

    try {
      const response = await invokeModel(fullPrompt, userContent, {
        model: MODELS.heavy,
        temperature: 0.3,
        maxTokens: 4096,
      });

      span.end({ output: { length: response.length } });
      return response;
    } catch (err) {
      span.end({ output: { error: err.message } });
      throw err;
    }
  }

  async regenerate(userMessage, classification, feedback, trace) {
    const span = trace.span({ name: `${this.domain}-agent-regenerate` });

    const context = this.buildContext(classification);
    const fullPrompt = this.systemPrompt + context;

    const userContent = `## User Query\n${userMessage}\n\n## Classification\n${JSON.stringify(classification, null, 2)}\n\n## IMPORTANT: Judge Feedback — Address These Issues\n${feedback}`;

    try {
      const response = await invokeModel(fullPrompt, userContent, {
        model: MODELS.heavy,
        temperature: 0.2,
        maxTokens: 4096,
      });

      span.end({ output: { length: response.length } });
      return response;
    } catch (err) {
      span.end({ output: { error: err.message } });
      throw err;
    }
  }
}

module.exports = BaseAgent;
