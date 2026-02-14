const { invokeModel, MODELS } = require('../config/bedrock');
const { loadPrompt } = require('../utils/promptLoader');

const FORMATTER_PROMPT = loadPrompt('response-formatter');

const format = async (actionPlan, classification, trace) => {
  const span = trace.span({ name: 'response-formatter' });

  const urgencyBadge = {
    critical: '🔴 **CRITICAL**',
    high: '🟡 **TIME-SENSITIVE**',
    medium: '🟢 **INFORMATIONAL**',
    low: '🟢 **INFORMATIONAL**',
  };

  const userContent = `## Classification
${JSON.stringify(classification, null, 2)}

## Action Plan(s) to Format
${actionPlan}

## Urgency Badge
${urgencyBadge[classification.urgency] || '🟢 **INFORMATIONAL**'}

Format this for display.`;

  try {
    const formatted = await invokeModel(FORMATTER_PROMPT, userContent, {
      model: MODELS.light,
      temperature: 0.2,
      maxTokens: 4096,
    });

    span.end({ output: { length: formatted.length } });
    return formatted;
  } catch (err) {
    span.end({ output: { error: err.message } });
    // Return the raw action plan with basic formatting as fallback
    return `${urgencyBadge[classification.urgency] || ''}\n\n${actionPlan}\n\n---\n⚡ **BarqAdl** — Justice at the speed of light.\n_This is legal information, not legal advice. For complex cases, consult a licensed UAE lawyer._`;
  }
};

module.exports = { format };
