const { Router } = require('express');
const { getVisited } = require('../controllers/visits.controller');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.get('/me', authenticate, getVisited);

module.exports = router;
