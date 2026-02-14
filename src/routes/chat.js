const express = require('express');
const router = express.Router();
const { langfuseTrace } = require('../middleware/langfuseTrace');
const { handleChat } = require('../agents/pipeline');

// POST /api/chat — Main chat endpoint
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

module.exports = router;
