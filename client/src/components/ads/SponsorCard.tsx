'use client';

/**
 * SponsorCard.tsx — Kategori / oda sponsorluk kartı.
 *
 * "Bu kategori X markasının katkılarıyla sunulur." formatında
 * net şekilde "Sponsorlu" etiketiyle gösterilen branded kart.
 *
 * Veri: API'dan gelen sponsor bilgisi prop olarak verilir.
 * Reklam ağı gerektirmez — doğrudan marka anlaşmasıyla çalışır.
 *
 * Kullanım:
 *   <SponsorCard
 *     sponsorName="Acme Corp"
 *     sponsorLogo="/logos/acme.png"
 *     sponsorUrl="https://acme.com"
 *     campaignId="acme-q1-2026"
 *     context="Bu kategori"
 *     contentType="topic"
 *     contentId={42}
 *   />
 */

import Image from 'next/image';
import { ExternalLink } from 'lucide-react';
import { analytics } from '@/lib/analytics';
import { adEvents } from '@/lib/adEvents';
import { useAdContext } from '@/components/ads/AdProvider';
import { AD_CONFIG } from '@/lib/adConfig';

interface SponsorCardProps {
  sponsorName: string;
  sponsorLogo?: string | null;
  sponsorUrl?: string | null;
  campaignId?: string;
  /** "Bu kategori" / "Bu oda" / "Bu konu" */
  context?: string;
  contentType?: 'slide' | 'topic' | 'slideo';
  contentId?: number;
  className?: string;
}

export default function SponsorCard({
  sponsorName,
  sponsorLogo,
  sponsorUrl,
  campaignId,
  context = 'Bu içerik',
  contentType = 'topic',
  contentId = 0,
  className = '',
}: SponsorCardProps) {
  const { pageType } = useAdContext();
  const placementLabel = `${pageType}_sponsor_card`;

  const handleClick = () => {
    analytics.sponsoredClick({
      content_type: contentType,
      content_id: contentId,
      sponsor_name: sponsorName,
      campaign_id: campaignId,
    });
    adEvents.click({
      ad_slot: 'SPONSOR_CARD',
      placement: placementLabel,
      page_type: pageType,
    });
  };

  const handleView = () => {
    analytics.sponsoredView({
      content_type: contentType,
      content_id: contentId,
      sponsor_name: sponsorName,
      campaign_id: campaignId,
    });
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-muted/30 ${className}`}
      onMouseEnter={handleView}
      data-sponsor-card="true"
    >
      {/* Sol: "Sponsorlu" etiketi + metin */}
      <div className="flex-1 min-w-0">
        <span className="text-[9px] font-bold text-muted-foreground/50 tracking-widest uppercase block mb-0.5">
          {AD_CONFIG.global.sponsoredLabel}
        </span>
        <p className="text-xs text-muted-foreground leading-snug">
          {context}{' '}
          <span className="font-semibold text-foreground">{sponsorName}</span>
          &apos;nin katkılarıyla sunulur.
        </p>
      </div>

      {/* Sağ: Logo + link */}
      <div className="shrink-0 flex items-center gap-2">
        {sponsorLogo && (
          <div className="w-8 h-8 relative rounded-lg overflow-hidden border border-border bg-background">
            <Image src={sponsorLogo} alt={sponsorName} fill className="object-contain p-0.5" />
          </div>
        )}
        {sponsorUrl && (
          <a
            href={sponsorUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={handleClick}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title={`${sponsorName} web sitesini ziyaret et`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}
