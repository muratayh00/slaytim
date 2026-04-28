/**
 * Backfill AI summaries for existing slides that are converted but missing
 * a summary. Safe to interrupt — every slide is committed in its own tx.
 *
 * Usage:
 *   cd server
 *   node scripts/backfill-ai-summary.js --dry-run --limit=10
 *   node scripts/backfill-ai-summary.js --batch=20 --concurrency=2
 *   node scripts/backfill-ai-summary.js --force --slide=123     # single slide
 *
 * Flags:
 *   --dry-run         do not call the LLM; report which slides would be processed
 *   --limit=<n>       hard cap on slides to process this run (default 50)
 *   --batch=<n>       (alias) same as --limit
 *   --concurrency=<n> parallel calls (default 2; Anthropic Haiku tolerates 5)
 *   --force           regenerate even if a summary already exists
 *   --slide=<id>      process exactly one slide id
 *
 * Cost guidance (Claude 3.5 Haiku, 04-2026 pricing):
 *   ~$0.0015 per slide. 1000 slides ≈ $1.50. Run during off-hours.
 */

const { PrismaClient } = require('@prisma/client');
const {
  generateSummaryForSlide,
  isEnabled,
  getDisabledReason,
} = require('../src/services/aiSummary.service');

const prisma = new PrismaClient();

function parseArgs(argv) {
  const args = { dryRun: false, limit: 50, concurrency: 2, force: false, slide: null };
  for (const a of argv.slice(2)) {
    if (a === '--dry-run' || a === '--dry') args.dryRun = true;
    else if (a === '--force') args.force = true;
    else if (a.startsWith('--limit=')) args.limit = Math.max(1, Number(a.split('=')[1] || 50));
    else if (a.startsWith('--batch=')) args.limit = Math.max(1, Number(a.split('=')[1] || 50));
    else if (a.startsWith('--concurrency=')) args.concurrency = Math.max(1, Math.min(8, Number(a.split('=')[1] || 2)));
    else if (a.startsWith('--slide=')) args.slide = Number(a.split('=')[1]);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.dryRun && !isEnabled()) {
    console.error(`AI summary disabled: ${getDisabledReason()}`);
    console.error('Run with --dry-run to preview, or set ANTHROPIC_API_KEY.');
    process.exitCode = 1;
    return;
  }

  // Build the candidate list.
  let candidates;
  if (args.slide) {
    const s = await prisma.slide.findUnique({
      where: { id: Number(args.slide) },
      select: { id: true, title: true, conversionStatus: true, aiSummary: true },
    });
    candidates = s ? [s] : [];
  } else {
    candidates = await prisma.slide.findMany({
      where: {
        conversionStatus: 'done',
        pdfUrl: { not: null },
        isHidden: false,
        deletedAt: null,
        ...(args.force ? {} : { aiSummary: null }),
      },
      select: { id: true, title: true, conversionStatus: true, aiSummary: true },
      orderBy: { id: 'asc' },
      take: args.limit,
    });
  }

  console.log(`📦 Backfill: ${candidates.length} slide${candidates.length === 1 ? '' : 's'} to process`);
  if (args.dryRun) {
    for (const s of candidates) {
      console.log(`  [dry] #${s.id} "${s.title.slice(0, 60)}"`);
    }
    console.log('Done (dry-run). Re-run without --dry-run to apply.');
    return;
  }

  // Simple concurrency pool.
  let cursor = 0;
  let ok = 0;
  let skipped = 0;
  let failed = 0;

  async function worker() {
    while (cursor < candidates.length) {
      const idx = cursor++;
      const slide = candidates[idx];
      const startedAt = Date.now();
      try {
        const result = await generateSummaryForSlide(slide.id, { force: args.force });
        const ms = Date.now() - startedAt;
        if (result.ok) {
          ok += 1;
          console.log(`  ✓ #${slide.id} (${ms}ms) ${result.status}`);
        } else if (result.status === 'skipped') {
          skipped += 1;
          console.log(`  ⊘ #${slide.id} skipped: ${result.reason}`);
        } else {
          failed += 1;
          console.log(`  ✗ #${slide.id} failed: ${result.reason}`);
        }
      } catch (err) {
        failed += 1;
        console.log(`  ✗ #${slide.id} crashed: ${err?.message || err}`);
      }
    }
  }

  const workers = Array.from({ length: args.concurrency }, () => worker());
  await Promise.all(workers);

  console.log('');
  console.log(`✅ Done. ok=${ok} skipped=${skipped} failed=${failed} total=${candidates.length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
