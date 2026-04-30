/** Shared design tokens for OG image templates. */

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
export const OG_CACHE_SECONDS = 3600; // 1 hour

export const COLORS = {
  bg: '#09090b',          // zinc-950
  card: '#18181b',        // zinc-900
  border: 'rgba(255,255,255,0.08)',
  text: '#f4f4f5',        // zinc-100
  muted: '#a1a1aa',       // zinc-400
  dimmed: '#71717a',      // zinc-500
  primary: '#7c3aed',     // violet-600
  primaryLight: '#a78bfa', // violet-400
  primaryBg: 'rgba(124,58,237,0.15)',
  primaryBorder: 'rgba(124,58,237,0.3)',
};

export const CACHE_HEADER = `public, max-age=${OG_CACHE_SECONDS}, stale-while-revalidate=${OG_CACHE_SECONDS}, s-maxage=${OG_CACHE_SECONDS}`;

/** Truncate text to maxLen chars, appending "…" if cut. */
export function truncate(str: string | null | undefined, maxLen: number): string {
  const s = (str || '').trim();
  return s.length <= maxLen ? s : `${s.slice(0, maxLen - 1)}…`;
}

/** Format a number: 1234 → "1.234" etc. */
export function fmt(n: number | string | undefined): string {
  return Number(n || 0).toLocaleString('tr-TR');
}
