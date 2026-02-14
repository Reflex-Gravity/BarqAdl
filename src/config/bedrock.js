const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-west-2',
});

const invokeModel = async (systemPrompt, userMessage, options = {}) => {
  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature || 0.3,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userMessage }
    ]
  };

  const command = new InvokeModelCommand({
    modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-sonnet-4-20250514',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload)
  });

  const response = await client.send(command);
  const body = JSON.parse(new TextDecoder().decode(response.body));
  return body.content[0].text;
};

module.exports = { client, invokeModel };
