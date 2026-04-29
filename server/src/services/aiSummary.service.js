/**
 * AI summary / BLUF service — provider-agnostic.
 *
 * Given a slide id, downloads its converted PDF, extracts text via pdf-parse,
 * sends a tightly-scoped prompt to a configured LLM, and stores a 4-section
 * Turkish summary on Slide.aiSummary. Used by:
 *   - Conversion service (fire-and-forget after conversionStatus → 'done')
 *   - scripts/backfill-ai-summary.js (batch existing slides)
 *
 * Provider selection (in priority order):
 *   1. ANTHROPIC_API_KEY  → Claude 3.5 Haiku (best Turkish quality)
 *   2. OPENAI_API_KEY     → GPT-4o-mini (good fallback, cheap)
 *   3. AI_SUMMARY_DRY_RUN=true → deterministic stub (dev/CI, no key needed)
 *   4. Neither key present → system disabled, all calls return {status:'skipped'}
 *
 * Manual summaries: set Slide.aiSummary directly in DB — they are always
 * respected (returned as-is) unless the caller passes { force: true }.
 *
 * Cost guidance (Claude 3.5 Haiku, 04-2026 pricing):
 *   ~$0.0015 per slide. 10 k slides ≈ $15 to backfill.
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const pdfParse = require('../lib/pdf-parse');
const prisma = require('../lib/prisma');
const logger = require('../lib/logger');
const {
  resolveStorageReadUrl,
  extractStorageKeyFromUrl,
} = require('./storage.service');

// ── Config ───────────────────────────────────────────────────────────────────

const ENABLED = String(process.env.AI_SUMMARY_ENABLED || 'true').toLowerCase() !== 'false';
const DRY_RUN = String(process.env.AI_SUMMARY_DRY_RUN || 'false').toLowerCase() === 'true';

const ANTHROPIC_KEY = String(process.env.ANTHROPIC_API_KEY || '').trim();
const OPENAI_KEY    = String(process.env.OPENAI_API_KEY    || '').trim();

// Model overrides (sensible defaults chosen per-provider).
const ANTHROPIC_MODEL = process.env.AI_SUMMARY_MODEL || 'claude-3-5-haiku-latest';
const OPENAI_MODEL    = process.env.AI_SUMMARY_OPENAI_MODEL || 'gpt-4o-mini';

const MAX_INPUT_CHARS   = Math.max(2000, Number(process.env.AI_SUMMARY_MAX_INPUT_CHARS || 18_000));
const REQUEST_TIMEOUT_MS = Math.max(5_000, Number(process.env.AI_SUMMARY_TIMEOUT_MS   || 30_000));

const ANTHROPIC_API_VERSION = '2023-06-01';

// ── Prompt (shared across providers) ─────────────────────────────────────────

// Keep these short — they show up verbatim in the slide page UI.
const PROMPT_SYSTEM = `Sen Türkçe sunumları özetleyen bir asistansın. Sana verilen sunumun metnini analiz edip dört kısa bölüm üreteceksin. Dilin sade, doğrudan, profesyonel olsun. Pazarlamacı klişelerinden ("muhteşem", "çığır açan") kaçın. Her bölüm 1-2 cümle, "highlights" maddeleri 5-7 kelime.`;

const PROMPT_USER = (title, text) => `Aşağıda Slaytim platformunda paylaşılmış bir sunumun başlığı ve metin içeriği var. Bu sunumla ilgili dört bölümlü bir özet üret.

BAŞLIK: ${title}

İÇERİK:
${text}

Çıktı formatı: SADECE aşağıdaki JSON'u döndür, başka hiçbir metin ekleme.

{
  "what": "Bu sunum NE hakkında? 1-2 cümle.",
  "audience": "KİMLER İÇİN bu sunum faydalıdır? 1-2 cümle, somut roller/durumlar.",
  "highlights": ["Öne çıkan başlık 1", "Öne çıkan başlık 2", "Öne çıkan başlık 3"],
  "useCase": "Hangi DURUMDA / KULLANIM ALANINDA bu sunumdan yararlanılır? 1-2 cümle."
}`;

// ── Provider detection ────────────────────────────────────────────────────────

/**
 * Returns the active provider name or null if none is available.
 * @returns {'anthropic'|'openai'|'dry-run'|null}
 */
function detectProvider() {
  if (DRY_RUN)         return 'dry-run';
  if (ANTHROPIC_KEY)   return 'anthropic';
  if (OPENAI_KEY)      return 'openai';
  return null;
}

function isEnabled() {
  if (!ENABLED) return false;
  return detectProvider() !== null;
}

