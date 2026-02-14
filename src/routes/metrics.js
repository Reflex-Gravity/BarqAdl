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

// GET /api/metrics/learning-timeline — Return strategy evolution events
router.get('/learning-timeline', (req, res) => {
  const strategies = getStrategyStore().getAllStrategies();
  const improvementLog = readJSON('improvement-log.json') || [];

  const events = [];
  for (const [domain, data] of Object.entries(strategies)) {
    if (!data.versions) continue;
    for (let i = 1; i < data.versions.length; i++) {
      const v = data.versions[i];
      const prev = data.versions[i - 1];
      events.push({
        domain,
        fromVersion: prev.version,
        toVersion: v.version,
        learned: v.newEnhancement || v.enhancements[v.enhancements.length - 1] || '',
        inheritedEnhancements: prev.enhancements || [],
        createdAt: v.createdAt || null,
        previousAvgScore: prev.avgScore || 0,
        currentAvgScore: v.avgScore || 0,
        scoreDelta: parseFloat(((v.avgScore || 0) - (prev.avgScore || 0)).toFixed(2)),
      });
    }
  }

  // Sort by createdAt descending (most recent first), nulls last
  events.sort((a, b) => {
    if (!a.createdAt && !b.createdAt) return 0;
    if (!a.createdAt) return 1;
    if (!b.createdAt) return -1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  // Compute summary KPIs
  const totalLearnings = events.length;
  const domainsEvolved = [...new Set(events.map(e => e.domain))].length;

  // v1 avg scores vs latest avg scores per domain
  const v1Scores = [];
  const latestScores = [];
  for (const [domain, data] of Object.entries(strategies)) {
    if (!data.versions || data.versions.length === 0) continue;
    const v1 = data.versions[0];
    const latest = data.versions[data.versions.length - 1];
    if (v1.avgScore) v1Scores.push(v1.avgScore);
    if (latest.avgScore) latestScores.push(latest.avgScore);
  }
  const v1Avg = v1Scores.length > 0 ? parseFloat((v1Scores.reduce((a, b) => a + b, 0) / v1Scores.length).toFixed(1)) : 0;
  const latestAvg = latestScores.length > 0 ? parseFloat((latestScores.reduce((a, b) => a + b, 0) / latestScores.length).toFixed(1)) : 0;

  // Build per-query score timeline with evolution markers
  const queryTimeline = improvementLog.map((entry, i) => ({
    index: i,
    score: entry.totalScore,
    domain: entry.domain,
    versionBefore: entry.strategy_version_before || null,
    versionAfter: entry.strategy_version_after || null,
    evolved: entry.strategy_version_before !== entry.strategy_version_after && !!entry.strategy_version_after,
    learned: entry.improvement_signal?.learned || null,
    timestamp: entry.timestamp || null,
  }));

  res.json({
    summary: { totalLearnings, domainsEvolved, v1Avg, latestAvg, scoreDelta: parseFloat((latestAvg - v1Avg).toFixed(1)) },
    events,
    queryTimeline,
  });
});

module.exports = router;
