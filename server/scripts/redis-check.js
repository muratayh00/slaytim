require('dotenv').config();
const IORedis = require('ioredis');

function getConnectionTarget() {
  const redisUrl = String(process.env.REDIS_URL || '').trim();
  if (redisUrl) return redisUrl;
  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    db: Number(process.env.REDIS_DB || 0),
  };
}

async function main() {
  const target = getConnectionTarget();
  const printable = typeof target === 'string'
    ? target.replace(/(:\/\/[^:@]*):([^@]+)@/, '$1:***@')
    : `${target.host}:${target.port} db=${target.db}`;

  let lastConnectionError = null;
  const redis = new IORedis(target, {
    maxRetriesPerRequest: 1,
    connectTimeout: 4000,
    lazyConnect: true,
  });
  // Avoid ioredis "Unhandled error event" noise when Redis is down.
  redis.on('error', (err) => {
    lastConnectionError = err;
  });

  try {
    await redis.connect();
    const pong = await redis.ping();
    const info = await redis.info('server');
    const versionLine = String(info)
      .split('\n')
      .find((line) => line.startsWith('redis_version:')) || 'redis_version:unknown';
    console.log(`[redis-check] target=${printable}`);
    console.log(`[redis-check] ping=${pong}`);
    console.log(`[redis-check] ${versionLine.trim()}`);
    process.exit(0);
  } catch (err) {
    console.error(`[redis-check] FAILED target=${printable}`);
    const reason = lastConnectionError?.message || err?.message || err;
    console.error(`[redis-check] ${reason}`);
    process.exit(1);
  } finally {
    try { await redis.quit(); } catch {}
  }
}

main();
