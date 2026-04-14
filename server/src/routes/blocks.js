const { Router } = require('express');
const { toggle, getMyBlocked, checkBlocked } = require('../controllers/blocks.controller');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.post('/:userId', authenticate, toggle);
router.get('/me', authenticate, getMyBlocked);
router.get('/check/:userId', authenticate, checkBlocked);

module.exports = router;
