#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const {
  S3Client,
  CreateBucketCommand,
  PutObjectCommand,
  ListBucketsCommand,
} = require('@aws-sdk/client-s3');
const {
  LambdaClient,
  CreateFunctionCommand,
  UpdateFunctionCodeCommand,
  UpdateFunctionConfigurationCommand,
  GetFunctionCommand,
  CreateFunctionUrlConfigCommand,
  GetFunctionUrlConfigCommand,
  AddPermissionCommand,
} = require('@aws-sdk/client-lambda');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const REGION = process.env.AWS_REGION || 'us-west-2';
const FUNCTION_NAME = 'workshop-studio-CustomerSupportLambda-N0GY5frS3PZd';
const ZIP_NAME = 'barqadl-lambda.zip';
const PROJECT_ROOT = path.join(__dirname, '..');

async function main() {
  console.log('\n⚡ BarqAdl — Deploying to AWS Lambda\n');

  // 1. Create zip
  console.log('[1/4] Creating deployment zip...');
  const zipPath = path.join(PROJECT_ROOT, ZIP_NAME);
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

  const items = ['lambda.js', 'package.json', 'src', 'data', 'prompts', 'node_modules'];
  const pathList = items.map(i => `'${i}'`).join(',');
  execSync(
    `powershell -Command "Compress-Archive -Path ${pathList} -DestinationPath '${ZIP_NAME}' -Force"`,
    { cwd: PROJECT_ROOT, stdio: 'inherit' }
  );

  const zipSize = fs.statSync(zipPath).size;
  console.log(`  Zip created: ${(zipSize / 1024 / 1024).toFixed(1)} MB\n`);

  // 2. Upload to S3
  console.log('[2/4] Uploading to S3...');
  const s3 = new S3Client({ region: REGION });

  let bucketName;
  const buckets = await s3.send(new ListBucketsCommand({}));
  const existing = buckets.Buckets?.find(b => b.Name?.startsWith('barqadl-deploy-'));
  if (existing) {
    bucketName = existing.Name;
    console.log(`  Reusing bucket: ${bucketName}`);
  } else {
    bucketName = `barqadl-deploy-${Date.now()}`;
    await s3.send(new CreateBucketCommand({ Bucket: bucketName }));
    console.log(`  Created bucket: ${bucketName}`);
  }

  const zipData = fs.readFileSync(zipPath);
  await s3.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: ZIP_NAME,
    Body: zipData,
  }));
  console.log(`  Uploaded ${ZIP_NAME} (${(zipSize / 1024 / 1024).toFixed(1)} MB)\n`);

  // 3. Create or update Lambda function
  console.log('[3/4] Deploying Lambda function...');
  const lambda = new LambdaClient({ region: REGION });

  const envVars = {
    NODE_ENV: 'production',
    BEDROCK_MODEL_ORCHESTRATOR: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
    BEDROCK_MODEL_HEAVY: 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
    BEDROCK_MODEL_JUDGE: 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
    BEDROCK_MODEL_SCRAPER: 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
    BEDROCK_MODEL_LIGHT: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
    BEDROCK_GUARDRAIL_ID: '',
    BEDROCK_GUARDRAIL_VERSION: 'DRAFT',
    LANGFUSE_PUBLIC_KEY: 'pk-lf-placeholder',
    LANGFUSE_SECRET_KEY: 'sk-lf-placeholder',
    LANGFUSE_BASE_URL: 'https://cloud.langfuse.com',
    PORT: '3001',
  };

  // Update the existing function's code
  console.log('  Uploading code...');
  await lambda.send(new UpdateFunctionCodeCommand({
    FunctionName: FUNCTION_NAME,
    S3Bucket: bucketName,
    S3Key: ZIP_NAME,
  }));

  // Wait for code update to finish
  console.log('  Waiting for code update...');
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const fn = await lambda.send(new GetFunctionCommand({ FunctionName: FUNCTION_NAME }));
    if (fn.Configuration.LastUpdateStatus === 'Successful') break;
    process.stdout.write('.');
  }

  // Update config: runtime, handler, timeout, memory, env
  console.log('\n  Updating configuration...');
  await lambda.send(new UpdateFunctionConfigurationCommand({
    FunctionName: FUNCTION_NAME,
    Runtime: 'nodejs20.x',
    Handler: 'lambda.handler',
    Environment: { Variables: envVars },
    Timeout: 300,
    MemorySize: 512,
  }));

  // Wait for config update
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const fn = await lambda.send(new GetFunctionCommand({ FunctionName: FUNCTION_NAME }));
    if (fn.Configuration.LastUpdateStatus === 'Successful') {
      console.log('  Function updated and active.\n');
      break;
    }
    process.stdout.write('.');
  }

  // 4. Create Function URL
  console.log('[4/4] Setting up public URL...');
  let functionUrl;
  try {
    const urlConfig = await lambda.send(new GetFunctionUrlConfigCommand({ FunctionName: FUNCTION_NAME }));
    functionUrl = urlConfig.FunctionUrl;
    console.log('  Function URL already exists.');
  } catch {
    const urlResult = await lambda.send(new CreateFunctionUrlConfigCommand({
      FunctionName: FUNCTION_NAME,
      AuthType: 'NONE',
      Cors: {
        AllowOrigins: ['*'],
        AllowMethods: ['*'],
        AllowHeaders: ['*'],
      },
    }));
    functionUrl = urlResult.FunctionUrl;
    console.log('  Function URL created.');

    // Add public invoke permission
    try {
      await lambda.send(new AddPermissionCommand({
        FunctionName: FUNCTION_NAME,
        StatementId: 'FunctionURLAllowPublicAccess',
        Action: 'lambda:InvokeFunctionUrl',
        Principal: '*',
        FunctionUrlAuthType: 'NONE',
      }));
      console.log('  Public access granted.');
    } catch (e) {
      if (!e.message?.includes('already exists')) throw e;
    }
  }

  console.log('\n========================================');
  console.log('⚡ BarqAdl deployed successfully!');
  console.log('========================================');
  console.log(`  URL:     ${functionUrl}`);
  console.log(`  Health:  ${functionUrl}health`);
  console.log(`  Chat:    POST ${functionUrl}api/chat`);
  console.log(`  Stream:  POST ${functionUrl}api/chat/stream`);
  console.log(`  Metrics: GET  ${functionUrl}api/metrics`);
  console.log(`  Agents:  GET  ${functionUrl}api/agents`);
  console.log(`  Feedback:POST ${functionUrl}api/feedback`);
  console.log('========================================\n');

  // Cleanup local zip
  fs.unlinkSync(zipPath);
}

main().catch(err => {
  console.error('\nDeployment failed:', err.message);
  process.exit(1);
});
