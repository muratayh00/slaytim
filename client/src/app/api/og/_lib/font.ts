/**
 * Font loader for next/og (ImageResponse / Satori).
 *
 * Strategy: read Inter variable TTF from public/fonts/Inter.ttf using
 * fs.readFileSync.  The file is bundled in the repo → zero CDN or
 * network dependency at build time OR at runtime.
 *
 * Why public/fonts/?
 *   - process.cwd() in a Next.js nodejs-runtime route handler always
 *     resolves to the project root (where `npm run build` / `pm2 start`
 *     is invoked), so `public/` is always reachable.
 *   - No webpack asset-tracing tricks needed.
 *   - The file doubles as a static HTTP asset at /fonts/Inter.ttf,
 *     which is fine for an open-source font.
 *
 * Format notes for Satori (bundled in next@14):
 *   WOFF2 → "Unsupported OpenType signature wOF2"  ❌
 *   WOFF1 → accepted by fontkit but skipped here   ⚠️
 *   TTF / OTF variable font → supported natively   ✓  ← we use this
 *
 * Inter[opsz,wght].ttf is a variable font that covers weight 100–900
 * in one file.  Registering it at both 400 and 700 lets Satori pick
 * the correct instance for regular and bold text.
 *
 * If the file cannot be read, getFonts() returns [].
 * Callers MUST check for an empty array and return a plain 500 Response
 * instead of calling ImageResponse (which would throw "No fonts loaded").
 */

import fs from 'fs';
import path from 'path';

type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export type FontDescriptor = {
  name: string;
  data: ArrayBuffer;
  weight: FontWeight;
  style: 'normal';
};

let _cache: FontDescriptor[] | null = null;

function loadFontsSync(): FontDescriptor[] {
  try {
    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Inter.ttf');
    const buf = fs.readFileSync(fontPath);
    // Convert Node Buffer → ArrayBuffer (zero-copy slice)
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    return [
      { name: 'Inter', data: ab, weight: 400, style: 'normal' },
      { name: 'Inter', data: ab, weight: 700, style: 'normal' },
    ];
  } catch {
    // Font file missing or unreadable — caller must NOT invoke ImageResponse.
    return [];
  }
}

/**
 * Returns font descriptors for ImageResponse.  Synchronous after the
 * first call (module-level cache).  Compatible with `await getFonts()`
 * at call sites — awaiting a non-Promise just returns the value.
 *
 * Returns [] if the font file cannot be read.
 */
export function getFonts(): FontDescriptor[] {
  if (_cache === null) {
    _cache = loadFontsSync();
  }
  return _cache;
}
