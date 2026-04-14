const { Router } = require('express');
const { getByTopic, create, remove } = require('../controllers/comments.controller');
const { authenticate } = require('../middleware/auth');
const { commentCreateLimiter } = require('../middleware/abuse-rate-limit');

const router = Router();

router.get('/topic/:topicId', getByTopic);
router.post('/topic/:topicId', authenticate, commentCreateLimiter, create);
router.delete('/:id', authenticate, remove);

module.exports = router;
