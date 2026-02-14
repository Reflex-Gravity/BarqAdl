require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { ApiGatewayV2Client, CreateApiCommand, CreateIntegrationCommand, CreateRouteCommand, CreateStageCommand, GetApisCommand } = require("@aws-sdk/client-apigatewayv2");
const { LambdaClient, AddPermissionCommand } = require("@aws-sdk/client-lambda");

const region = process.env.AWS_REGION;
const apigw = new ApiGatewayV2Client({ region });
const lambda = new LambdaClient({ region });
const FN_ARN = "arn:aws:lambda:us-west-2:563206138766:function:workshop-studio-CustomerSupportLambda-N0GY5frS3PZd";
const FN_NAME = "workshop-studio-CustomerSupportLambda-N0GY5frS3PZd";

async function main() {
  // Check if API already exists
  const apis = await apigw.send(new GetApisCommand({}));
  let api = apis.Items && apis.Items.find(a => a.Name === "barqadl-api");

  if (!api) {
    console.log("Creating HTTP API Gateway...");
    const createRes = await apigw.send(new CreateApiCommand({
      Name: "barqadl-api",
      ProtocolType: "HTTP",
      CorsConfiguration: {
        AllowOrigins: ["*"],
        AllowMethods: ["*"],
        AllowHeaders: ["*"],
      },
    }));
    api = createRes;
    console.log("API created:", api.ApiId);

    // Create integration
    console.log("Creating Lambda integration...");
    const integration = await apigw.send(new CreateIntegrationCommand({
      ApiId: api.ApiId,
      IntegrationType: "AWS_PROXY",
      IntegrationUri: FN_ARN,
      PayloadFormatVersion: "2.0",
    }));
    console.log("Integration:", integration.IntegrationId);

    // Create catch-all route
    console.log("Creating route...");
    await apigw.send(new CreateRouteCommand({
      ApiId: api.ApiId,
      RouteKey: "$default",
      Target: "integrations/" + integration.IntegrationId,
    }));

    // Create default stage with auto-deploy
    console.log("Creating stage...");
    await apigw.send(new CreateStageCommand({
      ApiId: api.ApiId,
      StageName: "$default",
      AutoDeploy: true,
    }));

    // Grant API Gateway permission to invoke Lambda
    console.log("Adding invoke permission...");
    try {
      await lambda.send(new AddPermissionCommand({
        FunctionName: FN_NAME,
        StatementId: "apigateway-invoke-" + api.ApiId,
        Action: "lambda:InvokeFunction",
        Principal: "apigateway.amazonaws.com",
        SourceArn: "arn:aws:execute-api:" + region + ":563206138766:" + api.ApiId + "/*",
      }));
    } catch (e) {
      if (e.message && !e.message.includes("already exists")) throw e;
    }
  } else {
    console.log("API already exists:", api.ApiId);
  }

  const url = api.ApiEndpoint || "https://" + api.ApiId + ".execute-api." + region + ".amazonaws.com";
  console.log("\n========================================");
  console.log("⚡ BarqAdl deployed successfully!");
  console.log("========================================");
  console.log("  URL:      " + url);
  console.log("  Health:   " + url + "/health");
  console.log("  Chat:     POST " + url + "/api/chat");
  console.log("  Stream:   POST " + url + "/api/chat/stream");
  console.log("  Metrics:  GET  " + url + "/api/metrics");
  console.log("  Agents:   GET  " + url + "/api/agents");
  console.log("  Feedback: POST " + url + "/api/feedback");
  console.log("========================================");
}

main().catch(err => {
  console.error("Failed:", err.message);
  process.exit(1);
});
