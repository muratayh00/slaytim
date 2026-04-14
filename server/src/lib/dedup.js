/**
 * Global deduplication service.
 *
 * When Redis is available: uses SET NX EX (atomic, multi-instance safe).
 * When Redis is unavailable: falls back to in-process Map (dev/single-instance).
 *
 * Usage:
 *   const { dedup } = require('./dedup');
 *   const counted = await dedup.check('view:slide:123:user:456', 30); // TTL seconds
 *   // counted = true  → first time seen, count it
 *   // counted = false → duplicate, skip
 */

const logger = require('./logger');

// ── In-process fallback ──────────────────────────────────────────
const fallbackStore = new Map();

function fallbackCheck(key, ttlSeconds) {
  const now = Date.now();
  const expiresAt = fallbackStore.get(key);
  if (expiresAt && now < expiresAt) return false; // still within window
  fallbackStore.set(key, now + ttlSeconds * 1000);
  // Periodic cleanup to prevent unbounded growth
  if (fallbackStore.size > 50_000) {
    for (const [k, exp] of fallbackStore.entries()) {
      if (now > exp) fallbackStore.delete(k);
    }
  }
  return true;
}

// ── Redis client (lazy, shared with queue) ───────────────────────
let redisClient = null;
let redisAvailable = false;
let redisCheckDone = false;

async function getRedis() {
  if (redisCheckDone) return redisAvailable ? redisClient : null;
  redisCheckDone = true;

  const enabled = String(process.env.REDIS_ENABLED || 'false').toLowerCase() === 'true';
  if (!enabled) return null;

  try {
    const IORedis = require('ioredis');
    const url = String(process.env.REDIS_URL || '').trim();
    // Always use lazyConnect so we can await .connect() + .ping() before marking available.
    // When using a URL string, pass it as first arg and options as second arg.
    const lazyOpts = {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      connectTimeout: 3000,
      lazyConnect: true,
    };
    redisClient = url
      ? new IORedis(url, lazyOpts)
      : new IORedis({
          host: process.env.REDIS_HOST || '127.0.0.1',
          port: Number(process.env.REDIS_PORT || 6379),
          password: process.env.REDIS_PASSWORD || undefined,
          db: Number(process.env.REDIS_DB || 0),
          ...lazyOpts,
        });
    await redisClient.connect();
    await redisClient.ping(); // verify connection
    redisAvailable = true;
    logger.info('[dedup] Redis backend active — multi-instance dedup enabled');
    redisClient.on('error', (err) => {
      if (redisAvailable) {
        logger.warn('[dedup] Redis error, falling back to in-process dedup', { error: err.message });
        redisAvailable = false;
      }
    });
    redisClient.on('ready', () => {
      if (!redisAvailable) {
        logger.info('[dedup] Redis reconnected — resuming Redis dedup');
        redisAvailable = true;
      }
    });
  } catch (err) {
    logger.warn('[dedup] Redis unavailable, using in-process fallback', { error: err.message });
    redisAvailable = false;
    redisClient = null;
  }
  return redisAvailable ? redisClient : null;
}

// ── Atomic increment helper ──────────────────────────────────────
/**
 * Atomically increment a counter in Redis with optional TTL.
 * Returns the new value after increment.
 * Falls back to 1 if Redis unavailable.
 */
async function atomicIncrement(key, ttlSeconds = 0) {
  const redis = redisAvailable ? redisClient : await getRedis();
  if (!redis) return 1; // fallback: assume first count
  try {
    const multi = redis.multi();
    multi.incr(key);
    if (ttlSeconds > 0) multi.expire(key, ttlSeconds, 'NX'); // only set TTL on first creation
    const results = await multi.exec();
    return results?.[0]?.[1] ?? 1;
  } catch (err) {
    logger.warn('[dedup] atomicIncrement failed', { key, error: err.message });
    return 1;
  }
}

// ── Core dedup check ─────────────────────────────────────────────
/**
 * Check and mark a dedup key.
 * Returns true if this is the FIRST occurrence within the TTL window (count it).
 * Returns false if it's a duplicate (skip it).
 *
 * Uses Redis SET key "" NX EX ttl  (atomic, multi-instance safe).
 */
async function check(key, ttlSeconds) {
  const redis = redisAvailable ? redisClient : await getRedis();
  if (!redis) {
    return fallbackCheck(key, ttlSeconds);
  }
  try {
    // SET key value NX EX ttl — only sets if key doesn't exist
    // Returns "OK" if set (first time), null if already exists (duplicate)
    const result = await redis.set(key, '1', 'NX', 'EX', ttlSeconds);
    return result === 'OK'; // true = first occurrence; false = duplicate
  } catch (err) {
    logger.warn('[dedup] Redis check failed, falling back', { key, error: err.message });
    return fallbackCheck(key, ttlSeconds);
  }
}

// ── Event dedup (idempotency) ─────────────────────────────────────
/**
 * Idempotency check for analytics events.
 * Uses a short TTL (5 min) to prevent duplicate event submissions.
 */
async function eventIdempotency(eventId, ttlSeconds = 300) {
  return check(`event:idem:${eventId}`, ttlSeconds);
}

// ── Initialise eagerly so Redis is ready before first request ────
let initPromise = null;
function init() {
  if (!initPromise) initPromise = getRedis();
  return initPromise;
}

module.exports = { check, atomicIncrement, eventIdempotency, init, fallbackCheck };
