const { Router } = require('express');
const { getPage } = require('../controllers/seo-pages.controller');

const router = Router();

router.get('/:slug', getPage);

module.exports = router;
