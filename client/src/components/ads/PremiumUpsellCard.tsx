'use client';

/**
 * PremiumUpsellCard.tsx
 *
 * Premium abonelik teşvik kartı.
 * Kullanım senaryoları:
 *  - Reklam engelleyici tespit edildiğinde fallback
 *  - Premium kapı olarak (download, AI özet vb.)
 *  - Reklam alanı yerine inline gösterim
 *
 * Boyut: infeed reklam kartıyla aynı alanı kaplar (CLS korunur).
 */

import { useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, Zap } from 'lucide-react';
import { adEvents } from '@/lib/adEvents';
import { useAdContext } from '@/components/ads/AdProvider';

interface PremiumUpsellCardProps {
  placement: string;
  trigger?: 'ad_block' | 'premium_gate' | 'download_cta' | 'inline';
  /** Compact mod — dar alanlarda daha küçük gösterim */
  compact?: boolean;
  className?: string;
}

export default function PremiumUpsellCard({
  placement,
  trigger = 'inline',
  compact = false,
  className = '',
}: PremiumUpsellCardProps) {
  const { pageType } = useAdContext();

  // Görünür olunca event at
  useEffect(() => {
    adEvents.premiumUpsellView({ placement, page_type: pageType, trigger });
  }, [placement, pageType, trigger]);

  const handleClick = () => {
    adEvents.premiumUpsellClick({
      placement,
      page_type: pageType,
      cta_text: 'Premium\'a Geç',
    });
  };

  if (compact) {
    return (
      <div
        className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-primary/20 bg-primary/5 ${className}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-primary shrink-0" />
          <p className="text-sm font-semibold truncate">Reklamsız deneyim için Premium&apos;a geç</p>
        </div>
        <Link
          href="/premium"
          onClick={handleClick}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors"
        >
          Keşfet
        </Link>
      </div>
    );
  }

  return (
    <div
      className={`w-full min-h-[100px] rounded-xl border border-primary/20 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent flex items-center justify-between gap-4 px-5 py-4 ${className}`}
      data-premium-upsell="true"
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-extrabold mb-0.5">Slaytim Premium</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Reklamsız deneyim · Sınırsız indirme · AI özetler · Flashcard &amp; Quiz
          </p>
        </div>
      </div>
      <Link
        href="/premium"
        onClick={handleClick}
        className="shrink-0 px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm"
      >
        Premium&apos;a Geç
      </Link>
    </div>
  );
}
