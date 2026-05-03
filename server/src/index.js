require('dotenv').config();
require('./config/env-validation')();

const logger = require('./lib/logger');

// Sentry must be initialized before any other imports that might throw
if (process.env.SENTRY_DSN && process.env.NODE_ENV === 'production') {
  const Sentry = require('@sentry/node');
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
  });
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { seedBadges } = require('./services/badge.service');
const {
  enqueueSlideConversion,
  reconcileMissingConversionJobs,
  recoverStuckConversionJobs,
  hasLibreOffice,
  hasPowerPoint,
  getLibreOfficeBinary,
  getConversionQueueState,
  getUploadPipelineHealth,
} = require('./services/conversion.service');
const { setupNotificationWebSocket } = require('./services/notification-stream.service');
const { assertRemoteStorageConfigured, isRemoteEnabled, resolveStorageReadUrl } = require('./services/storage.service');
const { runPreflight } = require('./lib/preflight');
const dedup = require('./lib/dedup');
const prisma = require('./lib/prisma');
const { csrfProtection } = require('./middleware/csrf');
const { UploadValidationError, UPLOAD_ERROR_STATUS } = require('./middleware/upload');
const { validateSecurityEnv, assertProductionReadiness } = require('./lib/security-env');
const { denyBlockedIps } = require('./middleware/traffic-guard');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const topicRoutes = require('./routes/topics');
const slideRoutes = require('./routes/slides');
const categoryRoutes = require('./routes/categories');
const likeRoutes = require('./routes/likes');
const saveRoutes = require('./routes/saves');
const followRoutes = require('./routes/follows');
const visitRoutes = require('./routes/visits');
const commentRoutes = require('./routes/comments');
const notificationRoutes = require('./routes/notifications');
const reportRoutes = require('./routes/reports');
const blockRoutes = require('./routes/blocks');
const adminRoutes = require('./routes/admin');
const badgeRoutes = require('./routes/badges');
const collectionRoutes = require('./routes/collections');
const slideoRoutes = require('./routes/slideo');
const slideoV3Routes = require('./routes/slideo-v3');
const feedbackRoutes = require('./routes/feedback');
const roomRoutes = require('./routes/rooms');
const flashcardRoutes = require('./routes/flashcards');
const analyticsRoutes        = require('./routes/analytics');
const adminAnalyticsRoutes   = require('./routes/admin-analytics');
const tagRoutes = require('./routes/tags');
const recommendationRoutes = require('./routes/recommendation');
const eventRoutes = require('./routes/events');
const feedRoutes = require('./routes/feed');
const seoPagesRoutes = require('./routes/seo-pages');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
const TRUST_PROXY = process.env.TRUST_PROXY;
// E2E_DISABLE_RATE_LIMIT is only honoured outside production.
// If someone accidentally sets it on a production server, it is silently ignored.
const disableRateLimitForE2E =
  process.env.NODE_ENV !== 'production' && process.env.E2E_DISABLE_RATE_LIMIT === 'true';
const allowNonProdAutomationBypass = process.env.NODE_ENV !== 'production';
const isAutomationBypassRequest = (req) =>
  allowNonProdAutomationBypass && String(req.headers['x-staging-proof'] || '') === '1';

if (TRUST_PROXY === '1' || TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
} else if (TRUST_PROXY === '0' || TRUST_PROXY === 'false') {
  app.set('trust proxy', false);
} else if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ── CORS origin allowlist ────────────────────────────────────────────────────
// Sources (all comma-separated):
//   CLIENT_URL   – primary env var  (e.g. "https://slaytim.com")
//   CLIENT_URLS  – optional alias   (additional origins)
// The production apex + www origins are always included regardless of env vars.
// Vercel preview deployments for this project are allowed via a strict regex so
// that new Vercel preview URLs never require a code change.
const isProd = process.env.NODE_ENV === 'production';

const _parseOriginList = (str) =>
  (str || '').split(',').map((x) => x.trim()).filter(Boolean);

const allowedOriginsSet = new Set([
  ..._parseOriginList(process.env.CLIENT_URL),
  ..._parseOriginList(process.env.CLIENT_URLS),
  // Production apex + www — always allowed, safe to include in dev too
  'https://slaytim.com',
  'https://www.slaytim.com',
]);

if (!isProd) {
  for (const o of [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
  ]) {
    allowedOriginsSet.add(o);
  }
}

