'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Plus, Users } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import NotificationBell from './NotificationBell';
import { buildProfilePath, buildTopicCreatePath } from '@/lib/url';
import { resolveMediaUrl } from '@/lib/media';

export default function TopBar() {
  const { user } = useAuthStore();
  const router = useRouter();

  return (
    <header className="hidden lg:flex fixed top-0 left-56 right-0 h-14 z-30 bg-card border-b border-border items-center gap-4 px-6">
      <form
        className="flex-1 max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          const q = (e.currentTarget.elements.namedItem('q') as HTMLInputElement).value.trim();
          if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
        }}
      >
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            name="q"
            type="text"
            placeholder="Konu, slayt veya kullanici ara..."
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 placeholder:text-muted-foreground/50"
          />
        </div>
      </form>

      <div className="flex items-center gap-2 ml-auto">
        {user ? (
          <>
            <Link href={buildTopicCreatePath()} className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-lg bg-primary text-white hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Konu Aç
            </Link>
            <Link href="/rooms" className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg border border-border hover:bg-muted transition-colors">
              <Users className="w-4 h-4" />
              Odalar
            </Link>
            <NotificationBell />
            <Link href={buildProfilePath(user.username)} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors">
              <div className="w-7 h-7 rounded-lg border border-border bg-muted/70 flex items-center justify-center text-[10px] font-black text-primary overflow-hidden relative shrink-0">
                {user.username.slice(0, 2).toUpperCase()}
                {resolveMediaUrl(user.avatarUrl) && (
                  <Image src={resolveMediaUrl(user.avatarUrl)!} alt={user.username} fill className="object-cover" />
                )}
              </div>
              <span className="text-[13px] font-semibold max-w-[100px] truncate">{user.username}</span>
            </Link>
          </>
        ) : (
          <>
            <Link href="/login" className="px-3.5 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
              Giriş
            </Link>
            <Link href="/register" className="px-4 py-2 text-sm font-bold rounded-lg bg-primary text-white hover:opacity-90 transition-opacity">
              Kayıt Ol
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

