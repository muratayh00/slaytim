import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full flex flex-col items-center">
          {/* Kare logo — formun üstünde ortalı */}
          <div className="flex justify-center mb-6">
            <Link href="/">
              <Image
                src="/icon.png"
                alt="Slaytim"
                width={64}
                height={64}
                className="rounded-2xl shadow-sm"
              />
            </Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
