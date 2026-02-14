require('dotenv').config();
const { BedrockClient, ListFoundationModelsCommand } = require('@aws-sdk/client-bedrock');

async function main() {
  const client = new BedrockClient({ region: process.env.AWS_REGION });
  const cmd = new ListFoundationModelsCommand({});
  const resp = await client.send(cmd);
  const models = resp.modelSummaries || [];
  console.log('Total foundation models:', models.length);
  console.log('');

  const providers = {};
  for (const m of models) {
    const p = m.providerName || 'Unknown';
    if (providers[p] === undefined) providers[p] = [];
    providers[p].push({ id: m.modelId, name: m.modelName, status: m.modelLifecycle?.status });
  }

  for (const provider of Object.keys(providers).sort()) {
    const ms = providers[provider];
    console.log('--- ' + provider + ' (' + ms.length + ' models) ---');
    for (const m of ms) {
      console.log('  ' + m.id + '  |  ' + m.name + '  |  ' + (m.status || ''));
    }
    console.log('');
  }
}

main().catch(e => console.error('Error:', e.message));
