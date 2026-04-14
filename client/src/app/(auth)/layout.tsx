import Link from 'next/link';
import { Presentation } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="relative z-10 p-6">
        <Link href="/" className="flex items-center gap-2.5 w-fit">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Presentation className="w-[18px] h-[18px] text-white" strokeWidth={2.5} />
          </div>
          <span className="font-extrabold text-[1.05rem] tracking-tight text-foreground">slaytim</span>
        </Link>
      </header>
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 pb-16">
        {children}
      </div>
    </div>
  );
}
