import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { getFonts } from '../../_lib/font';
import { COLORS, OG_WIDTH, OG_HEIGHT, CACHE_HEADER, truncate } from '../../_lib/theme';
import { getApiBaseUrl } from '@/lib/api-origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_URL = getApiBaseUrl();

async function fetchSlide(id: string) {
  if (!API_URL || !id) return null;
  try {
    const res = await fetch(`${API_URL}/slides/${id}`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const slide = await fetchSlide(params.id);
  const fonts = getFonts();

  if (fonts.length === 0) {
    return new Response('Font unavailable', { status: 500 });
  }

  // Thumbnail: use the backend page-image proxy — avoids signed R2 URL issues
  const thumbUrl = slide
    ? `${API_URL}/slides/${slide.id}/page-image/1`
    : null;

  const title = slide ? truncate(slide.title, 80) : 'Slayt Bulunamadı';
  const category = slide?.topic?.category?.name ?? slide?.topic?.categoryName ?? null;
  const author = slide?.user?.username ?? null;
  const pageCount: number = typeof slide?.pageCount === 'number'
    ? slide.pageCount
    : (slide?._count?.pages ?? 0);

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
        {/* Decorative blob */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            left: -80,
            width: 480,
            height: 480,
            background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -100,
            right: 280,
            width: 300,
            height: 300,
            background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* Left content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            padding: '52px 48px 48px 60px',
            gap: 0,
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
              marginBottom: 28,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: COLORS.primary,
              }}
            />
            <span
              style={{ fontSize: 18, color: COLORS.primaryLight, fontWeight: 700, letterSpacing: 2 }}
            >
              SLAYTIM
            </span>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: 54,
              fontWeight: 700,
              color: COLORS.text,
              lineHeight: 1.18,
              maxWidth: 680,
              flex: 1,
              display: 'flex',
              alignItems: 'flex-start',
            }}
          >
            {title}
          </div>

          {/* Meta row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginTop: 28,
              flexWrap: 'wrap',
            }}
          >
            {category && (
              <div
                style={{
                  background: 'rgba(124,58,237,0.18)',
                  border: '1px solid rgba(124,58,237,0.25)',
                  color: COLORS.primaryLight,
                  borderRadius: 10,
                  padding: '6px 16px',
                  fontSize: 20,
                  fontWeight: 600,
                }}
              >
                {category}
              </div>
            )}
            {author && (
              <span style={{ color: COLORS.muted, fontSize: 20, fontWeight: 400 }}>
                @{author}
              </span>
            )}
            {pageCount > 0 && (
              <span
                style={{
                  color: COLORS.dimmed,
                  fontSize: 18,
                  borderLeft: `1px solid ${COLORS.border}`,
                  paddingLeft: 16,
                }}
              >
                {pageCount} sayfa
              </span>
            )}
          </div>

          {/* Domain */}
          <div
            style={{
              marginTop: 24,
              color: COLORS.dimmed,
              fontSize: 18,
              letterSpacing: 0.5,
            }}
          >
            slaytim.com
          </div>
        </div>

        {/* Right: thumbnail */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '44px 56px 44px 0',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 330,
              height: 248,
              borderRadius: 20,
              overflow: 'hidden',
              border: `1px solid ${COLORS.border}`,
              background: COLORS.card,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {thumbUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={thumbUrl}
                width={330}
                height={248}
                alt=""
                style={{ objectFit: 'cover', width: '100%', height: '100%' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background:
                    'linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(67,56,202,0.1) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: COLORS.primaryBg,
                    border: `1px solid ${COLORS.primaryBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: 28, color: COLORS.primaryLight }}>📊</span>
                </div>
              </div>
            )}
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
