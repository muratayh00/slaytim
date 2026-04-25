const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const adminGuard = require('../middleware/admin');
const {
  getStats,
  getContent, hideContent, restoreContent, setContentSponsor, deleteContent,
  getUsers, warnUser, muteUser, banUser, updateRole,
  updateReportPriority, addReportNote,
  getContentIntelligence,
  getSlideoStats, hideSlideo, restoreSlideo, deleteSlideo,
  getAuditLogs,
  getConversionJobs, retryConversionJob, retryFailedConversions, reclassifyInvalidConversions, getConversionHealth,
  getPreviewOps, retryPreview,
  getHealth, getRoomsStats,
} = require('../controllers/admin.controller');

const router = Router();
router.use(authenticate);
router.use(adminGuard);

// Safeguard: if any read query hangs (e.g. missing DB index), return 503 after
// 9 seconds so the frontend timeout fires with a clean error instead of a 30s hang.
router.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      res.status(503).json({ error: 'Admin query timed out — DB may be slow. Try again.' });
    }
  }, 9000);
  res.on('finish', () => clearTimeout(timer));
  res.on('close', () => clearTimeout(timer));
  next();
});

// Overview
router.get('/stats', getStats);

// Content management
router.get('/content', getContent);
router.post('/content/:type/:id/hide', hideContent);
router.post('/content/:type/:id/restore', restoreContent);
router.patch('/content/:type/:id/sponsor', setContentSponsor);
router.delete('/content/:type/:id', deleteContent);

// Users
router.get('/users', getUsers);
router.post('/users/:id/warn', warnUser);
router.post('/users/:id/mute', muteUser);
router.post('/users/:id/ban', banUser);
router.patch('/users/:id/role', updateRole);

// Reports
router.patch('/reports/:id/priority', updateReportPriority);
router.patch('/reports/:id/note', addReportNote);

// Content Intelligence
router.get('/content-intel', getContentIntelligence);

// Slideos
router.get('/slideos', getSlideoStats);
router.patch('/slideos/:id/hide', hideSlideo);
router.patch('/slideos/:id/restore', restoreSlideo);
router.delete('/slideos/:id', deleteSlideo);

// Conversion queue health
router.get('/conversion-jobs', getConversionJobs);
router.get('/conversion-jobs/health', getConversionHealth);
router.post('/conversion-jobs/:id/retry', retryConversionJob);
router.post('/conversion-jobs/retry-failed', retryFailedConversions);
router.post('/conversion-jobs/reclassify-invalid', reclassifyInvalidConversions);

// Audit Logs
router.get('/audit', getAuditLogs);

// Preview Ops
router.get('/preview-ops', getPreviewOps);
router.post('/preview-ops/retry', retryPreview);

// System health
router.get('/health', getHealth);

// Rooms stats
router.get('/rooms', getRoomsStats);

module.exports = router;
