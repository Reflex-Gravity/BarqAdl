const express = require('express');
const router = express.Router();
const { getRegistry } = require('../registry/agentRegistry');

// GET /api/agents — Return agent registry status
router.get('/', (req, res) => {
  const registry = getRegistry();
  const agents = registry.getAllAgents();

  res.json({
    totalAgents: Object.keys(agents).length,
    agents: Object.entries(agents).map(([domain, info]) => ({
      domain,
      skillCount: info.skills || 0,
      avgScore: info.avgScore || 0,
      queryCount: info.queryCount || 0,
      createdAt: info.createdAt,
      status: 'active',
    })),
  });
});

module.exports = router;
