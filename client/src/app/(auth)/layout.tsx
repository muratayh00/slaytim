import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="relative z-10 p-6">
        <Link href="/" className="flex items-center w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/slaytimlogo.svg" alt="Slaytim" className="h-10 w-auto object-contain" />
        </Link>
      </header>
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 pb-16">
        {children}
      </div>
    </div>
  );
}
