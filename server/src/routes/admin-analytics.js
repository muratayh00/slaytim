'use strict';

const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  realtimeSSE,
  getOverview,
  getTraffic,
  getSearchIntelligence,
  getFunnel,
  getSlideoMetrics,
  getContentIntelligence,
} = require('../controllers/admin-analytics.controller');

// All endpoints require a valid session; admin-level guard is enforced per-handler.
router.use(authenticate);

// SSE — long-lived connection, keep alive
router.get('/realtime', realtimeSSE);

// REST
router.get('/overview', getOverview);
router.get('/traffic',  getTraffic);
router.get('/search',   getSearchIntelligence);
router.get('/funnel',   getFunnel);
router.get('/slideo',   getSlideoMetrics);
router.get('/content',  getContentIntelligence);

module.exports = router;
