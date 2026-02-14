// Bedrock Knowledge Base integration
// For hackathon, we use local skill files. This module provides the interface
// for future integration with AWS Bedrock Knowledge Bases.

const { BedrockAgentRuntimeClient, RetrieveCommand } = require('@aws-sdk/client-bedrock-agent-runtime');

let kbClient = null;

const getKBClient = () => {
  if (!kbClient && process.env.BEDROCK_KB_ID) {
    kbClient = new BedrockAgentRuntimeClient({
      region: process.env.AWS_REGION || 'us-west-2',
    });
  }
  return kbClient;
};

const retrieveFromKB = async (query, domain) => {
  const client = getKBClient();
  if (!client || !process.env.BEDROCK_KB_ID) {
    return []; // Fall back to local skills
  }

  try {
    const command = new RetrieveCommand({
      knowledgeBaseId: process.env.BEDROCK_KB_ID,
      retrievalQuery: { text: `UAE ${domain} law: ${query}` },
      retrievalConfiguration: {
        vectorSearchConfiguration: { numberOfResults: 5 },
      },
    });

    const response = await client.send(command);
    return response.retrievalResults || [];
  } catch {
    return [];
  }
};

module.exports = { retrieveFromKB };
