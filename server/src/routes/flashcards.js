const { Router } = require('express');
const { authenticate, optionalAuth } = require('../middleware/auth');
const {
  listForSlide,
  listMineForSlide,
  createForSlide,
  updateSet,
  submitAttempt,
  getSetStats,
} = require('../controllers/flashcards.controller');

const router = Router();

router.get('/slide/:slideId', listForSlide);
router.get('/mine/slide/:slideId', authenticate, listMineForSlide);
router.post('/slide/:slideId', authenticate, createForSlide);
router.patch('/:setId', authenticate, updateSet);
router.post('/:setId/submit', optionalAuth, submitAttempt);
router.get('/:setId/stats', authenticate, getSetStats);

module.exports = router;

