import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://slaytim.com';

// Private paths that must never be indexed (kept in one place so the rules below
// stay in sync between the wildcard rule and any per-bot overrides).
const PRIVATE_PATHS = [
  '/admin',
  '/api/',
  '/embed/',
  '/reset-password/',
  '/forgot-password',
  '/verify-email/',
  '/magic/',
  '/settings',
  '/search',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // ── Default: every crawler ───────────────────────────────────────────────
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      // ── Search engines (explicit allow so they get fresh budget) ─────────────
      { userAgent: 'Googlebot', allow: '/', disallow: PRIVATE_PATHS },
      { userAgent: 'Googlebot-Image', allow: '/', disallow: PRIVATE_PATHS },
      { userAgent: 'Bingbot', allow: '/', disallow: PRIVATE_PATHS },
      { userAgent: 'YandexBot', allow: '/', disallow: PRIVATE_PATHS },
      { userAgent: 'DuckDuckBot', allow: '/', disallow: PRIVATE_PATHS },
      // ── AI assistants (allow so Slaytim can be cited in answers) ─────────────
      // If you ever want to opt out of LLM training, switch any of these to
      // disallow: ['/']. Indexing for AI Overviews / Perplexity citation is
      // a separate concern handled by Google-Extended below.
      { userAgent: 'GPTBot', allow: '/', disallow: PRIVATE_PATHS },
      { userAgent: 'OAI-SearchBot', allow: '/', disallow: PRIVATE_PATHS },
      { userAgent: 'ChatGPT-User', allow: '/', disallow: PRIVATE_PATHS },
      { userAgent: 'PerplexityBot', allow: '/', disallow: PRIVATE_PATHS },
      { userAgent: 'Perplexity-User', allow: '/', disallow: PRIVATE_PATHS },
      { userAgent: 'ClaudeBot', allow: '/', disallow: PRIVATE_PATHS },
      { userAgent: 'Claude-Web', allow: '/', disallow: PRIVATE_PATHS },
      { userAgent: 'anthropic-ai', allow: '/', disallow: PRIVATE_PATHS },
      { userAgent: 'CCBot', allow: '/', disallow: PRIVATE_PATHS },
      // Google-Extended controls Bard/Gemini/Vertex training — explicit allow
      // means our public content can be summarized by Google AI products.
      { userAgent: 'Google-Extended', allow: '/', disallow: PRIVATE_PATHS },
      // ── Aggressive scrapers (block to protect crawl budget) ──────────────────
      { userAgent: 'AhrefsBot', disallow: ['/'] },
      { userAgent: 'SemrushBot', disallow: ['/'] },
      { userAgent: 'MJ12bot', disallow: ['/'] },
      { userAgent: 'DotBot', disallow: ['/'] },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL.replace(/^https?:\/\//, ''),
  };
}
