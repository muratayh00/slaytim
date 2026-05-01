import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { getFonts } from '../../_lib/font';
import { COLORS, OG_WIDTH, OG_HEIGHT, CACHE_HEADER, fmt } from '../../_lib/theme';
import { getApiBaseUrl } from '@/lib/api-origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_URL = getApiBaseUrl();

async function fetchCategory(slug: string) {
  if (!API_URL || !slug) return null;
  try {
    const res = await fetch(`${API_URL}/categories/${slug}`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const category = await fetchCategory(params.slug);
  const fonts = getFonts();

  if (fonts.length === 0) {
    return new Response('Font unavailable', { status: 500 });
  }

  const name: string = category?.name ?? 'Kategori';
  const topicCount: number = category?._count?.topics ?? 0;
  const slideCount: number = category?._count?.slides ?? 0;

  // Pick an emoji based on common category name keywords
  function categoryEmoji(n: string): string {
    const lower = n.toLowerCase();
    if (lower.includes('teknoloji') || lower.includes('yazılım') || lower.includes('tech')) return '💻';
    if (lower.includes('iş') || lower.includes('business') || lower.includes('finans')) return '💼';
    if (lower.includes('sağlık') || lower.includes('tıp') || lower.includes('health')) return '🏥';
    if (lower.includes('eğitim') || lower.includes('okul') || lower.includes('bilim')) return '🎓';
    if (lower.includes('pazarlama') || lower.includes('marketing')) return '📈';
    if (lower.includes('tasarım') || lower.includes('design') || lower.includes('sanat')) return '🎨';
    if (lower.includes('spor') || lower.includes('fitness')) return '🏆';
    if (lower.includes('müzik') || lower.includes('sanat')) return '🎵';
    if (lower.includes('hukuk') || lower.includes('hukuku')) return '⚖️';
    return '📊';
  }

  const emoji = categoryEmoji(name);

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: OG_WIDTH,
          height: OG_HEIGHT,
          background: COLORS.bg,
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Large decorative gradient */}
        <div
          style={{
            position: 'absolute',
            top: -160,
            left: -120,
            width: 600,
            height: 600,
            background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 65%)',
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -80,
            right: -60,
            width: 380,
            height: 380,
            background: 'radial-gradient(circle, rgba(67,56,202,0.1) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            padding: '52px 80px 52px 80px',
            zIndex: 1,
          }}
        >
          {/* Logo badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: COLORS.primaryBg,
              border: `1px solid ${COLORS.primaryBorder}`,
              borderRadius: 32,
              padding: '8px 20px',
              width: 'fit-content',
              marginBottom: 40,
            }}
          >
            <div
              style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS.primary }}
            />
            <span
              style={{ fontSize: 18, color: COLORS.primaryLight, fontWeight: 700, letterSpacing: 2 }}
            >
              SLAYTIM
            </span>
          </div>

          {/* Emoji icon */}
          <div style={{ fontSize: 72, marginBottom: 28, lineHeight: 1 }}>{emoji}</div>

          {/* Category name */}
          <div
            style={{
              fontSize: 68,
              fontWeight: 700,
              color: COLORS.text,
              lineHeight: 1.1,
              maxWidth: 900,
            }}
          >
            {name}
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: 24,
              color: COLORS.muted,
              marginTop: 16,
              fontWeight: 400,
            }}
          >
            Sunumları keşfet
          </div>

          {/* Stats + domain */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 0,
              marginTop: 'auto',
            }}
          >
            {topicCount > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: COLORS.text }}>
                  {fmt(topicCount)}
                </span>
                <span style={{ fontSize: 15, color: COLORS.dimmed, marginTop: 2 }}>Konu</span>
              </div>
            )}
            {slideCount > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  paddingLeft: 28,
                  marginLeft: 28,
                  borderLeft: `1px solid ${COLORS.border}`,
                }}
              >
                <span style={{ fontSize: 28, fontWeight: 700, color: COLORS.text }}>
                  {fmt(slideCount)}
                </span>
                <span style={{ fontSize: 15, color: COLORS.dimmed, marginTop: 2 }}>Slayt</span>
              </div>
            )}

            <div
              style={{
                marginLeft: 'auto',
                color: COLORS.dimmed,
                fontSize: 18,
                letterSpacing: 0.5,
              }}
            >
              slaytim.com
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      fonts,
      headers: { 'Cache-Control': CACHE_HEADER },
    },
  );
}
