const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis;

// Default query timeout (ms). Prevents a single slow/unindexed query from
// holding a DB connection and starving other requests (e.g. login).
// Note: this rejects the Prisma Promise early but does NOT cancel the
// underlying PostgreSQL query — use DB-level indexes for the real fix.
const QUERY_TIMEOUT_MS = 12_000;

function createPrismaClient() {
  const client = new PrismaClient();

  // Middleware: race every query against a 12s deadline.
  // Keeps individual slow admin queries from blocking the connection pool
  // long enough to starve user-facing endpoints.
  client.$use(async (params, next) => {
    const timeout = new Promise((_, reject) =>
      setTimeout(
        () => reject(Object.assign(new Error('PRISMA_QUERY_TIMEOUT'), { isPrismaTimeout: true })),
        QUERY_TIMEOUT_MS
      )
    );
    return Promise.race([next(params), timeout]);
  });

  return client;
}

const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

module.exports = prisma;
