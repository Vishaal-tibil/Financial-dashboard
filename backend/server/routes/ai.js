// ai.js — LLM endpoints (DEV 2 owns this file)
// POST /api/insights   → AI Insights panel bullets
// POST /api/chat       → SSE streaming chat
// POST /api/summary    → executive summary
const express = require('express');
const router  = express.Router();

router.post('/insights',  (req, res) => res.json({ insights: [], metrics: [] }));
router.post('/chat',      (req, res) => res.json({ reply: '' }));
router.post('/summary',   (req, res) => res.json({ bullets: [], takeaway: '' }));

module.exports = router;
