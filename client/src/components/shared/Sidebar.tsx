'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Home, Compass, LayoutGrid, Play, FolderOpen,
  Plus, Moon, Sun, LogOut, User, Presentation, ChevronUp, Clock, Users, Shield,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { buildProfilePath, buildTopicCreatePath, buildTopicPath } from '@/lib/url';
import { resolveMediaUrl } from '@/lib/media';

const BASE_NAV = [
  { href: '/', label: 'Ana Sayfa', icon: Home },
  { href: '/topics?sort=popular', label: 'Keşfet', icon: Compass },
  { href: '/topics', label: 'Konular', icon: LayoutGrid },
  { href: '/categories', label: 'Kategoriler', icon: LayoutGrid },
  { href: '/slideo', label: 'Slideo', icon: Play, fill: true },
  { href: '/rooms', label: 'Odalar', icon: Users },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [recentTopics, setRecentTopics] = useState<Array<{ id: number; title: string; slug?: string }>>([]);
  const [dark, setDark] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  useEffect(() => {
    let cancelled = false;
    let delayedRefresh: ReturnType<typeof setTimeout> | null = null;
    if (!user) {
      setRecentTopics([]);
      return;
    }

    const fetchRecent = async () => {
      try {
        const { data } = await api.get('/users/me/recent-topics');
        if (cancelled) return;
        const topics = Array.isArray(data?.topics) ? data.topics : [];
        setRecentTopics(topics.map((t: any) => ({ id: t.id, title: t.title, slug: t.slug })));
      } catch {
        if (cancelled) return;
        setRecentTopics([]);
      }
    };

    fetchRecent();
    if (pathname.startsWith('/konu/') || pathname.startsWith('/topics/')) {
      delayedRefresh = setTimeout(fetchRecent, 900);
    }

    return () => {
      cancelled = true;
      if (delayedRefresh) clearTimeout(delayedRefresh);
    };
  }, [user, pathname]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setProfileOpen(false);
  }, [pathname]);

  const toggleDark = () => {
    document.documentElement.classList.toggle('dark');
    setDark((d) => !d);
  };

  const handleLogout = () => {
    setRecentTopics([]);
    logout();
    toast.success('Çıkış Yapildi');
    router.push('/');
  };

  const navItems = [
    ...BASE_NAV,
    ...(user ? [{ href: '/collections', label: 'Koleksiyonlar', icon: FolderOpen, fill: false }] : []),
  ];

  const isActive = (href: string) => {
    const [path, query] = href.split('?');
    if (path === '/') return pathname === '/';
    if (pathname !== path) return false;
    if (!query) return searchParams.get('sort') !== 'popular';
    return new URLSearchParams(query).get('sort') === searchParams.get('sort');
  };

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-56 bg-card border-r border-border z-40">
      <div className="px-4 h-14 flex items-center border-b border-border/60 shrink-0">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Presentation className="w-[18px] h-[18px] text-white" strokeWidth={2.5} />
          </div>
          <span className="font-extrabold text-[1.02rem] tracking-tight text-foreground">slaytim</span>
        </Link>
      </div>

      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={item.href === '/slideo' ? false : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-semibold transition-colors group',
                  active ? 'bg-primary/8 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                )}
              >
                <item.icon
                  className={cn(
                    'w-[17px] h-[17px] shrink-0',
                    item.fill ? 'fill-current' : '',
                    active ? 'text-primary' : 'group-hover:text-foreground'
                  )}
                />
                {item.label}
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
              </Link>
            );
          })}
        </div>

        {user && recentTopics.length > 0 && (
          <div className="mt-4">
            <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Son Konular
            </p>
            <div className="space-y-0.5">
              {recentTopics.map((topic) => {
                const href = buildTopicPath({ id: topic.id, slug: topic.slug, title: topic.title });
                const active = pathname === href;
                return (
                  <Link
                    key={topic.id}
                    href={href}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] font-medium transition-colors group',
                      active ? 'bg-primary/8 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                    )}
                  >
                    <Clock className={cn('w-3 h-3 shrink-0', active ? 'text-primary' : 'text-muted-foreground/50')} />
                    <span className="truncate">{topic.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      <div className="px-2 pb-3 pt-3 space-y-1 border-t border-border/60 shrink-0">
        {user ? (
          <>
            <Link href={buildTopicCreatePath()} className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary text-white text-[13px] font-bold hover:opacity-90 transition-opacity w-full">
              <Plus className="w-4 h-4 shrink-0" strokeWidth={2.5} />
              Konu Aç
            </Link>

            <div ref={profileRef} className="relative">
              <button
                onClick={() => setProfileOpen((o) => !o)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-muted/70 transition-colors w-full text-left"
              >
                <div className="w-7 h-7 rounded-lg border border-border bg-muted/70 flex items-center justify-center text-[10px] font-black text-primary shrink-0 overflow-hidden relative">
                  {user.username.slice(0, 2).toUpperCase()}
                  {resolveMediaUrl(user.avatarUrl) && (
                    <img src={resolveMediaUrl(user.avatarUrl)!} alt={user.username}
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-bold truncate">{user.username}</p>
                </div>
                <ChevronUp className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0', !profileOpen && 'rotate-180')} />
              </button>

              {profileOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-1.5 bg-card border border-border rounded-xl shadow-card overflow-hidden z-50">
                  <div className="p-1.5">
                    <Link href={buildProfilePath(user.username)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-semibold hover:bg-muted transition-colors" onClick={() => setProfileOpen(false)}>
                      <User className="w-4 h-4 text-muted-foreground" />
                      Profilim
                    </Link>
                    <Link href="/collections" className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-semibold hover:bg-muted transition-colors" onClick={() => setProfileOpen(false)}>
                      <FolderOpen className="w-4 h-4 text-muted-foreground" />
                      Koleksiyonlarım
                    </Link>
                    <Link href="/rooms" className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-semibold hover:bg-muted transition-colors" onClick={() => setProfileOpen(false)}>
                      <Users className="w-4 h-4 text-muted-foreground" />
                      Odalar
                    </Link>
                    {(user as any).isAdmin && (
                      <Link href="/admin" className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-semibold hover:bg-muted transition-colors" onClick={() => setProfileOpen(false)}>
                        <Shield className="w-4 h-4 text-muted-foreground" />
                        Admin Paneli
                      </Link>
                    )}
                  </div>
                  <div className="p-1.5 border-t border-border/60">
                    <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-semibold text-red-500 hover:bg-red-500/8 transition-colors">
                      <LogOut className="w-4 h-4" />
                      Çıkış Yap
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-1.5">
            <Link href="/register" className="flex items-center justify-center py-2.5 rounded-lg bg-primary text-white text-[13px] font-bold hover:opacity-90 transition-opacity w-full">
              Kayıt Ol
            </Link>
            <Link href="/login" className="flex items-center justify-center py-2 rounded-lg border border-border text-[13px] font-semibold hover:bg-muted transition-colors w-full">
              Giriş Yap
            </Link>
          </div>
        )}

        <button onClick={toggleDark} className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors w-full">
          {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          {dark ? 'Acik Mod' : 'Koyu Mod'}
        </button>
      </div>
    </aside>
  );
}