// Vercel preview deployments: only match THIS project's slug prefix so we
// don't inadvertently allow all of *.vercel.app.
// Pattern: https://slaytim-trpg-<hash>-<account-slug>.vercel.app
const _vercelPreviewRe = /^https:\/\/slaytim-trpg-[a-z0-9-]+-[a-z0-9-]+\.vercel\.app$/i;

const isOriginAllowed = (origin) => {
  if (!origin) return true; // server-to-server / same-origin / curl — no Origin header
  if (allowedOriginsSet.has(origin)) return true;
  if (_vercelPreviewRe.test(origin)) return true;
  return false;
};

// Keep an array for CSP frame-ancestors (must be explicit list, no regex)
const allowedOrigins = [...allowedOriginsSet];
const uploadFrameAncestors = ["'self'", ...allowedOrigins, 'http://127.0.0.1:3000'];

app.use(helmet({
  frameguard: isProd ? { action: 'sameorigin' } : false,
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

if (!isProd) {
  app.use((req, res, next) => {
    res.removeHeader('X-Frame-Options');
    next();
  });
}

// Reflect the exact requesting origin so Access-Control-Allow-Origin is never
// "*", which is incompatible with credentials: true.
// OPTIONS preflight is handled automatically by the cors package.
app.use(cors({
  origin(origin, cb) {
    if (isOriginAllowed(origin)) return cb(null, origin || true);
    return cb(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With', 'x-view-session'],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 86400, // preflight cache: 24 h
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(denyBlockedIps);
app.use(csrfProtection);

app.use((req, res, next) => {
  const reqPath = String(req.path || '');
  const isUploadAsset = reqPath.startsWith('/uploads/');
  const isSlidePdfPreview = /^\/api\/slides\/\d+\/pdf$/.test(reqPath);

  if (isUploadAsset || isSlidePdfPreview) {
    // These routes are intentionally embeddable in client-side iframe previews.
    res.removeHeader('X-Frame-Options');
    res.setHeader(
      'Content-Security-Policy',
      `frame-ancestors ${uploadFrameAncestors.join(' ')}; base-uri 'self'; object-src 'none'`,
    );
  } else {
    res.setHeader('Content-Security-Policy', "frame-ancestors 'none'; base-uri 'self'; object-src 'none'");
  }
  next();
});

// Serve uploads - express.static handles path traversal protection natively.
// Cross-Origin-Resource-Policy: cross-origin is required so PDF.js (at localhost:3000)
// can fetch PDF files from this server (different port). Helmet sets CORP: same-origin
// by default which blocks these cross-origin reads.
app.use('/uploads', (req, res, next) => {
  res.removeHeader('X-Frame-Options');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  const reqPath = String(req.path || '').toLowerCase();
  if (reqPath.startsWith('/previews/')) {
    // WebP preview images are content-addressed (slideId/pageN.webp) — safe to cache forever
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (reqPath.startsWith('/thumbnails/')) {
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
  } else if (reqPath.startsWith('/pdfs/')) {
    res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=3600');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
  }
  next();
}, async (req, res, next) => {
  if (!isRemoteEnabled()) return next();
  const requestedPath = String(req.path || '/').replace(/^\/+/, '');
  const normalizedPath = `/uploads/${requestedPath}`;
  const localPath = path.join(__dirname, '../uploads', requestedPath);
  if (localPath && require('fs').existsSync(localPath)) return next();

  try {
    const signed = await resolveStorageReadUrl(normalizedPath);
    if (typeof signed === 'string' && /^https?:\/\//i.test(signed)) {
      return res.redirect(302, signed);
    }
    return res.status(404).json({ error: 'File not found' });
  } catch (err) {
    logger.error('[uploads] failed to resolve remote media', {
      path: normalizedPath,
      error: err?.message || String(err),
    });
    return res.status(502).json({ error: 'Remote media fetch failed' });
  }
}, express.static(path.join(__dirname, '../uploads'), {
  maxAge: '7d',
  immutable: false,
}));

// Cache-Control middleware for public read-only API routes
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.headers.authorization && !req.headers.cookie) {
    const publicPaths = ['/api/categories', '/api/topics', '/api/slides/popular', '/api/badges'];
    const isPublic = publicPaths.some(p => req.path.startsWith(p));
    if (isPublic) res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');
  }
  next();
});

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[level](`${req.method} ${req.url} ${res.statusCode} ${ms}ms`, {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      ms,
      ip: req.ip,
    });
  });
  next();
});

// Rate limiting - brute-force & DDoS protection
if (!disableRateLimitForE2E) {
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: { error: 'Çok fazla istek. Lütfen 15 dakika bekleyin.' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/auth/forgot-password', authLimiter);

  const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,                   // 10 uploads per hour per IP
    message: { error: 'Çok fazla yükleme. Lütfen bir saat bekleyin.' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/slides', (req, res, next) => {
    if (isAutomationBypassRequest(req)) {
      return next();
    }
    // Limit only heavy upload create requests, not reads/toggles/retries.
    if (req.method === 'POST' && (req.path === '/' || req.path === '')) {
      return uploadLimiter(req, res, next);
    }
    return next();
  });

  const generalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 200,            // 200 requests per minute per IP
    message: { error: 'Çok fazla istek. Lütfen bekleyin.' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api', (req, res, next) => {
    if (isAutomationBypassRequest(req)) {
      return next();
    }
    return generalLimiter(req, res, next);
  });
} else {
  logger.warn('Rate limiting disabled (E2E_DISABLE_RATE_LIMIT=true)');
}

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/slides', slideRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/saves', saveRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/blocks', blockRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/slideo', slideoRoutes);
app.use('/api/slideo-v3', slideoV3Routes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/analytics',        analyticsRoutes);
app.use('/api/admin/analytics',  adminAnalyticsRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/recommendation', recommendationRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/seo-pages', seoPagesRoutes);

app.get('/api/health', async (req, res) => {
  const checks = { status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() };
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
    checks.status = 'degraded';
  }
  checks.redis = process.env.REDIS_ENABLED === 'true' ? 'configured' : 'disabled';
  checks.node = process.version;
  checks.env = process.env.NODE_ENV;
  res.status(checks.status === 'ok' ? 200 : 503).json(checks);
});
app.get('/api/health/conversion', async (req, res) => {
  try {
    const queue = await getConversionQueueState();
    res.json({
      status: 'ok',
      converters: {
        libreOffice: Boolean(hasLibreOffice()),
        libreOfficePath: getLibreOfficeBinary() || null,
        powerPoint: Boolean(hasPowerPoint()),
      },
      queue,
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      error: err?.message || 'Conversion health check failed',
    });
  }
});

