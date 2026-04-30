import { notFound, permanentRedirect } from 'next/navigation';
import { getApiBaseUrl } from '@/lib/api-origin';
import ProfilePage from '../profile/[username]/page';

const API_URL = getApiBaseUrl();

export const dynamic = 'force-dynamic';

async function fetchProfileData(username: string) {
  if (!API_URL) return null;
  try {
    // Details endpoint requires auth — the server component has no user cookie,
    // so it always returns 403. Skip it here; ProfilePage fetches it client-side.
    const [profileRes, topicsRes] = await Promise.all([
      fetch(`${API_URL}/users/${encodeURIComponent(username)}`, { cache: 'no-store' }),
      fetch(`${API_URL}/users/${encodeURIComponent(username)}/topics`, { cache: 'no-store' }),
    ]);
    if (!profileRes.ok) return null;
    const profile = await profileRes.json();
    const topics = topicsRes.ok ? await topicsRes.json() : [];
    return { profile, details: null, topics };
  } catch {
    return null;
  }
}

type Props = {
  params: { username: string };
};

export default async function AtProfilePage({ params }: Props) {
  const raw = decodeURIComponent(params.username || '');

  // Only handle @username paths — let notFound() handle anything else
  if (!raw.startsWith('@') || raw.length <= 1) {
    notFound();
  }

  const usernameFromUrl = raw.slice(1).trim();
  if (!usernameFromUrl) notFound();

  const data = await fetchProfileData(usernameFromUrl);
  if (!data) notFound();

  const { profile, details, topics } = data;

  // Canonical redirect: if the URL username doesn't match the stored username
  // (e.g. wrong casing: /@Alice → /@alice), redirect to the canonical form.
  const canonicalUsername = String(profile.username || usernameFromUrl);
  if (usernameFromUrl !== canonicalUsername) {
    permanentRedirect(`/@${encodeURIComponent(canonicalUsername)}`);
  }

  return (
    <ProfilePage
      forcedUsername={canonicalUsername}
      initialProfile={profile}
      initialDetails={details}
      initialTopics={Array.isArray(topics) ? topics : []}
    />
  );
}