function getDisabledReason() {
  if (!ENABLED) return 'AI_SUMMARY_ENABLED=false';
  if (!detectProvider()) return 'No LLM API key found (set ANTHROPIC_API_KEY or OPENAI_API_KEY)';
  return null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function downloadPdfBuffer(pdfUrl) {
  if (!pdfUrl) return null;
  const storageKey = extractStorageKeyFromUrl(pdfUrl);

  // Local disk fast path: most installs serve PDFs from /uploads on the same box.
  if (storageKey) {
    const localPath = path.join(__dirname, '../..', 'uploads', storageKey);
    try {
      const stat = await fsp.stat(localPath);
      if (stat.isFile() && stat.size > 0) return fsp.readFile(localPath);
    } catch {
      // Fall through to remote read.
    }
  }

  // Remote (S3 / signed URL) fallback.
  const readUrl = await resolveStorageReadUrl(pdfUrl).catch(() => null);
  const url = readUrl || pdfUrl;
  if (!/^https?:/i.test(url)) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function extractPdfText(buffer) {
  if (!buffer || buffer.length === 0) return '';
  try {
    const parsed = await pdfParse(buffer);
    const text = String(parsed?.text || '').replace(/\s+/g, ' ').trim();
    return text.slice(0, MAX_INPUT_CHARS);
  } catch (err) {
    logger.warn('[ai-summary] pdf-parse failed', { error: err?.message || String(err) });
    return '';
  }
}

function syntheticDryRunSummary(title) {
  return {
    what: `Bu sunum "${title}" konusunu çeşitli açılardan ele alıyor.`,
    audience: 'Konuyla ilgili giriş seviyesinde bilgi edinmek isteyen okuyucular için.',
    highlights: [
      'Konunun temel kavramları',
      'Pratik örnekler ve uygulamalar',
      'Sık karşılaşılan hatalar',
    ],
    useCase: 'Eğitim materyali, ders notu veya kişisel referans olarak kullanılabilir.',
    language: 'tr',
    model: 'dry-run-stub',
    generatedAt: new Date().toISOString(),
  };
}

function safeParseJson(text) {
  if (!text || typeof text !== 'string') return null;
  // Most LLMs return clean JSON; handle ```json``` fences just in case.
  const stripped = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(stripped);
  } catch {
    // Last-resort: pull out the first {...} block.
    const match = stripped.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch {}
    }
    return null;
  }
}

function normalizeSummary(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  const what      = String(parsed.what      || '').trim().slice(0, 500);
  const audience  = String(parsed.audience  || '').trim().slice(0, 500);
  const useCase   = String(parsed.useCase   || '').trim().slice(0, 500);
  const highlights = Array.isArray(parsed.highlights)
    ? parsed.highlights
        .map((h) => String(h || '').trim().slice(0, 120))
        .filter(Boolean)
        .slice(0, 7)
    : [];
  if (!what || !audience || !useCase || highlights.length === 0) return null;
  return { what, audience, highlights, useCase };
}

// ── Provider implementations ──────────────────────────────────────────────────

