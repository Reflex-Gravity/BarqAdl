require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorHandler');
const { shutdownLangfuse } = require('./config/langfuse');
const { readJSON } = require('./config/db');

const chatRoutes = require('./routes/chat');
const agentRoutes = require('./routes/agents');
const metricsRoutes = require('./routes/metrics');
const feedbackRoutes = require('./routes/feedback');
const openaiRoutes = require('./routes/openai');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'barqadl', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/chat', chatRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/feedback', feedbackRoutes);

// OpenAI-compatible endpoint for LibreChat
app.use('/v1', openaiRoutes);

// Raw improvement log for dashboard charts
app.get('/api/improvement-log', (req, res) => {
  res.json(readJSON('improvement-log.json') || []);
});

// Serve dashboard UI
app.use(express.static(path.join(__dirname, '..', 'public')));

// Error handler
app.use(errorHandler);

// Only start listening when running directly (not in Lambda)
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  const server = app.listen(PORT, () => {
    console.log(`\n⚡ BarqAdl — Justice at the speed of light`);
    console.log(`  Server running on http://localhost:${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });

  process.on('SIGTERM', async () => {
    console.log('Shutting down...');
    await shutdownLangfuse();
    server.close();
  });
}

module.exports = app;
