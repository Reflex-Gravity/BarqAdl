const express = require('express');
const router = express.Router();
const { readJSON } = require('../config/db');
const { getStrategyStore } = require('../registry/strategyStore');

// GET /api/metrics — Return improvement metrics
router.get('/', (req, res) => {
  const improvementLog = readJSON('improvement-log.json') || [];
  const strategies = getStrategyStore().getAllStrategies();

  // Compute metrics from improvement log
  const totalQueries = improvementLog.length;
  const retries = improvementLog.filter(e => e.retried).length;
  const retryRate = totalQueries > 0 ? (retries / totalQueries * 100).toFixed(1) : 0;

  // Average scores over time (last 10 vs first 10)
  const scores = improvementLog.map(e => e.totalScore).filter(Boolean);
  const first10 = scores.slice(0, 10);
  const last10 = scores.slice(-10);
  const avgFirst = first10.length > 0 ? (first10.reduce((a, b) => a + b, 0) / first10.length).toFixed(1) : 0;
  const avgLast = last10.length > 0 ? (last10.reduce((a, b) => a + b, 0) / last10.length).toFixed(1) : 0;

  // Per-domain breakdown
  const domainStats = {};
  for (const entry of improvementLog) {
    const d = entry.domain;
    if (!d) continue;
    if (!domainStats[d]) domainStats[d] = { queries: 0, totalScore: 0, retries: 0 };
    domainStats[d].queries++;
    domainStats[d].totalScore += entry.totalScore || 0;
    if (entry.retried) domainStats[d].retries++;
  }
  for (const d of Object.keys(domainStats)) {
    domainStats[d].avgScore = (domainStats[d].totalScore / domainStats[d].queries).toFixed(1);
    domainStats[d].retryRate = (domainStats[d].retries / domainStats[d].queries * 100).toFixed(1) + '%';
  }

  res.json({
    totalQueries,
    retryRate: retryRate + '%',
    scoreImprovement: {
      earlyAvg: parseFloat(avgFirst),
      recentAvg: parseFloat(avgLast),
      delta: (parseFloat(avgLast) - parseFloat(avgFirst)).toFixed(1),
    },
    domainStats,
    strategies,
  });
});

module.exports = router;
