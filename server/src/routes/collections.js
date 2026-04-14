const { Router } = require('express');
const { getMine, getByUser, getOne, create, update, remove, addSlide, toggleFollow, getMyFollowedCollections } = require('../controllers/collections.controller');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = Router();

router.get('/me', authenticate, getMine);
router.get('/following/me', authenticate, getMyFollowedCollections);
router.get('/user/:username', optionalAuth, getByUser);
router.get('/:id', optionalAuth, getOne);
router.post('/', authenticate, create);
router.patch('/:id', authenticate, update);
router.delete('/:id', authenticate, remove);
router.post('/:id/slides/:slideId', authenticate, addSlide);
router.post('/:id/follow', authenticate, toggleFollow);

module.exports = router;
