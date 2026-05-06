'use client';

import { Suspense } from 'react';
import Navbar from '@/components/shared/Navbar';
import Sidebar from '@/components/shared/Sidebar';
import DesktopHeader from '@/components/shared/DesktopHeader';
import BottomNav from '@/components/shared/BottomNav';
import SiteFooter from '@/components/shared/SiteFooter';
import AnalyticsTracker from '@/components/shared/AnalyticsTracker';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Route-change tracker — fires page_view events to /api/analytics/event */}
      <Suspense fallback={null}><AnalyticsTracker /></Suspense>

      {/* Desktop: unified header (logo col + search/actions col) + sidebar nav */}
      <Suspense fallback={null}><DesktopHeader /></Suspense>
      <Suspense fallback={null}><Sidebar /></Suspense>

      {/* Mobile/tablet: classic top navbar */}
      <Suspense fallback={null}><Navbar /></Suspense>

      <div className="lg:pl-56">
        <main className="pt-[62px] lg:pt-[72px] pb-14 lg:pb-0">
          {children}
        </main>
        <SiteFooter />
      </div>
      <Suspense fallback={null}><BottomNav /></Suspense>
    </div>
  );
}