/** Anthropic Claude (raw HTTP — avoids SDK dep). */
async function callAnthropic(title, text) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': ANTHROPIC_API_VERSION,
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 600,
        temperature: 0.3,
        system: PROMPT_SYSTEM,
        messages: [{ role: 'user', content: PROMPT_USER(title, text) }],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Anthropic API ${res.status}: ${body.slice(0, 200)}`);
    }
    const json = await res.json();
    const blocks = Array.isArray(json?.content) ? json.content : [];
    const raw = blocks
      .map((b) => (b?.type === 'text' ? String(b.text || '') : ''))
      .join('')
      .trim();
    return { raw, model: json?.model || ANTHROPIC_MODEL };
  } finally {
    clearTimeout(timer);
  }
}

/** OpenAI Chat Completions (raw HTTP — avoids SDK dep). */
async function callOpenAI(title, text) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        max_tokens: 600,
        temperature: 0.3,
        messages: [
          { role: 'system', content: PROMPT_SYSTEM },
          { role: 'user',   content: PROMPT_USER(title, text) },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`OpenAI API ${res.status}: ${body.slice(0, 200)}`);
    }
    const json = await res.json();
    const raw = String(json?.choices?.[0]?.message?.content || '').trim();
    return { raw, model: json?.model || OPENAI_MODEL };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Route to the right provider based on available keys.
 * @param {string} title
 * @param {string} text
 * @returns {Promise<{raw: string, model: string}>}
 */
async function callLLM(title, text) {
  const provider = detectProvider();
  if (provider === 'anthropic') return callAnthropic(title, text);
  if (provider === 'openai')    return callOpenAI(title, text);
  throw new Error('No LLM provider available');
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate an AI summary for a single slide.
 *
 * @param {number} slideId
 * @param {{ force?: boolean }} options
 *        - force: regenerate even if a summary already exists (including manual ones)
 * @returns {Promise<{ ok: boolean; status: string; reason?: string; summary?: object }>}
 */
async function generateSummaryForSlide(slideId, options = {}) {
  const id = Number(slideId);
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, status: 'failed', reason: 'invalid slideId' };
  }
  if (!isEnabled()) {
    return { ok: false, status: 'skipped', reason: getDisabledReason() };
  }

  const slide = await prisma.slide.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      pdfUrl: true,
      conversionStatus: true,
      isHidden: true,
      deletedAt: true,
      aiSummary: true,
    },
  });
  if (!slide)            return { ok: false, status: 'failed',  reason: 'slide not found' };
  if (slide.deletedAt)   return { ok: false, status: 'skipped', reason: 'slide deleted' };
  if (slide.conversionStatus !== 'done' || !slide.pdfUrl) {
    return { ok: false, status: 'skipped', reason: 'conversion not done' };
  }
  // Manual or previously-generated summaries are always respected unless --force.
  if (slide.aiSummary && !options.force) {
    return { ok: true, status: 'done', reason: 'already exists', summary: slide.aiSummary };
  }

  await prisma.slide.update({
    where: { id },
    data: { aiSummaryStatus: 'processing' },
  }).catch(() => {});

  // Dry-run path: skip PDF read + LLM call entirely.
  if (DRY_RUN) {
    const stub = syntheticDryRunSummary(slide.title);
    await prisma.slide.update({
      where: { id },
      data: {
        aiSummary: stub,
        aiSummaryStatus: 'done',
        aiSummaryGeneratedAt: new Date(),
      },
    });
    return { ok: true, status: 'done', reason: 'dry-run', summary: stub };
  }

  // Download PDF.
  let pdfBuffer = null;
  try {
    pdfBuffer = await downloadPdfBuffer(slide.pdfUrl);
  } catch (err) {
    logger.warn('[ai-summary] PDF download failed', { slideId: id, error: err?.message });
  }
  if (!pdfBuffer) {
    await prisma.slide.update({
      where: { id },
      data: { aiSummaryStatus: 'failed' },
    }).catch(() => {});
    return { ok: false, status: 'failed', reason: 'pdf download failed' };
  }

  // Extract text.
  const text = await extractPdfText(pdfBuffer);
  if (!text || text.length < 80) {
    await prisma.slide.update({
      where: { id },
      data: { aiSummaryStatus: 'skipped' },
    }).catch(() => {});
    return { ok: false, status: 'skipped', reason: 'insufficient text' };
  }

  // Call LLM (provider chosen automatically).
  let llmResult;
  const provider = detectProvider();
  try {
    llmResult = await callLLM(slide.title, text);
  } catch (err) {
    logger.error('[ai-summary] LLM call failed', {
      slideId: id,
      provider,
      error: err?.message || String(err),
    });
    await prisma.slide.update({
      where: { id },
      data: { aiSummaryStatus: 'failed' },
    }).catch(() => {});
    return { ok: false, status: 'failed', reason: err?.message || 'llm error' };
  }

  // Parse + validate output.
  const parsed     = safeParseJson(llmResult.raw);
  const normalized = normalizeSummary(parsed);
  if (!normalized) {
    logger.warn('[ai-summary] Could not parse LLM output', {
      slideId: id,
      provider,
      preview: String(llmResult.raw || '').slice(0, 200),
    });
    await prisma.slide.update({
      where: { id },
      data: { aiSummaryStatus: 'failed' },
    }).catch(() => {});
    return { ok: false, status: 'failed', reason: 'invalid llm output' };
  }

  const finalSummary = {
    ...normalized,
    language: 'tr',
    model: llmResult.model,
    provider,
    generatedAt: new Date().toISOString(),
  };

  await prisma.slide.update({
    where: { id },
    data: {
      aiSummary: finalSummary,
      aiSummaryStatus: 'done',
      aiSummaryGeneratedAt: new Date(),
    },
  });

  return { ok: true, status: 'done', summary: finalSummary };
}

/**
 * Fire-and-forget wrapper used by the conversion service. Logs but never
 * throws, so a failed summary never breaks the conversion pipeline.
 */
function dispatchSummaryGeneration(slideId) {
  if (!isEnabled()) return;
  setImmediate(() => {
    generateSummaryForSlide(slideId).catch((err) => {
      logger.warn('[ai-summary] dispatch crashed', {
        slideId,
        error: err?.message || String(err),
      });
    });
  });
}

module.exports = {
  generateSummaryForSlide,
  dispatchSummaryGeneration,
  isEnabled,
  getDisabledReason,
  detectProvider,
};
