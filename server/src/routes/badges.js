const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { getUserBadges, awardBadgeManual, listAllBadges } = require('../controllers/badges.controller');

const router = Router();

router.get('/', listAllBadges);
router.get('/user/:username', getUserBadges);
router.post('/award', authenticate, awardBadgeManual);

module.exports = router;
