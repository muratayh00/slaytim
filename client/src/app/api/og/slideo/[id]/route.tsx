import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { getFonts } from '../../_lib/font';
import { COLORS, OG_WIDTH, OG_HEIGHT, CACHE_HEADER, truncate } from '../../_lib/theme';
import { getApiBaseUrl } from '@/lib/api-origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_URL = getApiBaseUrl();

async function fetchSlideo(id: string) {
  if (!API_URL || !id) return null;
  try {
    const res = await fetch(`${API_URL}/slideo/${id}`, {
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
  const slideo = await fetchSlideo(params.id);
  const fonts = await getFonts();

  const thumbUrl = slideo?.slide?.id
    ? `${API_URL}/slides/${slideo.slide.id}/page-image/1`
    : null;

  const title = slideo ? truncate(slideo.title, 80) : 'Slideo Bulunamadı';
  const author = slideo?.user?.username ?? null;
  const pageCount: number = Array.isArray(slideo?.pageIndices)
    ? slideo.pageIndices.length
    : typeof slideo?.pageCount === 'number'
      ? slideo.pageCount
      : 0;
  const views: number = slideo?.viewsCount ?? 0;

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
        {/* Decorative blobs */}
        <div
          style={{
            position: 'absolute',
            top: -100,
            right: 240,
            width: 420,
            height: 420,
            background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -80,
            left: -60,
            width: 280,
            height: 280,
            background: 'radial-gradient(circle, rgba(67,56,202,0.1) 0%, transparent 70%)',
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
            zIndex: 1,
          }}
        >
          {/* Logo + Slideo badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: COLORS.primaryBg,
                border: `1px solid ${COLORS.primaryBorder}`,
                borderRadius: 32,
                padding: '8px 20px',
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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 32,
                padding: '8px 16px',
              }}
            >
              {/* Play icon */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(248,113,113,0.9)">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span style={{ fontSize: 15, color: 'rgba(248,113,113,0.9)', fontWeight: 600 }}>
                Slideo
              </span>
            </div>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: 52,
              fontWeight: 700,
              color: COLORS.text,
              lineHeight: 1.18,
              maxWidth: 660,
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
            }}
          >
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
                  borderLeft: author ? `1px solid ${COLORS.border}` : undefined,
                  paddingLeft: author ? 16 : 0,
                }}
              >
                {pageCount} sayfa
              </span>
            )}
            {views > 0 && (
              <span
                style={{
                  color: COLORS.dimmed,
                  fontSize: 18,
                  borderLeft: `1px solid ${COLORS.border}`,
                  paddingLeft: 16,
                }}
              >
                {views.toLocaleString('tr-TR')} izlenme
              </span>
            )}
          </div>

          {/* Domain */}
          <div
            style={{
              marginTop: 20,
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
                    'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(124,58,237,0.12) 100%)',
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
                    background: 'rgba(239,68,68,0.12)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: 28 }}>▶</span>
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
