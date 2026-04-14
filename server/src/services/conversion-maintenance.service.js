const prisma = require('../lib/prisma');
const { enqueueSlideConversion } = require('./conversion.service');

const RETRYABLE_PATTERNS = [
  /bad xref entry/i,
  /command token too long/i,
  /redis/i,
  /queue/i,
  /timeout/i,
  /conversion failed/i,
];

const INVALID_SOURCE_PATTERNS = [
  /bad xref entry/i,
  /illegal character/i,
  /end of file inside array/i,
  /unterminated string/i,
  /invalid number:/i,
  /command token too long/i,
];

function isRetryableConversionError(lastError) {
  const text = String(lastError || '');
  return RETRYABLE_PATTERNS.some((r) => r.test(text));
}

function isInvalidSourceConversionError(lastError) {
  const text = String(lastError || '');
  return INVALID_SOURCE_PATTERNS.some((r) => r.test(text));
}

async function retryRecoverableFailedConversions(limit = 300) {
  const take = Math.max(1, Number(limit || 300));
  const failedJobs = await prisma.conversionJob.findMany({
    where: { status: 'failed' },
    orderBy: { updatedAt: 'asc' },
    take,
    include: {
      slide: { select: { id: true, fileUrl: true, isHidden: true, deletedAt: true } },
    },
  });

  const summary = {
    scanned: failedJobs.length,
    retryable: 0,
    requeued: 0,
    skipped: 0,
    failedRequeue: 0,
    samples: [],
  };

  for (const job of failedJobs) {
    const slide = job.slide;
    const lastError = String(job.lastError || '');

    if (!slide || slide.deletedAt || slide.isHidden || !slide.fileUrl || !isRetryableConversionError(lastError)) {
      summary.skipped += 1;
      continue;
    }

    summary.retryable += 1;
    try {
      // eslint-disable-next-line no-await-in-loop
      await enqueueSlideConversion(slide.id);
      summary.requeued += 1;
    } catch (err) {
      summary.failedRequeue += 1;
      if (summary.samples.length < 10) {
        summary.samples.push({
          slideId: slide.id,
          lastError,
          requeueError: String(err?.message || err),
        });
      }
    }
  }

  return summary;
}

async function reclassifyInvalidFailedConversions(limit = 500) {
  const take = Math.max(1, Number(limit || 500));
  const failedJobs = await prisma.conversionJob.findMany({
    where: { status: 'failed' },
    orderBy: { updatedAt: 'desc' },
    take,
    include: {
      slide: {
        select: { id: true, conversionStatus: true, deletedAt: true },
      },
    },
  });

  const summary = {
    scanned: failedJobs.length,
    eligible: 0,
    reclassified: 0,
    skipped: 0,
  };

  for (const job of failedJobs) {
    if (!job.slide || job.slide.deletedAt) {
      summary.skipped += 1;
      continue;
    }
    if (!isInvalidSourceConversionError(job.lastError)) {
      summary.skipped += 1;
      continue;
    }

    summary.eligible += 1;
    // eslint-disable-next-line no-await-in-loop
    await prisma.slide.updateMany({
      where: { id: job.slideId },
      data: { conversionStatus: 'unsupported' },
    });
    summary.reclassified += 1;
  }

  return summary;
}

module.exports = {
  RETRYABLE_PATTERNS,
  INVALID_SOURCE_PATTERNS,
  isRetryableConversionError,
  isInvalidSourceConversionError,
  retryRecoverableFailedConversions,
  reclassifyInvalidFailedConversions,
};
