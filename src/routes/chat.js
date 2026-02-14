const EventEmitter = require('events');
const express = require('express');
const router = express.Router();
const { langfuseTrace } = require('../middleware/langfuseTrace');
const { handleChat } = require('../agents/pipeline');

// POST /api/chat — Standard JSON response
router.post('/', langfuseTrace, async (req, res, next) => {
  try {
    const { message, conversationHistory = [], userId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await handleChat(message, conversationHistory, req.trace);

    res.json({
      response: result.response,
      classification: result.classification,
      evaluation: result.evaluation,
      agentsUsed: result.agentsUsed,
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/chat/stream — SSE streaming with progress events
router.post('/stream', langfuseTrace, async (req, res) => {
  const { message, conversationHistory = [], userId } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const emitter = new EventEmitter();

  // Forward pipeline progress events as SSE
  emitter.on('progress', (data) => {
    res.write(`event: progress\ndata: ${JSON.stringify(data)}\n\n`);
  });

  try {
    const result = await handleChat(message, conversationHistory, req.trace, emitter);

    // Send the final result
    res.write(`event: result\ndata: ${JSON.stringify({
      response: result.response,
      classification: result.classification,
      evaluation: result.evaluation,
      agentsUsed: result.agentsUsed,
      traceId: req.traceId,
    })}\n\n`);

    res.write('event: done\ndata: {}\n\n');
    res.end();
  } catch (err) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

module.exports = router;
