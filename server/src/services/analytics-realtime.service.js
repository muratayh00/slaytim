/**
 * Analytics Realtime Service
 *
 * Manages real-time counters and active-user tracking using Redis.
 * When REDIS_ENABLED=false (or Redis is unreachable) every operation silently
 * falls back to PostgreSQL count queries so the dashboard still works.
 *
 * Redis Key Schema
 * ─────────────────────────────────────────────────────────────
 *   analytics:active:{YYYY-MM-DD}          ZSET  sessionId → lastSeenMs
 *   analytics:slideo:active:{YYYY-MM-DD}   ZSET  sessionId → lastSeenMs
 *   analytics:today:pageviews:{YYYY-MM-DD} STRING INCR  (TTL 2 days)
 *   analytics:today:signups:{YYYY-MM-DD}   STRING INCR
 *   analytics:today:uploads:{YYYY-MM-DD}   STRING INCR
 *   analytics:today:slideo:{YYYY-MM-DD}    STRING INCR
 *   analytics:today:searches:{YYYY-MM-DD}  STRING INCR
 *   analytics:pages:{YYYY-MM-DD}           HASH   path → hitCount
 * ─────────────────────────────────────────────────────────────
 */

'use strict';

const logger = require('../lib/logger');
const prisma = require('../lib/prisma');

const REDIS_ENABLED = String(process.env.REDIS_ENABLED || 'false').toLowerCase() === 'true';
const ACTIVE_WINDOW_MS   = 60  * 1000;       // "active now" = last 60 s
const LAST_30M_WINDOW_MS = 30  * 60 * 1000;  // "last 30 min"
const KEY_TTL_S          = 172_800;          // 2 days

let _redis = null;
let _redisFailed = false; // stop retrying after first hard failure

function getRedis() {
  if (!REDIS_ENABLED || _redisFailed) return null;
  if (_redis) return _redis;
  try {
    const IORedis = require('ioredis');
    const url = String(process.env.REDIS_URL || '').trim();
    const opts = url || {
      host:     process.env.REDIS_HOST     || '127.0.0.1',
      port:     Number(process.env.REDIS_PORT || 6379),
      password: process.env.REDIS_PASSWORD  || undefined,
      db:       Number(process.env.REDIS_DB  || 0),
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    };
    _redis = new IORedis(opts);
    _redis.on('error', (err) => {
      logger.warn('[analytics-realtime] Redis error', { message: err.message });
    });
    return _redis;
  } catch (err) {
    logger.error('[analytics-realtime] Redis init failed', { message: err.message });
    _redisFailed = true;
    return null;
  }
}

/** Returns today's date string as YYYY-MM-DD (UTC). */
const todayKey = () => new Date().toISOString().slice(0, 10);

/* ──────────────────────────────────────────────
   WRITE HELPERS (called from analytics controller)
   ────────────────────────────────────────────── */

/**
 * Record a page_view event in Redis.
 * Safe to call from analytics.controller.js ingestBatch.
 */
async function recordPageView(sessionId, page) {
  const redis = getRedis();
  if (!redis) return;
  try {
    const date  = todayKey();
    const now   = Date.now();
    const normPage = page ? page.split('?')[0].slice(0, 200) : '/unknown';
    const pipe = redis.pipeline();
    pipe.zadd(`analytics:active:${date}`, now, sessionId || 'anon');
    pipe.expire(`analytics:active:${date}`, KEY_TTL_S);
    pipe.incr(`analytics:today:pageviews:${date}`);
    pipe.expire(`analytics:today:pageviews:${date}`, KEY_TTL_S);
    pipe.hincrby(`analytics:pages:${date}`, normPage, 1);
    pipe.expire(`analytics:pages:${date}`, KEY_TTL_S);
    await pipe.exec();
  } catch (err) {
    logger.warn('[analytics-realtime] recordPageView failed', { message: err.message });
  }
}

/**
 * Increment a named today counter.
 * @param {'signups'|'uploads'|'slideo'|'searches'} metric
 */
async function incrementToday(metric) {
  const redis = getRedis();
  if (!redis) return;
  try {
    const key = `analytics:today:${metric}:${todayKey()}`;
    await redis.incr(key);
    await redis.expire(key, KEY_TTL_S);
  } catch (err) {
    logger.warn('[analytics-realtime] incrementToday failed', { metric, message: err.message });
  }
}

