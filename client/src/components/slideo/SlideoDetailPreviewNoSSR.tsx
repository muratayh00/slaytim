'use client';

// Thin SSR-bypass wrapper for SlideoDetailPreview.
//
// Why this file exists:
//   dynamic({ ssr: false }) must be called from a 'use client' module.
//   /slideo/[id]/page.tsx is a Next.js App Router server component — it cannot
//   call dynamic() directly. This wrapper is imported by the server page instead,
//   ensuring SlideoDetailPreview (which uses PDF.js / canvas / sessionStorage)
//   is never executed during server-side rendering, eliminating hydration errors
//   #422 and #425.
import dynamic from 'next/dynamic';

export default dynamic(() => import('./SlideoDetailPreview'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[62vh] rounded-2xl border border-border bg-black animate-pulse" />
  ),
});
