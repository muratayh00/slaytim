import { notFound } from 'next/navigation';
import ProfilePage from '../profile/[username]/page';

type Props = {
  params: { username: string };
};

export default function AtProfileAliasPage({ params }: Props) {
  const raw = decodeURIComponent(params.username || '');
  if (!raw.startsWith('@') || raw.length <= 1) {
    notFound();
  }

  const username = raw.slice(1).trim();
  if (!username) {
    notFound();
  }

  return <ProfilePage forcedUsername={username} />;
}
