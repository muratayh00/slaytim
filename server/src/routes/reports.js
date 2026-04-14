const { Router } = require('express');
const { create, getAll, updateStatus, batchUpdateStatus } = require('../controllers/reports.controller');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.post('/', authenticate, create);
router.get('/', authenticate, getAll);
router.patch('/:id/status', authenticate, updateStatus);
router.patch('/batch/status', authenticate, batchUpdateStatus);

module.exports = router;
