'use client';

import { Suspense } from 'react';
import Navbar from '@/components/shared/Navbar';
import Sidebar from '@/components/shared/Sidebar';
import TopBar from '@/components/shared/TopBar';
import BottomNav from '@/components/shared/BottomNav';
import SiteFooter from '@/components/shared/SiteFooter';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={null}><Sidebar /></Suspense>
      <Suspense fallback={null}><Navbar /></Suspense>
      <Suspense fallback={null}><TopBar /></Suspense>
      <div className="lg:pl-56">
        <main className="pt-[62px] lg:pt-14 pb-14 lg:pb-0">
          {children}
        </main>
        <SiteFooter />
      </div>
      <Suspense fallback={null}><BottomNav /></Suspense>
    </div>
  );
}