app.get('/api/health/upload-pipeline', async (req, res) => {
  try {
    const health = await getUploadPipelineHealth();
    res.json(health);
  } catch (err) {
    res.status(500).json({
      status: 'error',
      error: err?.message || 'Upload pipeline health check failed',
    });
  }
});

// Global error handler — MUST be last middleware
app.use((err, req, res, next) => {
  const multerErrorStatusMap = {
    LIMIT_FILE_SIZE: UPLOAD_ERROR_STATUS.FILE_TOO_LARGE,
    LIMIT_UNEXPECTED_FILE: 400,
    LIMIT_PART_COUNT: 400,
    LIMIT_FIELD_KEY: 400,
    LIMIT_FIELD_VALUE: 400,
    LIMIT_FIELD_COUNT: 400,
  };

  if (err instanceof UploadValidationError || err?.name === 'UploadValidationError') {
    return res.status(err.status || 400).json({
      code: err.code || 'UPLOAD_VALIDATION_ERROR',
      error: err.message || 'Dosya dogrulama hatasi',
    });
  }
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(UPLOAD_ERROR_STATUS.FILE_TOO_LARGE).json({
      code: 'FILE_TOO_LARGE',
      error: 'Dosya boyutu 50MB sinirini asiyor',
    });
  }
  if (err?.name === 'MulterError') {
    logger.warn('Multer upload error', { error: err.message, code: err.code });
    return res.status(multerErrorStatusMap[err.code] || 400).json({
      code: err.code || 'MULTER_ERROR',
      error: err.message || 'Dosya yukleme hatasi',
    });
  }
  const status = err.status || err.statusCode || 500;
  logger.error('Unhandled error', {
    method: req.method,
    url: req.url,
    status,
    error: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });
  if (res.headersSent) return next(err);
  res.status(status).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

seedBadges().catch((err) => logger.error('[badges] Seed failed', { error: err?.message }));
validateSecurityEnv();
assertProductionReadiness();
assertRemoteStorageConfigured();
// ClamAV check is now done inside runPreflight() — assertClamAvStartup() removed from here.

// Retroactively convert slides stuck in "pending" or interrupted "processing" state.
// On restart, any slide mid-conversion will be stuck in "processing" with no pdfUrl.
// We reset those ConversionJob records and re-enqueue them cleanly.
async function queuePendingConversions() {
  try {
    const stuck = await prisma.slide.findMany({
      where: {
        conversionStatus: { in: ['pending', 'processing'] },
        pdfUrl: null,
      },
      select: { id: true, conversionStatus: true },
    });

    if (stuck.length > 0) {
      logger.info(`[conversion] Queuing ${stuck.length} stuck slide(s) for conversion...`);

      // Reset any interrupted "processing" jobs back to queued so they can be retried
      const processingIds = stuck
        .filter((s) => s.conversionStatus === 'processing')
        .map((s) => s.id);

      if (processingIds.length > 0) {
        await prisma.slide.updateMany({
          where: { id: { in: processingIds } },
          data: { conversionStatus: 'pending' },
        });
        await prisma.conversionJob.updateMany({
          where: { slideId: { in: processingIds }, status: 'processing' },
          data: { status: 'queued', lockedAt: null },
        });
      }

      let failedEnqueue = 0;
      for (const { id } of stuck) {
        try {
          await enqueueSlideConversion(id);
        } catch (err) {
          failedEnqueue += 1;
          logger.error('[conversion] Failed to enqueue stuck slide', {
            slideId: id,
            error: err?.message || String(err),
          });
        }
      }
      if (failedEnqueue > 0) {
        logger.warn('[conversion] Some stuck slides could not be enqueued', {
          failedEnqueue,
          total: stuck.length,
        });
      }
    }
  } catch (err) {
    logger.error('[conversion] Failed to queue pending slides:', { error: err.message, stack: err.stack });
  }
}

async function runConversionQueueReconciler() {
  try {
    const [result, recovered] = await Promise.all([
      reconcileMissingConversionJobs({
        limit: Number(process.env.CONVERSION_RECONCILE_LIMIT || 500),
      }),
      recoverStuckConversionJobs({
        thresholdMinutes: Number(process.env.CONVERSION_STUCK_MINUTES || 10),
        limit: Number(process.env.CONVERSION_STUCK_RECOVER_LIMIT || 50),
      }),
    ]);
    if ((result?.reEnqueued || 0) > 0) {
      // Small counts (1–4, no failures) are normal operation — log at info.
      // Only escalate to warn when something genuinely unexpected happened.
      const logFn = (result.reEnqueued >= 5 || (result.failed || 0) > 0) ? 'warn' : 'info';
      logger[logFn]('[conversion] Reconciler re-enqueued missing jobs', result);
    }
    if ((recovered?.recovered || 0) > 0) {
      logger.warn('[conversion] Auto recovered stuck processing jobs', recovered);
    }
  } catch (err) {
    logger.error('[conversion] Reconciler failed', { error: err?.message || String(err) });
  }
}

setupNotificationWebSocket(server);

async function startServer() {
  // Run all runtime checks before opening the port.
  // Any missing required component causes process.exit(1) — no silent fallbacks.
  await runPreflight();

  await new Promise((resolve) => {
    server.listen(PORT, () => {
      logger.info('Slaytim server running on http://localhost:' + PORT);

      dedup.init()
        .catch((err) => logger.error('[dedup] Init failed:', { error: err.message }));
      // Run warmup first, then start the reconciler only after warmup settles.
      // Running both concurrently caused a race: reconciler found slides that
      // queuePendingConversions() hadn't enqueued yet → false "missing jobs" warn.
      const reconcileEveryMs = Math.max(10_000, Number(process.env.CONVERSION_RECONCILE_INTERVAL_MS || 60_000));
      queuePendingConversions()
        .catch((err) => logger.error('[conversion] Queue warmup failed:', { error: err.message }))
        .finally(() => {
          runConversionQueueReconciler()
            .catch((err) => logger.error('[conversion] Initial reconcile failed:', { error: err.message }));
          setInterval(() => {
            runConversionQueueReconciler()
              .catch((err) => logger.error('[conversion] Scheduled reconcile failed:', { error: err.message }));
          }, reconcileEveryMs);
        });

      // Signal PM2 that the app is ready (used with wait_ready: true in ecosystem.config.js)
      if (process.send) process.send('ready');

      resolve();
    });
  });
}

startServer().catch((err) => {
  logger.error('[startup] Unhandled error during startup', { error: err.message, stack: err.stack });
  process.exit(1);
});

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
      logger.info('Database disconnected');
    } catch {}
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));





