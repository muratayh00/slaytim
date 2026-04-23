const { Router } = require('express');
const { list, getBySlug } = require('../controllers/tags.controller');

const router = Router();

router.get('/', list);
router.get('/:slug', getBySlug);

module.exports = router;
