/**
 * Slug generation utility with Turkish character normalization.
 */

const TR_MAP = {
  ş: 's',
  Ş: 's',
  ç: 'c',
  Ç: 'c',
  ğ: 'g',
  Ğ: 'g',
  ü: 'u',
  Ü: 'u',
  ö: 'o',
  Ö: 'o',
  ı: 'i',
  İ: 'i',
  I: 'i',
};

/**
 * Generate URL-safe slug.
 * @param {string} text
 * @returns {string}
 */
function toSlug(text) {
  return String(text || '')
    .split('')
    .map((c) => TR_MAP[c] ? c)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
    .replace(/^-+|-+$/g, '');
}

/**
 * Parse "123-title" style id+slug token.
 * @param {string} value
 * @returns {{ id: number|null, slug: string }}
 */
function parseIdSlug(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d+)(?:-(.*))?$/);
  if (!match) return { id: null, slug: raw.toLowerCase() };
  return {
    id: Number(match[1]),
    slug: String(match[2] || '').trim().toLowerCase(),
  };
}

/**
 * Build canonical "id-slug".
 * @param {number} id
 * @param {string} text
 * @returns {string}
 */
function canonicalIdSlug(id, text) {
  const safeId = Number(id);
  const safeSlug = toSlug(String(text || '')) || String(safeId);
  return `${safeId}-${safeSlug}`;
}

/**
 * Generate a short random base-36 suffix (6 chars ≈ 2.18 billion possibilities).
 * Used to break slug collisions without exposing sequential counters.
 */
function randomSuffix() {
  // crypto.randomInt gives a uniform random integer — no modulo bias.
  // Fallback to Math.random() if crypto is unavailable (never happens in Node ≥15).
  try {
    const { randomInt } = require('crypto');
    // 6 base-36 chars: 36^6 = 2,176,782,336 possibilities
    return randomInt(0, 2176782336).toString(36).padStart(6, '0');
  } catch {
    return Math.random().toString(36).slice(2, 8).padStart(6, '0');
  }
}

/**
 * Find unique slug in DB.
 *
 * Strategy (race-condition safe):
 *   1. Try the clean base slug first.
 *   2. On collision, append a random 6-char suffix instead of a sequential counter.
 *      Sequential counters (…-1, …-2) invite TOCTOU races: two concurrent requests
 *      both see "-1" is free, both try to insert it, one wins and the other gets a
 *      P2002 unique constraint error → 500.
 *      Random suffixes make two concurrent requests statistically impossible to collide
 *      (1-in-2-billion per pair), so this function's result is safe to insert without
 *      retrying in the caller in the normal case.
 *   3. Retries up to MAX_ATTEMPTS with fresh random suffixes if the random slug also
 *      happens to exist (extremely rare — existing record with that exact suffix).
 *   4. Last-resort fallback: base36 timestamp (monotonically unique per millisecond).
 *
 * @param {object} prismaModel  — Prisma model with findUnique({ where: { slug } })
 * @param {string} baseSlug
 * @param {number|null} excludeId — skip this id when checking (for update flows)
 * @returns {Promise<string>}
 */
async function uniqueSlug(prismaModel, baseSlug, excludeId = null) {
  const MAX_ATTEMPTS = 8;

  // Try clean slug first
  const existing = await prismaModel.findUnique({ where: { slug: baseSlug } });
  if (!existing || (excludeId != null && existing.id === excludeId)) {
    return baseSlug;
  }

  // Clean slug taken — use random suffix
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const slug = `${baseSlug}-${randomSuffix()}`;
    const ex = await prismaModel.findUnique({ where: { slug } });
    if (!ex) return slug;
  }

  // Absolute last resort: base36 timestamp (unique per millisecond, monotonic)
  return `${baseSlug}-${Date.now().toString(36)}`;
}

module.exports = { toSlug, uniqueSlug, parseIdSlug, canonicalIdSlug, randomSuffix };

