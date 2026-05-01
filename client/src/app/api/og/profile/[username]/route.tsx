import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { getFonts } from '../../_lib/font';
import { COLORS, OG_WIDTH, OG_HEIGHT, CACHE_HEADER, truncate, fmt } from '../../_lib/theme';
import { getApiBaseUrl } from '@/lib/api-origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_URL = getApiBaseUrl();

async function fetchProfile(username: string) {
  if (!API_URL || !username) return null;
  try {
    const res = await fetch(`${API_URL}/users/${username}`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function GET(_req: NextRequest, { params }: { params: { username: string } }) {
  const profile = await fetchProfile(params.username);
  const fonts = getFonts();

  if (fonts.length === 0) {
    return new Response('Font unavailable', { status: 500 });
  }

  const username = profile?.username ?? params.username ?? 'Kullanıcı';
  const bio = profile?.bio ? truncate(profile.bio, 110) : null;
  const topicCount: number = profile?._count?.topics ?? 0;
  const slideCount: number = profile?._count?.slides ?? 0;
  const slideoCount: number = profile?._count?.slideos ?? 0;
  const followerCount: number = profile?._count?.followers ?? 0;

  // Avatar: use proxy only for absolute URLs (R2/CDN), not relative paths
  const rawAvatar: string | null = profile?.avatarUrl ?? null;
  const avatarUrl = rawAvatar?.startsWith('http') ? rawAvatar : null;

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
            top: -120,
            right: -80,
            width: 480,
            height: 480,
            background: 'radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -80,
            left: 200,
            width: 320,
            height: 320,
            background: 'radial-gradient(circle, rgba(67,56,202,0.08) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* Main content */}
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

          {/* Avatar + username row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginBottom: 24 }}>
            {/* Avatar circle */}
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: '50%',
                overflow: 'hidden',
                border: `2px solid ${COLORS.primaryBorder}`,
                background: COLORS.card,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={avatarUrl}
                  width={88}
                  height={88}
                  alt=""
                  style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                />
              ) : (
                <span style={{ fontSize: 36, color: COLORS.primaryLight }}>
                  {username.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>

            {/* Username + handle */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 52, fontWeight: 700, color: COLORS.text, lineHeight: 1 }}>
                {truncate(username, 24)}
              </div>
              <div style={{ fontSize: 24, color: COLORS.muted, fontWeight: 400 }}>
                @{username}
              </div>
            </div>
          </div>

          {/* Bio */}
          {bio && (
            <div
              style={{
                fontSize: 22,
                color: COLORS.muted,
                lineHeight: 1.5,
                maxWidth: 900,
                marginBottom: 28,
              }}
            >
              {bio}
            </div>
          )}

          {/* Stats row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 'auto' }}>
            {[
              { label: 'Konu', value: fmt(topicCount) },
              { label: 'Slayt', value: fmt(slideCount) },
              ...(slideoCount > 0 ? [{ label: 'Slideo', value: fmt(slideoCount) }] : []),
              ...(followerCount > 0 ? [{ label: 'Takipçi', value: fmt(followerCount) }] : []),
            ].map((stat, idx) => (
              <div
                key={stat.label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  paddingLeft: idx > 0 ? 28 : 0,
                  marginLeft: idx > 0 ? 28 : 0,
                  borderLeft: idx > 0 ? `1px solid ${COLORS.border}` : undefined,
                }}
              >
                <span style={{ fontSize: 26, fontWeight: 700, color: COLORS.text }}>
                  {stat.value}
                </span>
                <span style={{ fontSize: 15, color: COLORS.dimmed, marginTop: 2 }}>
                  {stat.label}
                </span>
              </div>
            ))}

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
