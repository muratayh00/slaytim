import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { getFonts } from '../../_lib/font';
import { COLORS, OG_WIDTH, OG_HEIGHT, CACHE_HEADER, truncate } from '../../_lib/theme';
import { getApiBaseUrl } from '@/lib/api-origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_URL = getApiBaseUrl();

async function fetchTopic(id: string) {
  if (!API_URL || !id) return null;
  try {
    const res = await fetch(`${API_URL}/topics/${id}`, {
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
  const topic = await fetchTopic(params.id);
  const fonts = await getFonts();

  const title = topic ? truncate(topic.title, 80) : 'Konu Bulunamadı';
  const category = topic?.category?.name ?? null;
  const author = topic?.user?.username ?? null;
  const slideCount: number = topic?._count?.slides ?? 0;
  const description = topic?.description ? truncate(topic.description, 120) : null;

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
            top: -140,
            left: -100,
            width: 520,
            height: 520,
            background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -60,
            right: -60,
            width: 300,
            height: 300,
            background: 'radial-gradient(circle, rgba(67,56,202,0.1) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* Full-width content (no thumbnail panel for topic) */}
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
              marginBottom: 36,
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

          {/* Category label */}
          {category && (
            <div
              style={{
                display: 'flex',
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  background: 'rgba(124,58,237,0.18)',
                  border: '1px solid rgba(124,58,237,0.25)',
                  color: COLORS.primaryLight,
                  borderRadius: 10,
                  padding: '6px 16px',
                  fontSize: 18,
                  fontWeight: 600,
                }}
              >
                {category}
              </div>
            </div>
          )}

          {/* Title */}
          <div
            style={{
              fontSize: 60,
              fontWeight: 700,
              color: COLORS.text,
              lineHeight: 1.15,
              maxWidth: 1040,
              flex: 1,
              display: 'flex',
              alignItems: 'flex-start',
            }}
          >
            {title}
          </div>

          {/* Description snippet */}
          {description && (
            <div
              style={{
                fontSize: 22,
                color: COLORS.muted,
                lineHeight: 1.5,
                maxWidth: 900,
                marginTop: 20,
              }}
            >
              {description}
            </div>
          )}

          {/* Meta row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              marginTop: 28,
            }}
          >
            {author && (
              <span style={{ color: COLORS.muted, fontSize: 20, fontWeight: 400 }}>
                @{author}
              </span>
            )}
            {slideCount > 0 && (
              <span
                style={{
                  color: COLORS.dimmed,
                  fontSize: 18,
                  borderLeft: author ? `1px solid ${COLORS.border}` : undefined,
                  paddingLeft: author ? 20 : 0,
                }}
              >
                {slideCount} slayt
              </span>
            )}
            <span
              style={{
                color: COLORS.dimmed,
                fontSize: 18,
                borderLeft: `1px solid ${COLORS.border}`,
                paddingLeft: 20,
                marginLeft: 'auto',
              }}
            >
              slaytim.com
            </span>
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
