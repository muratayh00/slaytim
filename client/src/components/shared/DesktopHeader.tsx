'use client';

/**
 * DesktopHeader — unified top bar for lg+ screens.
 *
 * Spans the full viewport width in one <header> element, visually split into:
 *   ┌──────────────────┬──────────────────────────────────────────┐
 *   │  Logo  (w-56)    │  Search ————————————  User actions       │
 *   └──────────────────┴──────────────────────────────────────────┘
 *
 * The logo column width equals the sidebar width so the border-r aligns
 * perfectly with the sidebar's border-r, creating a seamless grid feel.
 *
 * TopBar.tsx is retained for reference but no longer rendered.
 */

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Plus, Users } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import NotificationBell from './NotificationBell';
import { buildProfilePath, buildTopicCreatePath } from '@/lib/url';
import { resolveMediaUrl } from '@/lib/media';

export default function DesktopHeader() {
  const { user } = useAuthStore();
  const router = useRouter();

  return (
    <header className="hidden lg:flex fixed top-0 inset-x-0 h-[72px] z-40 bg-background border-b border-border/50 items-stretch">

      {/* ── Brand / logo column ─────────────────────────────────────── */}
      {/* Width matches Sidebar (w-56 = 224px). border-r continues as sidebar border-r. */}
      <div className="w-56 shrink-0 flex items-center px-6 border-r border-border/50">
        <Link href="/" prefetch={false} className="flex items-center">
          {/* Light mode: transparent bg. Dark mode: subtle white pill. */}
          <span className="flex items-center rounded-xl dark:bg-white dark:px-2.5 dark:py-1.5 dark:ring-1 dark:ring-black/5 dark:shadow-sm">
            <Image
              src="/logo-wide.png"
              alt="Slaytim"
              width={0}
              height={0}
              sizes="160px"
              className="h-9 w-auto max-w-[160px] object-contain"
            />
          </span>
        </Link>
      </div>

      {/* ── Search + actions column ─────────────────────────────────── */}
      <div className="flex-1 flex items-center gap-4 px-8">

        {/* Search */}
        <form
          className="flex-1 max-w-xl"
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
              placeholder="Konu, slayt veya kullanıcı ara..."
              className="w-full h-10 pl-10 pr-4 text-sm rounded-xl border border-border/70 bg-muted/40
                         focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50
                         placeholder:text-muted-foreground/50 transition-shadow"
            />
          </div>
        </form>

        {/* User actions */}
        <div className="flex items-center gap-2.5 ml-auto shrink-0">
          {user ? (
            <>
              <Link
                href={buildTopicCreatePath()}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold rounded-xl
                           bg-primary text-white hover:opacity-90 transition-opacity shadow-sm"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                Konu Aç
              </Link>
              <Link
                href="/rooms"
                className="flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold
                           rounded-xl border border-border hover:bg-muted transition-colors"
              >
                <Users className="w-4 h-4" />
                Odalar
              </Link>
              <NotificationBell />
              <Link
                href={buildProfilePath(user.username)}
                className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-muted transition-colors"
              >
                <div className="w-8 h-8 rounded-xl border border-border bg-muted/70 flex items-center
                                justify-center text-[11px] font-black text-primary overflow-hidden relative shrink-0">
                  {user.username.slice(0, 2).toUpperCase()}
                  {resolveMediaUrl(user.avatarUrl) && (
                    <Image
                      src={resolveMediaUrl(user.avatarUrl)!}
                      alt={user.username}
                      fill
                      className="object-cover"
                    />
                  )}
                </div>
                <span className="text-[13px] font-semibold max-w-[100px] truncate">{user.username}</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2.5 text-sm font-semibold text-muted-foreground
                           hover:text-foreground hover:bg-muted rounded-xl transition-colors"
              >
                Giriş Yap
              </Link>
              <Link
                href="/register"
                className="px-5 py-2.5 text-sm font-bold rounded-xl bg-primary text-white
                           hover:opacity-90 transition-opacity shadow-sm"
              >
                Kayıt Ol
              </Link>
            </>
          )}
        </div>

      </div>
    </header>
  );
}
