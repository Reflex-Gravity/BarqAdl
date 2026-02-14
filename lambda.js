const serverlessExpress = require('@codegenie/serverless-express');

// Set env vars that would normally come from .env
// (Lambda environment variables are set in CloudFormation)
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const app = require('./src/index');

exports.handler = serverlessExpress({ app });
