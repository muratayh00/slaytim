/**
 * Inter font loader for next/og (ImageResponse / Satori).
 *
 * Module-level caching keeps the first CDN round-trip per process startup.
 * Subsequent requests within the same process reuse the cached buffer.
 * Falls back gracefully (no font array) on network failure so the route
 * doesn't crash — Satori will render with a built-in fallback glyph set.
 */

let fontBold: ArrayBuffer | null = null;
let fontRegular: ArrayBuffer | null = null;
let fontLoading: Promise<void> | null = null;

const FONT_BOLD_URL =
  'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.8/files/inter-latin-700-normal.woff2';
const FONT_REGULAR_URL =
  'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.8/files/inter-latin-400-normal.woff2';

async function _loadFonts(): Promise<void> {
  try {
    [fontBold, fontRegular] = await Promise.all([
      fetch(FONT_BOLD_URL, { cache: 'force-cache' }).then((r) => r.arrayBuffer()),
      fetch(FONT_REGULAR_URL, { cache: 'force-cache' }).then((r) => r.arrayBuffer()),
    ]);
  } catch {
    // Non-fatal — OG route continues without custom font
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
