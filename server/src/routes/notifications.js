const { Router } = require('express');
const { getAll, getUnreadCount, getSince, markRead, stream } = require('../controllers/notifications.controller');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.get('/stream', authenticate, stream);
router.get('/', authenticate, getAll);
router.get('/unread-count', authenticate, getUnreadCount);
router.get('/since', authenticate, getSince);
router.patch('/all/read', authenticate, markRead); // must come before /:id/read
router.patch('/:id/read', authenticate, markRead);

module.exports = router;
