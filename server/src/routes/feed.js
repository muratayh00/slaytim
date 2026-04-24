const { Router } = require('express');
const { optionalAuth } = require('../middleware/auth');
const { getFeed } = require('../controllers/feed.controller');

const router = Router();

router.get('/', optionalAuth, getFeed);

module.exports = router;
