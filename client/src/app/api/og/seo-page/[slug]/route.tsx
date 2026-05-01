import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { getFonts } from '../../_lib/font';
import { COLORS, OG_WIDTH, OG_HEIGHT, CACHE_HEADER } from '../../_lib/theme';
import { getSeoPageConfig, SEO_PAGE_SLUGS } from '@/lib/programmaticSeoPages';

export const runtime = 'nodejs';
// Config is static — cache aggressively, revalidate on deploy only.
export const dynamic = 'force-static';
export const revalidate = 86400; // 24 h

export function generateStaticParams() {
  return SEO_PAGE_SLUGS.map((slug) => ({ slug }));
}

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const cfg = getSeoPageConfig(params.slug);
  const fonts = await getFonts();

  const title = cfg?.h1 ?? 'Sunumlar';
  // Show first 4 popular tags as pills
  const tags = (cfg?.popularTags ?? []).slice(0, 4);

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
            bottom: -100,
            right: -60,
            width: 400,
            height: 400,
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
          {/* Slaytim + Sunumlar breadcrumb badge row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
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
                style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS.primary }}
              />
              <span
                style={{
                  fontSize: 17,
                  color: COLORS.primaryLight,
                  fontWeight: 700,
                  letterSpacing: 2,
                }}
              >
                SLAYTIM
              </span>
            </div>
            <span style={{ color: COLORS.dimmed, fontSize: 18 }}>/</span>
            <span style={{ color: COLORS.muted, fontSize: 17, fontWeight: 500 }}>Sunumlar</span>
          </div>

          {/* Main title */}
          <div
            style={{
              fontSize: 68,
              fontWeight: 700,
              color: COLORS.text,
              lineHeight: 1.1,
              maxWidth: 980,
              flex: 1,
              display: 'flex',
              alignItems: 'flex-start',
            }}
          >
            {title}
          </div>

          {/* Tag pills */}
          {tags.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 32 }}>
              {tags.map((tag) => (
                <div
                  key={tag}
                  style={{
                    background: 'rgba(124,58,237,0.15)',
                    border: '1px solid rgba(124,58,237,0.28)',
                    color: COLORS.primaryLight,
                    borderRadius: 32,
                    padding: '7px 18px',
                    fontSize: 17,
                    fontWeight: 600,
                  }}
                >
                  {tag}
                </div>
              ))}
            </div>
          )}

          {/* Domain */}
          <div
            style={{
              marginTop: 28,
              color: COLORS.dimmed,
              fontSize: 17,
              letterSpacing: 0.5,
            }}
          >
            {`slaytim.com/sunumlar/${params.slug}`}
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
