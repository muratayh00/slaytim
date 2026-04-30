import type { Metadata } from 'next';
import { buildProfilePath } from '@/lib/url';
import { getApiBaseUrl } from '@/lib/api-origin';
import { OG_WIDTH, OG_HEIGHT } from '@/app/api/og/_lib/theme';

const API_URL = getApiBaseUrl();
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://slaytim.com';

// force-dynamic: usernames are user-generated; build-time API calls cause
// ECONNREFUSED in CI. Metadata is generated at request time.
export const dynamic = 'force-dynamic';

async function fetchProfile(username: string) {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/users/${username}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  try {
    const profile = await fetchProfile(params.username);
    if (!profile) return { title: 'Kullanici Bulunamadi', robots: { index: false, follow: false } };

    const title = `@${profile.username}`;
    const description = profile.bio
      ? profile.bio.slice(0, 155)
      : `${profile._count?.topics || 0} konu ve ${profile._count?.slides || 0} slayt. Slaytim'de @${profile.username} profilini keşfet.`;
    const url = `${BASE_URL}${buildProfilePath(params.username)}`;
    const ogImage = `${BASE_URL}/api/og/profile/${encodeURIComponent(params.username)}`;
    const totalPublicContent =
      Number(profile?._count?.topics || 0)
      + Number(profile?._count?.slides || 0)
      + Number(profile?._count?.slideos || 0);

    return {
      title,
      description,
      ...(totalPublicContent <= 0 ? { robots: { index: false, follow: false } } : {}),
      openGraph: {
        title,
        description,
        url,
        type: 'profile',
        siteName: 'Slaytim',
        images: [{ url: ogImage, width: OG_WIDTH, height: OG_HEIGHT, alt: title }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImage],
      },
      alternates: { canonical: url },
    };
  } catch {
    return { title: 'Profil', robots: { index: false, follow: false } };
  }
}

export default async function ProfileLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { username: string };
}) {
  // Person JSON-LD: lets Google + AI engines resolve "@<username>" as a real
  // creator entity (Knowledge Graph). worksFor links the creator back to the
  // Slaytim Organization entity emitted in the root layout.
  let personJsonLd: object | null = null;
  try {
    const profile = await fetchProfile(params.username);
    if (profile) {
      const url = `${BASE_URL}${buildProfilePath(profile.username)}`;
      const topicCount = Number(profile?._count?.topics || 0);
      const slideCount = Number(profile?._count?.slides || 0);

      personJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: profile.username,
        alternateName: `@${profile.username}`,
        url,
        ...(profile.avatarUrl ? { image: profile.avatarUrl } : {}),
        ...(profile.bio ? { description: String(profile.bio).slice(0, 300) } : {}),
        worksFor: { '@type': 'Organization', name: 'Slaytim', url: BASE_URL },
        // mainEntityOfPage signals to search engines that this Person is the
        // primary entity of /@username (vs. e.g. WebPage being primary).
        mainEntityOfPage: { '@type': 'ProfilePage', '@id': url },
        // interactionStatistic exposes content volume — surfaces well in AI
        // citations ("@username has 47 slides on Slaytim").
        interactionStatistic: [
          {
            '@type': 'InteractionCounter',
            interactionType: 'https://schema.org/CreateAction',
            userInteractionCount: topicCount + slideCount,
          },
        ],
      };
    }
  } catch {
    // ignore JSON-LD failures
  }

  return (
    <>
      {personJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
      )}
      {children}
    </>
  );
}
