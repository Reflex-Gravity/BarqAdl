require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorHandler');
const { shutdownLangfuse } = require('./config/langfuse');

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

// Error handler
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`\n⚡ BarqAdl — Justice at the speed of light`);
  console.log(`  Server running on http://localhost:${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await shutdownLangfuse();
  server.close();
});

module.exports = app;
