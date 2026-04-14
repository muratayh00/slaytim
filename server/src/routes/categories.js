const { Router } = require('express');
const { getAll, getOne, create } = require('../controllers/categories.controller');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.get('/', getAll);
router.get('/:slug', getOne);
router.post('/', authenticate, create);

module.exports = router;
