const { Router } = require('express');
const { optionalAuth } = require('../middleware/auth');
const { ingestBatch, ingestSessionSnapshot } = require('../controllers/analytics.controller');

const router = Router();

router.post('/batch', optionalAuth, ingestBatch);
router.post('/session-snapshot', optionalAuth, ingestSessionSnapshot);

module.exports = router;

