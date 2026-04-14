const { Router } = require('express');
const { optionalAuth, authenticate } = require('../middleware/auth');
const adminGuard = require('../middleware/admin');
const {
  ingestRecommendationEvents,
  getRecommendationRuntimeFlags,
  getShadowEvaluationStats,
} = require('../controllers/recommendation.controller');

const router = Router();

router.post('/events', optionalAuth, ingestRecommendationEvents);
router.get('/flags', optionalAuth, getRecommendationRuntimeFlags);
router.get('/shadow-stats', authenticate, adminGuard, getShadowEvaluationStats);

module.exports = router;
