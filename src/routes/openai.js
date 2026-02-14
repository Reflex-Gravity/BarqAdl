const EventEmitter = require('events');
const express = require('express');
const router = express.Router();
const { handleChat } = require('../agents/pipeline');
const { getLangfuse } = require('../config/langfuse');
const { v4: uuidv4 } = require('uuid');

// POST /v1/chat/completions — OpenAI-compatible endpoint for LibreChat
router.post('/chat/completions', async (req, res) => {
  const { messages = [], stream = false, model } = req.body;

  // Extract the last user message
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  if (!lastUserMsg) {
    return res.status(400).json({ error: { message: 'No user message found', type: 'invalid_request_error' } });
  }

  const userMessage = lastUserMsg.content;
  const conversationHistory = messages.slice(0, -1);

  // Create a LangFuse trace
  const langfuse = getLangfuse();
  const traceId = uuidv4();
  const trace = langfuse.trace({
    id: traceId,
    name: 'barqadl-query',
    userId: 'librechat-user',
    metadata: { endpoint: '/v1/chat/completions', stream },
  });

  if (stream) {
    // SSE streaming in OpenAI format
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const completionId = `chatcmpl-${traceId.substring(0, 12)}`;
    const emitter = new EventEmitter();

    // Send progress events as assistant content chunks
    emitter.on('progress', (data) => {
      if (data.stage === 'done') return;
      const chunk = {
        id: completionId,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: 'barqadl-legal-ai',
        choices: [{
          index: 0,
          delta: { content: `\n> **[${data.stage}]** ${data.message}\n\n` },
          finish_reason: null,
        }],
      };
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    });

    try {
      const result = await handleChat(userMessage, conversationHistory, trace, emitter);

      // Send the full response as a final chunk
      const lines = result.response.split('');
      // Send it in one chunk for simplicity
      const finalChunk = {
        id: completionId,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: 'barqadl-legal-ai',
        choices: [{
          index: 0,
          delta: { content: result.response },
          finish_reason: null,
        }],
      };
      res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);

      // Send stop chunk
      const stopChunk = {
        id: completionId,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: 'barqadl-legal-ai',
        choices: [{
          index: 0,
          delta: {},
          finish_reason: 'stop',
        }],
      };
      res.write(`data: ${JSON.stringify(stopChunk)}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err) {
      const errChunk = {
        id: completionId,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: 'barqadl-legal-ai',
        choices: [{
          index: 0,
          delta: { content: `\n\nError: ${err.message}` },
          finish_reason: 'stop',
        }],
      };
      res.write(`data: ${JSON.stringify(errChunk)}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } else {
    // Non-streaming response
    try {
      const result = await handleChat(userMessage, conversationHistory, trace);

      res.json({
        id: `chatcmpl-${traceId.substring(0, 12)}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'barqadl-legal-ai',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: result.response },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: userMessage.length,
          completion_tokens: result.response.length,
          total_tokens: userMessage.length + result.response.length,
        },
      });
    } catch (err) {
      res.status(500).json({
        error: { message: err.message, type: 'server_error' },
      });
    }
  }
});

// GET /v1/models — LibreChat may call this to list models
router.get('/models', (req, res) => {
  res.json({
    object: 'list',
    data: [{
      id: 'barqadl-legal-ai',
      object: 'model',
      created: Math.floor(Date.now() / 1000),
      owned_by: 'barqadl',
    }],
  });
});

module.exports = router;
