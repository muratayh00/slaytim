const { Router } = require('express');
const { toggleSave, getSaved } = require('../controllers/saves.controller');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.post('/slide/:id', authenticate, toggleSave);
router.get('/me', authenticate, getSaved);

module.exports = router;
