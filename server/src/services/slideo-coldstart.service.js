/**
 * Cold-start distribution service for Slideo feed.
 *
 * Every new slideo enters a cold-start window:
 *   - coldStartBoost = 50  (lifts it into feed rotation immediately)
 *   - coldStartImpressions = 0
 *   - coldStartActive = true
 *
 * On each real view (non-deduped) coldStartImpressions is incremented.
 * When it reaches IMPRESSION_THRESHOLD (200) the slideo is evaluated:
 *
 *   completionRate = SlideoCompletion.count / viewsCount
 *
 *   >= 0.40  → PROMOTED  boost = 20  (stays discoverable long-term)
 *   0.20–0.39 → NEUTRAL  boost = 5   (fades naturally with time decay)
 *   <  0.20  → KILLED    boost = 0   (disappears from hot feed)
 *
 * All evaluation runs asynchronously via setImmediate so it never blocks
 * the view endpoint.
 */

const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

const IMPRESSION_THRESHOLD  = 200;   // views before graduation
const HIGH_COMPLETION_RATE  = 0.40;
const LOW_COMPLETION_RATE   = 0.20;
const BOOST_PROMOTED        = 20;
const BOOST_NEUTRAL         = 5;
const BOOST_KILLED          = 0;

/**
 * Increment cold-start impression counter for a single slideo.
 * No-ops silently if the slideo has already graduated (coldStartActive = false).
 * Fires evaluateColdStart asynchronously when the threshold is crossed.
 *
 * MUST be called via setImmediate so it never blocks the HTTP response.
 */
async function incrementColdStartImpression(slideoId) {
  try {
    // Atomic increment — only touches active items
    const result = await prisma.slideo.updateMany({
      where: { id: slideoId, coldStartActive: true },
      data:  { coldStartImpressions: { increment: 1 } },
    });

    if (result.count === 0) return; // already graduated — fast exit

    // Check if we just crossed the threshold
    const current = await prisma.slideo.findUnique({
      where:  { id: slideoId },
      select: { coldStartImpressions: true },
    });

    if (current && current.coldStartImpressions >= IMPRESSION_THRESHOLD) {
      // Non-blocking evaluation in next event loop tick
      setImmediate(() => evaluateColdStart(slideoId).catch(() => {}));
    }
  } catch (err) {
    logger.warn('[cold-start] impression increment failed', {
      slideoId,
      error: err.message,
    });
  }
}

/**
 * Evaluate a slideo that has reached the impression threshold.
 * Assigns final boost and marks it as graduated (coldStartActive = false).
 */
async function evaluateColdStart(slideoId) {
  try {
    const slideo = await prisma.slideo.findUnique({
      where:  { id: slideoId },
      select: {
        id: true,
        coldStartActive: true,
        viewsCount: true,
        _count: { select: { completions: true } },
      },
    });

    if (!slideo)                  return;
    if (!slideo.coldStartActive)  return; // another worker already evaluated

    const views       = Math.max(slideo.viewsCount, 1); // avoid /0
    const completions = slideo._count.completions || 0;
    const rate        = completions / views;

    let newBoost;
    let outcome;

    if (rate >= HIGH_COMPLETION_RATE) {
      newBoost = BOOST_PROMOTED;
      outcome  = 'promoted';
    } else if (rate < LOW_COMPLETION_RATE) {
      newBoost = BOOST_KILLED;
      outcome  = 'killed';
    } else {
      newBoost = BOOST_NEUTRAL;
      outcome  = 'neutral';
    }

    await prisma.slideo.update({
      where: { id: slideoId },
      data:  { coldStartBoost: newBoost, coldStartActive: false },
    });

    logger.info('[cold-start] graduated', {
      slideoId,
      views,
      completions,
      completionRate: Number(rate.toFixed(3)),
      outcome,
      newBoost,
    });
  } catch (err) {
    logger.warn('[cold-start] evaluation failed', {
      slideoId,
      error: err.message,
    });
  }
}

module.exports = {
  incrementColdStartImpression,
  evaluateColdStart,
  // Exposed for tests / admin tooling
  IMPRESSION_THRESHOLD,
  HIGH_COMPLETION_RATE,
  LOW_COMPLETION_RATE,
  BOOST_PROMOTED,
  BOOST_NEUTRAL,
  BOOST_KILLED,
};