/** Track an active Slideo viewer session. */
async function recordSlideoView(sessionId) {
  const redis = getRedis();
  if (!redis) return;
  try {
    const date = todayKey();
    const pipe = redis.pipeline();
    pipe.zadd(`analytics:slideo:active:${date}`, Date.now(), sessionId || 'anon');
    pipe.expire(`analytics:slideo:active:${date}`, KEY_TTL_S);
    pipe.incr(`analytics:today:slideo:${date}`);
    pipe.expire(`analytics:today:slideo:${date}`, KEY_TTL_S);
    await pipe.exec();
  } catch (err) {
    logger.warn('[analytics-realtime] recordSlideoView failed', { message: err.message });
  }
}

/* ──────────────────────────────────────────────
   READ HELPERS (called from SSE / dashboard)
   ────────────────────────────────────────────── */

/**
 * Return the full realtime snapshot.
 * Tries Redis first, falls back to DB counts if unavailable.
 */
async function getRealtimeSnapshot() {
  const redis  = getRedis();
  const date   = todayKey();

  if (redis) {
    try {
      const now  = Date.now();
      const pipe = redis.pipeline();
      pipe.zcount(`analytics:active:${date}`,        now - ACTIVE_WINDOW_MS,   '+inf');
      pipe.zcount(`analytics:active:${date}`,        now - LAST_30M_WINDOW_MS, '+inf');
      pipe.get(`analytics:today:pageviews:${date}`);
      pipe.get(`analytics:today:signups:${date}`);
      pipe.get(`analytics:today:uploads:${date}`);
      pipe.get(`analytics:today:slideo:${date}`);
      pipe.get(`analytics:today:searches:${date}`);
      pipe.zcount(`analytics:slideo:active:${date}`, now - ACTIVE_WINDOW_MS,   '+inf');
      const r = await pipe.exec();
      return {
        activeNow:          Number(r[0][1] ?? 0),
        last30m:            Number(r[1][1] ?? 0),
        pageviewsToday:     Number(r[2][1] ?? 0),
        signupsToday:       Number(r[3][1] ?? 0),
        uploadsToday:       Number(r[4][1] ?? 0),
        slideoViewsToday:   Number(r[5][1] ?? 0),
        searchesToday:      Number(r[6][1] ?? 0),
        activeSlideoViewers:Number(r[7][1] ?? 0),
        source: 'redis',
        ts: Date.now(),
      };
    } catch (err) {
      logger.warn('[analytics-realtime] snapshot Redis failed → DB fallback', { message: err.message });
    }
  }

  return _snapshotFromDb(date);
}

async function _snapshotFromDb(date) {
  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd   = new Date(dayStart.getTime() + 86_400_000);
  try {
    const [pageviews, signups, uploads, slideoViews, searches] = await Promise.all([
      prisma.analyticsEvent.count({ where: { eventType: 'page_view', createdAt: { gte: dayStart, lt: dayEnd } } }),
      prisma.user.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
      prisma.slide.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
      prisma.analyticsEvent.count({ where: { eventType: 'slideo_view', createdAt: { gte: dayStart, lt: dayEnd } } }),
      prisma.searchQuery.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } }).catch(() => 0),
    ]);
    return {
      activeNow: 0, last30m: 0,
      pageviewsToday: pageviews, signupsToday: signups,
      uploadsToday: uploads, slideoViewsToday: slideoViews,
      searchesToday: searches, activeSlideoViewers: 0,
      source: 'db', ts: Date.now(),
    };
  } catch {
    return {
      activeNow: 0, last30m: 0, pageviewsToday: 0,
      signupsToday: 0, uploadsToday: 0, slideoViewsToday: 0,
      searchesToday: 0, activeSlideoViewers: 0,
      source: 'fallback', ts: Date.now(),
    };
  }
}

/**
 * Return top active pages from today (Redis only; returns [] when unavailable).
 */
async function getActivePages(limit = 8) {
  const redis = getRedis();
  if (!redis) return [];
  try {
    const raw = await redis.hgetall(`analytics:pages:${todayKey()}`);
    if (!raw) return [];
    return Object.entries(raw)
      .map(([path, count]) => ({ path, count: Number(count) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch {
    return [];
  }
}

module.exports = {
  recordPageView,
  incrementToday,
  recordSlideoView,
  getRealtimeSnapshot,
  getActivePages,
};
