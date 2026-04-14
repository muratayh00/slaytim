const { Router } = require('express');
const { getBySlug } = require('../controllers/tags.controller');

const router = Router();

router.get('/:slug', getBySlug);

module.exports = router;
