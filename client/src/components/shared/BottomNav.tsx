'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import { Home, Compass, Play, Users, LogIn } from 'lucide-react';

export default function BottomNav() {
  const { user } = useAuthStore();
  const pathname = usePathname();

  const isActive = (href: string) => {
    const path = href.split('?')[0];
    if (path === '/') return pathname === '/';
    return pathname === path || pathname.startsWith(path + '/');
  };

  const items = user
    ? [
        { href: '/', label: 'Ana Sayfa', icon: Home },
        { href: '/topics?sort=popular', label: 'Keşfet', icon: Compass },
        { href: '/slideo', label: 'Slideo', icon: Play, fill: true },
        { href: '/rooms', label: 'Odalar', icon: Users },
      ]
    : [
        { href: '/', label: 'Ana Sayfa', icon: Home },
        { href: '/topics?sort=popular', label: 'Keşfet', icon: Compass },
        { href: '/slideo', label: 'Slideo', icon: Play, fill: true },
        { href: '/login', label: 'Giriş Yap', icon: LogIn },
      ];

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border">
      <div className="flex items-stretch justify-around h-[56px]">
        {items.map((item) => {
          const active = isActive(item.href);

          if (item.href === '/slideo') {
            return (
              <Link key={item.href} href={item.href} prefetch={false} className="flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 transition-colors">
                <div className={cn('w-11 h-8 rounded-lg flex items-center justify-center transition-colors', active ? 'bg-primary' : 'bg-primary/85')}>
                  <Play className="w-4 h-4 text-white fill-white" />
                </div>
                <span className={cn('text-[9.5px] font-bold truncate', active ? 'text-primary' : 'text-muted-foreground')}>
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn('flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 transition-colors', active ? 'text-primary' : 'text-muted-foreground')}
            >
              <item.icon className={cn('w-5 h-5', (item as any).fill ? 'fill-current' : '')} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[9.5px] font-bold truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

