const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-west-2',
});

// Multi-provider model tiers — best-in-class per agent role
// TODO: Enable non-Anthropic models once AWS Marketplace subscriptions are active:
//   orchestrator → meta.llama4-maverick-17b-instruct-v1:0
//   judge        → us.deepseek.r1-v1:0
//   scraper      → mistral.mistral-large-2407-v1:0
const MODELS = {
  orchestrator: process.env.BEDROCK_MODEL_ORCHESTRATOR || 'us.anthropic.claude-3-5-haiku-20241022-v1:0',      // Fast routing
  heavy:        process.env.BEDROCK_MODEL_HEAVY        || 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',     // Sub-agents
  judge:        process.env.BEDROCK_MODEL_JUDGE        || 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',     // Independent eval
  scraper:      process.env.BEDROCK_MODEL_SCRAPER      || 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',     // Skill extraction
  light:        process.env.BEDROCK_MODEL_LIGHT        || 'us.anthropic.claude-3-5-haiku-20241022-v1:0',      // Formatter
};

// Optional Bedrock Guardrails
const GUARDRAIL_ID = process.env.BEDROCK_GUARDRAIL_ID || '';
const GUARDRAIL_VERSION = process.env.BEDROCK_GUARDRAIL_VERSION || 'DRAFT';

const invokeModel = async (systemPrompt, userMessage, options = {}) => {
  const modelId = options.model || MODELS.heavy;

  const converseInput = {
    modelId,
    messages: [
      {
        role: 'user',
        content: [{ text: userMessage }],
      },
    ],
    system: [{ text: systemPrompt }],
    inferenceConfig: {
      maxTokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.3,
    },
  };

  // Attach guardrails if configured
  if (GUARDRAIL_ID) {
    converseInput.guardrailConfig = {
      guardrailIdentifier: GUARDRAIL_ID,
      guardrailVersion: GUARDRAIL_VERSION,
    };
  }

  const command = new ConverseCommand(converseInput);
  const response = await client.send(command);

  // ConverseCommand returns a unified response shape
  const outputMessage = response.output?.message;
  if (outputMessage?.content?.[0]?.text) {
    return outputMessage.content[0].text;
  }

  // Fallback: stringify whatever we got
  return JSON.stringify(response.output);
};

module.exports = { client, invokeModel, MODELS };
