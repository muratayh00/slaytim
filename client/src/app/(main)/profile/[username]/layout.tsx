import type { Metadata } from 'next';
import { buildProfilePath } from '@/lib/url';
import { getApiBaseUrl } from '@/lib/api-origin';

const API_URL = getApiBaseUrl();
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://slaytim.com';

export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  try {
    const res = await fetch(`${API_URL}/users/${params.username}`, { next: { revalidate: 3600 } });
    if (!res.ok) return { title: 'KullanÄ±cÄ± BulunamadÄ±' };
    const profile = await res.json();

    const title = `@${profile.username}`;
    const description = profile.bio
      ? profile.bio.slice(0, 155)
      : `${profile._count?.topics || 0} konu ve ${profile._count?.slides || 0} slayt. Slaytim'de @${profile.username} profilini keÅŸfet.`;
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

