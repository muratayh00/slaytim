/**
 * Font loader for next/og (ImageResponse / Satori).
 *
 * Format notes for this Satori version (bundled in next@14):
 *   wOF2  (WOFF2) → throws "Unsupported OpenType signature wOF2"  ❌
 *   wOFF  (WOFF1) → supported; Satori decompresses zlib tables    ✓
 *   TTF / OTF     → supported natively                             ✓
 *
 * We fetch WOFF1 from jsDelivr. The CDN URL is stable and versioned.
 * Module-level caching: fonts are fetched once per Node.js process
 * and reused for every subsequent request.
 *
 * If the CDN is unreachable the caller receives [] and should catch the
 * Satori "No fonts are loaded" error gracefully (return 500 / fallback).
 */

let fontBold: ArrayBuffer | null = null;
let fontRegular: ArrayBuffer | null = null;
let fontLoading: Promise<void> | null = null;

// WOFF1 — not WOFF2. Satori rejects WOFF2 with "Unsupported OpenType signature wOF2".
const FONT_BOLD_URL =
  'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.8/files/inter-latin-700-normal.woff';
const FONT_REGULAR_URL =
  'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.8/files/inter-latin-400-normal.woff';

async function _loadFonts(): Promise<void> {
  try {
    [fontBold, fontRegular] = await Promise.all([
      fetch(FONT_BOLD_URL, { cache: 'force-cache' }).then((r) => {
        if (!r.ok) throw new Error(`font fetch ${r.status}`);
        return r.arrayBuffer();
      }),
      fetch(FONT_REGULAR_URL, { cache: 'force-cache' }).then((r) => {
        if (!r.ok) throw new Error(`font fetch ${r.status}`);
        return r.arrayBuffer();
      }),
    ]);
  } catch {
    // Non-fatal — OG routes catch the downstream "No fonts" Satori error
    // and return a 500 so the rest of the app keeps running.
    fontBold = null;
    fontRegular = null;
  }
}

type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export async function getFonts(): Promise<
  { name: string; data: ArrayBuffer; weight: FontWeight; style: 'normal' }[]
> {
  if (!fontBold || !fontRegular) {
    if (!fontLoading) fontLoading = _loadFonts();
    await fontLoading;
  }

  const fonts: { name: string; data: ArrayBuffer; weight: FontWeight; style: 'normal' }[] = [];
  if (fontBold) fonts.push({ name: 'Inter', data: fontBold, weight: 700, style: 'normal' });
  if (fontRegular) fonts.push({ name: 'Inter', data: fontRegular, weight: 400, style: 'normal' });
  return fonts;
}
