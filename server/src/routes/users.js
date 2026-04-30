const { Router } = require('express');
const { getProfile, getProfileDetails, updateProfile, getUserTopics, getUserSlideos, searchUsers, deleteAccount, getMyRecentTopics, getNotificationPrefs, updateNotificationPrefs, updatePrivacySettings } = require('../controllers/users.controller');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = Router();

router.get('/search', searchUsers);
router.get('/me/recent-topics', authenticate, getMyRecentTopics);
router.get('/me/notification-prefs', authenticate, getNotificationPrefs);
router.patch('/me/notification-prefs', authenticate, updateNotificationPrefs);
router.patch('/me/privacy-settings', authenticate, updatePrivacySettings);
router.put('/me', authenticate, updateProfile);
router.delete('/me', authenticate, deleteAccount);
router.get('/:username', getProfile);
router.get('/:username/details', optionalAuth, getProfileDetails);
router.get('/:username/topics', getUserTopics);
router.get('/:username/slideos', getUserSlideos);

module.exports = router;
