/**
 * AI summary / BLUF service.
 *
 * Given a slide id, downloads its converted PDF, extracts text via pdf-parse,
 * sends a tightly-scoped prompt to Anthropic Claude, and stores a 4-section
 * Turkish summary on Slide.aiSummary. Used by:
 *   - Conversion service (fire-and-forget after conversionStatus → 'done')
 *   - scripts/backfill-ai-summary.js (batch existing slides)
 *
 * Provider abstraction: we currently only ship the Anthropic implementation
 * because the rest of the platform is Turkish-first and Claude Haiku gives
 * the best price/quality on Turkish text. A `_dryRun` mode (env
 * AI_SUMMARY_DRY_RUN=true) returns a deterministic stub so dev/CI works
 * without an API key — and the slide page still renders the section.
 *
 * Cost: ~$0.0015 per slide at the current Haiku pricing (5k input + 300
 * output tokens). 10k slides ≈ $15 total to backfill.
 *
 * Failure modes: every error path writes aiSummaryStatus='failed' (or
 * 'skipped' for non-actionable inputs like empty PDFs) so the conversion
 * pipeline never retries silently and the admin UI can surface state.
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

const ENABLED = String(process.env.AI_SUMMARY_ENABLED || 'true').toLowerCase() !== 'false';
const DRY_RUN = String(process.env.AI_SUMMARY_DRY_RUN || 'false').toLowerCase() === 'true';
const API_KEY = String(process.env.ANTHROPIC_API_KEY || '').trim();
const MODEL = process.env.AI_SUMMARY_MODEL || 'claude-3-5-haiku-latest';
const MAX_INPUT_CHARS = Math.max(2000, Number(process.env.AI_SUMMARY_MAX_INPUT_CHARS || 18000));
const REQUEST_TIMEOUT_MS = Math.max(5000, Number(process.env.AI_SUMMARY_TIMEOUT_MS || 30_000));
const ANTHROPIC_VERSION = '2023-06-01';

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

// ── Helpers ─────────────────────────────────────────────────────────────────

function isEnabled() {
  return ENABLED && (DRY_RUN || Boolean(API_KEY));
}

function getDisabledReason() {
  if (!ENABLED) return 'AI_SUMMARY_ENABLED=false';
  if (!DRY_RUN && !API_KEY) return 'ANTHROPIC_API_KEY missing';
  return null;
}

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
  // Claude usually returns clean JSON; handle ```json``` fences just in case.
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
  const what = String(parsed.what || '').trim().slice(0, 500);
  const audience = String(parsed.audience || '').trim().slice(0, 500);
  const useCase = String(parsed.useCase || '').trim().slice(0, 500);
  const highlights = Array.isArray(parsed.highlights)
    ? parsed.highlights
        .map((h) => String(h || '').trim().slice(0, 120))
        .filter(Boolean)
        .slice(0, 7)
    : [];
  if (!what || !audience || !useCase || highlights.length === 0) return null;
  return { what, audience, highlights, useCase };
}

async function callAnthropic(title, text) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
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
    // Concatenate any text blocks Claude returned. Usually 1 block.
    const blocks = Array.isArray(json?.content) ? json.content : [];
    const raw = blocks
      .map((b) => (b?.type === 'text' ? String(b.text || '') : ''))
      .join('')
      .trim();
    return { raw, model: json?.model || MODEL };
  } finally {
    clearTimeout(timer);
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate an AI summary for a single slide.
 * @param {number} slideId
 * @param {{ force?: boolean }} options
 *        - force: regenerate even if a summary already exists
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
  if (!slide) return { ok: false, status: 'failed', reason: 'slide not found' };
  if (slide.deletedAt) return { ok: false, status: 'skipped', reason: 'slide deleted' };
  if (slide.conversionStatus !== 'done' || !slide.pdfUrl) {
    return { ok: false, status: 'skipped', reason: 'conversion not done' };
  }
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

  const text = await extractPdfText(pdfBuffer);
  if (!text || text.length < 80) {
    await prisma.slide.update({
      where: { id },
      data: { aiSummaryStatus: 'skipped' },
    }).catch(() => {});
    return { ok: false, status: 'skipped', reason: 'insufficient text' };
  }

  let llmResult;
  try {
    llmResult = await callAnthropic(slide.title, text);
  } catch (err) {
    logger.error('[ai-summary] Anthropic call failed', {
      slideId: id,
      error: err?.message || String(err),
    });
    await prisma.slide.update({
      where: { id },
      data: { aiSummaryStatus: 'failed' },
    }).catch(() => {});
    return { ok: false, status: 'failed', reason: err?.message || 'llm error' };
  }

  const parsed = safeParseJson(llmResult.raw);
  const normalized = normalizeSummary(parsed);
  if (!normalized) {
    logger.warn('[ai-summary] Could not parse LLM output', {
      slideId: id,
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
 * Fire-and-forget wrapper used by the conversion service. Logs but never throws,
 * so a failed summary never breaks the conversion pipeline.
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
};
