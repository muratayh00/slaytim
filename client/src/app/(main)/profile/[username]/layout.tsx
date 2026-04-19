import type { Metadata } from 'next';
import { buildProfilePath } from '@/lib/url';
import { getApiBaseUrl } from '@/lib/api-origin';

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
    if (!profile) return { title: 'Kullanıcı Bulunamadı' };

    const title = `@${profile.username}`;
    const description = profile.bio
      ? profile.bio.slice(0, 155)
      : `${profile._count?.topics || 0} konu ve ${profile._count?.slides || 0} slayt. Slaytim'de @${profile.username} profilini keşfet.`;
    const url = `${BASE_URL}${buildProfilePath(params.username)}`;
    const image = profile.avatarUrl || undefined;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url,
        type: 'profile',
        siteName: 'Slaytim',
        ...(image ? { images: [{ url: image, width: 400, height: 400 }] } : {}),
      },
      twitter: {
        card: 'summary',
        title,
        description,
        ...(image ? { images: [image] } : {}),
      },
      alternates: { canonical: url },
    };
  } catch {
    return { title: 'Profil' };
  }
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
