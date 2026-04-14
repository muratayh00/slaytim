require('dotenv').config();
require('../src/config/env-validation')();

const prisma = require('../src/lib/prisma');
const { retryRecoverableFailedConversions } = require('../src/services/conversion-maintenance.service');

async function run() {
  const limit = Math.max(1, Number(process.env.RECOVER_CONVERSION_LIMIT || 300));
  const summary = await retryRecoverableFailedConversions(limit);

  console.log(JSON.stringify(summary, null, 2));
}

run()
  .catch((err) => {
    console.error('RECOVER_FAILED_CONVERSIONS_ERROR', err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
    } catch {}
  });
