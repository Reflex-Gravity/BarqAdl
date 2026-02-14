const express = require('express');
const router = express.Router();
const { getLangfuse } = require('../config/langfuse');
const { getStrategyStore } = require('../registry/strategyStore');
const { appendToLog } = require('../config/db');

// POST /api/feedback — User feedback on a response
router.post('/', async (req, res, next) => {
  try {
    const { traceId, score, comment, domain, userId } = req.body;

    if (score === undefined || score === null) {
      return res.status(400).json({ error: 'score is required (1-5)' });
    }

    const numericScore = Math.min(5, Math.max(1, Math.round(Number(score))));

    // 1. Log score to LangFuse if traceId is present
    if (traceId) {
      const langfuse = getLangfuse();
      langfuse.score({
        traceId,
        name: 'user_feedback',
        value: numericScore,
        comment: comment || '',
      });
    }

    // 2. Update strategy store — negative feedback triggers enhancement
    if (domain && numericScore <= 2) {
      const strategyStore = getStrategyStore();
      const signal = {
        learned: comment
          ? `User feedback: "${comment.substring(0, 100)}"`
          : 'User indicated low satisfaction — improve response quality',
        update_prompt: true,
      };
      strategyStore.update(domain, { total: numericScore * 8 }, signal);
    }

    // 3. Persist feedback in log
    appendToLog('feedback-log.json', {
      traceId: traceId || null,
      score: numericScore,
      comment: comment || '',
      domain: domain || null,
      userId: userId || 'anonymous',
    });

    res.json({
      received: true,
      score: numericScore,
      traceId: traceId || null,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
