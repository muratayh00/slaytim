'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Search, Plus, LogOut, Menu, X, Moon, Sun, Layers, Compass,
  User, Presentation, Folder, ChevronDown, Play, Users, Shield, Settings,
} from 'lucide-react';
import NotificationBell from '@/components/shared/NotificationBell';
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { buildProfilePath, buildTopicCreatePath } from '@/lib/url';
import { resolveMediaUrl } from '@/lib/media';
import { warmupPdfjs } from '@/lib/pdfRenderer';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Restore persisted dark mode preference
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
      setDark(true);
    } else if (saved === 'light') {
      document.documentElement.classList.remove('dark');
      setDark(false);
    } else {
      setDark(document.documentElement.classList.contains('dark'));
    }
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Warm up the PDF.js singleton in the background so slide previews open
  // instantly.  Deferred 4 s so it doesn't compete with critical page resources.
  useEffect(() => {
    const t = setTimeout(() => { warmupPdfjs(); }, 4000);
    return () => clearTimeout(t);
  }, []);

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
    setMobileOpen(false);
    if (pathname === '/') {
      // Ana sayfada her zaman light mod — tercih kaydedilmez
      document.documentElement.classList.remove('dark');
      setDark(false);
    } else {
      // Diğer sayfalarda kaydedilmiş tercihi uygula
      const saved = localStorage.getItem('theme');
      if (saved === 'dark') {
        document.documentElement.classList.add('dark');
        setDark(true);
      }
    }
  }, [pathname]);

  const toggleDark = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    setDark(isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Çıkış Yapıldı');
    router.push('/');
  };

  const navLinks = [
    { href: '/kesfet', label: 'Konular', icon: Layers },
    { href: '/kategori', label: 'Kategoriler', icon: Layers },
    { href: '/kesfet?sort=popular', label: 'Keşfet', icon: Compass },
    { href: '/slideo', label: 'Slideo', icon: Play },
    { href: '/rooms', label: 'Odalar', icon: Users },
  ];

  const isActive = (href: string) => {
    const [path, query] = href.split('?');
    if (pathname !== path) return false;
    if (!query) return searchParams.get('sort') !== 'popular';
    const params = new URLSearchParams(query);
    return params.get('sort') === searchParams.get('sort');
  };

  return (
    <>
      <header
        className={cn(
          'lg:hidden fixed top-0 inset-x-0 z-50 h-[62px]',
          scrolled ? 'bg-card border-b border-border shadow-navbar' : 'bg-card'
        )}
      >
        <div className="max-w-7xl mx-auto px-5 h-full flex items-center justify-between gap-4">
          <Link href="/" prefetch={false} className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Presentation className="w-[18px] h-[18px] text-white" strokeWidth={2.5} />
            </div>
            <span className="font-extrabold text-[1.05rem] tracking-tight hidden sm:block text-foreground">slaytim</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch={false}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors',
                  isActive(link.href)
                    ? 'text-primary bg-primary/8'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                )}
              >
                <link.icon className="w-3.5 h-3.5" />
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex flex-1 max-w-[340px]">
            <form
              className="relative w-full"
              onSubmit={(e) => {
                e.preventDefault();
                const q = (e.currentTarget.elements.namedItem('q') as HTMLInputElement).value.trim();
                if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
              }}
            >
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                name="q"
                type="text"
                placeholder="Konu veya slayt ara..."
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 placeholder:text-muted-foreground/50"
              />
            </form>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleDark}
              className="w-9 h-9 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
            >
              {dark ? <Sun className="w-[17px] h-[17px]" /> : <Moon className="w-[17px] h-[17px]" />}
            </button>

            {user ? (
              <>
                <Link
                  href={buildTopicCreatePath()}
                  className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-lg bg-primary text-white hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-4 h-4" strokeWidth={2.5} />
                  Konu Aç
                </Link>
                <NotificationBell />

                <div ref={profileRef} className="relative">
                  <button onClick={() => setProfileOpen((o) => !o)} className="flex items-center gap-1">
                    <div className="w-9 h-9 rounded-lg border border-border bg-muted/60 flex items-center justify-center text-xs font-black text-primary overflow-hidden relative">
                      {user.username.slice(0, 2).toUpperCase()}
                      {resolveMediaUrl(user.avatarUrl) && (
                        <Image src={resolveMediaUrl(user.avatarUrl)!} alt={user.username} fill className="object-cover" />
                      )}
                    </div>
                    <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform', profileOpen && 'rotate-180')} />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-border rounded-xl shadow-card overflow-hidden z-50">
                      <div className="px-4 py-3 border-b border-border/60">
                        <p className="text-sm font-extrabold truncate">{user.username}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>

                      <div className="p-1.5">
                        <Link href={buildProfilePath(user.username)} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-muted transition-colors">
                          <User className="w-4 h-4 text-muted-foreground" />
                          Profilim
                        </Link>
                        <Link href="/collections" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-muted transition-colors">
                          <Folder className="w-4 h-4 text-muted-foreground" />
                          Koleksiyonlarım
                        </Link>
                        <Link href="/rooms" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-muted transition-colors">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          Odalar
                        </Link>
                        <Link href="/settings" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-muted transition-colors">
                          <Settings className="w-4 h-4 text-muted-foreground" />
                          Ayarlar
                        </Link>
                        {(user as any).isAdmin && (
                          <Link href="/admin" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-muted transition-colors">
                            <Shield className="w-4 h-4 text-muted-foreground" />
                            Admin Paneli
                          </Link>
                        )}
                      </div>

                      <div className="p-1.5 border-t border-border/60">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-red-500 hover:bg-red-500/8 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Çıkış Yap
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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

            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="md:hidden w-9 h-9 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="lg:hidden fixed top-[62px] inset-x-0 z-40 bg-card border-b border-border px-5 py-4 flex flex-col gap-2 md:hidden">
          <form
            className="relative mb-1"
            onSubmit={(e) => {
              e.preventDefault();
              const q = (e.currentTarget.elements.namedItem('q') as HTMLInputElement).value.trim();
              if (q) {
                router.push(`/search?q=${encodeURIComponent(q)}`);
                setMobileOpen(false);
              }
            }}
          >
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input name="q" type="text" placeholder="Ara..." className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-border bg-background focus:outline-none" />
          </form>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={false}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <link.icon className="w-4 h-4" />
              {link.label}
            </Link>
          ))}
          <div className="h-px bg-border my-1" />
          {user ? (
            <>
              <Link
                href={buildTopicCreatePath()}
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-opacity min-h-[44px] mb-1"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />Konu Aç
              </Link>
              <Link href={buildProfilePath(user.username)} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold hover:bg-muted transition-colors min-h-[44px]"><User className="w-4 h-4 text-muted-foreground" />Profilim</Link>
              <Link href="/collections" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold hover:bg-muted transition-colors min-h-[44px]"><Folder className="w-4 h-4 text-muted-foreground" />Koleksiyonlarım</Link>
              <Link href="/settings" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold hover:bg-muted transition-colors min-h-[44px]"><Settings className="w-4 h-4 text-muted-foreground" />Ayarlar</Link>
              <Link href="/rooms" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold hover:bg-muted transition-colors min-h-[44px]"><Users className="w-4 h-4 text-muted-foreground" />Odalar</Link>
              {(user as any).isAdmin && (
                <Link href="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold hover:bg-muted transition-colors min-h-[44px]"><Shield className="w-4 h-4 text-muted-foreground" />Admin Paneli</Link>
              )}
              <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors min-h-[44px]"><LogOut className="w-4 h-4" />Çıkış Yap</button>
            </>
          ) : (
            <>
              <Link
                href="/register"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-opacity min-h-[44px]"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                Ücretsiz Başla
              </Link>
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center py-3 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors min-h-[44px]"
              >
                Giriş Yap
              </Link>
            </>
          )}
        </div>
      )}
    </>
  );
}
