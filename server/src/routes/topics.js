const { Router } = require('express');
const { getAll, getOne, getBySlug, create, update, pinSlide, getTrending, search, getFeed, toggleSubscription, getMySubscriptions } = require('../controllers/topics.controller');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { validateNumericParam } = require('../middleware/route-validation');

const router = Router();

router.get('/', optionalAuth, getAll);
router.get('/trending', getTrending);
router.get('/search', search);
router.get('/feed', authenticate, getFeed);
router.get('/subscriptions/me', authenticate, getMySubscriptions);
router.get('/slug/:slug', optionalAuth, getBySlug);
router.get('/:id', validateNumericParam('id'), optionalAuth, getOne);
router.post('/:id/subscribe', validateNumericParam('id'), authenticate, toggleSubscription);
router.post('/', authenticate, create);
router.patch('/:id', validateNumericParam('id'), authenticate, update);
router.patch('/:id/pin-slide', validateNumericParam('id'), authenticate, pinSlide);

module.exports = router;
