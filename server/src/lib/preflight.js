/**
 * Runtime preflight checks (fail-fast).
 *
 * Runs before the HTTP server starts listening.
 * If a required dependency is unavailable, process exits with code 1.
 */

const logger = require('./logger');

const IS_PROD = (process.env.NODE_ENV || 'development') === 'production';
const REDIS_ENABLED = String(process.env.REDIS_ENABLED || 'false').toLowerCase() === 'true';

async function checkDatabase() {
  const label = '[preflight:db]';
  try {
    const prisma = require('./prisma');
    await prisma.$queryRaw`SELECT 1`;
    logger.info(`${label} Database reachable`);
  } catch (err) {
    logger.error(`${label} FATAL: cannot connect to database`, { error: err.message });
    process.exit(1);
  }
}

async function checkRedis() {
  const label = '[preflight:redis]';

  if (!REDIS_ENABLED) {
    logger.info(`${label} Skipped (REDIS_ENABLED=false)`);
    return;
  }

  const IORedis = require('ioredis');
  const url = String(process.env.REDIS_URL || '').trim();
  const opts = {
    maxRetriesPerRequest: 0,
    connectTimeout: 5000,
    lazyConnect: true,
    enableOfflineQueue: false,
    retryStrategy: () => null,
  };

  const targets = [];
  if (url) targets.push({ kind: 'url', value: url });
  targets.push({
    kind: 'host-port',
    value: {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT || 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      db: Number(process.env.REDIS_DB || 0),
    },
  });

  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    for (let i = 0; i < targets.length; i += 1) {
      const target = targets[i];
      let client;
      try {
        client = target.kind === 'url'
          ? new IORedis(target.value, opts)
          : new IORedis({ ...target.value, ...opts });

        await client.connect();
        const pong = await client.ping();
        if (pong !== 'PONG') throw new Error(`Unexpected PING response: ${pong}`);

        logger.info(`${label} Redis reachable`, { target: target.kind, attempt });
        return;
      } catch (err) {
        const isLastAttempt = attempt === maxAttempts && i === targets.length - 1;
        if (isLastAttempt) {
          logger.error(`${label} FATAL: REDIS_ENABLED=true but Redis is unreachable`, {
            error: err.message,
            hint: 'Set REDIS_ENABLED=false for local fallback or fix REDIS_URL/REDIS_HOST.',
          });
          process.exit(1);
        } else {
          logger.warn(`${label} transient failure`, {
            target: target.kind,
            attempt,
            error: err.message,
          });
        }
      } finally {
        try { if (client) await client.disconnect(); } catch {}
      }
    }

    await new Promise((resolve) => setTimeout(resolve, Math.min(1500, attempt * 300)));
  }
}

async function checkLibreOffice() {
  const label = '[preflight:libreoffice]';

  const envVal = process.env.LIBREOFFICE_REQUIRED;
  const required = envVal !== undefined
    ? String(envVal).toLowerCase() === 'true'
    : IS_PROD;

  const { getLibreOfficeBinary } = require('../services/conversion.service');
  const binary = getLibreOfficeBinary();

  if (binary) {
    logger.info(`${label} LibreOffice found`, { binary });
    return;
  }

  if (required) {
    logger.error(`${label} FATAL: LibreOffice binary not found`, {
      hint: 'Install LibreOffice, set LIBREOFFICE_PATH, or set LIBREOFFICE_REQUIRED=false to skip.',
    });
    process.exit(1);
  }

  logger.warn(`${label} LibreOffice not found (PPTX->PDF conversion may fail in runtime).`);
}

function checkClamAV() {
  const { assertClamAvStartup } = require('../services/file-scan.service');
  assertClamAvStartup();
}

async function runPreflight() {
  const t0 = Date.now();
  logger.info('[preflight] Runtime preflight starting');

  checkClamAV();
  await checkRedis();
  await checkDatabase();
  await checkLibreOffice();

  logger.info('[preflight] All checks passed', { ms: Date.now() - t0 });
}

module.exports = { runPreflight };

