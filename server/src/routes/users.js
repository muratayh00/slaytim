const { Router } = require('express');
const { getProfile, getProfileDetails, updateProfile, getUserTopics, getUserSlideos, searchUsers, deleteAccount, getMyRecentTopics, getNotificationPrefs, updateNotificationPrefs } = require('../controllers/users.controller');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.get('/search', searchUsers);
router.get('/me/recent-topics', authenticate, getMyRecentTopics);
router.get('/:username', getProfile);
router.get('/:username/details', authenticate, getProfileDetails);
router.get('/:username/topics', getUserTopics);
router.get('/:username/slideos', getUserSlideos);
router.put('/me', authenticate, updateProfile);
router.get('/me/notification-prefs', authenticate, getNotificationPrefs);
router.patch('/me/notification-prefs', authenticate, updateNotificationPrefs);
router.delete('/me', authenticate, deleteAccount);

module.exports = router;
