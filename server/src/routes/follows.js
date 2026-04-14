const { Router } = require('express');
const { toggleFollowUser, toggleFollowCategory, getFollowStatus } = require('../controllers/follows.controller');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.post('/user/:id', authenticate, toggleFollowUser);
router.post('/category/:id', authenticate, toggleFollowCategory);
router.get('/me', authenticate, getFollowStatus);

module.exports = router;
