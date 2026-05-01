/**
 * Font stub for next/og (ImageResponse / Satori).
 *
 * Satori's font parser accepts TTF/OTF binary only. WOFF2 ("wOF2" magic
 * bytes) throws "Unsupported OpenType signature wOF2" at parse time —
 * this blows up static-generation routes at `npm run build`.
 *
 * Returning an empty array lets Satori fall back to its built-in Noto Sans
 * which has solid Latin-Extended coverage (Turkish: ş ğ ü ı ö ç) with no
 * network round-trip and no build-time dependency.
 */

type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export async function getFonts(): Promise<
  { name: string; data: ArrayBuffer; weight: FontWeight; style: 'normal' }[]
> {
  return [];
}
