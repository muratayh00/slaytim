const { Router } = require('express');
const { authenticate, optionalAuth } = require('../middleware/auth');
const {
  getAll, getMine, getOne, create, update, join, leave, follow, unfollow, accessByName,
  getMessages, createMessage, streamMessages,
} = require('../controllers/rooms.controller');

const router = Router();

router.get('/', optionalAuth, getAll);
router.get('/me', authenticate, getMine);
router.get('/:id', optionalAuth, getOne);
router.post('/', authenticate, create);
router.patch('/:id', authenticate, update);
router.post('/:id/join', authenticate, join);
router.post('/:id/leave', authenticate, leave);
router.post('/:id/follow', authenticate, follow);
router.post('/:id/unfollow', authenticate, unfollow);
router.post('/access', authenticate, accessByName);
router.get('/:id/messages', authenticate, getMessages);
router.post('/:id/messages', authenticate, createMessage);
router.get('/:id/messages/stream', authenticate, streamMessages);

module.exports = router;
