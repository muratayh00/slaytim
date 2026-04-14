const { Router } = require('express');
const { optionalAuth } = require('../middleware/auth');
const { submit } = require('../controllers/feedback.controller');

const router = Router();

// Anyone (logged in or not) can submit feedback
router.post('/', optionalAuth, submit);

module.exports = router;
