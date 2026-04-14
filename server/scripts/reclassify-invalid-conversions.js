require('dotenv').config();
require('../src/config/env-validation')();

const prisma = require('../src/lib/prisma');
const { reclassifyInvalidFailedConversions } = require('../src/services/conversion-maintenance.service');

async function run() {
  const limit = Math.max(1, Number(process.env.RECLASSIFY_LIMIT || 500));
  const summary = await reclassifyInvalidFailedConversions(limit);

  console.log(JSON.stringify(summary, null, 2));
}

run()
  .catch((err) => {
    console.error('RECLASSIFY_INVALID_CONVERSIONS_ERROR', err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
    } catch {}
  });
