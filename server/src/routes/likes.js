const { Router } = require('express');
const { toggleTopicLike, toggleSlideLike, getUserLikes } = require('../controllers/likes.controller');
const { authenticate } = require('../middleware/auth');
const { likeActionLimiter } = require('../middleware/abuse-rate-limit');

const router = Router();

router.post('/topic/:id', authenticate, likeActionLimiter, toggleTopicLike);
router.post('/slide/:id', authenticate, likeActionLimiter, toggleSlideLike);
router.get('/me', authenticate, getUserLikes);

module.exports = router;
